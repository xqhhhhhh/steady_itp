const $ = (id) => document.getElementById(id);
const legacyAreaCodes = [];
const newAreaCodes = [];
const DEFAULT_OCR_API_URL = "https://api.nexuschat.top/ocr-api/ocr/file";
let currentOcrApiUrl = DEFAULT_OCR_API_URL;
let currentCountryCode = "86";
let currentPhoneNumber = "";

function isSupportedEventUrl(rawUrl) {
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

function normalizeScavengeLoopIntervalSec(raw) {
  return normalizeNumber(raw, 15, 3600, 600, true);
}

function normalizeScavengeLoopIntervalMin(raw) {
  return normalizeNumber(raw, 1, 120, 10, true);
}

function normalizeScavengeRoundMaxMin(raw) {
  return normalizeNumber(raw, 0, 180, 0, true);
}

function normalizeLegacyAreaTimingMs(raw, fallback = 1200) {
  return normalizeNumber(raw, 120, 5000, Number(fallback) || 1200, true);
}

function normalizeLegacyAreaRandomJitterMs(raw, fallback = 0) {
  return normalizeNumber(raw, 0, 1500, Number(fallback) || 0, true);
}

function normalizeLegacyAreaCode(raw) {
  const digits = String(raw || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  const clipped = digits.slice(-3);
  const n = Number(clipped);
  if (!Number.isFinite(n) || n < 0 || n > 999) return "";
  return String(n).padStart(3, "0");
}

function normalizeLegacyAreaCodes(raw) {
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

function getLegacyAreaCodes() {
  return legacyAreaCodes.slice();
}

function renderNewAreaCodeList() {
  const list = $("newAreaCodeList");
  if (!list) return;
  list.innerHTML = "";
  for (const code of newAreaCodes) {
    const item = document.createElement("span");
    item.className = "code-item";
    item.textContent = code;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "code-remove";
    removeBtn.textContent = "x";
    removeBtn.dataset.code = code;
    removeBtn.addEventListener("click", () => {
      const idx = newAreaCodes.indexOf(code);
      if (idx >= 0) {
        newAreaCodes.splice(idx, 1);
        renderNewAreaCodeList();
      }
    });

    item.appendChild(removeBtn);
    list.appendChild(item);
  }
}

function setNewAreaCodes(codes) {
  newAreaCodes.splice(0, newAreaCodes.length, ...normalizeLegacyAreaCodes(codes));
  renderNewAreaCodeList();
}

function getNewAreaCodes() {
  return newAreaCodes.slice();
}

function renderLegacyAreaCodeList() {
  const list = $("legacyAreaCodeList");
  if (!list) return;
  list.innerHTML = "";
  for (const code of legacyAreaCodes) {
    const item = document.createElement("span");
    item.className = "code-item";
    item.textContent = code;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "code-remove";
    removeBtn.textContent = "x";
    removeBtn.dataset.code = code;
    removeBtn.addEventListener("click", () => {
      const idx = legacyAreaCodes.indexOf(code);
      if (idx >= 0) {
        legacyAreaCodes.splice(idx, 1);
        renderLegacyAreaCodeList();
      }
    });

    item.appendChild(removeBtn);
    list.appendChild(item);
  }
}

function setLegacyAreaCodes(codes) {
  legacyAreaCodes.splice(0, legacyAreaCodes.length, ...normalizeLegacyAreaCodes(codes));
  renderLegacyAreaCodeList();
}

function syncLegacyAreaCustomVisibility() {
  const mode = $("legacyAreaOrderMode").value === "custom" ? "custom" : "default";
  $("legacyAreaCustomWrap").classList.toggle("hidden", mode !== "custom");
}

function syncNewAreaCustomVisibility() {
  const mode = $("newAreaOrderMode").value === "custom" ? "custom" : "default";
  $("newAreaCustomWrap").classList.toggle("hidden", mode !== "custom");
}

function getSelectedRunMode() {
  return $("runModeScavenge").checked ? "scavenge" : "timed";
}

function setRunMode(mode) {
  const isScavenge = mode === "scavenge";
  $("runModeScavenge").checked = isScavenge;
  $("runModeTimed").checked = !isScavenge;
  syncRunModeVisibility();
}

function syncRunModeVisibility() {
  const isScavenge = getSelectedRunMode() === "scavenge";
  $("timedModeFields").classList.toggle("hidden", isScavenge);
  $("scavengeModeFields").classList.toggle("hidden", !isScavenge);
  $("vpnConfigWrap")?.classList.toggle("hidden", isScavenge);
  syncVpnApiVisibility();
}

function syncVpnApiVisibility() {
  const vpnApiUrlField = $("vpnApiUrlField");
  const vpnAutoSwitchEnabled = $("vpnAutoSwitchEnabled");
  if (!vpnApiUrlField || !vpnAutoSwitchEnabled) return;
  vpnApiUrlField.classList.toggle("hidden", !vpnAutoSwitchEnabled.checked);
}

function addLegacyAreaCodeFromInput() {
  const input = $("legacyAreaCodeInput");
  const code = normalizeLegacyAreaCode(input.value);
  input.value = "";
  if (!code) return;
  if (!legacyAreaCodes.includes(code)) {
    legacyAreaCodes.push(code);
    renderLegacyAreaCodeList();
  }
}

function addNewAreaCodeFromInput() {
  const input = $("newAreaCodeInput");
  const code = normalizeLegacyAreaCode(input.value);
  input.value = "";
  if (!code) return;
  if (!newAreaCodes.includes(code)) {
    newAreaCodes.push(code);
    renderNewAreaCodeList();
  }
  $("newAreaOrderMode").value = "custom";
  syncNewAreaCustomVisibility();
}

function getFormConfig() {
  const runMode = getSelectedRunMode();
  const preEnter = normalizeNumber($("preEnterSeconds").value || 30, 5, 300, 30, true);
  const criticalPre = normalizeNumber($("criticalPreSeconds").value || 2.5, 0.5, 10, 2.5, false);
  const criticalPost = normalizeNumber($("criticalPostSeconds").value || 8, 1, 20, 8, false);
  const criticalTick = normalizeNumber($("criticalTickMs").value || 65, 40, 180, 65, true);
  const reserveClickInterval = normalizeNumber(
    $("reserveClickIntervalMs").value || 65,
    40,
    1000,
    65,
    true
  );
  const reserveClickBurstCount = normalizeNumber(
    $("reserveClickBurstCount").value || 1,
    1,
    5,
    1,
    true
  );
  const reserveClickStartMode =
    $("reserveClickStartMode").value === "always" ? "always" : "edge_once";
  const newCodes = getNewAreaCodes();
  return {
    eventUrl: $("eventUrl").value.trim(),
    saleStartTime: $("saleStartTime").value.trim(),
    preEnterSeconds: preEnter,
    criticalPreSeconds: criticalPre,
    criticalPostSeconds: criticalPost,
    criticalTickMs: criticalTick,
    reserveClickIntervalMs: reserveClickInterval,
    reserveClickBurstCount,
    reserveClickStartMode,
    scavengeLoopEnabled: runMode === "scavenge",
    scavengeLoopIntervalSec:
      normalizeScavengeLoopIntervalMin($("scavengeLoopIntervalMin").value || 10) * 60,
    scavengeRoundMaxSec:
      normalizeScavengeRoundMaxMin($("scavengeRoundMaxMin").value || 0) * 60,
    quantity: Number($("quantity").value || 1),
    dateMonth: $("dateMonth").value.trim(),
    dateDay: $("dateDay").value.trim(),
    dateTime: $("dateTime").value.trim(),
    newAreaOrderMode:
      $("newAreaOrderMode").value === "custom" || newCodes.length ? "custom" : "default",
    newAreaCustomCodes: newCodes,
    legacyAreaOrderMode: $("legacyAreaOrderMode").value === "custom" ? "custom" : "default",
    legacyAreaCustomCodes: getLegacyAreaCodes(),
    legacyAreaSwitchIntervalMs: normalizeLegacyAreaTimingMs(
      $("legacyAreaSwitchIntervalMs").value || 1200,
      1200
    ),
    legacyAreaSettleMs: normalizeLegacyAreaTimingMs($("legacyAreaSettleMs").value || 1200, 1200),
    legacyAreaRandomJitterMs: normalizeLegacyAreaRandomJitterMs(
      $("legacyAreaRandomJitterMs").value || 0,
      0
    ),
    countryCode: String(currentCountryCode || "86").trim(),
    phoneNumber: String(currentPhoneNumber || "").trim(),
    ocrApiUrl: normalizeOcrApiUrl(currentOcrApiUrl),
    ocrActivationCode: $("ocrActivationCode").value.trim(),
    vpnApiUrl: $("vpnApiUrl").value.trim(),
    vpnAutoSwitchEnabled: runMode === "scavenge" ? false : $("vpnAutoSwitchEnabled").checked,
    queueVpnNotifyEnabled: $("queueVpnNotifyEnabled").checked,
    dingTalkWebhookUrl: $("dingTalkWebhookUrl").value.trim(),
    dingTalkSecret: $("dingTalkSecret").value.trim(),
    fullFlowEnabled: false
  };
}

function setStatus(text) {
  $("status").textContent = text;
}

function renderOcrLicenseStatus(config) {
  const el = $("ocrLicenseStatus");
  const bar = $("licenseBar");
  const codeInput = $("ocrActivationCode");
  const activateBtn = $("activateOcrBtn");
  if (!el || !bar || !codeInput || !activateBtn) return;
  const expiresAt = Number(config?.ocrLicenseExpiresAt || 0);
  const isActivated = expiresAt > Date.now();

  bar.classList.toggle("activated", isActivated);
  el.classList.toggle("activated", isActivated);
  codeInput.disabled = isActivated;
  activateBtn.disabled = isActivated;
  activateBtn.textContent = isActivated ? "已激活" : "激活";

  if (isActivated) {
    el.textContent = "已激活";
    return;
  }

  if (String(config?.ocrActivationCode || "").trim()) {
    el.textContent = "待激活";
    return;
  }

  el.textContent = "未激活";
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
  $("reserveClickIntervalMs").value = String(
    normalizeNumber(config.reserveClickIntervalMs ?? 65, 40, 1000, 65, true)
  );
  $("reserveClickBurstCount").value = String(
    normalizeNumber(config.reserveClickBurstCount ?? 1, 1, 5, 1, true)
  );
  $("reserveClickStartMode").value =
    String(config.reserveClickStartMode || "").trim() === "always"
      ? "always"
      : "edge_once";
  setRunMode(config.scavengeLoopEnabled === true ? "scavenge" : "timed");
  $("scavengeLoopIntervalMin").value = String(
    normalizeScavengeLoopIntervalMin(
      normalizeScavengeLoopIntervalSec(config.scavengeLoopIntervalSec ?? 600) / 60
    )
  );
  $("scavengeRoundMaxMin").value = String(
    normalizeScavengeRoundMaxMin(Number(config.scavengeRoundMaxSec || 0) / 60)
  );
  if (config.quantity) $("quantity").value = config.quantity;
  applySelectValue("dateMonth", config.dateMonth, normalizeMonthValue);
  applySelectValue("dateDay", config.dateDay, normalizeDayValue);
  applySelectValue("dateTime", config.dateTime, (v) => String(v || "").trim());
  $("newAreaOrderMode").value = config.newAreaOrderMode === "custom" ? "custom" : "default";
  setNewAreaCodes(config.newAreaCustomCodes || []);
  $("legacyAreaOrderMode").value = config.legacyAreaOrderMode === "custom" ? "custom" : "default";
  setLegacyAreaCodes(config.legacyAreaCustomCodes || []);
  syncNewAreaCustomVisibility();
  $("legacyAreaSwitchIntervalMs").value = String(
    normalizeLegacyAreaTimingMs(config.legacyAreaSwitchIntervalMs ?? 1200, 1200)
  );
  $("legacyAreaSettleMs").value = String(
    normalizeLegacyAreaTimingMs(config.legacyAreaSettleMs ?? 1200, 1200)
  );
  $("legacyAreaRandomJitterMs").value = String(
    normalizeLegacyAreaRandomJitterMs(config.legacyAreaRandomJitterMs ?? 0, 0)
  );
  syncLegacyAreaCustomVisibility();
  currentCountryCode = String(config.countryCode || currentCountryCode || "86").trim() || "86";
  currentPhoneNumber = String(config.phoneNumber || currentPhoneNumber || "").trim();
  currentOcrApiUrl = normalizeOcrApiUrl(config.ocrApiUrl || currentOcrApiUrl || DEFAULT_OCR_API_URL);
  if (typeof config.ocrActivationCode === "string") {
    $("ocrActivationCode").value = config.ocrActivationCode;
  }
  renderOcrLicenseStatus(config);
  if (config.vpnApiUrl) $("vpnApiUrl").value = config.vpnApiUrl;
  $("vpnAutoSwitchEnabled").checked = config.vpnAutoSwitchEnabled !== false;
  $("queueVpnNotifyEnabled").checked = config.queueVpnNotifyEnabled !== false;
  syncVpnApiVisibility();
  if (config.dingTalkWebhookUrl) $("dingTalkWebhookUrl").value = config.dingTalkWebhookUrl;
  if (config.dingTalkSecret) $("dingTalkSecret").value = config.dingTalkSecret;
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
    if (!isSupportedEventUrl(config.eventUrl)) {
      setStatus("URL 必须是 world.nol.com / tickets.interpark.com / gpoticket.globalinterpark.com");
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
    if (!isSupportedEventUrl(config.eventUrl)) {
      setStatus("URL 必须是 world.nol.com / tickets.interpark.com / gpoticket.globalinterpark.com");
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

$("activateOcrBtn").addEventListener("click", async () => {
  const btn = $("activateOcrBtn");
  try {
    const apiUrl = normalizeOcrApiUrl(currentOcrApiUrl || DEFAULT_OCR_API_URL);
    const activationCode = $("ocrActivationCode").value.trim();
    if (!activationCode) {
      setStatus("请输入激活码");
      return;
    }
    setStatus("激活中...");
    if (btn) btn.disabled = true;
    const resp = await chrome.runtime.sendMessage({
      type: "ACTIVATE_OCR_LICENSE",
      payload: {
        ocrApiUrl: apiUrl,
        ocrActivationCode: activationCode
      }
    });
    if (!resp) {
      throw new Error("未收到后台响应，请重载扩展后重试");
    }
    if (!resp?.ok) {
      setStatus(`激活失败: ${resp?.error || "unknown"}`);
      return;
    }
    setStatus("激活成功");
    await loadState();
  } catch (err) {
    setStatus(`激活异常: ${String(err?.message || err)}`);
  } finally {
    if (btn && btn.textContent !== "已激活") {
      btn.disabled = false;
    }
  }
});

$("legacyAreaOrderMode").addEventListener("change", () => {
  syncLegacyAreaCustomVisibility();
});

$("newAreaOrderMode").addEventListener("change", () => {
  syncNewAreaCustomVisibility();
});

$("runModeTimed").addEventListener("change", () => {
  syncRunModeVisibility();
});

$("runModeScavenge").addEventListener("change", () => {
  syncRunModeVisibility();
});

$("vpnAutoSwitchEnabled").addEventListener("change", () => {
  syncVpnApiVisibility();
});

$("legacyAreaCodeInput").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addLegacyAreaCodeFromInput();
});

$("newAreaCodeInput").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addNewAreaCodeFromInput();
});

loadState();
