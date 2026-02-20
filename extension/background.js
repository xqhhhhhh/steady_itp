const STORAGE_KEY = "nolBotConfig";
const pendingKickTabs = new Set();
const PRE_ENTER_ALARM = "nolBotPreEnterAlarm";
const DING_NOTIFY_SENT_KEY = "nolBotDingNotifySent";
const DING_DEDUP_TTL_MS = 5 * 60 * 1000;
const DEFAULT_OCR_API_URL = "https://api.nexuschat.top/ocr-api/ocr/file";
const OCR_DEVICE_ID_SYNC_KEY = "nolBotOcrDeviceId";
const OCR_DEVICE_ID_RE = /^[A-Za-z0-9._:-]{8,128}$/;

function normalizeOcrApiUrl(raw, fallback = DEFAULT_OCR_API_URL) {
  const candidate = String(raw || "").trim();
  const fb = String(fallback || DEFAULT_OCR_API_URL).trim();
  if (!candidate) return fb;
  try {
    const u = new URL(candidate);
    const host = String(u.hostname || "").toLowerCase();
    const isLocalHost =
      host === "127.0.0.1" || host === "localhost" || host === "::1" || host.endsWith(".local");
    if (isLocalHost) return fb;
    return u.toString();
  } catch (_) {
    return fb;
  }
}

