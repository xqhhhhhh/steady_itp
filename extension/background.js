const STORAGE_KEY = "nolBotConfig";
const pendingKickTabs = new Set();
const PRE_ENTER_ALARM = "nolBotPreEnterAlarm";
const DING_NOTIFY_SENT_KEY = "nolBotDingNotifySent";
const DING_DEDUP_TTL_MS = 5 * 60 * 1000;

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function saveConfig(config) {
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...config,
      saleStartTime: String(config?.saleStartTime || "").trim(),
      preEnterSeconds: normalizePreEnterSeconds(config?.preEnterSeconds, 30),
      criticalPreSeconds: normalizeCriticalSeconds(config?.criticalPreSeconds, 2.5, 0.5, 10),
      criticalPostSeconds: normalizeCriticalSeconds(config?.criticalPostSeconds, 8, 1, 20),
      criticalTickMs: normalizeCriticalTickMs(config?.criticalTickMs, 65),
      dateMonth: String(config?.dateMonth || "").trim(),
      dateDay: String(config?.dateDay || "").trim(),
      dateTime: String(config?.dateTime || "").trim(),
      fullFlowEnabled: config?.fullFlowEnabled !== false,
      ocrApiUrl: String(config?.ocrApiUrl || "http://127.0.0.1:8000/ocr/file").trim(),
      vpnApiUrl: String(config?.vpnApiUrl || "http://127.0.0.1:8000").trim(),
      vpnAutoSwitchEnabled: config?.vpnAutoSwitchEnabled !== false,
      dingTalkWebhookUrl: String(config?.dingTalkWebhookUrl || "").trim(),
      dingTalkSecret: String(config?.dingTalkSecret || "").trim(),
      enabled: true,
      startedAt: Date.now()
    }
  });
}

async function saveConfigOnly(config) {
  const current = await getConfig();
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...current,
      eventUrl: String(config?.eventUrl || "").trim(),
      saleStartTime: String(config?.saleStartTime || "").trim(),
      preEnterSeconds: normalizePreEnterSeconds(
        config?.preEnterSeconds,
        current.preEnterSeconds || 30
      ),
      criticalPreSeconds: normalizeCriticalSeconds(
        config?.criticalPreSeconds,
        current.criticalPreSeconds || 2.5,
        0.5,
        10
      ),
      criticalPostSeconds: normalizeCriticalSeconds(
        config?.criticalPostSeconds,
        current.criticalPostSeconds || 8,
        1,
        20
      ),
      criticalTickMs: normalizeCriticalTickMs(
        config?.criticalTickMs,
        current.criticalTickMs || 65
      ),
      quantity: Number(config?.quantity || current.quantity || 1),
      dateMonth: String(config?.dateMonth || "").trim(),
      dateDay: String(config?.dateDay || "").trim(),
      dateTime: String(config?.dateTime || "").trim(),
      fullFlowEnabled:
        typeof config?.fullFlowEnabled === "boolean"
          ? config.fullFlowEnabled
          : current.fullFlowEnabled !== false,
      countryCode: String(config?.countryCode || current.countryCode || "86").trim(),
      phoneNumber: String(config?.phoneNumber || "").trim(),
      ocrApiUrl: String(
        config?.ocrApiUrl || current.ocrApiUrl || "http://127.0.0.1:8000/ocr/file"
      ).trim(),
      vpnApiUrl: String(config?.vpnApiUrl || current.vpnApiUrl || "http://127.0.0.1:8000").trim(),
      vpnAutoSwitchEnabled:
        typeof config?.vpnAutoSwitchEnabled === "boolean"
          ? config.vpnAutoSwitchEnabled
          : current.vpnAutoSwitchEnabled !== false,
      dingTalkWebhookUrl: String(
        config?.dingTalkWebhookUrl || current.dingTalkWebhookUrl || ""
      ).trim(),
      dingTalkSecret: String(config?.dingTalkSecret || current.dingTalkSecret || "").trim(),
      savedAt: Date.now()
    }
  });
}

async function disableConfig() {
  const all = await chrome.storage.local.get(STORAGE_KEY);
  const current = all[STORAGE_KEY] || {};
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...current,
      enabled: false,
      stoppedAt: Date.now()
    }
  });
}

async function pingActiveTabBot() {
  const tab = await getActiveTab();
  if (!tab?.id) return { ok: false, error: "NO_ACTIVE_TAB" };
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "PING_BOT" });
    return { ok: true, response: resp, tabId: tab.id, url: tab.url || "" };
  } catch (err) {
    return {
      ok: false,
      error: String(err?.message || err),
      tabId: tab.id,
      url: tab.url || ""
    };
  }
}

