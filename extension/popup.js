const $ = (id) => document.getElementById(id);
const legacyAreaCodes = [];
const newAreaCodes = [];
const queueNotifyThresholds = [];
const DEFAULT_OCR_API_URL = "https://api.nexuschat.top/ocr-api/ocr/file";
const DEFAULT_QUEUE_NOTIFY_THRESHOLDS = [1000, 100, 10];
const DEFAULT_LEGACY_AREA_SWITCH_INTERVAL_MS = 5000;
const DEFAULT_LEGACY_AREA_SETTLE_MS = 200;
const DEFAULT_LEGACY_AREA_RANDOM_JITTER_MS = 100;
const POPUP_LANG_KEY = "nolBotPopupUiLanguage";
const I18N = {
  "zh-CN": {
    appTitle: "NOL 抢票助手",
    "language.label": "界面语言",
    ocrActivationPlaceholder: "请输入激活码",
    activate: "激活",
    activated: "已激活",
    "license.inactive": "未激活",
    "license.pending": "待激活",
    "license.expired": "已失效",
    "license.active": "已激活",
    "license.inactiveHint": "请输入并激活有效激活码后显示主要功能。",
    "license.pendingHint": "当前激活码尚未生效，激活成功后显示主要功能。",
    "license.expiredHint": "当前激活码已失效，请重新激活后继续使用。",
    "section.mode": "模式设置",
    modeHintExclusive: "抢票与捡漏必须二选一",
    runModeGroupLabel: "运行模式",
    "runMode.timed": "按时抢票模式",
    "runMode.scavenge": "捡漏模式",
    eventUrl: "演唱会 URL",
    timedOnly: "按时抢票专用",
    saleStartTime: "开抢时间",
    preEnterSeconds: "提前进场秒数",
    criticalPreSeconds: "临界前置秒数",
    criticalPostSeconds: "临界后置秒数",
    criticalTickMs: "临界轮询毫秒",
    reserveClickIntervalMs: "预定点击间隔(ms)",
    reserveClickStartMode: "预定触发策略",
    "reserveMode.edgeOnce": "卡点出现时只点一次",
    "reserveMode.always": "到点后持续点击",
    reserveClickBurstCount: "每轮预定点击次数",
    scavengeOnly: "捡漏专用",
    scavengeLoopIntervalMin: "捡漏重跑间隔（分钟）(建议10分钟以上)",
    scavengeRoundMaxMin: "单次循环时长上限（分钟，0=不限制，建议1-3分钟，过长请求过多可能短暂封号）",
    "section.general": "通用配置",
    quantity: "票数",
    dateMonth: "日期-月 (可选)",
    dateDay: "日期-日 (可选)",
    dateTime: "日期-时间 (可选)",
    newAreaOrderMode: "新版区域查询顺序",
    "order.default": "默认顺序",
    "order.custom": "自定义顺序",
    newAreaCustom: "新版自定义区域 (三位数字，回车添加)",
    newAreaPlaceholder: "例如 001",
    newAreaHint: "将按输入顺序优先查询这些新版区域",
    legacyAreaOrderMode: "旧版区域查询顺序",
    legacyAreaCustom: "自定义区域 (三位数字，逗号分隔，回车批量添加)",
    legacyAreaPlaceholder: "例如 205,206，207",
    legacyAreaHint: "支持中英文逗号分隔，按回车后将按输入顺序逐个查找这些区域",
    legacyAreaSpeed: "旧版区域切换速度",
    legacyCompetitionUiEnabled: "旧版比赛场界面",
    legacyAreaSwitchIntervalMs: "区域切换间隔(ms)",
    legacyAreaSettleMs: "区域切换后等待(ms)",
    legacyAreaRandomJitterMs: "随机抖动(±ms)",
    legacyAreaRandomHint: "最终延迟 = 基础值 ± 随机抖动",
    notifyProvider: "消息提醒渠道",
    "notifyProvider.dingtalk": "钉钉",
    "notifyProvider.telegram": "Telegram",
    notifyCategories: "消息推送开关",
    queueNotifyEnabled: "排队提醒",
    cloudflareNotifyEnabled: "Cloudflare 人机验证提醒",
    captchaNotifyEnabled: "验证码消息提醒",
    successNotifyEnabled: "进入价格页/锁座成功提醒",
    dingTalkWebhookUrl: "钉钉 Webhook (可选)",
    dingTalkSecret: "钉钉加签 Secret (可选)",
    telegramBotToken: "Telegram Bot Token",
    telegramChatId: "Telegram Chat ID",
    queueNotifyThresholds: "排队提醒阈值",
    queueNotifyThresholdsPlaceholder: "例如 1000，回车添加",
    queueNotifyThresholdsHint: "输入阈值后按回车添加；当排队剩余小于等于任一阈值时发送提醒。",
    captchaAssist: "验证码辅助",
    captchaAutoFillEnabled: "数字验证码自动填写",
    captchaAutoFillHint: "检测到图片验证码时自动识别并填写；关闭后可手动输入，脚本会等待你完成后继续。",
    sliderAutoDragEnabled: "滑块验证码自动拖动",
    sliderAutoDragHint: "检测到滑块时自动尝试拖动；若未通过，流程会暂停，手动完成后自动继续。",
    start: "开始",
    stop: "停止",
    save: "保存配置",
    "status.base.running": "运行中",
    "status.base.stopped": "未启动",
    "status.contentReady": "{base} | 页面: {host}",
    "status.withLog": "{base} | {text}",
    "status.unsupportedUrl": "URL 必须是 world.nol.com / tickets.interpark.com / gpoticket.globalinterpark.com",
    "status.invalidSaleStartTime": "开抢时间格式无效",
    "status.startedScheduled": "已启动，定时进场: {at}",
    "status.startedRunning": "已启动，正在执行流程",
    "status.startFailed": "启动失败: {error}",
    "status.configSaved": "配置已保存",
    "status.configAutoSaved": "配置已自动保存",
    "status.saveFailed": "保存失败: {error}",
    "status.stopped": "已停止",
    "status.stopFailed": "停止失败: {error}",
    "status.enterActivationCode": "请输入激活码",
    "status.activating": "激活中...",
    "status.noResponse": "未收到后台响应，请重载扩展后重试",
    "status.activationFailed": "激活失败: {error}",
    "status.activationSuccess": "激活成功",
    "status.activationException": "激活异常: {error}",
    "status.initFailed": "初始化失败: {error}",
    unspecified: "不指定",
    monthLabel: ({ value }) => `${value} 月`,
    dayLabel: ({ value }) => `${value} 日`
  },
  en: {
    appTitle: "NOL Ticket Helper",
    "language.label": "UI Language",
    ocrActivationPlaceholder: "Enter activation code",
    activate: "Activate",
    activated: "Activated",
    "license.inactive": "Not activated",
    "license.pending": "Pending activation",
    "license.expired": "Expired",
    "license.active": "Activated",
    "license.inactiveHint": "Enter and activate a valid code to reveal the main features.",
    "license.pendingHint": "This activation code is not active yet. Main features appear after activation succeeds.",
    "license.expiredHint": "This activation code has expired. Reactivate to continue using the main features.",
    "section.mode": "Mode",
    modeHintExclusive: "Choose either timed mode or scavenger mode.",
    runModeGroupLabel: "Run mode",
    "runMode.timed": "Timed Ticket Rush",
    "runMode.scavenge": "Scavenger Mode",
    eventUrl: "Event URL",
    timedOnly: "Timed Mode",
    saleStartTime: "Sale start time",
    preEnterSeconds: "Pre-enter seconds",
    criticalPreSeconds: "Critical pre-window (s)",
    criticalPostSeconds: "Critical post-window (s)",
    criticalTickMs: "Critical polling (ms)",
    reserveClickIntervalMs: "Reserve click interval (ms)",
    reserveClickStartMode: "Reserve trigger mode",
    "reserveMode.edgeOnce": "Click once at the edge",
    "reserveMode.always": "Keep clicking after start",
    reserveClickBurstCount: "Clicks per burst",
    scavengeOnly: "Scavenger Settings",
    scavengeLoopIntervalMin: "Scavenge rerun interval (min, 10+ recommended)",
    scavengeRoundMaxMin: "Max single round (min, 0 = unlimited, 1-3 recommended)",
    "section.general": "General Settings",
    quantity: "Quantity",
    dateMonth: "Month (optional)",
    dateDay: "Day (optional)",
    dateTime: "Time (optional)",
    newAreaOrderMode: "New layout area order",
    "order.default": "Default order",
    "order.custom": "Custom order",
    newAreaCustom: "Custom new-layout areas (3 digits, press Enter)",
    newAreaPlaceholder: "e.g. 001",
    newAreaHint: "These new-layout areas will be checked in the order you enter them.",
    legacyAreaOrderMode: "Legacy layout area order",
    legacyAreaCustom: "Custom legacy areas (3 digits, comma-separated, press Enter)",
    legacyAreaPlaceholder: "e.g. 205,206,207",
    legacyAreaHint: "Use English or Chinese commas, then press Enter to add all areas in order.",
    legacyAreaSpeed: "Legacy Area Timing",
    legacyCompetitionUiEnabled: "Legacy stadium-style UI",
    legacyAreaSwitchIntervalMs: "Area switch interval (ms)",
    legacyAreaSettleMs: "Wait after switching (ms)",
    legacyAreaRandomJitterMs: "Random jitter (±ms)",
    legacyAreaRandomHint: "Final delay = base value ± random jitter",
    notifyProvider: "Notification channel",
    "notifyProvider.dingtalk": "DingTalk",
    "notifyProvider.telegram": "Telegram",
    notifyCategories: "Notification toggles",
    queueNotifyEnabled: "Queue alerts",
    cloudflareNotifyEnabled: "Cloudflare verification alerts",
    captchaNotifyEnabled: "Captcha alerts",
    successNotifyEnabled: "Price page / seat lock success alerts",
    dingTalkWebhookUrl: "DingTalk webhook (optional)",
    dingTalkSecret: "DingTalk signing secret (optional)",
    telegramBotToken: "Telegram Bot Token",
    telegramChatId: "Telegram Chat ID",
    queueNotifyThresholds: "Queue alert thresholds",
    queueNotifyThresholdsPlaceholder: "e.g. 1000, then press Enter",
    queueNotifyThresholdsHint: "Press Enter to add each threshold. A reminder is sent when the queue position falls to or below any threshold.",
    captchaAssist: "Captcha Assistance",
    captchaAutoFillEnabled: "Auto-fill image captcha",
    captchaAutoFillHint: "Automatically recognize and fill image captchas. Turn this off to enter the code manually while the bot waits.",
    sliderAutoDragEnabled: "Auto-drag slider captcha",
    sliderAutoDragHint: "When a slider captcha appears, the bot will try to drag it automatically. If verification still fails, the flow pauses and continues after manual completion.",
    start: "Start",
    stop: "Stop",
    save: "Save",
    "status.base.running": "Running",
    "status.base.stopped": "Idle",
    "status.contentReady": "{base} | page: {host}",
    "status.withLog": "{base} | {text}",
    "status.unsupportedUrl": "URL must be world.nol.com / tickets.interpark.com / gpoticket.globalinterpark.com",
    "status.invalidSaleStartTime": "Invalid sale start time",
    "status.startedScheduled": "Started, scheduled entry: {at}",
    "status.startedRunning": "Started, running the flow",
    "status.startFailed": "Start failed: {error}",
    "status.configSaved": "Configuration saved",
    "status.configAutoSaved": "Configuration auto-saved",
    "status.saveFailed": "Save failed: {error}",
    "status.stopped": "Stopped",
    "status.stopFailed": "Stop failed: {error}",
    "status.enterActivationCode": "Please enter an activation code",
    "status.activating": "Activating...",
    "status.noResponse": "No response from background. Reload the extension and try again.",
    "status.activationFailed": "Activation failed: {error}",
    "status.activationSuccess": "Activation succeeded",
    "status.activationException": "Activation error: {error}",
    "status.initFailed": "Initialization failed: {error}",
    unspecified: "Any",
    monthLabel: ({ value }) => `Month ${String(Number(value))}`,
    dayLabel: ({ value }) => `Day ${String(Number(value))}`
  }
};
let currentOcrApiUrl = DEFAULT_OCR_API_URL;
let currentCountryCode = "86";
let currentPhoneNumber = "";
let uiLanguage = resolveInitialLanguage();
let lastStatusState = { type: "key", key: "status.base.stopped", vars: {} };
let lastConfigSnapshot = null;
let autoSaveTimer = null;
let autoSaveInFlight = false;
let suppressAutoSave = false;