function isSupportedTicketUrl(rawUrl = "") {
  try {
    const url = new URL(String(rawUrl || "").trim());
    if (url.protocol !== "https:") return false;
    const host = String(url.host || "").toLowerCase();
    return (
      host === "world.nol.com" ||
      host === "tickets.interpark.com" ||
      host === "gpoticket.globalinterpark.com"
    );
  } catch (_) {
    return false;
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function saveConfig(config) {
  const current = await getConfig();
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...current,
      ...config,
      saleStartTime: String(config?.saleStartTime || "").trim(),
      preEnterSeconds: normalizePreEnterSeconds(config?.preEnterSeconds, 30),
      criticalPreSeconds: normalizeCriticalSeconds(config?.criticalPreSeconds, 2.5, 0.5, 10),
      criticalPostSeconds: normalizeCriticalSeconds(config?.criticalPostSeconds, 8, 1, 20),
      criticalTickMs: normalizeCriticalTickMs(config?.criticalTickMs, 65),
      scavengeLoopEnabled: config?.scavengeLoopEnabled === true,
      scavengeLoopIntervalSec: normalizeScavengeLoopIntervalSec(
        config?.scavengeLoopIntervalSec,
        600
      ),
      scavengeRoundMaxSec: normalizeScavengeRoundMaxSec(
        config?.scavengeRoundMaxSec,
        0
      ),
      dateMonth: String(config?.dateMonth || "").trim(),
      dateDay: String(config?.dateDay || "").trim(),
      dateTime: String(config?.dateTime || "").trim(),
      legacyAreaOrderMode: normalizeLegacyAreaOrderMode(config?.legacyAreaOrderMode, "default"),
      legacyAreaCustomCodes: normalizeLegacyAreaCustomCodes(config?.legacyAreaCustomCodes || []),
      legacyAreaSwitchIntervalMs: normalizeLegacyAreaTimingMs(
        config?.legacyAreaSwitchIntervalMs,
        1200
      ),
      legacyAreaSettleMs: normalizeLegacyAreaTimingMs(config?.legacyAreaSettleMs, 1200),
      legacyAreaRandomJitterMs: normalizeLegacyAreaRandomJitterMs(
        config?.legacyAreaRandomJitterMs,
        0
      ),
      fullFlowEnabled: config?.fullFlowEnabled !== false,
      ocrApiUrl: normalizeOcrApiUrl(config?.ocrApiUrl, DEFAULT_OCR_API_URL),
      ocrActivationCode: String(config?.ocrActivationCode || current?.ocrActivationCode || "").trim(),
      ocrApiToken: String(config?.ocrApiToken || current?.ocrApiToken || "").trim(),
      ocrDeviceId: String(current?.ocrDeviceId || "").trim(),
      ocrAccessToken: String(current?.ocrAccessToken || "").trim(),
      ocrAccessTokenExpiresAt: Number(current?.ocrAccessTokenExpiresAt || 0),
      ocrLicenseExpiresAt: Number(current?.ocrLicenseExpiresAt || 0),
      ocrLicenseActivatedAt: Number(current?.ocrLicenseActivatedAt || 0),
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
      scavengeLoopEnabled:
        typeof config?.scavengeLoopEnabled === "boolean"
          ? config.scavengeLoopEnabled
          : current.scavengeLoopEnabled === true,
      scavengeLoopIntervalSec: normalizeScavengeLoopIntervalSec(
        config?.scavengeLoopIntervalSec,
        current.scavengeLoopIntervalSec || 600
      ),
      scavengeRoundMaxSec: normalizeScavengeRoundMaxSec(
        config?.scavengeRoundMaxSec,
        current.scavengeRoundMaxSec || 0
      ),
      quantity: Number(config?.quantity || current.quantity || 1),
      dateMonth: String(config?.dateMonth || "").trim(),
      dateDay: String(config?.dateDay || "").trim(),
      dateTime: String(config?.dateTime || "").trim(),
      legacyAreaOrderMode: normalizeLegacyAreaOrderMode(
        config?.legacyAreaOrderMode,
        current.legacyAreaOrderMode || "default"
      ),
      legacyAreaCustomCodes: normalizeLegacyAreaCustomCodes(
        config?.legacyAreaCustomCodes || current.legacyAreaCustomCodes || []
      ),
      legacyAreaSwitchIntervalMs: normalizeLegacyAreaTimingMs(
        config?.legacyAreaSwitchIntervalMs,
        current.legacyAreaSwitchIntervalMs || 1200
      ),
      legacyAreaSettleMs: normalizeLegacyAreaTimingMs(
        config?.legacyAreaSettleMs,
        current.legacyAreaSettleMs || 1200
      ),
      legacyAreaRandomJitterMs: normalizeLegacyAreaRandomJitterMs(
        config?.legacyAreaRandomJitterMs,
        current.legacyAreaRandomJitterMs || 0
      ),
      fullFlowEnabled:
        typeof config?.fullFlowEnabled === "boolean"
          ? config.fullFlowEnabled
          : current.fullFlowEnabled !== false,
      countryCode: String(config?.countryCode || current.countryCode || "86").trim(),
      phoneNumber: String(config?.phoneNumber || "").trim(),
      ocrApiUrl: normalizeOcrApiUrl(
        config?.ocrApiUrl || current.ocrApiUrl,
        DEFAULT_OCR_API_URL
      ),
      ocrActivationCode: String(
        config?.ocrActivationCode || current.ocrActivationCode || ""
      ).trim(),
      ocrApiToken: String(config?.ocrApiToken || current.ocrApiToken || "").trim(),
      ocrDeviceId: String(current?.ocrDeviceId || "").trim(),
      ocrAccessToken: String(current?.ocrAccessToken || "").trim(),
      ocrAccessTokenExpiresAt: Number(current?.ocrAccessTokenExpiresAt || 0),
      ocrLicenseExpiresAt: Number(current?.ocrLicenseExpiresAt || 0),
      ocrLicenseActivatedAt: Number(current?.ocrLicenseActivatedAt || 0),
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

function normalizeScavengeLoopIntervalSec(raw, fallback = 600) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(3600, Math.max(15, Number(fallback) || 600));
  return Math.min(3600, Math.max(15, Math.round(n)));
}

function normalizeScavengeRoundMaxSec(raw, fallback = 0) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(10800, Math.max(0, Number(fallback) || 0));
  return Math.min(10800, Math.max(0, Math.round(n)));
}

function normalizeLegacyAreaOrderMode(raw, fallback = "default") {
  const mode = String(raw || fallback || "default").trim().toLowerCase();
  return mode === "custom" ? "custom" : "default";
}

function normalizeLegacyAreaCode(raw) {
  const digits = String(raw || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  const clipped = digits.slice(-3);
  const n = Number(clipped);
  if (!Number.isFinite(n) || n < 0 || n > 999) return "";
  return String(n).padStart(3, "0");
}

function normalizeLegacyAreaCustomCodes(raw) {
  const values = Array.isArray(raw) ? raw : String(raw || "").split(/[,\s]+/);
  const seen = new Set();
  const out = [];
  for (const item of values) {
    const code = normalizeLegacyAreaCode(item);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

function normalizeLegacyAreaTimingMs(raw, fallback = 1200) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(5000, Math.max(120, Number(fallback) || 1200));
  return Math.min(5000, Math.max(120, Math.round(n)));
}

function normalizeLegacyAreaRandomJitterMs(raw, fallback = 0) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(1500, Math.max(0, Number(fallback) || 0));
  return Math.min(1500, Math.max(0, Math.round(n)));
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

function makeDeviceId() {
  try {
    if (crypto?.randomUUID) return `dev_${crypto.randomUUID()}`;
  } catch (_) {}
  const raw = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `dev_${raw}`;
}

function normalizeDeviceId(raw) {
  const did = String(raw || "").trim();
  if (!OCR_DEVICE_ID_RE.test(did)) return "";
  return did;
}

function makeStableRuntimeDeviceId() {
  const runtimeId = String(chrome?.runtime?.id || "").trim();
  if (!runtimeId) return "";
  const did = `dev_${runtimeId}`;
  return normalizeDeviceId(did);
}

async function getSyncedOcrDeviceId() {
  try {
    const all = await chrome.storage.sync.get(OCR_DEVICE_ID_SYNC_KEY);
    return normalizeDeviceId(all?.[OCR_DEVICE_ID_SYNC_KEY] || "");
  } catch (_) {
    return "";
  }
}

async function setSyncedOcrDeviceId(deviceId) {
  const did = normalizeDeviceId(deviceId);
  if (!did) return;
  try {
    await chrome.storage.sync.set({ [OCR_DEVICE_ID_SYNC_KEY]: did });
  } catch (_) {}
}

async function getOrCreateOcrDeviceId(preferred = "") {
  const fromPreferred = normalizeDeviceId(preferred);
  if (fromPreferred) {
    await setSyncedOcrDeviceId(fromPreferred);
    return fromPreferred;
  }

  const fromSync = await getSyncedOcrDeviceId();
  if (fromSync) return fromSync;

  const stable = makeStableRuntimeDeviceId();
  if (stable) {
    await setSyncedOcrDeviceId(stable);
    return stable;
  }

  const fallback = normalizeDeviceId(makeDeviceId()) || makeDeviceId();
  await setSyncedOcrDeviceId(fallback);
  return fallback;
}

function toMs(raw, fallback = 0) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function buildOcrServiceBaseUrl(apiUrl) {
  const u = new URL(String(apiUrl || "").trim());
  let path = String(u.pathname || "/").replace(/\/+$/g, "");
  path = path.replace(/\/ocr\/(file|base64)$/i, "");
  if (!path) path = "/";
  if (!path.endsWith("/")) path += "/";
  return `${u.origin}${path}`;
}

function buildOcrServiceUrl(apiUrl, path) {
  const base = buildOcrServiceBaseUrl(apiUrl);
  return new URL(String(path || "").replace(/^\/+/, ""), base).toString();
}

async function requestOcrLicenseActivate(apiUrl, activationCode, deviceId) {
  const code = String(activationCode || "").trim();
  const did = String(deviceId || "").trim();
  if (!code) throw new Error("OCR activation code is empty");
  if (!did) throw new Error("OCR device id is empty");

  const url = buildOcrServiceUrl(apiUrl, "license/activate");
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      activation_code: code,
      device_id: did,
      client: "nol-extension"
    })
  });

  const rawText = await resp.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (_) {}

  if (!resp.ok) {
    const detail = String(data?.detail || rawText || `LICENSE HTTP ${resp.status}`).trim();
    const err = new Error(detail || `LICENSE HTTP ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  return data;
}

async function ensureOcrAccessToken(cfg, apiUrl, forceRefresh = false) {
  const staticToken = String(cfg?.ocrApiToken || "").trim();
  if (staticToken) {
    return { token: staticToken, cfg, source: "manual_token" };
  }

  const now = Date.now();
  const cachedToken = String(cfg?.ocrAccessToken || "").trim();
  const cachedExpiry = toMs(cfg?.ocrAccessTokenExpiresAt, 0);
  if (!forceRefresh && cachedToken && cachedExpiry - now > 30 * 1000) {
    return { token: cachedToken, cfg, source: "cached_session" };
  }

  const activationCode = String(cfg?.ocrActivationCode || "").trim();
  if (!activationCode) {
    throw new Error("OCR 未激活，请先输入激活码并点击激活");
  }

  const deviceId = await getOrCreateOcrDeviceId(cfg?.ocrDeviceId);
  const activated = await requestOcrLicenseActivate(apiUrl, activationCode, deviceId);
  const accessToken = String(activated?.access_token || "").trim();
  const accessTokenExpiresAt = toMs(activated?.access_token_expires_at, 0);
  const licenseExpiresAt = toMs(activated?.license_expires_at, 0);
  const licenseActivatedAt = toMs(activated?.activated_at, 0);
  const boundDeviceId = String(activated?.device_id || deviceId).trim();

  if (!accessToken || !accessTokenExpiresAt) {
    throw new Error("激活响应无有效会话令牌");
  }

  const nextCfg = {
    ...cfg,
    ocrDeviceId: boundDeviceId,
    ocrAccessToken: accessToken,
    ocrAccessTokenExpiresAt: accessTokenExpiresAt,
    ocrLicenseExpiresAt: licenseExpiresAt,
    ocrLicenseActivatedAt: licenseActivatedAt
  };
  await setSyncedOcrDeviceId(boundDeviceId);
  await chrome.storage.local.set({ [STORAGE_KEY]: nextCfg });
  return { token: accessToken, cfg: nextCfg, source: "license_activate", activated };
}

async function requestOcrCode(apiUrl, bytes, ocrApiToken = "") {
  const safeUrl = String(apiUrl || "").trim();
  if (!safeUrl) throw new Error("OCR apiUrl is empty");
  if (!Array.isArray(bytes) || bytes.length === 0) throw new Error("OCR image bytes are empty");

  const u8 = new Uint8Array(bytes);
  const formData = new FormData();
  formData.append("file", new Blob([u8], { type: "image/png" }), "captcha.png");

  const headers = {};
  const token = String(ocrApiToken || "").trim();
  const host = (() => {
    try {
      return new URL(safeUrl).hostname;
    } catch (_) {
      return "";
    }
  })();
  const isLocalHost =
    host === "127.0.0.1" || host === "localhost" || host === "::1" || host.endsWith(".local");
  if (!token && !isLocalHost) {
    throw new Error("OCR token is empty");
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-OCR-Token"] = token;
  }

  const resp = await fetch(safeUrl, {
    method: "POST",
    headers,
    body: formData
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    let detail = "";
    try {
      const parsed = text ? JSON.parse(text) : {};
      detail = String(parsed?.detail || "").trim();
    } catch (_) {}
    const err = new Error(detail || `OCR HTTP ${resp.status}`);
    err.status = resp.status;
    throw err;
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

async function runLegacyScriptInMainWorld(tabId, frameId, script = "", label = "") {
  if (!tabId) return { ok: false, error: "no_tab_id" };
  const execOnTarget = async (target, scope) => {
    const results = await chrome.scripting.executeScript({
      target,
      world: "MAIN",
      func: (rawScript, rawLabel, rawScope) => {
        const out = {
          ok: false,
          label: String(rawLabel || ""),
          scope: String(rawScope || ""),
          frameHref: String(location.href || ""),
          script: String(rawScript || ""),
          normalizedScript: "",
          mode: "",
          fnBlockSeatUpdateDefined: false,
          fnHost: "",
          fnChangeMonthDefined: false,
          fnChangeMonthHost: "",
          directMonthArg: "",
          directArgs: [],
          beforeSeatSrc: "",
          afterSeatSrc: "",
          error: ""
        };
        try {
          let code = String(rawScript || "").trim();
          code = code.replace(/^javascript:\s*/i, "").trim();
          code = code.replace(/\breturn\s+false\b\s*;?/gi, "").trim();
          out.normalizedScript = code;
          out.fnBlockSeatUpdateDefined = typeof window.fnBlockSeatUpdate === "function";
          out.beforeSeatSrc = String(document.querySelector("#ifrmSeat")?.getAttribute("src") || "");
          if (!code) {
            out.error = "empty_script";
            out.afterSeatSrc = out.beforeSeatSrc;
            return out;
          }

          const parseFnBlockArgs = (source) => {
            const m = String(source || "").match(
              /(?:window\.|parent\.|top\.)?fnblockseatupdate\s*\(([\s\S]*?)\)\s*;?/i
            );
            if (!m) return null;
            const body = String(m[1] || "");
            const quoted = [];
            const qre = /'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"/g;
            let qm;
            while ((qm = qre.exec(body)) && quoted.length < 3) {
              const raw = qm[1] != null ? qm[1] : qm[2];
              quoted.push(
                String(raw || "")
                  .replace(/\\'/g, "'")
                  .replace(/\\"/g, '"')
              );
            }
            if (quoted.length >= 3) return quoted.slice(0, 3);
            const split = body
              .split(",")
              .map((x) => String(x || "").trim().replace(/^['"]|['"]$/g, ""))
              .filter((x) => x.length || x === "");
            if (split.length >= 3) return split.slice(0, 3);
            return null;
          };

          const resolveFnBlockSeatUpdate = () => {
            const refs = [
              { host: "window", ref: window },
              { host: "parent", ref: window.parent },
              { host: "top", ref: window.top }
            ];
            for (const item of refs) {
              try {
                if (typeof item.ref?.fnBlockSeatUpdate === "function") {
                  return {
                    host: item.host,
                    fn: item.ref.fnBlockSeatUpdate,
                    ctx: item.ref
                  };
                }
              } catch (_) {}
            }
            return null;
          };
          const parseFnChangeMonthArg = (source) => {
            const m = String(source || "").match(
              /(?:window\.|parent\.|top\.)?fnchangemonth\s*\(\s*['"]?(\d{6})['"]?\s*\)\s*;?/i
            );
            return m ? String(m[1] || "") : "";
          };
          const resolveFnChangeMonth = () => {
            const refs = [
              { host: "window", ref: window },
              { host: "parent", ref: window.parent },
              { host: "top", ref: window.top }
            ];
            for (const item of refs) {
              try {
                if (typeof item.ref?.fnChangeMonth === "function") {
                  return {
                    host: item.host,
                    fn: item.ref.fnChangeMonth,
                    ctx: item.ref
                  };
                }
              } catch (_) {}
            }
            return null;
          };

          const hasFnCall = /fnblockseatupdate\s*\(/i.test(code);
          const directArgs = hasFnCall ? parseFnBlockArgs(code) : null;
          const resolvedFn = resolveFnBlockSeatUpdate();
          if (resolvedFn) {
            out.fnBlockSeatUpdateDefined = true;
            out.fnHost = resolvedFn.host;
          }
          const directMonthArg = parseFnChangeMonthArg(code);
          const resolvedMonthFn = resolveFnChangeMonth();
          if (resolvedMonthFn) {
            out.fnChangeMonthDefined = true;
            out.fnChangeMonthHost = resolvedMonthFn.host;
          }

          if (resolvedFn && directArgs?.length === 3) {
            resolvedFn.fn.call(resolvedFn.ctx, directArgs[0], directArgs[1], directArgs[2]);
            out.ok = true;
            out.mode = "direct_fn";
            out.directArgs = directArgs;
          } else if (resolvedMonthFn && /^\d{6}$/.test(directMonthArg)) {
            resolvedMonthFn.fn.call(resolvedMonthFn.ctx, directMonthArg);
            out.ok = true;
            out.mode = "direct_month_fn";
            out.directMonthArg = directMonthArg;
          } else {
            try {
              window.eval(code);
              out.ok = true;
              out.mode = "eval";
            } catch (_) {
              try {
                const fn = window.Function(code);
                fn.call(window);
                out.ok = true;
                out.mode = "function";
              } catch (err2) {
                out.error = String(err2?.message || err2);
              }
            }
          }
          out.afterSeatSrc = String(document.querySelector("#ifrmSeat")?.getAttribute("src") || "");
          return out;
        } catch (err) {
          out.error = String(err?.message || err);
          out.afterSeatSrc = String(document.querySelector("#ifrmSeat")?.getAttribute("src") || "");
          return out;
        }
      },
      args: [String(script || ""), String(label || ""), String(scope || "")]
    });
    return Array.isArray(results) ? results : [];
  };

  const pickBest = (rows = []) => {
    const mapped = rows
      .map((row) => ({
        frameId: Number.isInteger(row?.frameId) ? row.frameId : null,
        result: row?.result || null
      }))
      .filter((x) => x.result);
    const direct = mapped.find(
      (x) => x.result.ok && (x.result.mode === "direct_fn" || x.result.mode === "direct_month_fn")
    );
    if (direct) return { ...direct.result, frameId: direct.frameId };
    const srcChanged = mapped.find(
      (x) =>
        x.result.ok &&
        String(x.result.beforeSeatSrc || "") !== String(x.result.afterSeatSrc || "")
    );
    if (srcChanged) return { ...srcChanged.result, frameId: srcChanged.frameId };
    const success = mapped.find((x) => x.result.ok);
    if (success) return { ...success.result, frameId: success.frameId };
    const hasFn = mapped.find((x) => x.result.fnBlockSeatUpdateDefined);
    if (hasFn) return { ...hasFn.result, frameId: hasFn.frameId };
    const first = mapped[0];
    return first ? { ...first.result, frameId: first.frameId } : null;
  };

  try {
    const primaryTarget = Number.isInteger(frameId) ? { tabId, frameIds: [frameId] } : { tabId };
    const primaryRows = await execOnTarget(primaryTarget, "sender_frame");
    const primaryBest = pickBest(primaryRows);
    if (primaryBest?.ok) return primaryBest;

    const allRows = await execOnTarget({ tabId, allFrames: true }, "all_frames");
    const allBest = pickBest(allRows);
    if (allBest) return allBest;

    return primaryBest || { ok: false, error: "no_result" };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function runLegacySelectSeatInMainWorld(tabId, frameId, payload = {}) {
  if (!tabId) return { ok: false, error: "no_tab_id" };
  const execOnTarget = async (target, scope, performAction = true) => {
    const results = await chrome.scripting.executeScript({
      target,
      world: "MAIN",
      func: async (rawPayload, rawScope, doAction) => {
        const data = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
        const out = {
          ok: false,
          scope: String(rawScope || ""),
          frameHref: String(location.href || ""),
          frameSeatNodeCount: 0,
          matched: false,
          mode: "",
          selectSeatDefined: false,
          selectSeatHost: "",
          actionAttempted: false,
          beforeSelected: 0,
          afterSelected: 0,
          beforeClass: "",
          afterClass: "",
          stillAvailable: null,
          title: String(data?.title || ""),
          onclick: String(data?.onclick || ""),
          areaCode: String(data?.areaCode || ""),
          error: ""
        };
        try {
          const normalize = (x) => String(x || "").replace(/\s+/g, " ").trim().toLowerCase();
          const getClass = (el) => {
            if (!el) return "";
            if (typeof el.className === "string") return el.className;
            if (typeof el.className?.baseVal === "string") return el.className.baseVal;
            return String(el.className || "");
          };
          const isDashedSelected = (el) => {
            if (!el) return false;
            const inlineStyle = normalize(el.getAttribute("style") || "");
            if (inlineStyle.includes("border") && inlineStyle.includes("dashed")) return true;
            try {
              const st = window.getComputedStyle(el);
              const borderStyle = normalize(st.borderStyle || "");
              const borderWidth = Number.parseFloat(String(st.borderWidth || "0"));
              if (borderStyle.includes("dashed") && Number.isFinite(borderWidth) && borderWidth > 0.4) {
                return true;
              }
            } catch (_) {}
            return false;
          };
          const isAvailableSeat = (el) => {
            if (!el) return false;
            const tag = String(el.tagName || "").toLowerCase();
            if (tag !== "span") return false;
            const cls = normalize(getClass(el));
            const value = normalize(el.getAttribute("value") || "");
            const onclick = normalize(el.getAttribute("onclick") || "");
            if (cls.includes("seatr") || cls.includes("seatb") || cls.includes("sold")) return false;
            if (isDashedSelected(el)) return false;
            if (cls.includes("seatn") || value === "n") return true;
            if (onclick.includes("selectseat")) return true;
            return false;
          };
          const selectedCount = () => {
            const nodes = Array.from(
              document.querySelectorAll("span#Seats, span[name='Seats'], span[class*='Seat']")
            );
            return nodes.filter((el) => {
              const cls = normalize(getClass(el));
              if (!cls.includes("seat")) return false;
              if (isDashedSelected(el)) return true;
              if (cls.includes("seatn") || cls.includes("seatr") || cls.includes("seatb")) return false;
              return true;
            }).length;
          };
          const seatNodes = Array.from(
            document.querySelectorAll(
              "span#Seats, span[name='Seats'], span[class*='Seat'], span[onclick*='SelectSeat'], span[onclick*='selectseat'], span[value='N'], span[value='n']"
            )
          );
          out.frameSeatNodeCount = seatNodes.length;
          const availableNodes = seatNodes.filter((el) => isAvailableSeat(el));
          const resolveSelectSeat = () => {
            const refs = [
              { host: "window", ref: window },
              { host: "parent", ref: window.parent },
              { host: "top", ref: window.top }
            ];
            for (const item of refs) {
              try {
                if (typeof item.ref?.SelectSeat === "function") {
                  return {
                    host: item.host,
                    fn: item.ref.SelectSeat,
                    ctx: item.ref
                  };
                }
              } catch (_) {}
            }
            return null;
          };
          const selectSeatRef = resolveSelectSeat();
          if (selectSeatRef) {
            out.selectSeatDefined = true;
            out.selectSeatHost = selectSeatRef.host;
          }

          const wantedOnclick = String(data?.onclick || "").trim();
          const wantedTitle = String(data?.title || "").trim();
          const wantedAreaCode = String(data?.areaCode || "").trim();
          const areaToken = wantedAreaCode ? `${wantedAreaCode}구역` : "";

          let targetEl =
            (wantedOnclick
              ? availableNodes.find((el) => String(el.getAttribute("onclick") || "").trim() === wantedOnclick)
              : null) ||
            (wantedTitle
              ? availableNodes.find((el) => String(el.getAttribute("title") || "").trim() === wantedTitle)
              : null) ||
            (areaToken
              ? availableNodes.find((el) =>
                  String(el.getAttribute("title") || "").replace(/\s+/g, "").includes(areaToken)
                )
              : null) ||
            availableNodes[0] ||
            null;

          if (!targetEl) {
            out.error = "target_not_found";
            return out;
          }
          out.matched = true;
          if (!doAction) {
            out.mode = "probe";
            return out;
          }
          out.beforeSelected = selectedCount();
          out.beforeClass = getClass(targetEl);

          const inline = String(targetEl.getAttribute("onclick") || "").trim();
          if (!inline) {
            out.error = "empty_onclick";
            return out;
          }

          let invoked = false;
          try {
            const fn = window.Function(inline);
            fn.call(targetEl);
            invoked = true;
            out.mode = "onclick_function";
          } catch (err) {
            out.error = String(err?.message || err);
          }
          out.actionAttempted = invoked;

          // Allow the legacy page to apply seat selection state before evaluating success.
          if (invoked) {
            await new Promise((resolve) => setTimeout(resolve, 120));
          }
          out.afterSelected = selectedCount();
          out.afterClass = getClass(targetEl);
          out.stillAvailable = isAvailableSeat(targetEl);
          out.ok =
            Boolean(invoked) &&
            (out.afterSelected > out.beforeSelected ||
              isDashedSelected(targetEl) ||
              out.stillAvailable === false ||
              normalize(out.beforeClass) !== normalize(out.afterClass));
          if (!out.ok && !out.error) {
            out.error = "seat_not_changed";
          }
          return out;
        } catch (err) {
          out.error = String(err?.message || err);
          return out;
        }
      },
      args: [payload || {}, String(scope || ""), Boolean(performAction)]
    });
    return Array.isArray(results) ? results : [];
  };

  const pickBest = (rows = []) => {
    const mapped = rows
      .map((row) => ({
        frameId: Number.isInteger(row?.frameId) ? row.frameId : null,
        result: row?.result || null
      }))
      .filter((x) => x.result);
    const success = mapped.find((x) => x.result.ok);
    if (success) return { ...success.result, frameId: success.frameId };
    const matched = mapped.find((x) => x.result.matched);
    if (matched) return { ...matched.result, frameId: matched.frameId };
    const withSeats = mapped
      .filter((x) => Number(x.result.frameSeatNodeCount || 0) > 0)
      .sort((a, b) => Number(b.result.frameSeatNodeCount || 0) - Number(a.result.frameSeatNodeCount || 0))[0];
    if (withSeats) return { ...withSeats.result, frameId: withSeats.frameId };
    const first = mapped[0];
    return first ? { ...first.result, frameId: first.frameId } : null;
  };

  try {
    let senderProbeBest = null;
    if (Number.isInteger(frameId)) {
      const senderProbeRows = await execOnTarget(
        { tabId, frameIds: [frameId] },
        "sender_probe",
        false
      );
      senderProbeBest = pickBest(senderProbeRows);
      if (senderProbeBest?.matched && Number.isInteger(senderProbeBest.frameId)) {
        const senderActionRows = await execOnTarget(
          { tabId, frameIds: [senderProbeBest.frameId] },
          "sender_winner",
          true
        );
        const senderActionBest = pickBest(senderActionRows);
        if (senderActionBest) return senderActionBest;
      }
    }

    const probeRows = await execOnTarget({ tabId, allFrames: true }, "all_frames_probe", false);
    const probeBest = pickBest(probeRows);

    if (Number.isInteger(probeBest?.frameId)) {
      const winnerRows = await execOnTarget(
        { tabId, frameIds: [probeBest.frameId] },
        "all_frames_winner",
        true
      );
      const winnerBest = pickBest(winnerRows);
      if (winnerBest) return winnerBest;
    }

    return senderProbeBest || probeBest || { ok: false, error: "no_result" };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const all = await chrome.storage.local.get(STORAGE_KEY);
  if (!all[STORAGE_KEY]) {
    const initialOcrDeviceId = await getOrCreateOcrDeviceId("");
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        enabled: false,
        eventUrl: "",
        quantity: 1,
        dateMonth: "",
        dateDay: "",
        dateTime: "",
        legacyAreaOrderMode: "default",
        legacyAreaCustomCodes: [],
        legacyAreaSwitchIntervalMs: 1200,
        legacyAreaSettleMs: 1200,
        legacyAreaRandomJitterMs: 0,
        fullFlowEnabled: true,
        saleStartTime: "",
        preEnterSeconds: 30,
        criticalPreSeconds: 2.5,
        criticalPostSeconds: 8,
        criticalTickMs: 65,
        scavengeLoopEnabled: false,
        scavengeLoopIntervalSec: 600,
        scavengeRoundMaxSec: 0,
        countryCode: "86",
        phoneNumber: "",
        ocrApiUrl: DEFAULT_OCR_API_URL,
        ocrActivationCode: "",
        ocrApiToken: "",
        ocrDeviceId: initialOcrDeviceId,
        ocrAccessToken: "",
        ocrAccessTokenExpiresAt: 0,
        ocrLicenseExpiresAt: 0,
        ocrLicenseActivatedAt: 0,
        vpnApiUrl: "http://127.0.0.1:8000",
        vpnAutoSwitchEnabled: true,
        dingTalkWebhookUrl: "",
        dingTalkSecret: ""
      }
    });
    return;
  }

  const current = all[STORAGE_KEY] || {};
  const normalizedOcrApiUrl = normalizeOcrApiUrl(current?.ocrApiUrl, DEFAULT_OCR_API_URL);
  const normalizedOcrDeviceId = await getOrCreateOcrDeviceId(current?.ocrDeviceId);
  if (
    String(current?.ocrApiUrl || "").trim() !== normalizedOcrApiUrl ||
    String(current?.ocrDeviceId || "").trim() !== normalizedOcrDeviceId
  ) {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        ...current,
        ocrApiUrl: normalizedOcrApiUrl,
        ocrDeviceId: normalizedOcrDeviceId
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
  if (!isSupportedTicketUrl(tab?.url || "")) {
    pendingKickTabs.delete(tabId);
    return;
  }
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

    if (message?.type === "ACTIVATE_OCR_LICENSE") {
      try {
        const payload = message?.payload && typeof message.payload === "object" ? message.payload : {};
        const current = await getConfig();
        const ocrApiUrl = normalizeOcrApiUrl(payload?.ocrApiUrl || current?.ocrApiUrl);
        const ocrActivationCode = String(
          payload?.ocrActivationCode || current?.ocrActivationCode || ""
        ).trim();
        if (!ocrApiUrl) {
          sendResponse({ ok: false, error: "OCR 服务地址为空" });
          return;
        }
        if (!ocrActivationCode) {
          sendResponse({ ok: false, error: "激活码为空" });
          return;
        }

        const ensuredDeviceId = await getOrCreateOcrDeviceId(current?.ocrDeviceId);
        const mergedCfg = {
          ...current,
          ocrApiUrl,
          ocrActivationCode,
          ocrDeviceId: ensuredDeviceId
        };
        await chrome.storage.local.set({ [STORAGE_KEY]: mergedCfg });
        const ensured = await ensureOcrAccessToken(mergedCfg, ocrApiUrl, true);
        sendResponse({
          ok: true,
          data: {
            deviceId: String(ensured?.cfg?.ocrDeviceId || "").trim(),
            licenseExpiresAt: toMs(ensured?.cfg?.ocrLicenseExpiresAt, 0),
            accessTokenExpiresAt: toMs(ensured?.cfg?.ocrAccessTokenExpiresAt, 0),
            source: ensured?.source || "",
            message: "激活成功"
          }
        });
      } catch (err) {
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
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

    if (message?.type === "LEGACY_RUN_SCRIPT_MAIN") {
      const tabId = _sender?.tab?.id;
      const frameId = _sender?.frameId;
      const result = await runLegacyScriptInMainWorld(
        tabId,
        Number.isInteger(frameId) ? frameId : undefined,
        String(message?.script || ""),
        String(message?.label || "")
      );
      sendResponse({ ok: Boolean(result?.ok), result });
      return;
    }

    if (message?.type === "LEGACY_SELECT_SEAT_MAIN") {
      const tabId = _sender?.tab?.id;
      const frameId = _sender?.frameId;
      const result = await runLegacySelectSeatInMainWorld(
        tabId,
        Number.isInteger(frameId) ? frameId : undefined,
        message?.payload && typeof message.payload === "object" ? message.payload : {}
      );
      sendResponse({ ok: Boolean(result?.ok), result });
      return;
    }

    if (message?.type === "OCR_REQUEST") {
      try {
        let cfg = await getConfig();
        await chrome.storage.local.set({
          nolBotLastLog: {
            text: `OCR_REQUEST bytes=${Array.isArray(message.bytes) ? message.bytes.length : 0}`,
            ts: Date.now()
          }
        });
        const apiUrl = normalizeOcrApiUrl(message?.apiUrl || cfg?.ocrApiUrl);

        let authToken = String(message?.ocrApiToken || cfg?.ocrApiToken || "").trim();
        if (!authToken) {
          const ensured = await ensureOcrAccessToken(cfg, apiUrl, false);
          cfg = ensured?.cfg || cfg;
          authToken = String(ensured?.token || "").trim();
        }

        let result;
        try {
          result = await requestOcrCode(apiUrl, message.bytes, authToken);
        } catch (err) {
          const shouldRetry =
            Number(err?.status || 0) === 401 &&
            !String(cfg?.ocrApiToken || "").trim() &&
            Boolean(String(cfg?.ocrActivationCode || "").trim());
          if (!shouldRetry) throw err;
          const refreshed = await ensureOcrAccessToken(cfg, apiUrl, true);
          result = await requestOcrCode(
            apiUrl,
            message.bytes,
            String(refreshed?.token || "").trim()
          );
        }
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