async function openOrUpdateTab(url) {
  const tab = await getActiveTab();
  if (!tab) {
    const created = await chrome.tabs.create({ url });
    return created?.id;
  }
  const updated = await chrome.tabs.update(tab.id, { url });
  return updated?.id;
}

function normalizePreEnterSeconds(raw, fallback = 30) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(300, Math.max(5, Number(fallback) || 30));
  return Math.min(300, Math.max(5, Math.round(n)));
}

function normalizeCriticalSeconds(raw, fallback, min, max) {
  const n = Number(raw);
  const base = Number(fallback);
  if (!Number.isFinite(n)) return Number.isFinite(base) ? base : min;
  const clamped = Math.min(max, Math.max(min, n));
  return Math.round(clamped * 10) / 10;
}

function normalizeCriticalTickMs(raw, fallback = 65) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(180, Math.max(40, Number(fallback) || 65));
  return Math.min(180, Math.max(40, Math.round(n)));
}

function getSaleStartTimestamp(config) {
  const raw = String(config?.saleStartTime || "").trim();
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  if (!Number.isFinite(ts)) return null;
  return ts;
}

function getPreEnterTimestamp(config) {
  const startAt = getSaleStartTimestamp(config);
  if (!startAt) return null;
  const lead = normalizePreEnterSeconds(config?.preEnterSeconds, 30);
  return startAt - lead * 1000;
}

async function clearPreEnterAlarm() {
  try {
    await chrome.alarms.clear(PRE_ENTER_ALARM);
  } catch (_) {}
}

async function schedulePreEnterAlarmIfNeeded(config) {
  const preEnterAt = getPreEnterTimestamp(config);
  if (!preEnterAt || !config?.eventUrl) {
    await clearPreEnterAlarm();
    return { scheduled: false, preEnterAt: null };
  }
  if (Date.now() >= preEnterAt) {
    await clearPreEnterAlarm();
    return { scheduled: false, preEnterAt };
  }
  await chrome.alarms.create(PRE_ENTER_ALARM, { when: preEnterAt });
  await chrome.storage.local.set({
    nolBotLastLog: {
      text: `已设置定时进场: ${new Date(preEnterAt).toLocaleString()}`,
      ts: Date.now()
    }
  });
  return { scheduled: true, preEnterAt };
}

async function getConfig() {
  const all = await chrome.storage.local.get(STORAGE_KEY);
  return all[STORAGE_KEY] || {};
}

async function requestOcrCode(apiUrl, bytes) {
  const safeUrl = String(apiUrl || "").trim();
  if (!safeUrl) throw new Error("OCR apiUrl is empty");
  if (!Array.isArray(bytes) || bytes.length === 0) throw new Error("OCR image bytes are empty");

  const u8 = new Uint8Array(bytes);
  const formData = new FormData();
  formData.append("file", new Blob([u8], { type: "image/png" }), "captcha.png");

  const resp = await fetch(safeUrl, {
    method: "POST",
    body: formData
  });
  if (!resp.ok) {
    throw new Error(`OCR HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const code = String(data?.code || "").trim();
  if (!code) throw new Error("OCR code is empty");
  const candidates = Array.isArray(data?.candidates)
    ? data.candidates.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  return { code, candidates };
}

async function requestVpnApi(baseUrl, path, payload = {}) {
  const base = String(baseUrl || "").trim() || "http://127.0.0.1:8000";
  const url = new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  if (!resp.ok) throw new Error(`VPN API HTTP ${resp.status}`);
  return await resp.json();
}

function u8ToBase64(u8) {
  let binary = "";
  for (let i = 0; i < u8.length; i += 1) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}

async function buildDingTalkSignedUrl(webhookUrl, secret) {
  const url = new URL(String(webhookUrl || "").trim());
  const sec = String(secret || "").trim();
  if (!sec) return url.toString();

  const timestamp = Date.now();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sec),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const payload = `${timestamp}\n${sec}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const sign = encodeURIComponent(u8ToBase64(new Uint8Array(signature)));
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("sign", sign);
  return url.toString();
}

async function hasSentDingEvent(eventKey, ttlMs = DING_DEDUP_TTL_MS) {
  const key = String(eventKey || "").trim();
  if (!key) return false;
  const now = Date.now();
  const all = await chrome.storage.local.get(DING_NOTIFY_SENT_KEY);
  const map = all[DING_NOTIFY_SENT_KEY] || {};
  const cleaned = {};
  for (const [k, ts] of Object.entries(map)) {
    const n = Number(ts);
    if (Number.isFinite(n) && now - n < ttlMs) cleaned[k] = n;
  }
  if (cleaned[key]) {
    if (Object.keys(cleaned).length !== Object.keys(map).length) {
      await chrome.storage.local.set({ [DING_NOTIFY_SENT_KEY]: cleaned });
    }
    return true;
  }
  return false;
}

async function markDingEventSent(eventKey) {
  const key = String(eventKey || "").trim();
  if (!key) return;
  const all = await chrome.storage.local.get(DING_NOTIFY_SENT_KEY);
  const map = all[DING_NOTIFY_SENT_KEY] || {};
  map[key] = Date.now();
  await chrome.storage.local.set({ [DING_NOTIFY_SENT_KEY]: map });
}

async function sendDingTalkText(webhookUrl, secret, title, text) {
  const signedUrl = await buildDingTalkSignedUrl(webhookUrl, secret);
  const bodyText = `[NOL BOT] ${String(title || "通知")}\n${String(text || "").trim()}\n${new Date().toLocaleString()}`;
  const resp = await fetch(signedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msgtype: "text",
      text: { content: bodyText }
    })
  });
  if (!resp.ok) throw new Error(`DingTalk HTTP ${resp.status}`);
  const data = await resp.json().catch(() => ({}));
  if (typeof data?.errcode === "number" && data.errcode !== 0) {
    throw new Error(`DingTalk errcode=${data.errcode} errmsg=${data.errmsg || ""}`.trim());
  }
  return true;
}