function resolveInitialLanguage() {
  try {
    const stored = String(localStorage.getItem(POPUP_LANG_KEY) || "").trim();
    if (stored === "zh-CN" || stored === "en") return stored;
  } catch (_) {}
  const browserLang = String(navigator.language || "").toLowerCase();
  return browserLang.startsWith("en") ? "en" : "zh-CN";
}

function renderTemplate(text, vars = {}) {
  return String(text || "").replace(/\{(\w+)\}/g, (_match, key) => String(vars?.[key] ?? ""));
}

function t(key, vars = {}) {
  const table = I18N[uiLanguage] || I18N["zh-CN"];
  const fallback = I18N["zh-CN"];
  const value = table?.[key] ?? fallback?.[key] ?? key;
  if (typeof value === "function") return value(vars);
  return renderTemplate(value, vars);
}

function isSliderAutoDragEnabled(config) {
  return config?.sliderAutoDragEnabled === true || config?.sliderAutoDragSecretEnabled === true;
}

function normalizeNotifyProvider(raw, fallback = "dingtalk") {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "telegram") return "telegram";
  if (value === "dingtalk") return "dingtalk";
  return fallback === "telegram" ? "telegram" : "dingtalk";
}

function normalizeQueueNotifyThresholds(raw, fallback = DEFAULT_QUEUE_NOTIFY_THRESHOLDS) {
  const values = Array.isArray(raw) ? raw : String(raw || "").split(/[,\s]+/);
  const seen = new Set();
  const out = [];
  for (const item of values) {
    const n = Number(String(item || "").trim());
    if (!Number.isFinite(n)) continue;
    const threshold = Math.min(999999, Math.max(1, Math.round(n)));
    if (seen.has(threshold)) continue;
    seen.add(threshold);
    out.push(threshold);
  }
  if (!out.length) return Array.isArray(fallback) ? fallback.slice() : DEFAULT_QUEUE_NOTIFY_THRESHOLDS.slice();
  out.sort((a, b) => b - a);
  return out;
}

