const $ = (id) => document.getElementById(id);

function addOption(select, value, label) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  select.appendChild(opt);
}

function buildDateSelectOptions() {
  const month = $("dateMonth");
  const day = $("dateDay");
  const time = $("dateTime");

  month.innerHTML = "";
  day.innerHTML = "";
  time.innerHTML = "";

  addOption(month, "", "不指定");
  for (let i = 1; i <= 12; i += 1) {
    const v = String(i).padStart(2, "0");
    addOption(month, v, `${v} 月`);
  }

  addOption(day, "", "不指定");
  for (let i = 1; i <= 31; i += 1) {
    const v = String(i).padStart(2, "0");
    addOption(day, v, `${v} 日`);
  }

  addOption(time, "", "不指定");
  for (let h = 0; h < 24; h += 1) {
    for (const m of [0, 30]) {
      const mm = String(m).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      const h12raw = h % 12 || 12;
      const label = `${h12raw}:${mm} ${ampm}`;
      addOption(time, label, label);
    }
  }
}

function normalizeMonthValue(raw) {
  const nums = String(raw || "").match(/\d+/g);
  if (!nums?.length) return "";
  const month = Number(nums[nums.length - 1]);
  if (!Number.isFinite(month) || month < 1 || month > 12) return "";
  return String(month).padStart(2, "0");
}

function normalizeDayValue(raw) {
  const day = Number(String(raw || "").trim());
  if (!Number.isFinite(day) || day < 1 || day > 31) return "";
  return String(day).padStart(2, "0");
}

function applySelectValue(id, value, transform = (v) => v) {
  const select = $(id);
  const normalized = transform(value);
  if (!normalized) {
    select.value = "";
    return;
  }
  const exists = Array.from(select.options).some((opt) => opt.value === normalized);
  if (exists) {
    select.value = normalized;
    return;
  }
  addOption(select, normalized, normalized);
  select.value = normalized;
}

function normalizeNumber(raw, min, max, fallback, integer = false) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const clamped = Math.min(max, Math.max(min, n));
  return integer ? Math.round(clamped) : Math.round(clamped * 10) / 10;
}

function getFormConfig() {
  const preEnter = normalizeNumber($("preEnterSeconds").value || 30, 5, 300, 30, true);
  const criticalPre = normalizeNumber($("criticalPreSeconds").value || 2.5, 0.5, 10, 2.5, false);
  const criticalPost = normalizeNumber($("criticalPostSeconds").value || 8, 1, 20, 8, false);
  const criticalTick = normalizeNumber($("criticalTickMs").value || 65, 40, 180, 65, true);
  return {
    eventUrl: $("eventUrl").value.trim(),
    saleStartTime: $("saleStartTime").value.trim(),
    preEnterSeconds: preEnter,
    criticalPreSeconds: criticalPre,
    criticalPostSeconds: criticalPost,
    criticalTickMs: criticalTick,
    quantity: Number($("quantity").value || 2),
    dateMonth: $("dateMonth").value.trim(),
    dateDay: $("dateDay").value.trim(),
    dateTime: $("dateTime").value.trim(),
    countryCode: ($("countryCode").value || "86").trim(),
    phoneNumber: $("phoneNumber").value.trim(),
    ocrApiUrl: $("ocrApiUrl").value.trim(),
    vpnApiUrl: $("vpnApiUrl").value.trim(),
    vpnAutoSwitchEnabled: $("vpnAutoSwitchEnabled").checked,
    dingTalkWebhookUrl: $("dingTalkWebhookUrl").value.trim(),
    dingTalkSecret: $("dingTalkSecret").value.trim(),
    fullFlowEnabled: $("fullFlowEnabled").checked
  };
}

function setStatus(text) {
  $("status").textContent = text;
}

async function loadState() {
  const response = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  const config = response?.config || {};
  buildDateSelectOptions();
  if (config.eventUrl) $("eventUrl").value = config.eventUrl;
  if (config.saleStartTime) $("saleStartTime").value = String(config.saleStartTime).trim();
  if (config.preEnterSeconds) $("preEnterSeconds").value = config.preEnterSeconds;
  $("criticalPreSeconds").value = String(
    normalizeNumber(config.criticalPreSeconds ?? 2.5, 0.5, 10, 2.5, false)
  );
  $("criticalPostSeconds").value = String(
    normalizeNumber(config.criticalPostSeconds ?? 8, 1, 20, 8, false)
  );
  $("criticalTickMs").value = String(
    normalizeNumber(config.criticalTickMs ?? 65, 40, 180, 65, true)
  );
  if (config.quantity) $("quantity").value = config.quantity;
  applySelectValue("dateMonth", config.dateMonth, normalizeMonthValue);
  applySelectValue("dateDay", config.dateDay, normalizeDayValue);
  applySelectValue("dateTime", config.dateTime, (v) => String(v || "").trim());
  if (config.countryCode) $("countryCode").value = config.countryCode;
  if (config.phoneNumber) $("phoneNumber").value = config.phoneNumber;
  if (config.ocrApiUrl) $("ocrApiUrl").value = config.ocrApiUrl;
  if (config.vpnApiUrl) $("vpnApiUrl").value = config.vpnApiUrl;
  $("vpnAutoSwitchEnabled").checked = config.vpnAutoSwitchEnabled !== false;
  if (config.dingTalkWebhookUrl) $("dingTalkWebhookUrl").value = config.dingTalkWebhookUrl;
  if (config.dingTalkSecret) $("dingTalkSecret").value = config.dingTalkSecret;
  $("fullFlowEnabled").checked = config.fullFlowEnabled !== false;
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
    if (config.saleStartTime && Number.isNaN(new Date(config.saleStartTime).getTime())) {
      setStatus("开抢时间格式无效");
      return;
    }
    const resp = await chrome.runtime.sendMessage({ type: "START_BOT", config });
    if (resp?.scheduled) {
      const at = resp.preEnterAt ? new Date(resp.preEnterAt).toLocaleString() : "T-30s";
      setStatus(`已启动，定时进场: ${at}`);
      return;
    }
    setStatus("已启动，正在执行流程");
  } catch (err) {
    setStatus(`启动失败: ${String(err?.message || err)}`);
  }
});

$("saveBtn").addEventListener("click", async () => {
  try {
    const config = getFormConfig();
    if (!config.eventUrl.startsWith("https://world.nol.com/")) {
      setStatus("URL 必须是 world.nol.com");
      return;
    }
    if (config.saleStartTime && Number.isNaN(new Date(config.saleStartTime).getTime())) {
      setStatus("开抢时间格式无效");
      return;
    }
    await chrome.runtime.sendMessage({ type: "SAVE_CONFIG", config });
    setStatus("配置已保存");
  } catch (err) {
    setStatus(`保存失败: ${String(err?.message || err)}`);
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
