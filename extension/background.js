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
      enabled: true,
      startedAt: Date.now()
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
        countryCode: "86",
        phoneNumber: ""
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
    }
  })();
  return true;
});