function normalizeQueueNotifyThresholdValue(raw) {
  return normalizeQueueNotifyThresholds([raw], [])[0] || 0;
}

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

function applyStaticTranslations() {
  document.documentElement.lang = uiLanguage === "en" ? "en" : "zh-CN";
  document.title = t("appTitle");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    el.setAttribute("placeholder", t(key));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    if (!key) return;
    el.setAttribute("aria-label", t(key));
  });
}

function rerenderStatus() {
  if (lastStatusState.type === "key") {
    $("status").textContent = t(lastStatusState.key, lastStatusState.vars);
    return;
  }
  $("status").textContent = lastStatusState.text;
}

function setStatus(text) {
  lastStatusState = { type: "raw", text: String(text || "") };
  $("status").textContent = lastStatusState.text;
}

function setStatusKey(key, vars = {}) {
  lastStatusState = { type: "key", key, vars };
  $("status").textContent = t(key, vars);
}

function reapplyLocalizedSelectOptions() {
  const monthValue = $("dateMonth")?.value || "";
  const dayValue = $("dateDay")?.value || "";
  const timeValue = $("dateTime")?.value || "";
  buildDateSelectOptions();
  applySelectValue("dateMonth", monthValue, (v) => String(v || "").trim());
  applySelectValue("dateDay", dayValue, (v) => String(v || "").trim());
  applySelectValue("dateTime", timeValue, (v) => String(v || "").trim());
}