async function forceInjectAndKick(tabId) {
  if (!tabId) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-script.js"]
    });
  } catch (_) {}
  try {
    await chrome.tabs.sendMessage(tabId, { type: "FORCE_START" });
  } catch (_) {}
}

async function runLegacyNextInMainWorld(tabId, frameId, reason = "") {
  if (!tabId) return { ok: false, error: "no_tab_id" };
  try {
    const target = Number.isInteger(frameId)
      ? { tabId, frameIds: [frameId] }
      : { tabId };
    const results = await chrome.scripting.executeScript({
      target,
      world: "MAIN",
      func: (why) => {
        const out = {
          ok: false,
          reason: String(why || ""),
          hasFnNextStep: typeof window.fnNextStep === "function",
          fnInvoked: false,
          target: "",
          clicked: false,
          stepBefore: typeof window.nNowBookStep !== "undefined" ? window.nNowBookStep : null,
          stepAfter: null,
          seatSrc: "",
          error: ""
        };
        try {
          const shown = (el) => {
            if (!el) return false;
            try {
              const s = window.getComputedStyle(el);
              return s.display !== "none" && s.visibility !== "hidden";
            } catch (_) {
              return false;
            }
          };

          if (typeof window.fnNextStep === "function") {
            window.fnNextStep("P");
            out.fnInvoked = true;
            out.ok = true;
          } else {
            const largeWrap = document.getElementById("LargeNextBtn");
            const smallWrap = document.getElementById("SmallNextBtn");
            const large = document.getElementById("LargeNextBtnLink");
            const small = document.getElementById("SmallNextBtnLink");
            const targetEl =
              (shown(largeWrap) && large) ||
              (shown(smallWrap) && small) ||
              large ||
              small ||
              document.querySelector("a[href*='fnNextStep']");
            if (targetEl) {
              out.target = String(targetEl.id || targetEl.tagName || "");
              targetEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
              targetEl.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
              targetEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
              out.clicked = true;
              out.ok = true;
            }
          }
        } catch (err) {
          out.error = String(err?.message || err);
        }
        out.stepAfter = typeof window.nNowBookStep !== "undefined" ? window.nNowBookStep : null;
        out.seatSrc = String(document.querySelector("#ifrmSeat")?.getAttribute("src") || "");
        return out;
      },
      args: [String(reason || "")]
    });
    return results?.[0]?.result || { ok: false, error: "no_result" };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function runLegacyCaptchaActionInMainWorld(tabId, frameId, action = "") {
  if (!tabId) return { ok: false, error: "no_tab_id" };
  try {
    const target = Number.isInteger(frameId)
      ? { tabId, frameIds: [frameId] }
      : { tabId };
    const results = await chrome.scripting.executeScript({
      target,
      world: "MAIN",
      func: (act) => {
        const out = { ok: false, action: String(act || ""), error: "" };
        try {
          const input = document.querySelector("#txtCaptcha");
          if (act === "refresh") {
            if (typeof window.fnCapchaRefresh === "function") {
              window.fnCapchaRefresh();
              out.ok = true;
              return out;
            }
            const btn = document.querySelector(".capchaLayer .refreshBtn");
            if (btn && typeof btn.click === "function") {
              btn.click();
              out.ok = true;
              return out;
            }
          }
          if (act === "submit") {
            if (typeof window.fnCheck === "function") {
              window.fnCheck();
              out.ok = true;
              return out;
            }
            const btn = document.querySelector(".capchaLayer a[onclick*='fnCheck']");
            if (btn && typeof btn.click === "function") {
              btn.click();
              out.ok = true;
              return out;
            }
          }
          if (act === "enter" && input) {
            input.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })
            );
            input.dispatchEvent(
              new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true })
            );
            if (typeof window.IsEnterGo === "function") {
              window.IsEnterGo();
            }
            out.ok = true;
            return out;
          }
          out.error = "action_not_handled";
          return out;
        } catch (err) {
          out.error = String(err?.message || err);
          return out;
        }
      },
      args: [String(action || "")]
    });
    return results?.[0]?.result || { ok: false, error: "no_result" };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const all = await chrome.storage.local.get(STORAGE_KEY);
  if (!all[STORAGE_KEY]) {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        enabled: false,
        eventUrl: "",
        quantity: 1,
        dateMonth: "",
        dateDay: "",
        dateTime: "",
        fullFlowEnabled: true,
        saleStartTime: "",
        preEnterSeconds: 30,
        criticalPreSeconds: 2.5,
        criticalPostSeconds: 8,
        criticalTickMs: 65,
        countryCode: "86",
        phoneNumber: "",
        ocrApiUrl: "http://127.0.0.1:8000/ocr/file",
        vpnApiUrl: "http://127.0.0.1:8000",
        vpnAutoSwitchEnabled: true,
        dingTalkWebhookUrl: "",
        dingTalkSecret: ""
      }
    });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!pendingKickTabs.has(tabId)) return;
  if (changeInfo.status !== "complete") return;
  const cfg = await getConfig();
  if (!cfg.enabled) {
    pendingKickTabs.delete(tabId);
    return;
  }
  if (!tab?.url?.startsWith("https://world.nol.com/")) return;
  await forceInjectAndKick(tabId);
  pendingKickTabs.delete(tabId);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm?.name !== PRE_ENTER_ALARM) return;
  const cfg = await getConfig();
  if (!cfg?.enabled || !cfg?.eventUrl) return;
  let tabId = null;
  try {
    tabId = await openOrUpdateTab(cfg.eventUrl);
    if (tabId) pendingKickTabs.add(tabId);
    await forceInjectAndKick(tabId);
    await chrome.storage.local.set({
      nolBotLastLog: {
        text: "定时进场触发，已进入活动页",
        ts: Date.now()
      }
    });
  } catch (err) {
    await chrome.storage.local.set({
      nolBotLastLog: {
        text: `定时进场失败: ${String(err?.message || err)}`,
        ts: Date.now()
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "START_BOT") {
      const config = message.config || {};
      await saveConfig(config);
      const saved = await getConfig();
      const scheduleResult = await schedulePreEnterAlarmIfNeeded(saved);
      if (scheduleResult.scheduled) {
        sendResponse({ ok: true, scheduled: true, preEnterAt: scheduleResult.preEnterAt });
        return;
      }
      let tabId = null;
      if (config.eventUrl) {
        tabId = await openOrUpdateTab(config.eventUrl);
      } else {
        const tab = await getActiveTab();
        tabId = tab?.id || null;
      }
      if (tabId) {
        pendingKickTabs.add(tabId);
      }
      await forceInjectAndKick(tabId);
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "SAVE_CONFIG") {
      const config = message.config || {};
      await saveConfigOnly(config);
      const merged = await getConfig();
      if (merged.enabled) {
        await schedulePreEnterAlarmIfNeeded(merged);
      }
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "STOP_BOT") {
      await disableConfig();
      await clearPreEnterAlarm();
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "GET_STATUS") {
      const all = await chrome.storage.local.get([
        STORAGE_KEY,
        "nolBotLastLog",
        "nolBotContentReady"
      ]);
      const cfg = all[STORAGE_KEY] || { enabled: false };
      sendResponse({
        ok: true,
        config: cfg,
        lastLog: all.nolBotLastLog || null,
        contentReady: all.nolBotContentReady || null
      });
      return;
    }

    if (message?.type === "PING_ACTIVE_TAB_BOT") {
      const result = await pingActiveTabBot();
      sendResponse(result);
      return;
    }

    if (message?.type === "LOG_EVENT") {
      await chrome.storage.local.set({
        nolBotLastLog: {
          text: message.text || "",
          ts: Date.now()
        }
      });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "CONTENT_READY") {
      await chrome.storage.local.set({
        nolBotContentReady: {
          ts: Date.now(),
          url: message.url || "",
          host: message.host || "",
          frame: message.frame || "unknown"
        }
      });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "LEGACY_NEXT_MAIN") {
      const tabId = _sender?.tab?.id;
      const frameId = _sender?.frameId;
      const result = await runLegacyNextInMainWorld(
        tabId,
        Number.isInteger(frameId) ? frameId : undefined,
        String(message?.reason || "")
      );
      sendResponse({ ok: Boolean(result?.ok), result });
      return;
    }

    if (message?.type === "LEGACY_CAPTCHA_ACTION") {
      const tabId = _sender?.tab?.id;
      const frameId = _sender?.frameId;
      const result = await runLegacyCaptchaActionInMainWorld(
        tabId,
        Number.isInteger(frameId) ? frameId : undefined,
        String(message?.action || "")
      );
      sendResponse({ ok: Boolean(result?.ok), result });
      return;
    }

    if (message?.type === "OCR_REQUEST") {
      try {
        await chrome.storage.local.set({
          nolBotLastLog: {
            text: `OCR_REQUEST bytes=${Array.isArray(message.bytes) ? message.bytes.length : 0}`,
            ts: Date.now()
          }
        });
        const result = await requestOcrCode(message.apiUrl, message.bytes);
        sendResponse({ ok: true, code: result.code, candidates: result.candidates || [] });
      } catch (err) {
        await chrome.storage.local.set({
          nolBotLastLog: {
            text: `OCR_REQUEST failed: ${String(err?.message || err)}`,
            ts: Date.now()
          }
        });
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
      return;
    }

    if (message?.type === "FETCH_IMAGE_BYTES") {
      try {
        const targetUrl = String(message?.url || "").trim();
        if (!targetUrl) {
          sendResponse({ ok: false, error: "empty_url" });
          return;
        }
        const resp = await fetch(targetUrl, {
          method: "GET",
          credentials: "include",
          cache: "no-store"
        });
        if (!resp.ok) {
          sendResponse({ ok: false, error: `HTTP ${resp.status}` });
          return;
        }
        const buf = await resp.arrayBuffer();
        sendResponse({ ok: true, bytes: Array.from(new Uint8Array(buf)) });
      } catch (err) {
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
      return;
    }

    if (message?.type === "DINGTALK_NOTIFY") {
      try {
        const cfg = await getConfig();
        const webhook = String(cfg?.dingTalkWebhookUrl || "").trim();
        const secret = String(cfg?.dingTalkSecret || "").trim();
        if (!webhook) {
          sendResponse({ ok: false, error: "DingTalk webhook 未配置" });
          return;
        }
        const eventKey = String(message?.eventKey || "").trim();
        if (eventKey && (await hasSentDingEvent(eventKey))) {
          sendResponse({ ok: true, sent: false, dedup: true });
          return;
        }
        await sendDingTalkText(
          webhook,
          secret,
          String(message?.title || "NOL BOT 通知"),
          String(message?.text || "")
        );
        if (eventKey) await markDingEventSent(eventKey);
        await chrome.storage.local.set({
          nolBotLastLog: {
            text: `钉钉通知已发送: ${String(message?.title || "通知")}`,
            ts: Date.now()
          }
        });
        sendResponse({ ok: true, sent: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
      return;
    }

    if (message?.type === "VPN_HEALTH_CHECK") {
      try {
        const cfg = await getConfig();
        const apiUrl = String(message?.apiUrl || cfg?.vpnApiUrl || "http://127.0.0.1:8000").trim();
        const data = await requestVpnApi(apiUrl, "/vpn/health", {
          target_url: String(message?.targetUrl || ""),
          timeout_ms: Number(message?.timeoutMs || 5000)
        });
        sendResponse({ ok: true, data });
      } catch (err) {
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
      return;
    }

    if (message?.type === "VPN_SWITCH_REQUEST") {
      try {
        const cfg = await getConfig();
        const apiUrl = String(message?.apiUrl || cfg?.vpnApiUrl || "http://127.0.0.1:8000").trim();
        const data = await requestVpnApi(apiUrl, "/vpn/switch", {
          reason: String(message?.reason || "queue_unhealthy"),
          current_queue: Number(message?.currentQueue || 0),
          source_url: String(message?.sourceUrl || ""),
          strategy: String(message?.strategy || "round_robin")
        });
        sendResponse({ ok: true, data });
      } catch (err) {
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
      return;
    }
  })();
  return true;
});
