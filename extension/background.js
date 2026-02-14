const STORAGE_KEY = "nolBotConfig";
const pendingKickTabs = new Set();

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function saveConfig(config) {
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...config,
      dateMonth: String(config?.dateMonth || "").trim(),
      dateDay: String(config?.dateDay || "").trim(),
      dateTime: String(config?.dateTime || "").trim(),
      ocrApiUrl: String(config?.ocrApiUrl || "http://127.0.0.1:8000/ocr/file").trim(),
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
      quantity: Number(config?.quantity || current.quantity || 2),
      dateMonth: String(config?.dateMonth || "").trim(),
      dateDay: String(config?.dateDay || "").trim(),
      dateTime: String(config?.dateTime || "").trim(),
      countryCode: String(config?.countryCode || current.countryCode || "86").trim(),
      phoneNumber: String(config?.phoneNumber || "").trim(),
      ocrApiUrl: String(
        config?.ocrApiUrl || current.ocrApiUrl || "http://127.0.0.1:8000/ocr/file"
      ).trim(),
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

chrome.runtime.onInstalled.addListener(async () => {
  const all = await chrome.storage.local.get(STORAGE_KEY);
  if (!all[STORAGE_KEY]) {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        enabled: false,
        eventUrl: "",
        quantity: 2,
        dateMonth: "",
        dateDay: "",
        dateTime: "",
        countryCode: "86",
        phoneNumber: "",
        ocrApiUrl: "http://127.0.0.1:8000/ocr/file"
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "START_BOT") {
      const config = message.config || {};
      await saveConfig(config);
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
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "STOP_BOT") {
      await disableConfig();
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
  })();
  return true;
});