function applyLanguage() {
  applyStaticTranslations();
  reapplyLocalizedSelectOptions();
  rerenderStatus();
  renderOcrLicenseStatus(lastConfigSnapshot);
  syncLicensedContentVisibility(lastConfigSnapshot);
}

function buildDateSelectOptions() {
  const month = $("dateMonth");
  const day = $("dateDay");
  const time = $("dateTime");

  month.innerHTML = "";
  day.innerHTML = "";
  time.innerHTML = "";

  addOption(month, "", t("unspecified"));
  for (let i = 1; i <= 12; i += 1) {
    const v = String(i).padStart(2, "0");
    addOption(month, v, t("monthLabel", { value: v }));
  }

  addOption(day, "", t("unspecified"));
  for (let i = 1; i <= 31; i += 1) {
    const v = String(i).padStart(2, "0");
    addOption(day, v, t("dayLabel", { value: v }));
  }

  addOption(time, "", t("unspecified"));
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
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.max(120, Math.round(Number(fallback) || 1200));
  return Math.max(120, Math.round(n));
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

function syncNotifyProviderVisibility() {
  const provider = normalizeNotifyProvider($("notifyProvider")?.value, "dingtalk");
  $("dingTalkNotifyFields")?.classList.toggle("hidden", provider !== "dingtalk");
  $("telegramNotifyFields")?.classList.toggle("hidden", provider !== "telegram");
}

function getLegacyAreaCodes() {
  return legacyAreaCodes.slice();
}

function renderQueueNotifyThresholdList() {
  const list = $("queueNotifyThresholdList");
  if (!list) return;
  list.innerHTML = "";
  for (const threshold of queueNotifyThresholds) {
    const item = document.createElement("span");
    item.className = "code-item";
    item.textContent = String(threshold);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "code-remove";
    removeBtn.textContent = "x";
    removeBtn.dataset.threshold = String(threshold);
    removeBtn.addEventListener("click", () => {
      const idx = queueNotifyThresholds.indexOf(threshold);
      if (idx >= 0) {
        queueNotifyThresholds.splice(idx, 1);
        renderQueueNotifyThresholdList();
        scheduleAutoSave(0);
      }
    });

    item.appendChild(removeBtn);
    list.appendChild(item);
  }
}

function setQueueNotifyThresholds(values) {
  queueNotifyThresholds.splice(
    0,
    queueNotifyThresholds.length,
    ...normalizeQueueNotifyThresholds(values, DEFAULT_QUEUE_NOTIFY_THRESHOLDS)
  );
  renderQueueNotifyThresholdList();
}

function getQueueNotifyThresholds() {
  return queueNotifyThresholds.slice();
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
        scheduleAutoSave(0);
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
        scheduleAutoSave(0);
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
}

function addLegacyAreaCodeFromInput() {
  const input = $("legacyAreaCodeInput");
  const codes = normalizeLegacyAreaCodes(String(input.value || "").split(/[,\uff0c]+/));
  input.value = "";
  if (!codes.length) return;
  let changed = false;
  for (const code of codes) {
    if (legacyAreaCodes.includes(code)) continue;
    legacyAreaCodes.push(code);
    changed = true;
  }
  if (changed) {
    renderLegacyAreaCodeList();
    scheduleAutoSave(0);
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
  scheduleAutoSave(0);
}

function addQueueNotifyThresholdFromInput() {
  const input = $("queueNotifyThresholds");
  const values = normalizeQueueNotifyThresholds(input.value, []);
  input.value = "";
  if (!values.length) return;
  const next = normalizeQueueNotifyThresholds(
    [...queueNotifyThresholds, ...values],
    DEFAULT_QUEUE_NOTIFY_THRESHOLDS
  );
  queueNotifyThresholds.splice(0, queueNotifyThresholds.length, ...next);
  renderQueueNotifyThresholdList();
  scheduleAutoSave(0);
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
      normalizeScavengeRoundMaxMin($("scavengeRoundMaxMin").value || 8) * 60,
    quantity: Number($("quantity").value || 1),
    dateMonth: $("dateMonth").value.trim(),
    dateDay: $("dateDay").value.trim(),
    dateTime: $("dateTime").value.trim(),
    newAreaOrderMode:
      $("newAreaOrderMode").value === "custom" || newCodes.length ? "custom" : "default",
    newAreaCustomCodes: newCodes,
    legacyAreaOrderMode: $("legacyAreaOrderMode").value === "custom" ? "custom" : "default",
    legacyAreaCustomCodes: getLegacyAreaCodes(),
    legacyCompetitionUiEnabled: $("legacyCompetitionUiEnabled").checked,
    legacyAreaSwitchIntervalMs: normalizeLegacyAreaTimingMs(
      $("legacyAreaSwitchIntervalMs").value || DEFAULT_LEGACY_AREA_SWITCH_INTERVAL_MS,
      DEFAULT_LEGACY_AREA_SWITCH_INTERVAL_MS
    ),
    legacyAreaSettleMs: normalizeLegacyAreaTimingMs(
      $("legacyAreaSettleMs").value || DEFAULT_LEGACY_AREA_SETTLE_MS,
      DEFAULT_LEGACY_AREA_SETTLE_MS
    ),
    legacyAreaRandomJitterMs: normalizeLegacyAreaRandomJitterMs(
      $("legacyAreaRandomJitterMs").value || DEFAULT_LEGACY_AREA_RANDOM_JITTER_MS,
      DEFAULT_LEGACY_AREA_RANDOM_JITTER_MS
    ),
    countryCode: String(currentCountryCode || "86").trim(),
    phoneNumber: String(currentPhoneNumber || "").trim(),
    ocrApiUrl: normalizeOcrApiUrl(currentOcrApiUrl),
    ocrActivationCode: $("ocrActivationCode").value.trim(),
    captchaAutoFillEnabled: $("captchaAutoFillEnabled").checked,
    vpnApiUrl: "http://127.0.0.1:8000",
    sliderAutoDragSecretEnabled: $("sliderAutoDragEnabled").checked,
    vpnAutoSwitchEnabled: false,
    queueVpnNotifyEnabled: false,
    queueNotifyEnabled: $("queueNotifyEnabled").checked,
    cloudflareNotifyEnabled: $("cloudflareNotifyEnabled").checked,
    captchaNotifyEnabled: $("captchaNotifyEnabled").checked,
    successNotifyEnabled: $("successNotifyEnabled").checked,
    notifyProvider: normalizeNotifyProvider($("notifyProvider").value, "dingtalk"),
    dingTalkWebhookUrl: $("dingTalkWebhookUrl").value.trim(),
    dingTalkSecret: $("dingTalkSecret").value.trim(),
    telegramBotToken: $("telegramBotToken").value.trim(),
    telegramChatId: $("telegramChatId").value.trim(),
    queueNotifyThresholds: getQueueNotifyThresholds(),
    fullFlowEnabled: false
  };
}

async function persistCurrentConfig({ auto = false } = {}) {
  const config = getFormConfig();
  await chrome.runtime.sendMessage({ type: "SAVE_CONFIG", config });
  lastConfigSnapshot = {
    ...(lastConfigSnapshot || {}),
    ...config
  };
  setStatusKey(auto ? "status.configAutoSaved" : "status.configSaved");
}

function getLicenseState(config = null) {
  const expiresAt = Number(config?.ocrLicenseExpiresAt || 0);
  if (expiresAt > Date.now()) return "active";
  if (Number(config?.ocrLicenseActivatedAt || 0) > 0 || expiresAt > 0) return "expired";
  if (String(config?.ocrActivationCode || "").trim()) return "pending";
  return "inactive";
}

function isLicenseActive(config = null) {
  return getLicenseState(config) === "active";
}

function syncLicensedContentVisibility(config = null) {
  const licenseState = getLicenseState(config);
  const active = licenseState === "active";
  $("licensedContent")?.classList.toggle("hidden", !active);
  const note = $("licenseGateNotice");
  if (!note) return;
  note.classList.toggle("hidden", active);
  if (!active) {
    note.textContent = t(`license.${licenseState}Hint`);
  }
}

function scheduleAutoSave(delayMs = 280) {
  if (suppressAutoSave) return;
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = window.setTimeout(async () => {
    autoSaveTimer = null;
    if (autoSaveInFlight) return;
    autoSaveInFlight = true;
    try {
      await persistCurrentConfig({ auto: true });
    } catch (err) {
      setStatusKey("status.saveFailed", { error: String(err?.message || err) });
    } finally {
      autoSaveInFlight = false;
    }
  }, delayMs);
}

function renderOcrLicenseStatus(config = null) {
  const el = $("ocrLicenseStatus");
  const bar = $("licenseBar");
  const codeInput = $("ocrActivationCode");
  const activateBtn = $("activateOcrBtn");
  if (!el || !bar || !codeInput || !activateBtn) return;
  const licenseState = getLicenseState(config);
  const isActivated = licenseState === "active";

  bar.classList.toggle("activated", isActivated);
  el.classList.toggle("activated", isActivated);
  codeInput.disabled = isActivated;
  activateBtn.disabled = isActivated;
  activateBtn.textContent = isActivated ? t("activated") : t("activate");

  if (isActivated) {
    el.textContent = t("license.active");
    return;
  }

  if (licenseState === "expired") {
    el.textContent = t("license.expired");
    return;
  }

  if (licenseState === "pending") {
    el.textContent = t("license.pending");
    return;
  }

  el.textContent = t("license.inactive");
}

async function loadState() {
  const response = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  const config = response?.config || {};
  lastConfigSnapshot = config;
  suppressAutoSave = true;
  try {
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
      normalizeScavengeRoundMaxMin(Number(config.scavengeRoundMaxSec ?? 480) / 60)
    );
    if (config.quantity) $("quantity").value = config.quantity;
    applySelectValue("dateMonth", config.dateMonth, normalizeMonthValue);
    applySelectValue("dateDay", config.dateDay, normalizeDayValue);
    applySelectValue("dateTime", config.dateTime, (v) => String(v || "").trim());
    $("newAreaOrderMode").value = config.newAreaOrderMode === "custom" ? "custom" : "default";
    setNewAreaCodes(config.newAreaCustomCodes || []);
    $("legacyAreaOrderMode").value = config.legacyAreaOrderMode === "custom" ? "custom" : "default";
    setLegacyAreaCodes(config.legacyAreaCustomCodes || []);
    $("legacyCompetitionUiEnabled").checked = config.legacyCompetitionUiEnabled === true;
    syncNewAreaCustomVisibility();
    $("legacyAreaSwitchIntervalMs").value = String(
      normalizeLegacyAreaTimingMs(
        config.legacyAreaSwitchIntervalMs ?? DEFAULT_LEGACY_AREA_SWITCH_INTERVAL_MS,
        DEFAULT_LEGACY_AREA_SWITCH_INTERVAL_MS
      )
    );
    $("legacyAreaSettleMs").value = String(
      normalizeLegacyAreaTimingMs(
        config.legacyAreaSettleMs ?? DEFAULT_LEGACY_AREA_SETTLE_MS,
        DEFAULT_LEGACY_AREA_SETTLE_MS
      )
    );
    $("legacyAreaRandomJitterMs").value = String(
      normalizeLegacyAreaRandomJitterMs(
        config.legacyAreaRandomJitterMs ?? DEFAULT_LEGACY_AREA_RANDOM_JITTER_MS,
        DEFAULT_LEGACY_AREA_RANDOM_JITTER_MS
      )
    );
    syncLegacyAreaCustomVisibility();
    currentCountryCode = String(config.countryCode || currentCountryCode || "86").trim() || "86";
    currentPhoneNumber = String(config.phoneNumber || currentPhoneNumber || "").trim();
    currentOcrApiUrl = normalizeOcrApiUrl(
      config.ocrApiUrl || currentOcrApiUrl || DEFAULT_OCR_API_URL
    );
    if (typeof config.ocrActivationCode === "string") {
      $("ocrActivationCode").value = config.ocrActivationCode;
    }
    renderOcrLicenseStatus(config);
    syncLicensedContentVisibility(config);
    $("captchaAutoFillEnabled").checked = config.captchaAutoFillEnabled !== false;
    $("sliderAutoDragEnabled").checked = isSliderAutoDragEnabled(config);
    $("queueNotifyEnabled").checked = config.queueNotifyEnabled !== false;
    $("cloudflareNotifyEnabled").checked = config.cloudflareNotifyEnabled !== false;
    $("captchaNotifyEnabled").checked = config.captchaNotifyEnabled !== false;
    $("successNotifyEnabled").checked = config.successNotifyEnabled !== false;
    $("notifyProvider").value = normalizeNotifyProvider(config.notifyProvider, "dingtalk");
    $("dingTalkWebhookUrl").value = String(config.dingTalkWebhookUrl || "");
    $("dingTalkSecret").value = String(config.dingTalkSecret || "");
    $("telegramBotToken").value = String(config.telegramBotToken || "");
    $("telegramChatId").value = String(config.telegramChatId || "");
    $("queueNotifyThresholds").value = "";
    setQueueNotifyThresholds(config.queueNotifyThresholds || DEFAULT_QUEUE_NOTIFY_THRESHOLDS);
    syncNotifyProviderVisibility();
  } finally {
    suppressAutoSave = false;
  }
  const base = t(config.enabled ? "status.base.running" : "status.base.stopped");
  const ready = response?.contentReady;
  const lastLog = response?.lastLog;
  if (ready?.host) {
    setStatusKey("status.contentReady", { base, host: ready.host });
    return;
  }
  if (lastLog?.text) {
    setStatusKey("status.withLog", { base, text: lastLog.text });
    return;
  }
  setStatusKey(config.enabled ? "status.base.running" : "status.base.stopped");
}

