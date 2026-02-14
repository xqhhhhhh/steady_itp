const $ = (id) => document.getElementById(id);

function getFormConfig() {
  return {
    eventUrl: $("eventUrl").value.trim(),
    quantity: Number($("quantity").value || 2),
    countryCode: ($("countryCode").value || "86").trim(),
    phoneNumber: $("phoneNumber").value.trim()
  };
}

function setStatus(text) {
  $("status").textContent = text;
}

async function loadState() {
  const response = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  const config = response?.config || {};
  if (config.eventUrl) $("eventUrl").value = config.eventUrl;
  if (config.quantity) $("quantity").value = config.quantity;
  if (config.countryCode) $("countryCode").value = config.countryCode;
  if (config.phoneNumber) $("phoneNumber").value = config.phoneNumber;
  const base = config.enabled ? "运行中" : "未启动";
  const ready = response?.contentReady;
  const lastLog = response?.lastLog;
  if (ready?.host) {
    setStatus(`${base} | content: ${ready.host}`);
    return;
  }
  if (lastLog?.text) {
    setStatus(`${base} | ${lastLog.text}`);
    return;
  }
  setStatus(base);
}

$("startBtn").addEventListener("click", async () => {
  try {
    const config = getFormConfig();
    if (!config.eventUrl.startsWith("https://world.nol.com/")) {
      setStatus("URL 必须是 world.nol.com");
      return;
    }
    await chrome.runtime.sendMessage({ type: "START_BOT", config });
    setStatus("已启动，正在执行流程");
  } catch (err) {
    setStatus(`启动失败: ${String(err?.message || err)}`);
  }
});

$("stopBtn").addEventListener("click", async () => {
  try {
    await chrome.runtime.sendMessage({ type: "STOP_BOT" });
    setStatus("已停止");
  } catch (err) {
    setStatus(`停止失败: ${String(err?.message || err)}`);
  }
});

$("diagBtn").addEventListener("click", async () => {
  try {
    const result = await chrome.runtime.sendMessage({ type: "PING_ACTIVE_TAB_BOT" });
    if (!result?.ok) {
      setStatus(`诊断失败: ${result?.error || "未知错误"}`);
      return;
    }
    const enabled = result?.response?.enabled ? "enabled" : "disabled";
    const host = result?.response?.host || "unknown";
    setStatus(`已连接 content-script (${host}, ${enabled})`);
  } catch (err) {
    setStatus(`诊断异常: ${String(err?.message || err)}`);
  }
});

loadState();