function bindAutoSave(ids, events = ["change"]) {
  for (const id of ids) {
    const el = $(id);
    if (!el) continue;
    for (const eventName of events) {
      el.addEventListener(eventName, () => {
        scheduleAutoSave();
      });
    }
  }
}

$("startBtn").addEventListener("click", async () => {
  try {
    if (!isLicenseActive(lastConfigSnapshot)) return;
    const config = getFormConfig();
    if (!isSupportedEventUrl(config.eventUrl)) {
      setStatusKey("status.unsupportedUrl");
      return;
    }
    if (config.saleStartTime && Number.isNaN(new Date(config.saleStartTime).getTime())) {
      setStatusKey("status.invalidSaleStartTime");
      return;
    }
    const resp = await chrome.runtime.sendMessage({ type: "START_BOT", config });
    if (resp?.scheduled) {
      const at = resp.preEnterAt
        ? new Date(resp.preEnterAt).toLocaleString(uiLanguage === "en" ? "en-US" : "zh-CN")
        : "T-30s";
      setStatusKey("status.startedScheduled", { at });
      return;
    }
    setStatusKey("status.startedRunning");
  } catch (err) {
    setStatusKey("status.startFailed", { error: String(err?.message || err) });
  }
});

$("saveBtn").addEventListener("click", async () => {
  try {
    if (!isLicenseActive(lastConfigSnapshot)) return;
    const config = getFormConfig();
    if (!isSupportedEventUrl(config.eventUrl)) {
      setStatusKey("status.unsupportedUrl");
      return;
    }
    if (config.saleStartTime && Number.isNaN(new Date(config.saleStartTime).getTime())) {
      setStatusKey("status.invalidSaleStartTime");
      return;
    }
    await persistCurrentConfig({ auto: false });
  } catch (err) {
    setStatusKey("status.saveFailed", { error: String(err?.message || err) });
  }
});

$("stopBtn").addEventListener("click", async () => {
  try {
    await chrome.runtime.sendMessage({ type: "STOP_BOT" });
    setStatusKey("status.stopped");
  } catch (err) {
    setStatusKey("status.stopFailed", { error: String(err?.message || err) });
  }
});

$("activateOcrBtn").addEventListener("click", async () => {
  const btn = $("activateOcrBtn");
  try {
    const apiUrl = normalizeOcrApiUrl(currentOcrApiUrl || DEFAULT_OCR_API_URL);
    const activationCode = $("ocrActivationCode").value.trim();
    if (!activationCode) {
      setStatusKey("status.enterActivationCode");
      return;
    }
    setStatusKey("status.activating");
    if (btn) btn.disabled = true;
    const resp = await chrome.runtime.sendMessage({
      type: "ACTIVATE_OCR_LICENSE",
      payload: {
        ocrApiUrl: apiUrl,
        ocrActivationCode: activationCode
      }
    });
    if (!resp) {
      throw new Error(t("status.noResponse"));
    }
    if (!resp?.ok) {
      setStatusKey("status.activationFailed", { error: resp?.error || "unknown" });
      return;
    }
    setStatusKey("status.activationSuccess");
    await loadState();
  } catch (err) {
    setStatusKey("status.activationException", { error: String(err?.message || err) });
  } finally {
    if (btn && btn.textContent !== t("activated")) {
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

$("notifyProvider").addEventListener("change", () => {
  syncNotifyProviderVisibility();
  scheduleAutoSave(0);
});

$("runModeTimed").addEventListener("change", () => {
  syncRunModeVisibility();
  scheduleAutoSave(0);
});

$("runModeScavenge").addEventListener("change", () => {
  syncRunModeVisibility();
  scheduleAutoSave(0);
});

$("uiLanguage").addEventListener("change", (event) => {
  const next = String(event?.target?.value || "").trim();
  if (next !== "zh-CN" && next !== "en") return;
  uiLanguage = next;
  try {
    localStorage.setItem(POPUP_LANG_KEY, uiLanguage);
  } catch (_) {}
  applyLanguage();
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

$("queueNotifyThresholds").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addQueueNotifyThresholdFromInput();
});

$("uiLanguage").value = uiLanguage;
applyLanguage();
syncNotifyProviderVisibility();
bindAutoSave(
  [
    "eventUrl",
    "saleStartTime",
    "preEnterSeconds",
    "criticalPreSeconds",
    "criticalPostSeconds",
    "criticalTickMs",
    "reserveClickIntervalMs",
    "reserveClickBurstCount",
    "reserveClickStartMode",
    "scavengeLoopIntervalMin",
    "scavengeRoundMaxMin",
    "quantity",
    "dateMonth",
    "dateDay",
    "dateTime",
    "newAreaOrderMode",
    "legacyAreaOrderMode",
    "legacyCompetitionUiEnabled",
    "legacyAreaSwitchIntervalMs",
    "legacyAreaSettleMs",
    "legacyAreaRandomJitterMs",
    "notifyProvider",
    "queueNotifyEnabled",
    "cloudflareNotifyEnabled",
    "captchaNotifyEnabled",
    "successNotifyEnabled",
    "captchaAutoFillEnabled",
    "dingTalkWebhookUrl",
    "dingTalkSecret",
    "telegramBotToken",
    "telegramChatId",
    "sliderAutoDragEnabled",
    "ocrActivationCode"
  ],
  ["change", "input"]
);
loadState().catch((err) =>
  setStatusKey("status.initFailed", { error: String(err?.message || err) })
);
