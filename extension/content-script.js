const STORAGE_KEY = "nolBotConfig";
const EXIMBAY_ACTIVE_KEY = "nolBotEximbayActive";
const DEFAULT_OCR_API_URL = "https://api.nexuschat.top/ocr-api/ocr/file";

const state = {
  config: {
    enabled: false,
    startedAt: 0,
    eventUrl: "",
    fullFlowEnabled: true,
    saleStartTime: "",
    preEnterSeconds: 30,
    criticalPreSeconds: 2.5,
    criticalPostSeconds: 8,
    criticalTickMs: 65,
    scavengeLoopEnabled: false,
    scavengeLoopIntervalSec: 600,
    scavengeRoundMaxSec: 0,
    quantity: 1,
    dateMonth: "",
    dateDay: "",
    dateTime: "",
    legacyAreaOrderMode: "default",
    legacyAreaCustomCodes: [],
    legacyAreaSwitchIntervalMs: 1200,
    legacyAreaSettleMs: 1200,
    legacyAreaRandomJitterMs: 0,
    countryCode: "86",
    phoneNumber: "",
    ocrApiUrl: DEFAULT_OCR_API_URL,
    ocrActivationCode: "",
    ocrApiToken: "",
    ocrDeviceId: "",
    ocrAccessToken: "",
    ocrAccessTokenExpiresAt: 0,
    ocrLicenseExpiresAt: 0,
    ocrLicenseActivatedAt: 0,
    vpnApiUrl: "http://127.0.0.1:8000",
    vpnAutoSwitchEnabled: true,
    dingTalkWebhookUrl: "",
    dingTalkSecret: ""
  },
  intervalId: null,
  busy: false,
  paymentClicked: false,
  badgeEl: null,
  loginHinted: false,
  lastInfoStepAt: 0,
  totalClickedAt: 0,
  totalButtonClicked: false,
  logPanelEl: null,
  logListEl: null,
  logBuffer: [],
  eximbaySignalAt: 0,
  eximbayFlowKey: "",
  eximbayWechatClicked: false,
  eximbayConsentClicked: false,
  eximbayPayClicked: false,
  infoFlowDone: false,
  infoFlowKey: "",
  priceFlowKey: "",
  priceBaseQuantity: null,
  pricePreorderClicked: false,
  pricePlusClickCount: 0,
  priceLastPreorderClickAt: 0,
  dateLastDayClickAt: 0,
  dateLastSlotClickAt: 0,
  dateLastNextAt: 0,
  legacyNextPendingUntil: 0,
  legacyNextWaitLogAt: 0,
  productFlowKey: "",
  productBuyClickedAt: 0,
  productLastCountdownLogAt: 0,
  queueLastLogAt: 0,
  queueActive: false,
  queueNextKeepAliveAt: 0,
  queueKeepAliveCount: 0,
  queueHealth: {
    lastProbeAt: 0,
    probeIntervalMs: 5000,
    consecutiveFail: 0,
    lastSuccessAt: 0,
    alertActive: false,
    lastAlertAt: 0,
    lastSwitchAt: 0,
    switching: false,
    lastSwitchResultAt: 0
  },
  queueTop50FastestSwitchDone: false,
  queueLastRemaining: null,
  tickMode: "fast",
  tickIntervalMs: 180,
  priceLockedSlow: false,
  buyNowCachedEl: null,
  firstBuyNowClickAt: 0,
  humanVerifyLastClickAt: 0,
  humanVerifyLastLogAt: 0,
  humanVerifyAttempted: false,
  humanVerifyAlertActive: false,
  humanVerifyLastNotifyAt: 0,
  sliderCaptchaPaused: false,
  sliderCaptchaLastLogAt: 0,
  sliderCaptchaLastNotifyAt: 0,
  lastStage: "unknown",
  lastBookingPageVariant: "unknown",
  notifySale3mSent: false,
  notifyPriceEnteredSent: false,
  notifyLegacySeatCompletedSent: false,
  scavengeLoopSuccess: false,
  scavengeLoopNextRestartAt: 0,
  scavengeLoopLastRestartAt: 0,
  scavengeLoopLastWaitLogAt: 0,
  scavengeLoopLastWaitTargetAt: 0,
  notifyQueueThresholdSent: {
    1000: false,
    100: false,
    10: false
  },
  legacySeatFlowKey: "",
  legacySeatAreaIndex: 0,
  legacySeatCurrentAreaCode: "",
  legacySeatLastAreaSwitchAt: 0,
  legacySeatAreaNextSwitchAt: 0,
  legacySeatLastSeatClickAt: 0,
  legacySeatLastNextAt: 0,
  legacySeatSelectedAssumed: 0,
  legacySeatClickedKeys: [],
  legacySeatAttemptedKeys: {},
  legacySeatNoSeatCycles: 0,
  legacySeatLastLogAt: 0,
  legacySeatLastClickFailLogAt: 0,
  legacySeatLastGradeClickAt: 0,
  legacySeatCurrentGrade: "",
  legacySeatGradeIndex: 0,
  legacySeatLastAreaDiscoveryAt: 0,
  legacySeatAreaSettleUntil: 0,
  legacySeatSinglePickPendingUntil: 0,
  legacySeatSubmitTriggeredAt: 0,
  legacySeatSubmitSelectedAtTrigger: 0,
  legacySeatSubmitTargetAtTrigger: 0,
  selectedSeatCountCache: {
    ts: 0,
    count: 0
  },
  captcha: {
    lastImageSig: "",
    lastAttemptAt: 0,
    submitCount: 0,
    solvedAt: 0,
    lastPassLogAt: 0,
    candidates: [],
    candidateIndex: 0,
    legacyFirstInputDelayDone: false
  }
};

const STEP_TEXT = {
  buyNow: ["立即购买", "立即購買", "buy now", "book now", "예매하기"],
  reserveEntry: [
    "预约",
    "預約",
    "预订",
    "預訂",
    "预定",
    "預定",
    "一般预订",
    "一般預訂",
    "一般预定",
    "一般預定",
    "general reservation",
    "normal reservation",
    "reservation",
    "reserve",
    "book reservation",
    "예매",
    "일반예매"
  ],
  nextStep: ["下一步", "下一步", "next", "다음"],
  completeSeat: ["完成选择", "完成選擇", "done", "confirm seat", "좌석선택완료"],
  priceStep: ["选择价格", "選擇價格", "price selection", "가격 선택"],
  preorder: ["预购", "預購", "订购", "訂購"],
  agreement: ["同意条款", "同意條款", "同意", "약관", "agree"]
};

const TICK_MS_FAST = 180;
const TICK_MS_NORMAL = 480;
const TICK_MS_CRITICAL_DEFAULT = 65;
const QUEUE_KEEP_ALIVE_MIN_MS = 2.2 * 60 * 1000;
const QUEUE_KEEP_ALIVE_MAX_MS = 4.8 * 60 * 1000;
const LEGACY_AREA_SETTLE_MS = 1200;
const LEGACY_AREA_SWITCH_INTERVAL_MS = 1200;
const LEGACY_AREA_RANDOM_JITTER_MS = 0;
const IS_TOP_FRAME = window.top === window;
const BOT_OWNER_KEY = "__nolBotTopOwner";
const BOT_INSTANCE_ID = `nol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function normalizeText(text) {
  return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
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

function isDomElement(el) {
  return Boolean(el && el.nodeType === 1 && typeof el.getBoundingClientRect === "function");
}

function visible(el) {
  if (!isDomElement(el)) return false;
  const view = el.ownerDocument?.defaultView || window;
  const style = view.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return (
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    style.pointerEvents !== "none" &&
    rect.width > 2 &&
    rect.height > 2
  );
}

function visibleForSeat(el) {
  if (!isDomElement(el)) return false;
  const view = el.ownerDocument?.defaultView || window;
  const style = view.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return (
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    rect.width > 0.4 &&
    rect.height > 0.4
  );
}

function clickElement(el) {
  if (!el) return false;
  el.scrollIntoView({ block: "center", inline: "center" });
  el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return true;
}

function forceClick(el) {
  if (!el) return false;
  try {
    if (typeof el.click === "function") el.click();
  } catch (_) {}
  try {
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  } catch (_) {}
  return clickElement(el);
}

function clickAtCenter(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const doc = el.ownerDocument || document;
  let topEl = doc.elementFromPoint(x, y) || el;
  if (topEl?.closest?.("#nol-ticket-bot-log-panel, #nol-ticket-bot-badge")) {
    topEl = el;
  }
  try {
    topEl.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, clientX: x, clientY: y })
    );
    topEl.dispatchEvent(
      new MouseEvent("mouseup", { bubbles: true, clientX: x, clientY: y })
    );
    topEl.dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: x, clientY: y })
    );
    return true;
  } catch (_) {
    return false;
  }
}

function dispatchRichPointerClick(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const doc = el.ownerDocument || document;
  const target = doc.elementFromPoint(x, y) || el;
  const common = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1
  };
  try {
    if (typeof target.focus === "function") target.focus({ preventScroll: true });
  } catch (_) {}
  try {
    target.dispatchEvent(new PointerEvent("pointerover", { ...common, pointerType: "mouse", isPrimary: true }));
    target.dispatchEvent(new PointerEvent("pointerdown", { ...common, pointerType: "mouse", isPrimary: true }));
    target.dispatchEvent(new MouseEvent("mousedown", common));
    target.dispatchEvent(new MouseEvent("mouseup", common));
    target.dispatchEvent(new PointerEvent("pointerup", { ...common, pointerType: "mouse", isPrimary: true }));
    target.dispatchEvent(new MouseEvent("click", common));
    return true;
  } catch (_) {
    return false;
  }
}

function isCheckboxLikeChecked(el) {
  if (!el) return false;
  if (el instanceof HTMLInputElement && el.type === "checkbox") {
    return Boolean(el.checked);
  }
  const aria = String(el.getAttribute?.("aria-checked") || "").toLowerCase();
  if (aria === "true") return true;
  const cls = normalizeText(el.className?.toString?.() || "");
  if (cls.includes("checked") || cls.includes("selected")) return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function tryClaimBotOwner(staleMs = 2500) {
  if (!IS_TOP_FRAME) return false;
  const now = Date.now();
  const owner = window[BOT_OWNER_KEY];
  if (!owner || owner.id === BOT_INSTANCE_ID || now - Number(owner.hb || 0) > staleMs) {
    window[BOT_OWNER_KEY] = { id: BOT_INSTANCE_ID, hb: now };
    return true;
  }
  return false;
}

function isBotOwner() {
  return Boolean(IS_TOP_FRAME && window[BOT_OWNER_KEY]?.id === BOT_INSTANCE_ID);
}

function touchBotOwner() {
  if (!isBotOwner()) return;
  window[BOT_OWNER_KEY].hb = Date.now();
}

function scheduleNextQueueKeepAlive(initial = false) {
  const gap = randomInt(QUEUE_KEEP_ALIVE_MIN_MS, QUEUE_KEEP_ALIVE_MAX_MS);
  state.queueNextKeepAliveAt = Date.now() + gap;
  if (initial) {
    log(`排队保活已开启，约 ${Math.round(gap / 1000)}s 后触发首次保活`);
  }
}

function runQueueKeepAliveAction() {
  const vw = Math.max(320, window.innerWidth);
  const vh = Math.max(240, window.innerHeight);
  const action = randomInt(1, 3);

  // 保活动作尽量轻量，避免影响排队状态。
  if (action === 1) {
    const scrollEl = document.scrollingElement || document.documentElement || document.body;
    const delta = randomInt(10, 36) * (Math.random() > 0.5 ? 1 : -1);
    try {
      scrollEl.scrollBy({ top: delta, behavior: "instant" });
    } catch (_) {
      try {
        window.scrollBy(0, delta);
      } catch (_) {}
    }
    window.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: delta }));
  } else if (action === 2) {
    const x = randomInt(Math.round(vw * 0.35), Math.round(vw * 0.7));
    const y = randomInt(Math.round(vh * 0.25), Math.round(vh * 0.75));
    document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: x, clientY: y }));
    document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x, clientY: y }));
  } else {
    const x = randomInt(12, 48);
    const y = randomInt(12, 48);
    const target = document.elementFromPoint(x, y) || document.body;
    try {
      target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: x, clientY: y }));
      target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: x, clientY: y }));
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: y }));
    } catch (_) {}
  }

  state.queueKeepAliveCount += 1;
  log(`排队保活动作已执行 #${state.queueKeepAliveCount}`);
}

function normalizePreEnterSeconds(raw, fallback = 30) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(300, Math.max(5, Number(fallback) || 30));
  return Math.min(300, Math.max(5, Math.round(n)));
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

function normalizeCriticalSeconds(raw, fallback, min, max) {
  const n = Number(raw);
  const base = Number(fallback);
  if (!Number.isFinite(n)) return Number.isFinite(base) ? base : min;
  const clamped = Math.min(max, Math.max(min, n));
  return Math.round(clamped * 10) / 10;
}

function normalizeCriticalTickMs(raw, fallback = TICK_MS_CRITICAL_DEFAULT) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(180, Math.max(40, Number(fallback) || TICK_MS_CRITICAL_DEFAULT));
  return Math.min(180, Math.max(40, Math.round(n)));
}

function normalizeScavengeLoopIntervalSec(raw, fallback = 600) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(3600, Math.max(15, Math.round(Number(fallback) || 600)));
  return Math.min(3600, Math.max(15, Math.round(n)));
}

function normalizeScavengeRoundMaxSec(raw, fallback = 0) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(10800, Math.max(0, Math.round(Number(fallback) || 0)));
  return Math.min(10800, Math.max(0, Math.round(n)));
}

function normalizeLegacyAreaTimingMs(raw, fallback = 1200) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(5000, Math.max(120, Math.round(Number(fallback) || 1200)));
  return Math.min(5000, Math.max(120, Math.round(n)));
}

function normalizeLegacyAreaRandomJitterMs(raw, fallback = 0) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.min(1500, Math.max(0, Math.round(Number(fallback) || 0)));
  return Math.min(1500, Math.max(0, Math.round(n)));
}

function withJitterMs(baseMs, jitterMs, minMs = 0, maxMs = 60000) {
  const base = Math.round(Number(baseMs) || 0);
  const jitter = Math.max(0, Math.round(Number(jitterMs) || 0));
  if (!jitter) return Math.min(maxMs, Math.max(minMs, base));
  const delta = Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
  return Math.min(maxMs, Math.max(minMs, base + delta));
}

function getLegacyAreaSwitchIntervalMs() {
  const base = normalizeLegacyAreaTimingMs(
    state.config.legacyAreaSwitchIntervalMs,
    LEGACY_AREA_SWITCH_INTERVAL_MS
  );
  const jitter = normalizeLegacyAreaRandomJitterMs(
    state.config.legacyAreaRandomJitterMs,
    LEGACY_AREA_RANDOM_JITTER_MS
  );
  return withJitterMs(base, jitter, 120, 5000);
}

function getLegacyAreaSettleMs() {
  const base = normalizeLegacyAreaTimingMs(state.config.legacyAreaSettleMs, LEGACY_AREA_SETTLE_MS);
  const jitter = normalizeLegacyAreaRandomJitterMs(
    state.config.legacyAreaRandomJitterMs,
    LEGACY_AREA_RANDOM_JITTER_MS
  );
  return withJitterMs(base, jitter, 120, 5000);
}

function normalizeQuantity(raw, fallback = 2) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) {
    const fb = Math.floor(Number(fallback));
    if (!Number.isFinite(fb) || fb < 1) return 1;
    return Math.min(8, fb);
  }
  return Math.min(8, n);
}

function getCriticalPreMs() {
  return normalizeCriticalSeconds(state.config.criticalPreSeconds, 2.5, 0.5, 10) * 1000;
}

function getCriticalPostMs() {
  return normalizeCriticalSeconds(state.config.criticalPostSeconds, 8, 1, 20) * 1000;
}

function getSaleStartTimestamp() {
  const raw = String(state.config.saleStartTime || "").trim();
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  if (!Number.isFinite(ts)) return null;
  return ts;
}

function getSaleCountdownMs() {
  const ts = getSaleStartTimestamp();
  if (!ts) return null;
  return ts - Date.now();
}

function hasDingTalkWebhookConfigured() {
  return Boolean(String(state.config.dingTalkWebhookUrl || "").trim());
}

async function sendDingTalkNotify(eventKey, title, text) {
  if (window.top !== window) return false;
  if (!hasDingTalkWebhookConfigured()) return false;
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "DINGTALK_NOTIFY",
      eventKey: String(eventKey || "").trim(),
      title: String(title || "NOL BOT 通知"),
      text: String(text || "")
    });
    if (resp?.ok && resp.sent) {
      log(`钉钉通知已发送: ${title}`);
      return true;
    }
  } catch (_) {}
  return false;
}

function parseQueueRemaining() {
  const raw = (document.body?.innerText || "").replace(/\u00a0/g, " ");
  const patterns = [
    /我的等候[順位顺位]\s*[:：]?\s*([\d,]+)/i,
    /目前等候[順位顺位]\s*[:：]?\s*([\d,]+)/i,
    /等候[順位顺位]\s*[:：]?\s*([\d,]+)/i,
    /대기\s*순위\s*[:：]?\s*([\d,]+)/i,
    /waiting\s*(?:rank|number|queue)\s*[:：]?\s*([\d,]+)/i
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (!m) continue;
    const n = Number(String(m[1] || "").replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function getVpnApiUrl() {
  const raw = String(state.config.vpnApiUrl || "").trim();
  return raw || "http://127.0.0.1:8000";
}

async function requestVpnHealthCheck(targetUrl) {
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "VPN_HEALTH_CHECK",
      apiUrl: getVpnApiUrl(),
      targetUrl: String(targetUrl || location.href),
      timeoutMs: 5000
    });
    if (!resp?.ok) return { ok: false, reason: resp?.error || "vpn_health_fail" };
    const data = resp.data || {};
    const healthy = data.healthy !== false;
    return {
      ok: healthy,
      reason: healthy ? "" : String(data.reason || "unhealthy"),
      detail: data
    };
  } catch (err) {
    return { ok: false, reason: String(err?.message || err) };
  }
}

async function triggerVpnAutoSwitch(reason, currentQueue, options = {}) {
  if (window.top !== window) return { ok: false, skipped: "not_top_frame" };
  if (!state.config.vpnAutoSwitchEnabled) return { ok: false, skipped: "disabled" };
  if (state.queueHealth.switching) return { ok: false, skipped: "switching" };
  const strategy = String(options.strategy || "round_robin").trim().toLowerCase();
  const bypassCooldown = options.bypassCooldown === true;
  const now = Date.now();
  // 冷却 10 分钟，避免来回切换
  if (!bypassCooldown && now - state.queueHealth.lastSwitchAt < 10 * 60 * 1000) {
    return { ok: false, skipped: "cooldown" };
  }
  state.queueHealth.switching = true;
  state.queueHealth.lastSwitchAt = now;
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "VPN_SWITCH_REQUEST",
      apiUrl: getVpnApiUrl(),
      reason: String(reason || "queue_unhealthy"),
      currentQueue: Number.isFinite(currentQueue) ? currentQueue : 0,
      sourceUrl: location.href,
      strategy
    });
    state.queueHealth.lastSwitchResultAt = Date.now();
    if (!resp?.ok) {
      return { ok: false, error: resp?.error || "switch_failed" };
    }
    return { ok: true, data: resp.data || {} };
  } finally {
    state.queueHealth.switching = false;
  }
}

async function runQueueHealthGuard() {
  const now = Date.now();
  if (now - state.queueHealth.lastProbeAt < state.queueHealth.probeIntervalMs) return;
  state.queueHealth.lastProbeAt = now;

  const remaining = parseQueueRemaining();
  let health = { ok: true, reason: "" };

  if (!navigator.onLine) {
    health = { ok: false, reason: "offline" };
  } else {
    health = await requestVpnHealthCheck(location.href);
  }

  if (health.ok) {
    if (state.queueHealth.alertActive) {
      await sendDingTalkNotify(
        `queue_recovered_${state.config.saleStartTime || location.pathname}`,
        "排队网络已恢复",
        `网络探测恢复正常，当前队列约 ${Number.isFinite(remaining) ? remaining : "未知"}。`
      );
      state.queueHealth.alertActive = false;
      state.queueHealth.lastAlertAt = 0;
    }
    state.queueHealth.consecutiveFail = 0;
    state.queueHealth.lastSuccessAt = now;
    return;
  }

  state.queueHealth.consecutiveFail += 1;
  if (state.queueHealth.consecutiveFail < 4) return;

  const canResend = now - state.queueHealth.lastAlertAt > 60000;
  if (!state.queueHealth.alertActive || canResend) {
    await sendDingTalkNotify(
      `queue_unhealthy_${state.config.saleStartTime || location.pathname}`,
      "排队网络异常（重度）",
      `连续探测失败 ${state.queueHealth.consecutiveFail} 次，原因: ${health.reason || "unknown"}，当前队列约 ${Number.isFinite(remaining) ? remaining : "未知"}。`
    );
    state.queueHealth.alertActive = true;
    state.queueHealth.lastAlertAt = now;
  }

  // 关键区间（<=100）只告警，不自动切换，防误伤。
  if (Number.isFinite(remaining) && remaining <= 100) {
    log(`队列已到关键区间(${remaining})，仅告警不自动切换VPN`);
    return;
  }

  const switched = await triggerVpnAutoSwitch(health.reason || "queue_unhealthy", remaining);
  if (switched.ok) {
    log("已触发 VPN 自动切换");
    await sendDingTalkNotify(
      `vpn_switched_${state.config.saleStartTime || location.pathname}_${Math.floor(now / 600000)}`,
      "已触发 VPN 自动切换",
      `队列网络连续异常，已请求自动切换 VPN。当前队列约 ${Number.isFinite(remaining) ? remaining : "未知"}。`
    );
  } else if (!switched.skipped) {
    log(`VPN 自动切换失败: ${switched.error || "unknown"}`);
  }
}

async function maybeNotifySale3Minutes() {
  if (state.notifySale3mSent) return;
  const countdown = getSaleCountdownMs();
  if (!Number.isFinite(countdown) || countdown <= 0 || countdown > 180000) return;
  state.notifySale3mSent = true;
  const startAt = getSaleStartTimestamp();
  const at = startAt ? new Date(startAt).toLocaleString() : "未知";
  await sendDingTalkNotify(
    `sale_3m_${state.config.saleStartTime || "unknown"}`,
    "开抢前3分钟提醒",
    `距开抢约 3 分钟，请确认已登录、页面在线、网络稳定。开抢时间: ${at}`
  );
}

async function maybeNotifyQueueThresholds() {
  const remaining = parseQueueRemaining();
  if (!Number.isFinite(remaining)) return;
  for (const threshold of [1000, 100, 10]) {
    if (remaining <= threshold && !state.notifyQueueThresholdSent[threshold]) {
      state.notifyQueueThresholdSent[threshold] = true;
      await sendDingTalkNotify(
        `queue_${threshold}_${state.config.saleStartTime || location.pathname}`,
        `排队剩余 <= ${threshold}`,
        `当前排队顺位约 ${remaining}，请准备关注页面放行。`
      );
    }
  }

  const prev = Number.isFinite(state.queueLastRemaining) ? state.queueLastRemaining : null;
  const crossed50 = prev !== null && prev > 50 && remaining <= 50;
  state.queueLastRemaining = remaining;

  if (crossed50 && !state.queueTop50FastestSwitchDone) {
    state.queueTop50FastestSwitchDone = true;
    const switched = await triggerVpnAutoSwitch("queue_top50_fastest", remaining, {
      strategy: "fastest",
      bypassCooldown: true
    });
    if (switched.ok) {
      log("排队<=50，已切换到最快节点");
    } else {
      log(`排队<=50 最快节点切换未执行: ${switched.skipped || switched.error || "unknown"}`);
    }
  }
}

async function maybeNotifyEnteredPrice() {
  if (state.notifyPriceEnteredSent) return;
  state.notifyPriceEnteredSent = true;
  const selected = detectSelectedSeatCount();
  await sendDingTalkNotify(
    `entered_price_${state.config.saleStartTime || location.pathname}${location.search}`,
    "已进入价格页",
    `已进入价格页(step=price)，当前检测已选座位数: ${selected}。`
  );
  await maybeFinishScavengeLoopIfEnabled("已进入价格页");
}

function markLegacySeatSubmitTriggered(selectedAtTrigger, targetAtTrigger) {
  state.legacySeatSubmitTriggeredAt = Date.now();
  state.legacySeatSubmitSelectedAtTrigger = Math.max(0, Number(selectedAtTrigger) || 0);
  state.legacySeatSubmitTargetAtTrigger = Math.max(1, Number(targetAtTrigger) || 1);
}

async function maybeNotifyLegacySeatCompletedOnTransition() {
  const triggeredAt = Number(state.legacySeatSubmitTriggeredAt || 0);
  if (!triggeredAt) return;
  if (state.notifyLegacySeatCompletedSent) {
    state.legacySeatSubmitTriggeredAt = 0;
    return;
  }

  const now = Date.now();
  const elapsed = now - triggeredAt;
  const stepNo = getLegacyActiveStepNumber();
  const seatVisible = isLegacySeatLayerVisible();
  const progressedByStep = Number.isFinite(stepNo) && stepNo > 0 && stepNo !== 2;
  const progressedByLayer = elapsed > 1200 && !seatVisible && stepNo !== 2;

  if (!progressedByStep && !progressedByLayer) {
    if (elapsed > 20000) {
      state.legacySeatSubmitTriggeredAt = 0;
    }
    return;
  }

  state.legacySeatSubmitTriggeredAt = 0;
  const selected = Math.max(1, Number(state.legacySeatSubmitSelectedAtTrigger) || 1);
  const target = Math.max(1, Number(state.legacySeatSubmitTargetAtTrigger) || 1);
  const eventKey = `legacy_seat_done_${state.config.saleStartTime || "unknown"}_${location.pathname}_${location.search}`;
  const sent = await sendDingTalkNotify(
    eventKey,
    "抢票成功：已提交座位",
    `已选座并点击 completed，已进入下一界面。数量: ${selected}/${target}，step=${stepNo || "unknown"}，时间: ${new Date().toLocaleString()}`
  );
  if (sent) {
    state.notifyLegacySeatCompletedSent = true;
  }
  await maybeFinishScavengeLoopIfEnabled("已选座并进入下一界面");
}

function getScavengeLoopIntervalMs() {
  const sec = normalizeScavengeLoopIntervalSec(
    state.config.scavengeLoopIntervalSec,
    600
  );
  return sec * 1000;
}

function getScavengeRoundMaxMs() {
  const sec = normalizeScavengeRoundMaxSec(
    state.config.scavengeRoundMaxSec,
    0
  );
  return sec > 0 ? sec * 1000 : 0;
}

async function persistScavengeRuntime(nextRestartAt = 0, lastRestartAt = 0) {
  try {
    const all = await chrome.storage.local.get(STORAGE_KEY);
    const cfg = all[STORAGE_KEY] || {};
    const startedAt = Number(cfg.startedAt || state.config.startedAt || 0);
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        ...cfg,
        scavengeLoopNextRestartAt: Number(nextRestartAt) || 0,
        scavengeLoopLastRestartAt: Number(lastRestartAt) || 0,
        scavengeLoopRuntimeStartedAt: startedAt
      }
    });
  } catch (_) {}
}

async function clearScavengeRuntime() {
  await persistScavengeRuntime(0, 0);
}

async function maybeFinishScavengeLoopIfEnabled(reason = "") {
  if (state.config.scavengeLoopEnabled !== true) return false;
  if (state.scavengeLoopSuccess) return true;
  state.scavengeLoopSuccess = true;
  state.scavengeLoopNextRestartAt = 0;
  state.scavengeLoopLastWaitLogAt = 0;
  state.scavengeLoopLastWaitTargetAt = 0;
  const msg = String(reason || "命中成功条件");
  log(`捡漏循环已命中成功条件，停止自动化: ${msg}`);
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...state.config,
      scavengeLoopNextRestartAt: 0,
      scavengeLoopLastRestartAt: 0,
      scavengeLoopRuntimeStartedAt: Number(state.config.startedAt || 0),
      enabled: false,
      stoppedAt: Date.now()
    }
  });
  await clearScavengeRuntime();
  stopLoop(`捡漏成功: ${msg}`);
  return true;
}

async function maybeRunScavengeLoopRestart() {
  if (!state.config.enabled || state.config.scavengeLoopEnabled !== true) return false;
  if (state.scavengeLoopSuccess) return false;
  const targetUrl = String(state.config.eventUrl || "").trim();
  if (!targetUrl) return false;
  const countdownMs = getSaleCountdownMs();
  if (Number.isFinite(countdownMs) && countdownMs > 0) return false;
  const intervalMs = getScavengeLoopIntervalMs();
  if (intervalMs <= 0) return false;

  const now = Date.now();
  if (!state.scavengeLoopNextRestartAt || now < state.scavengeLoopNextRestartAt) return false;

  state.scavengeLoopLastRestartAt = now;
  state.scavengeLoopNextRestartAt = now + intervalMs;
  state.scavengeLoopLastWaitLogAt = 0;
  state.scavengeLoopLastWaitTargetAt = 0;
  state.productFlowKey = "";
  state.productBuyClickedAt = 0;
  state.productLastCountdownLogAt = 0;
  state.buyNowCachedEl = null;
  state.firstBuyNowClickAt = 0;
  await persistScavengeRuntime(state.scavengeLoopNextRestartAt, state.scavengeLoopLastRestartAt);
  const minutes = Math.max(1, Math.round(intervalMs / 60000));
  log(`捡漏循环触发：每 ${minutes} 分钟重跑一次，正在重新开始流程`);
  try {
    const nowUrl = String(location.href || "").split("#")[0];
    const targetNoHash = targetUrl.split("#")[0];
    if (nowUrl === targetNoHash) {
      window.location.reload();
    } else {
      window.location.assign(targetUrl);
    }
  } catch (_) {
    window.location.href = targetUrl;
  }
  return true;
}

async function maybeAbortScavengeRoundByTimeout() {
  if (!state.config.enabled || state.config.scavengeLoopEnabled !== true || state.scavengeLoopSuccess) {
    return false;
  }
  const maxMs = getScavengeRoundMaxMs();
  if (!maxMs) return false;

  const host = String(location.host || "").toLowerCase();
  const inBookingHost =
    host === "tickets.interpark.com" ||
    host === "gpoticket.globalinterpark.com" ||
    isLegacyBookingUrl();
  if (!inBookingHost) return false;

  const now = Date.now();
  if (!state.scavengeLoopLastRestartAt) {
    state.scavengeLoopLastRestartAt = now;
    return false;
  }
  const elapsed = now - state.scavengeLoopLastRestartAt;
  if (elapsed < maxMs) return false;

  const intervalMs = getScavengeLoopIntervalMs();
  state.scavengeLoopLastRestartAt = now;
  state.scavengeLoopNextRestartAt = now + intervalMs;
  state.scavengeLoopLastWaitLogAt = 0;
  state.scavengeLoopLastWaitTargetAt = 0;
  await persistScavengeRuntime(state.scavengeLoopNextRestartAt, state.scavengeLoopLastRestartAt);

  const maxMin = Math.max(1, Math.round(maxMs / 60000));
  const nextAtText = new Date(state.scavengeLoopNextRestartAt).toLocaleString();
  log(`捡漏单轮超时(${maxMin}分钟)，结束本轮并返回 world.nol.com，下一轮启动时间: ${nextAtText}`);

  const waitUrl = "https://world.nol.com/";
  try {
    window.location.assign(waitUrl);
  } catch (_) {
    window.location.href = waitUrl;
  }
  return true;
}

function shouldHoldOnWorldForScavengeWaiting() {
  if (!state.config.enabled || state.config.scavengeLoopEnabled !== true || state.scavengeLoopSuccess) {
    return false;
  }

  const normalizeUrlForCompare = (raw, dropQuery = false) => {
    try {
      const u = new URL(String(raw || "").trim(), location.href);
      u.hash = "";
      const path = String(u.pathname || "/").replace(/\/+$/, "") || "/";
      return dropQuery ? `${u.origin}${path}` : `${u.origin}${path}${u.search}`;
    } catch (_) {
      return "";
    }
  };

  const targetFull = normalizeUrlForCompare(state.config.eventUrl, false);
  const targetPath = normalizeUrlForCompare(state.config.eventUrl, true);
  const currentFull = normalizeUrlForCompare(location.href, false);
  const currentPath = normalizeUrlForCompare(location.href, true);

  // 在目标活动页（或同一路径）时，不等待下一轮，继续完整执行本轮流程。
  if ((targetFull && currentFull === targetFull) || (targetPath && currentPath === targetPath)) {
    return false;
  }
  // 若当前页仍存在可点击入口，也应继续跑本轮，不提前进入“等待下一轮”。
  if (getCachedOrFindBuyNowButton() || findReserveEntryButtonStrict()) {
    return false;
  }

  const nextAt = Number(state.scavengeLoopNextRestartAt || 0);
  if (!nextAt) return false;
  const now = Date.now();
  if (now >= nextAt) return false;

  const shouldLog =
    state.scavengeLoopLastWaitTargetAt !== nextAt || now - state.scavengeLoopLastWaitLogAt > 8000;
  if (shouldLog) {
    state.scavengeLoopLastWaitLogAt = now;
    state.scavengeLoopLastWaitTargetAt = nextAt;
    log(`捡漏等待中，下一轮启动时间: ${new Date(nextAt).toLocaleString()}`);
  }
  return true;
}

function setTickMode(mode) {
  let nextMode = "fast";
  if (mode === "normal") nextMode = "normal";
  if (mode === "critical") nextMode = "critical";
  const criticalMs = normalizeCriticalTickMs(
    state.config.criticalTickMs,
    state.tickIntervalMs || TICK_MS_CRITICAL_DEFAULT
  );
  const nextMs =
    nextMode === "normal" ? TICK_MS_NORMAL : nextMode === "critical" ? criticalMs : TICK_MS_FAST;
  if (state.tickMode === nextMode && state.tickIntervalMs === nextMs) return;

  state.tickMode = nextMode;
  state.tickIntervalMs = nextMs;
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = window.setInterval(tick, nextMs);
  }
  if (nextMode === "normal") {
    log("切换为常速模式(已到价格页)");
  } else if (nextMode === "critical") {
    log("切换为临界冲刺模式(开抢瞬间)");
  } else {
    log("切换为极速模式(抢座)");
  }
}

function log(text) {
  const msg = `[NOL BOT] ${text}`;
  console.log(msg);
  chrome.runtime.sendMessage({ type: "LOG_EVENT", text }).catch(() => {});
  pushVisibleLog(text);
}

function isElementShown(el) {
  if (!isDomElement(el)) return false;
  const view = el.ownerDocument?.defaultView || window;
  const style = view.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

function getHumanVerifyChallengeIframes() {
  const selectors = [
    "iframe[src*='challenges.cloudflare.com']",
    "iframe[src*='turnstile']",
    "iframe[title*='turnstile']",
    "iframe[src*='recaptcha']",
    "iframe[title*='recaptcha']",
    "iframe[src*='hcaptcha']",
    "iframe[title*='hcaptcha']"
  ];
  const out = [];
  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll(selector));
    for (const node of nodes) {
      if (!isElementShown(node)) continue;
      if (!out.includes(node)) out.push(node);
    }
  }
  return out;
}

function findHumanVerifyContainer() {
  const container = document.querySelector(
    "#content[aria-live='polite'], .cb-c, #ehurV4, #verifying, #success, #fail"
  );
  if (isElementShown(container)) return container;
  const frame = getHumanVerifyChallengeIframes()[0] || null;
  if (frame) return frame;
  return null;
}

function findHumanVerifyCheckbox() {
  const cloudflareDirect = Array.from(
    document.querySelectorAll(".cb-c input[type='checkbox'], .cb-lb input[type='checkbox']")
  ).find((input) => isElementShown(input.closest("label") || input));
  if (cloudflareDirect) return cloudflareDirect;

  const strict = Array.from(
    document.querySelectorAll("label.cb-lb input[type='checkbox'], input[type='checkbox']")
  ).find((input) => {
    const label = input.closest("label");
    const labelText = normalizeText(label?.textContent || "");
    const content = normalizeText(
      [
        input.getAttribute("aria-label"),
        input.getAttribute("name"),
        input.getAttribute("id"),
        input.className?.toString(),
        labelText
      ]
        .filter(Boolean)
        .join(" ")
    );
    const inChallenge = Boolean(
      input.closest("#content[aria-live='polite']") ||
        input.closest("#ehurV4") ||
        input.closest(".cb-c")
    );
    return (
      inChallenge &&
      (content.includes("verify you are human") ||
        content.includes("human") ||
        content.includes("cb-lb"))
    );
  });
  if (strict) return strict;

  const roleBased = Array.from(
    document.querySelectorAll("[role='checkbox'], [aria-checked], .cb-i, .cb-lb")
  ).find((el) => {
    const content = normalizeText(
      [
        el.getAttribute?.("aria-label"),
        el.getAttribute?.("name"),
        el.getAttribute?.("id"),
        el.className?.toString?.(),
        el.textContent
      ]
        .filter(Boolean)
        .join(" ")
    );
    return (
      isElementShown(el.closest?.(".cb-c, #content, #ehurV4, label") || el) &&
      (content.includes("verify you are human") ||
        content.includes("human") ||
        content.includes("checkbox") ||
        content.includes("cb-"))
    );
  });
  if (roleBased) return roleBased;

  const verifyTextHost = Array.from(document.querySelectorAll("label, div, span, p"))
    .find((el) => normalizeText(el.textContent || "").includes("verify you are human"));
  if (verifyTextHost) {
    const host =
      verifyTextHost.closest(".cb-c, #content, #ehurV4, label, div") ||
      verifyTextHost.parentElement ||
      verifyTextHost;
    const near = host.querySelector(
      "input[type='checkbox'], [role='checkbox'], [aria-checked], .cb-i, .cb-lb, label"
    );
    if (near && isElementShown(near.closest("label") || near)) return near;
    if (isElementShown(host)) return host;
  }

  const text = normalizeText(document.body?.innerText || "");
  if (!text.includes("verify you are human")) return null;
  return (
    Array.from(document.querySelectorAll("input[type='checkbox']")).find((input) =>
      isElementShown(input.closest("label") || input)
    ) || null
  );
}

function isHumanVerifyWidgetPresent() {
  const cloudflareLabel = Array.from(document.querySelectorAll(".cb-c .cb-lb-t"))
    .find((el) => normalizeText(el.textContent || "").includes("verify you are human"));
  if (cloudflareLabel && isElementShown(cloudflareLabel.closest(".cb-c") || cloudflareLabel)) {
    return true;
  }

  const challengeFrames = getHumanVerifyChallengeIframes();
  if (challengeFrames.length) return true;

  if (findHumanVerifyContainer()) return true;

  const text = normalizeText(document.body?.innerText || "");
  if (
    text.includes("verify you are human") ||
    text.includes("verifying...") ||
    text.includes("verification failed") ||
    text.includes("verification expired")
  ) {
    return true;
  }
  if (findHumanVerifyCheckbox()) return true;
  return false;
}

function isSliderCaptchaWidgetPresent(preferredDoc = null) {
  const docs = getCaptchaSearchDocuments(preferredDoc);
  const hasSliderText = (text) => {
    const bag = normalizeText(text || "");
    if (!bag) return false;
    return (
      bag.includes("滑动滑块以调整谜题") ||
      bag.includes("如果拼图匹配") ||
      bag.includes("slider") ||
      bag.includes("puzzle")
    );
  };
  return docs.some((doc) => {
    const layer = doc.querySelector(".captchSliderLayer");
    if (isElementShown(layer)) return true;
    const sliderRoot = doc.querySelector("#captchSlider, .sliderContainer, .captchSliderInner");
    if (!isElementShown(sliderRoot)) return false;
    const titleNode = doc.querySelector(".captchSliderTitle");
    if (isElementShown(titleNode) && hasSliderText(titleNode.innerText || "")) return true;
    return hasSliderText(doc.body?.innerText || "");
  });
}

async function runSliderCaptchaPauseGuard() {
  const active = isSliderCaptchaWidgetPresent();
  if (!active) {
    if (state.sliderCaptchaPaused) {
      state.sliderCaptchaPaused = false;
      state.sliderCaptchaLastLogAt = 0;
      log("滑块验证码已完成，恢复自动流程");
    }
    return false;
  }

  const now = Date.now();
  if (!state.sliderCaptchaPaused) {
    state.sliderCaptchaPaused = true;
    log("检测到滑块验证码，自动流程暂停，请手动完成滑块验证");
  } else if (now - state.sliderCaptchaLastLogAt > 3500) {
    log("滑块验证码处理中，等待人工完成后自动继续");
  }
  state.sliderCaptchaLastLogAt = now;

  if (now - state.sliderCaptchaLastNotifyAt > 5 * 60 * 1000) {
    state.sliderCaptchaLastNotifyAt = now;
    await sendDingTalkNotify(
      "",
      "检测到滑块验证码，已暂停",
      `页面出现滑块验证码，自动流程已暂停。请手动完成滑块后，脚本会自动继续。\n页面: ${location.href}`
    );
  }
  return true;
}

function dispatchHumanEvent(element, type, options = {}) {
  if (!element) return;
  try {
    const keyboardTypes = new Set(["keydown", "keypress", "keyup"]);
    if (keyboardTypes.has(String(type || "").toLowerCase())) {
      const event = new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        ...options
      });
      element.dispatchEvent(event);
      return;
    }
    const event = new MouseEvent(type, {
      view: window,
      bubbles: true,
      cancelable: true,
      ...options
    });
    element.dispatchEvent(event);
  } catch (_) {}
}

function simulateMouseMovement(element) {
  if (!isDomElement(element)) return;
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const startX = Math.floor(Math.random() * Math.max(1, window.innerWidth));
  const startY = Math.floor(Math.random() * Math.max(1, window.innerHeight));
  const steps = 5 + Math.floor(Math.random() * 10);
  for (let i = 0; i <= steps; i += 1) {
    const x = startX + (centerX - startX) * (i / steps) + (Math.random() * 10 - 5);
    const y = startY + (centerY - startY) * (i / steps) + (Math.random() * 10 - 5);
    dispatchHumanEvent(document, "mousemove", {
      clientX: x,
      clientY: y
    });
  }
  dispatchHumanEvent(document, "mousemove", {
    clientX: centerX,
    clientY: centerY
  });
}

async function runHumanVerifyStep() {
  if (!isHumanVerifyWidgetPresent()) {
    state.humanVerifyAttempted = false;
    state.humanVerifyAlertActive = false;
    return false;
  }

  if (!state.humanVerifyAlertActive || Date.now() - state.humanVerifyLastNotifyAt > 2 * 60 * 1000) {
    state.humanVerifyAlertActive = true;
    state.humanVerifyLastNotifyAt = Date.now();
    await sendDingTalkNotify(
      `human_verify_${location.pathname}_${Math.floor(Date.now() / (2 * 60 * 1000))}`,
      "检测到 Cloudflare 人机验证",
      `页面出现 Verify you are human 验证，请及时处理。\n页面: ${location.href}`
    );
  }

  const verifying = document.querySelector("#verifying");
  if (isElementShown(verifying)) {
    if (Date.now() - state.humanVerifyLastLogAt > 2000) {
      log("人机验证进行中，等待通过");
      state.humanVerifyLastLogAt = Date.now();
    }
    return true;
  }

  const checkboxSelectors = [
    "#challenge-stage input[type='checkbox']",
    ".cf-checkbox-label",
    "[name='cf_captcha_kind']",
    ".verify-you-are-human-checkbox",
    "[role='checkbox'][aria-checked='false']"
  ];
  let checkbox = null;
  for (const selector of checkboxSelectors) {
    const el = document.querySelector(selector);
    if (el && isElementShown(el.closest?.("label, div") || el)) {
      checkbox = el;
      break;
    }
  }
  if (!checkbox) {
    checkbox = findHumanVerifyCheckbox();
  }

  const challengeContainer = findHumanVerifyContainer();
  if (!checkbox && challengeContainer) {
    const now = Date.now();
    const randomDelay = 1200 + Math.floor(Math.random() * 800);
    if (now - state.humanVerifyLastClickAt >= randomDelay && !state.humanVerifyAttempted) {
      state.humanVerifyAttempted = true;
      state.humanVerifyLastClickAt = now;
      simulateMouseMovement(challengeContainer);
      await sleep(100 + Math.random() * 200);
      forceClick(challengeContainer);
      await sleep(50 + Math.random() * 100);
      clickAtCenter(challengeContainer);
      await sleep(50 + Math.random() * 100);
      clickElement(challengeContainer);
    }

    if (Date.now() - state.humanVerifyLastLogAt > 2000) {
      log("检测到人机验证框（含挑战 iframe），等待验证通过");
      state.humanVerifyLastLogAt = Date.now();
    }
    return true;
  }

  if (checkbox) {
    const now = Date.now();
    if (isCheckboxLikeChecked(checkbox)) {
      state.humanVerifyAttempted = false;
      return true;
    }

    const minClickInterval = 1200 + Math.floor(Math.random() * 800);
    if (now - state.humanVerifyLastClickAt < minClickInterval) return true;

    state.humanVerifyAttempted = true;
    state.humanVerifyLastClickAt = now;

    const clickable =
      checkbox.closest?.("label, [role='checkbox'], button, a, div") || checkbox;
    const indicator =
      clickable?.querySelector?.(".cb-i, [role='checkbox'], input[type='checkbox']") || null;
    const clickTargets = Array.from(new Set([indicator, clickable, checkbox].filter(Boolean)));

    for (const target of clickTargets) {
      simulateMouseMovement(target);
      await sleep(50 + Math.random() * 150);
      dispatchHumanEvent(target, "mouseover");
      dispatchHumanEvent(target, "mousemove");
      await sleep(30 + Math.random() * 100);
      dispatchHumanEvent(target, "mousedown", { button: 0 });
      await sleep(100 + Math.random() * 200);
      forceClick(target);
      clickAtCenter(target);
      clickElement(target);
      dispatchRichPointerClick(target);
      await sleep(50 + Math.random() * 100);
      dispatchHumanEvent(target, "mouseup", { button: 0 });
      dispatchHumanEvent(target, "click");
      await sleep(50 + Math.random() * 100);

      try {
        if (typeof target.focus === "function") {
          target.focus({ preventScroll: true });
          await sleep(30 + Math.random() * 80);
        }
        dispatchHumanEvent(target, "keydown", {
          key: " ",
          code: "Space",
          keyCode: 32
        });
        await sleep(50 + Math.random() * 100);
        dispatchHumanEvent(target, "keypress", {
          key: " ",
          code: "Space",
          keyCode: 32
        });
        await sleep(50 + Math.random() * 100);
        dispatchHumanEvent(target, "keyup", {
          key: " ",
          code: "Space",
          keyCode: 32
        });
      } catch (_) {}
    }
    log("检测到人机验证，已模拟真实操作点击 Verify checkbox");
    return true;
  }

  state.humanVerifyAttempted = false;
  return true;
}

function ensureLogPanel() {
  if (!IS_TOP_FRAME) return;
  if (state.logPanelEl || !document.body) return;
  const existing = document.getElementById("nol-ticket-bot-log-panel");
  if (existing) {
    state.logPanelEl = existing;
    state.logListEl = existing.querySelector("div:last-child");
    return;
  }
  const panel = document.createElement("div");
  panel.id = "nol-ticket-bot-log-panel";
  Object.assign(panel.style, {
    position: "fixed",
    right: "14px",
    bottom: "58px",
    width: "360px",
    maxHeight: "240px",
    overflow: "hidden",
    zIndex: "2147483647",
    background: "rgba(17,24,39,0.92)",
    color: "#e5e7eb",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "10px",
    boxShadow: "0 6px 20px rgba(0,0,0,.35)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "11px"
  });

  const title = document.createElement("div");
  title.textContent = "NOL BOT Logs";
  Object.assign(title.style, {
    padding: "8px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    fontWeight: "600",
    color: "#93c5fd"
  });

  const list = document.createElement("div");
  Object.assign(list.style, {
    padding: "8px 10px",
    maxHeight: "190px",
    overflowY: "auto",
    lineHeight: "1.4",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word"
  });

  panel.appendChild(title);
  panel.appendChild(list);
  document.body.appendChild(panel);
  state.logPanelEl = panel;
  state.logListEl = list;
}

function pushVisibleLog(text) {
  ensureLogPanel();
  if (!state.logListEl) return;
  const now = new Date();
  const ts = now.toTimeString().slice(0, 8);
  state.logBuffer.push(`${ts} ${text}`);
  if (state.logBuffer.length > 18) state.logBuffer.shift();
  state.logListEl.textContent = state.logBuffer.join("\n");
}

async function signalEximbayActive() {
  const now = Date.now();
  if (now - state.eximbaySignalAt < 800) return;
  state.eximbaySignalAt = now;
  await chrome.storage.local
    .set({
      [EXIMBAY_ACTIVE_KEY]: {
        ts: now,
        host: location.host,
        url: location.href
      }
    })
    .catch(() => {});
}

function hasEximbayContextInDom() {
  if (location.host === "secureapi.ext.eximbay.com") return true;
  if (location.href.includes("secureapi.ext.eximbay.com")) return true;
  const iframe = document.querySelector(
    "iframe[src*='secureapi.ext.eximbay.com'], frame[src*='secureapi.ext.eximbay.com']"
  );
  if (iframe) return true;
  const text = getWholeText();
  return text.includes("eximbay") || text.includes("wechat pay") || text.includes("credit / debit");
}

async function isEximbayFlowLikelyActive() {
  if (hasEximbayContextInDom()) return true;
  const all = await chrome.storage.local
    .get([EXIMBAY_ACTIVE_KEY, "nolBotContentReady"])
    .catch(() => ({}));
  const marker = all[EXIMBAY_ACTIVE_KEY];
  if (marker?.ts && Date.now() - Number(marker.ts) < 25000) return true;
  const ready = all.nolBotContentReady;
  if (
    ready?.host === "secureapi.ext.eximbay.com" &&
    ready?.ts &&
    Date.now() - Number(ready.ts) < 25000
  ) {
    return true;
  }
  return false;
}

function ensureBadge() {
  if (!IS_TOP_FRAME) return;
  if (state.badgeEl || !document.body) return;
  const badge = document.createElement("div");
  badge.id = "nol-ticket-bot-badge";
  Object.assign(badge.style, {
    position: "fixed",
    right: "14px",
    bottom: "14px",
    zIndex: "2147483647",
    background: "#1f3fff",
    color: "#fff",
    fontSize: "12px",
    lineHeight: "1",
    padding: "9px 10px",
    borderRadius: "999px",
    boxShadow: "0 6px 18px rgba(0,0,0,.2)",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
  });
  document.body.appendChild(badge);
  state.badgeEl = badge;
}

function setBadge(text, active) {
  ensureBadge();
  if (!state.badgeEl) return;
  state.badgeEl.textContent = text;
  state.badgeEl.style.background = active ? "#1f3fff" : "#6b7280";
}

function findClickableByText(words) {
  const targets = Array.from(
    document.querySelectorAll(
      "button, a, [role='button'], [role='tab'], div, span"
    )
  );
  const normalizedWords = words.map((w) => normalizeText(w));
  for (const el of targets) {
    if (!visible(el)) continue;
    const text = normalizeText(el.textContent);
    if (!text) continue;
    if (normalizedWords.some((w) => text.includes(w))) {
      return el;
    }
  }
  return null;
}

function findButtonByClassAndText(words) {
  const normalizedWords = words.map((w) => normalizeText(w));
  const buttons = Array.from(document.querySelectorAll("button")).filter(visible);
  const preferred = buttons.filter((btn) => {
    const classBag = normalizeText(btn.className || "");
    return classBag.includes("joint-rectangle-button");
  });
  const pool = preferred.length ? preferred : buttons;
  for (const btn of pool) {
    const text = normalizeText(btn.textContent);
    if (!text) continue;
    if (normalizedWords.some((w) => text.includes(w))) return btn;
  }
  return null;
}

function clickByKeywords(words) {
  const byClass = findButtonByClassAndText(words);
  if (byClass) return clickElement(byClass);
  const generic = findClickableByText(words);
  if (generic) return clickElement(generic);
  return false;
}

function clickBottomRightPrimaryButton(words) {
  const normalizedWords = words.map((w) => normalizeText(w));
  const buttons = Array.from(document.querySelectorAll("button")).filter(visible);
  const candidates = buttons
    .map((btn) => {
      const text = normalizeText(btn.textContent);
      if (!text) return null;
      if (!normalizedWords.some((w) => text.includes(w))) return null;
      const cls = normalizeText(btn.className || "");
      const disabled =
        btn.disabled ||
        cls.includes("disabled") ||
        btn.getAttribute("aria-disabled") === "true";
      if (disabled) return null;
      const r = btn.getBoundingClientRect();
      let score = 0;
      if (r.left > window.innerWidth * 0.55) score += 4;
      if (r.top > window.innerHeight * 0.7) score += 4;
      if (r.width > 220) score += 2;
      if (r.height > 44) score += 2;
      if (cls.includes("joint-rectangle-button")) score += 3;
      return { btn, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const target = candidates[0]?.btn;
  if (!target) return false;
  return clickElement(target);
}

function findAllByText(words) {
  const targets = Array.from(
    document.querySelectorAll(
      "button, a, [role='button'], [role='tab'], div, span, li"
    )
  );
  const normalizedWords = words.map((w) => normalizeText(w));
  return targets.filter((el) => {
    if (!visible(el)) return false;
    const text = normalizeText(el.textContent);
    return text && normalizedWords.some((w) => text.includes(w));
  });
}

function typeInInput(input, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
}

function getWholeText() {
  return normalizeText(document.body?.innerText || "");
}

function countDomSelectedSeats() {
  const selectedNodes = Array.from(
    document.querySelectorAll(
      "svg [class*='selected'], svg [aria-selected='true'], svg [data-selected='true']"
    )
  );
  const unique = new Set();
  selectedNodes.forEach((el) => {
    if (!visibleForSeat(el)) return;
    if (hasDisabledSeatMarker(el)) return;
    const cls = normalizeText(getClassBag(el));
    const id = normalizeText(el.id || "");
    const attrs = normalizeText(
      [
        el.getAttribute("aria-label"),
        el.getAttribute("data-seat"),
        el.getAttribute("data-seat-id"),
        el.getAttribute("data-status")
      ]
        .filter(Boolean)
        .join(" ")
    );
    const bag = `${cls} ${id} ${attrs}`;
    const seatLike =
      hasSeatMapClassPrefix(el, "seatmap_selected__") ||
      hasSeatMapClassPrefix(el, "seatmap_seatsvg__") ||
      bag.includes("seat") ||
      bag.includes("좌석") ||
      bag.includes("席");
    if (!seatLike) return;

    const { blockId } = findSeatBlockAndCluster(el);
    if (!blockId) return;
    const rect = el.getBoundingClientRect();
    const key =
      el.id ||
      `${blockId}@${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(
        rect.width
      )}:${Math.round(rect.height)}`;
    unique.add(key);
  });
  return unique.size;
}

function detectSelectedSeatCount() {
  const now = Date.now();
  if (now - state.selectedSeatCountCache.ts < 120) {
    return state.selectedSeatCountCache.count;
  }

  const text = getWholeText();
  const domCount = countDomSelectedSeats();
  let textCount = 0;

  if (
    text.includes("尚未选择座位") ||
    text.includes("尚未選擇座位") ||
    text.includes("no seats selected")
  ) {
    textCount = 0;
  }

  const strictPatterns = [
    /全席\s*(\d+)\s*\/\s*(\d+)/i,
    /선택\s*좌석\s*(\d+)\s*\/\s*(\d+)/i,
    /(selected seats?|seat selected)\s*(\d+)\s*\/\s*(\d+)/i
  ];
  for (const re of strictPatterns) {
    const m = text.match(re);
    if (!m) continue;
    const a = Number(m[m.length - 2]);
    const b = Number(m[m.length - 1]);
    if (Number.isFinite(a) && Number.isFinite(b) && b >= 1 && b <= 12 && a >= 0 && a <= b) {
      textCount = Math.max(textCount, a);
    }
  }

  // 兜底：抓 1/2 之类计数，避免误用较大数字（年份/时间等）。
  const looseMatches = Array.from(text.matchAll(/(\d{1,2})\s*\/\s*(\d{1,2})/g));
  looseMatches.forEach((m) => {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    if (b < 1 || b > 12) return;
    if (a < 0 || a > b) return;
    textCount = Math.max(textCount, a);
  });

  const count = Math.max(textCount, domCount);
  if (!Number.isFinite(count) || count < 0) {
    state.selectedSeatCountCache = { ts: now, count: 0 };
    return 0;
  }
  state.selectedSeatCountCache = { ts: now, count };
  return count;
}

function getClassBag(el) {
  if (!el) return "";
  const raw = el.className;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw.baseVal === "string") return raw.baseVal;
  return "";
}

function hasSeatMapClassPrefix(el, prefix) {
  const target = String(prefix || "").toLowerCase();
  let node = el;
  for (let depth = 0; node && depth < 4; depth += 1) {
    const cls = getClassBag(node);
    if (cls) {
      const tokens = cls.split(/\s+/).map((x) => x.trim()).filter(Boolean);
      if (tokens.some((t) => t.toLowerCase().startsWith(target))) return true;
    }
    node = node.parentElement;
  }
  return false;
}

function hasDisabledSeatMarker(el) {
  let node = el;
  for (let depth = 0; node && depth < 4; depth += 1) {
    const cls = normalizeText(getClassBag(node));
    const ariaDisabled = normalizeText(node.getAttribute?.("aria-disabled") || "");
    const dataStatus = normalizeText(node.getAttribute?.("data-status") || "");
    if (
      ariaDisabled === "true" ||
      cls.includes("seatmap_disabled__") ||
      cls.includes("disabled") ||
      cls.includes("sold") ||
      cls.includes("reserved") ||
      cls.includes("unavailable") ||
      cls.includes("occupied") ||
      dataStatus.includes("disable") ||
      dataStatus.includes("sold") ||
      dataStatus.includes("reserved")
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function parseSeatRowHint(el) {
  const text = normalizeText(
    [
      el.getAttribute("aria-label"),
      el.getAttribute("data-seat"),
      el.getAttribute("data-seat-id"),
      el.id
    ]
      .filter(Boolean)
      .join(" ")
  );
  if (!text) return null;
  let m = text.match(/(?:row|열|排|행)\s*([0-9]{1,2})/i);
  if (!m) m = text.match(/([0-9]{1,2})\s*(?:row|열|排|행)/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n;
}

function findSeatBlockId(el) {
  let node = el;
  for (let depth = 0; node && depth < 8; depth += 1) {
    if ((node.tagName || "").toLowerCase() === "g") {
      const id = node.id || "";
      if (/^seat_block_/i.test(id)) return id;
    }
    node = node.parentElement;
  }
  return "";
}

function parseSeatBlockParts(blockId) {
  const m = String(blockId || "").match(/^seat_block_(\d+):(\d+)$/i);
  if (!m) return null;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
  return { major, minor };
}

function getSeatBlockPriority(blockId) {
  // 仅作同层 tie-break，主排序由几何位置（靠前+靠中）决定。
  const parts = parseSeatBlockParts(blockId);
  if (!parts) return Number.POSITIVE_INFINITY;
  const { major, minor } = parts;
  return major * 1000 + minor;
}

function getSiblingGIndex(el) {
  if (!el || !el.parentElement) return 0;
  const gs = Array.from(el.parentElement.children).filter(
    (child) => (child.tagName || "").toLowerCase() === "g"
  );
  const idx = gs.indexOf(el);
  return idx >= 0 ? idx : 0;
}

function findSeatBlockAndCluster(el) {
  let node = el;
  let nearestG = null;
  for (let depth = 0; node && depth < 10; depth += 1) {
    if ((node.tagName || "").toLowerCase() === "g") {
      if (!nearestG) nearestG = node;
      const id = node.id || "";
      if (/^seat_block_/i.test(id)) {
        const blockId = id;
        const clusterEl = nearestG && nearestG !== node ? nearestG : node;
        let clusterId = clusterEl.id || "";
        if (!clusterId) {
          clusterId = `${blockId}::__g${getSiblingGIndex(clusterEl)}`;
        }
        return { blockId, clusterId };
      }
    }
    node = node.parentElement;
  }
  return { blockId: "", clusterId: "" };
}

function buildSeatBlockMetrics(mapped) {
  const groups = new Map();
  mapped.forEach((item, idx) => {
    const key = item.blockId || "__no_block__";
    const rect = item.rect;
    const g = groups.get(key) || {
      blockId: key,
      minTop: Number.POSITIVE_INFINITY,
      minLeft: Number.POSITIVE_INFINITY,
      maxRight: Number.NEGATIVE_INFINITY,
      maxBottom: Number.NEGATIVE_INFINITY,
      firstOrder: idx,
      count: 0
    };
    g.minTop = Math.min(g.minTop, rect.top);
    g.minLeft = Math.min(g.minLeft, rect.left);
    g.maxRight = Math.max(g.maxRight, rect.right);
    g.maxBottom = Math.max(g.maxBottom, rect.bottom);
    g.firstOrder = Math.min(g.firstOrder, idx);
    g.count += 1;
    groups.set(key, g);
  });

  const metrics = new Map();
  for (const [key, g] of groups.entries()) {
    const blockCenterX = (g.minLeft + g.maxRight) / 2;
    const blockCenterDist = Math.abs(blockCenterX - window.innerWidth / 2);
    // 综合“靠前 + 靠中”。值越小越优先。
    const frontNorm = g.minTop / Math.max(1, window.innerHeight);
    const centerNorm = blockCenterDist / Math.max(1, window.innerWidth);
    const blockScore = frontNorm * 0.6 + centerNorm * 0.4;
    const blockPriority = getSeatBlockPriority(key);
    metrics.set(key, {
      blockId: key,
      blockPriority,
      blockTop: g.minTop,
      blockCenterDist,
      blockScore,
      firstOrder: g.firstOrder,
      count: g.count
    });
  }
  return metrics;
}

function buildSeatClusterMetrics(mapped) {
  const groups = new Map();
  mapped.forEach((item, idx) => {
    const key = item.clusterId || item.blockId || "__no_cluster__";
    const rect = item.rect;
    const g = groups.get(key) || {
      clusterId: key,
      minTop: Number.POSITIVE_INFINITY,
      minLeft: Number.POSITIVE_INFINITY,
      maxRight: Number.NEGATIVE_INFINITY,
      firstOrder: idx,
      count: 0
    };
    g.minTop = Math.min(g.minTop, rect.top);
    g.minLeft = Math.min(g.minLeft, rect.left);
    g.maxRight = Math.max(g.maxRight, rect.right);
    g.firstOrder = Math.min(g.firstOrder, idx);
    g.count += 1;
    groups.set(key, g);
  });

  const metrics = new Map();
  for (const [key, g] of groups.entries()) {
    const centerX = (g.minLeft + g.maxRight) / 2;
    const centerDist = Math.abs(centerX - window.innerWidth / 2);
    const frontNorm = g.minTop / Math.max(1, window.innerHeight);
    const centerNorm = centerDist / Math.max(1, window.innerWidth);
    const score = frontNorm * 0.6 + centerNorm * 0.4;
    metrics.set(key, {
      clusterId: key,
      clusterTop: g.minTop,
      clusterCenterDist: centerDist,
      clusterScore: score,
      firstOrder: g.firstOrder,
      count: g.count
    });
  }
  return metrics;
}

function getSeatCandidates() {
  const all = Array.from(
    document.querySelectorAll(
      "circle[id*='seat'], circle[class*='seat'], path[id*='seat'], [data-seat], [class*='seat'], [id*='seat']"
    )
  );

  const mapped = all
    .map((el) => {
      if (!visibleForSeat(el)) return null;
      const rect = el.getBoundingClientRect();
      // 兼容小圆点座位（r=1）和常规圆点；仅排除容器类大块元素。
      if (rect.width < 0.4 || rect.height < 0.4 || rect.width > 80 || rect.height > 80) return null;

      const cls = normalizeText(getClassBag(el));
      const id = normalizeText(el.id || "");
      const attrs = normalizeText(
        [
          el.getAttribute("aria-label"),
          el.getAttribute("data-status"),
          el.getAttribute("data-seat"),
          el.getAttribute("aria-disabled")
        ]
          .filter(Boolean)
          .join(" ")
      );
      const bag = `${cls} ${id} ${attrs}`;

      const hasSeatSvgClass = hasSeatMapClassPrefix(el, "seatmap_seatsvg__");
      const hasDisabledClass = hasSeatMapClassPrefix(el, "seatmap_disabled__");
      const hasSelectedClass = hasSeatMapClassPrefix(el, "seatmap_selected__");
      const looksLikeSeat =
        hasSeatSvgClass ||
        bag.includes("seat") ||
        bag.includes("좌석") ||
        bag.includes("席") ||
        el.tagName.toLowerCase() === "circle" ||
        Boolean(el.ownerSVGElement);
      if (!looksLikeSeat) return null;

      const blocked =
        hasDisabledClass ||
        hasSelectedClass ||
        hasDisabledSeatMarker(el) ||
        bag.includes("선택됨") ||
        bag.includes("selected") ||
        bag.includes("已选");
      if (blocked) return null;

      const centerX = rect.left + rect.width / 2;
      const centerDist = Math.abs(centerX - window.innerWidth / 2);
      const rowHint = parseSeatRowHint(el);
      const { blockId, clusterId } = findSeatBlockAndCluster(el);
      if (!blockId) return null;
      return { el, rect, centerDist, rowHint, blockId, clusterId };
    })
    .filter(Boolean);

  const blockMetrics = buildSeatBlockMetrics(mapped);
  const clusterMetrics = buildSeatClusterMetrics(mapped);
  mapped.sort((a, b) => {
    const ba = blockMetrics.get(a.blockId || "__no_block__");
    const bb = blockMetrics.get(b.blockId || "__no_block__");
    const aBlockTop = ba?.blockTop ?? Number.POSITIVE_INFINITY;
    const bBlockTop = bb?.blockTop ?? Number.POSITIVE_INFINITY;
    // 先按 block 靠前（top 更小）排序。
    if (Math.abs(aBlockTop - bBlockTop) > 1) return aBlockTop - bBlockTop;
    const aBlockCenter = ba?.blockCenterDist ?? Number.POSITIVE_INFINITY;
    const bBlockCenter = bb?.blockCenterDist ?? Number.POSITIVE_INFINITY;
    // 同层前后接近时，优先 block 靠中。
    if (Math.abs(aBlockCenter - bBlockCenter) > 1) return aBlockCenter - bBlockCenter;
    const aBlockPriority = ba?.blockPriority ?? Number.POSITIVE_INFINITY;
    const bBlockPriority = bb?.blockPriority ?? Number.POSITIVE_INFINITY;
    if (aBlockPriority !== bBlockPriority) return aBlockPriority - bBlockPriority;

    const ca = clusterMetrics.get(a.clusterId || a.blockId || "__no_cluster__");
    const cb = clusterMetrics.get(b.clusterId || b.blockId || "__no_cluster__");
    const caScore = ca?.clusterScore ?? Number.POSITIVE_INFINITY;
    const cbScore = cb?.clusterScore ?? Number.POSITIVE_INFINITY;
    if (Math.abs(caScore - cbScore) > 0.0001) return caScore - cbScore;
    const caTop = ca?.clusterTop ?? Number.POSITIVE_INFINITY;
    const cbTop = cb?.clusterTop ?? Number.POSITIVE_INFINITY;
    if (Math.abs(caTop - cbTop) > 2) return caTop - cbTop;
    const caCenter = ca?.clusterCenterDist ?? Number.POSITIVE_INFINITY;
    const cbCenter = cb?.clusterCenterDist ?? Number.POSITIVE_INFINITY;
    if (Math.abs(caCenter - cbCenter) > 1) return caCenter - cbCenter;
    const caOrder = ca?.firstOrder ?? Number.POSITIVE_INFINITY;
    const cbOrder = cb?.firstOrder ?? Number.POSITIVE_INFINITY;
    if (caOrder !== cbOrder) return caOrder - cbOrder;

    const aScore = ba?.blockScore ?? Number.POSITIVE_INFINITY;
    const bScore = bb?.blockScore ?? Number.POSITIVE_INFINITY;
    if (Math.abs(aScore - bScore) > 0.0001) return aScore - bScore;
    const aOrder = ba?.firstOrder ?? Number.POSITIVE_INFINITY;
    const bOrder = bb?.firstOrder ?? Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder - bOrder;

    const rowA = Number.isFinite(a.rowHint) ? a.rowHint : Number.POSITIVE_INFINITY;
    const rowB = Number.isFinite(b.rowHint) ? b.rowHint : Number.POSITIVE_INFINITY;
    if (rowA !== rowB) return rowA - rowB;
    // 行号未知时，Y 越小越靠前（更靠近舞台）。
    if (Math.abs(a.rect.top - b.rect.top) > 2) return a.rect.top - b.rect.top;
    // 同排优先中轴附近。
    if (Math.abs(a.centerDist - b.centerDist) > 1) return a.centerDist - b.centerDist;
    return a.rect.left - b.rect.left;
  });

  return mapped.map((x) => x.el);
}

function clickSeatCandidate(el) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "circle" || tag === "path" || el.ownerSVGElement) {
    return forceClick(el) || clickAtCenter(el);
  }
  return clickElement(el);
}

async function chooseSeatsByClick(quantity) {
  const target = Math.max(1, Number(quantity || 1));
  if (detectSelectedSeatCount() >= target) return true;

  const tried = new WeakSet();
  let hintedBlock = false;
  for (let round = 0; round < 3; round += 1) {
    const current = detectSelectedSeatCount();
    if (current >= target) break;

    const remaining = target - current;
    const budget = Math.max(remaining * 12, 14);
    let attempts = 0;
    const candidates = getSeatCandidates().filter((el) => !tried.has(el));
    if (!candidates.length) {
      const totalSeatSvg = document.querySelectorAll("[class*='SeatMap_seatSvg__'], [class*='seatSvg']").length;
      const disabledSeatSvg = document.querySelectorAll("[class*='SeatMap_seatSvg__'][class*='disabled'], [class*='seatSvg'][class*='disabled']").length;
      log(`未发现可选座位候选 (seatSvg=${totalSeatSvg}, disabled=${disabledSeatSvg})`);
      break;
    }
    if (!hintedBlock) {
      const first = candidates[0];
      const topBlock = findSeatBlockId(first);
      const topCluster = findSeatBlockAndCluster(first)?.clusterId || "";
      const blockMetric = buildSeatBlockMetrics(
        candidates.map((el) => {
          const rect = el.getBoundingClientRect();
          const { blockId, clusterId } = findSeatBlockAndCluster(el);
          return { el, rect, blockId, clusterId };
        })
      ).get(topBlock || "__no_block__");
      const topTop = Number.isFinite(blockMetric?.blockTop) ? Math.round(blockMetric.blockTop) : -1;
      if (topBlock && topCluster && topCluster !== topBlock) {
        log(`优先座位块: ${topBlock} / ${topCluster} (top=${topTop})`);
      } else if (topBlock) {
        log(`优先座位块: ${topBlock} (top=${topTop})`);
      }
      hintedBlock = true;
    }

    for (const seat of candidates) {
      if (attempts >= budget) break;
      const before = detectSelectedSeatCount();
      if (before >= target) break;

      tried.add(seat);
      attempts += 1;
      if (!clickSeatCandidate(seat)) continue;
      // 选座计数在部分场馆页面会有渲染延迟，等待更久避免超点
      await sleep(220);

      const after = detectSelectedSeatCount();
      if (after > before) {
        log(`选座进度: ${after}/${target}`);
        await sleep(50);
      }
    }
    await sleep(120);
  }

  return detectSelectedSeatCount() >= target;
}

function getSelectedSeatCandidates() {
  return Array.from(
    document.querySelectorAll(
      "svg [class*='selected'], svg [aria-selected='true'], svg [data-selected='true']"
    )
  )
    .filter((el) => visibleForSeat(el))
    .filter((el) => !hasDisabledSeatMarker(el))
    .filter((el) => {
      const cls = normalizeText(getClassBag(el));
      const id = normalizeText(el.id || "");
      const attrs = normalizeText(
        [
          el.getAttribute("aria-label"),
          el.getAttribute("data-seat"),
          el.getAttribute("data-seat-id"),
          el.getAttribute("data-status")
        ]
          .filter(Boolean)
          .join(" ")
      );
      const bag = `${cls} ${id} ${attrs}`;
      return (
        hasSeatMapClassPrefix(el, "seatmap_selected__") ||
        hasSeatMapClassPrefix(el, "seatmap_seatsvg__") ||
        bag.includes("seat") ||
        bag.includes("좌석") ||
        bag.includes("席")
      );
    });
}

async function trimSelectedSeatsToTarget(target) {
  let current = detectSelectedSeatCount();
  if (current <= target) return false;

  let changed = false;
  for (let i = 0; i < 6 && current > target; i += 1) {
    const selected = getSelectedSeatCandidates();
    if (!selected.length) break;
    // 从较靠后的已选座开始取消，尽量保留靠前座位
    selected.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      if (Math.abs(ar.top - br.top) > 2) return br.top - ar.top;
      return Math.abs(br.left - window.innerWidth / 2) - Math.abs(ar.left - window.innerWidth / 2);
    });

    const needDrop = Math.max(1, current - target);
    for (let k = 0; k < Math.min(needDrop, selected.length); k += 1) {
      if (!clickSeatCandidate(selected[k])) continue;
      changed = true;
      await sleep(180);
    }
    current = detectSelectedSeatCount();
  }

  if (changed) {
    log(`已回退多选座位，当前: ${detectSelectedSeatCount()}/${target}`);
  }
  return changed;
}

function closeSeatUnlockNoticeIfPresent() {
  const text = getWholeText();
  const hit =
    text.includes("其他客户已选定的座位将被解除锁定") ||
    text.includes("其他客戶已選定的座位將被解除鎖定") ||
    text.includes("selected by another customer") ||
    text.includes("will be unlocked");
  if (!hit) return false;

  const okWords = ["確認", "确认", "ok", "confirm"];
  if (clickBottomRightPrimaryButton(okWords) || clickByKeywords(okWords)) {
    log("已处理座位锁定提示弹窗(確認)");
    return true;
  }
  return false;
}

async function runSeatStep() {
  log("开始执行选座步骤");
  const target = normalizeQuantity(state.config.quantity, 1);
  if (closeSeatUnlockNoticeIfPresent()) {
    await sleep(140);
    return;
  }
  const selected = detectSelectedSeatCount();
  if (selected < target) {
    log(`选座目标: ${target}, 当前已选: ${selected}`);
    await chooseSeatsByClick(target);
  } else if (selected > target) {
    log(`已选座位超过目标: ${selected}/${target}，开始回退`);
    await trimSelectedSeatsToTarget(target);
  }
  const finalCount = detectSelectedSeatCount();
  if (finalCount <= 0) {
    log("未检测到已选座位，跳过 完成选择");
    return;
  }
  if (finalCount > target) {
    log(`回退后仍超目标(${finalCount}/${target})，本轮不点完成选择`);
    return;
  }
  if (clickByKeywords(STEP_TEXT.completeSeat)) {
    // 每次完成选座后，允许价格页重新触发一次预购点击
    state.pricePreorderClicked = false;
    state.pricePlusClickCount = 0;
    state.priceLastPreorderClickAt = 0;
    log(`已点击 完成选择 (当前已选: ${finalCount})`);
    await sleep(300);
  }
}

function findPlusButton() {
  const spinnerPlus = Array.from(document.querySelectorAll("button"))
    .filter(visible)
    .find((btn) => {
      const cls = String(btn.className || "");
      return /(?:^|\s)Spinner_buttons__\S+/.test(cls) && !/(?:^|\s)Spinner_minus__\S+/.test(cls);
    });
  if (spinnerPlus) return spinnerPlus;

  const strictPlus = Array.from(document.querySelectorAll("button[aria-label]"))
    .filter(visible)
    .find((btn) => {
      const aria = normalizeText(btn.getAttribute("aria-label") || "");
      const cls = normalizeText(btn.className?.toString() || "");
      const isIncrease = aria.includes("증가") || aria.includes("increase") || aria.includes("plus");
      const isMinus = aria.includes("감소") || cls.includes("spinner_minus");
      return isIncrease && !isMinus;
    });
  if (strictPlus) return strictPlus;

  const controls = Array.from(
    document.querySelectorAll("button, [role='button'], div, span")
  ).filter(visible);

  const plusTextSet = new Set(["+", "＋", "﹢", "➕", "✚"]);
  const scored = controls
    .map((el) => {
      const text = (el.textContent || "").trim();
      const bag = normalizeText(
        [
          text,
          el.getAttribute("aria-label"),
          el.getAttribute("title"),
          el.id,
          el.className?.toString()
        ]
          .filter(Boolean)
          .join(" ")
      );
      const rect = el.getBoundingClientRect();
      let score = 0;
      if (plusTextSet.has(text)) score += 8;
      if (
        bag.includes("plus") ||
        bag.includes("add") ||
        bag.includes("increase") ||
        bag.includes("추가") ||
        bag.includes("증가")
      ) {
        score += 6;
      }
      if (rect.left > window.innerWidth * 0.55) score += 3;
      if (rect.width <= 64 && rect.height <= 64) score += 2;
      if (window.getComputedStyle(el).borderRadius !== "0px") score += 1;
      return { el, score, rect };
    })
    .filter((item) => item.score >= 6)
    .sort((a, b) => b.score - a.score || b.rect.left - a.rect.left);

  return scored[0]?.el || findQuantityControlByNeighbor("plus") || null;
}

function findQuantityControlByNeighbor(direction) {
  const numberNodes = Array.from(document.querySelectorAll("div, span, p"))
    .filter(visible)
    .map((el) => ({ el, text: (el.textContent || "").trim() }))
    .filter((x) => /^\d{1,2}$/.test(x.text))
    .map((x) => ({ ...x, rect: x.el.getBoundingClientRect() }))
    .filter((x) => x.rect.left > window.innerWidth * 0.55 && x.rect.width < 80)
    .sort((a, b) => b.rect.left - a.rect.left);
  const anchor = numberNodes[0];
  if (!anchor) return null;

  const controls = Array.from(document.querySelectorAll("button, [role='button'], div, span"))
    .filter(visible)
    .map((el) => ({ el, rect: el.getBoundingClientRect(), text: (el.textContent || "").trim() }))
    .filter((x) => x.rect.width >= 24 && x.rect.width <= 80 && x.rect.height >= 24 && x.rect.height <= 80);

  const side = controls
    .filter((x) => Math.abs(x.rect.top - anchor.rect.top) < 80)
    .filter((x) =>
      direction === "plus"
        ? x.rect.left > anchor.rect.right - 6
        : x.rect.right < anchor.rect.left + 6
    )
    .sort((a, b) =>
      direction === "plus" ? a.rect.left - b.rect.left : b.rect.right - a.rect.right
    );

  return side[0]?.el || null;
}

function detectCurrentQuantityFromText() {
  const text = getWholeText().replace(/／/g, "/");
  const match = text.match(/(全席|all seats?|seat)\s*(\d+)\s*\/\s*(\d+)/i);
  if (match) return Number(match[2]);
  const loose = text.match(/(?:全席|all seats?|seat)?\s*(\d+)\s*\/\s*(\d+)/i);
  if (loose) return Number(loose[1]);
  const nums = Array.from(document.querySelectorAll("div, span, p"))
    .filter(visible)
    .map((el) => (el.textContent || "").trim())
    .filter((t) => /^\d{1,2}$/.test(t))
    .map((t) => Number(t))
    .filter((n) => n >= 1 && n <= 10);
  if (nums.length) return nums[0];
  return 0;
}

function getCurrentPriceQuantity() {
  const plus = findPlusButton();
  const minus = findMinusButton();
  if (plus && minus) {
    const pr = plus.getBoundingClientRect();
    const mr = minus.getBoundingClientRect();
    const left = Math.min(pr.right, mr.right) - 8;
    const right = Math.max(pr.left, mr.left) + 8;
    const centerY = (pr.top + pr.height / 2 + (mr.top + mr.height / 2)) / 2;
    const nearNums = Array.from(document.querySelectorAll("div, span, p, strong, b"))
      .filter(visible)
      .map((el) => ({ el, text: (el.textContent || "").trim(), r: el.getBoundingClientRect() }))
      .filter((x) => /^\d{1,2}$/.test(x.text))
      .filter((x) => x.r.left >= left && x.r.right <= right)
      .filter((x) => Math.abs(x.r.top + x.r.height / 2 - centerY) < 70)
      .sort(
        (a, b) =>
          Math.abs(a.r.top + a.r.height / 2 - centerY) -
          Math.abs(b.r.top + b.r.height / 2 - centerY)
      );
    if (nearNums.length) {
      const n = Number(nearNums[0].text);
      if (Number.isFinite(n)) return n;
    }
  }
  const fallback = detectCurrentQuantityFromText();
  return Number.isFinite(fallback) ? fallback : null;
}

function hasMoveToOrderConfirmPrompt() {
  const text = getWholeText();
  return (
    text.includes("確定要移動至訂購確認") ||
    text.includes("移动至订购确认") ||
    text.includes("移動時會失去現在的訂購")
  );
}

function findMinusButton() {
  const spinnerMinus = Array.from(document.querySelectorAll("button"))
    .filter(visible)
    .find((btn) => {
      const cls = String(btn.className || "");
      return /(?:^|\s)Spinner_minus__\S+/.test(cls);
    });
  if (spinnerMinus) return spinnerMinus;

  const strictMinus = Array.from(document.querySelectorAll("button[aria-label]"))
    .filter(visible)
    .find((btn) => {
      const aria = normalizeText(btn.getAttribute("aria-label") || "");
      const cls = normalizeText(btn.className?.toString() || "");
      return aria.includes("감소") || aria.includes("decrease") || cls.includes("spinner_minus");
    });
  if (strictMinus) return strictMinus;

  const controls = Array.from(
    document.querySelectorAll("button, [role='button'], div, span")
  ).filter(visible);
  const scored = controls
    .map((el) => {
      const text = (el.textContent || "").trim();
      const bag = normalizeText(
        [text, el.getAttribute("aria-label"), el.getAttribute("title"), el.className?.toString()]
          .filter(Boolean)
          .join(" ")
      );
      const r = el.getBoundingClientRect();
      let score = 0;
      if (text === "-" || text === "－" || text === "−") score += 8;
      if (bag.includes("minus") || bag.includes("decrease") || bag.includes("감소")) score += 6;
      if (r.left > window.innerWidth * 0.55) score += 2;
      if (r.width <= 64 && r.height <= 64) score += 2;
      return { el, score };
    })
    .filter((x) => x.score >= 6)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.el || findQuantityControlByNeighbor("minus") || null;
}

function getPreorderButtonStrict() {
  const words = ["预购", "預購", "preorder", "pre-order"];
  const buttons = Array.from(
    document.querySelectorAll("button, [role='button'], a, div, span")
  ).filter(visible);
  const candidates = buttons
    .map((el) => {
      const text = normalizeText(el.textContent || "");
      if (!text) return null;
      if (!words.some((w) => text.includes(normalizeText(w)))) return null;
      const r = el.getBoundingClientRect();
      const cls = normalizeText(el.className?.toString() || "");
      const disabled =
        el.disabled ||
        cls.includes("disabled") ||
        el.getAttribute("aria-disabled") === "true";
      if (disabled) return null;
      let score = 0;
      if (r.left > window.innerWidth * 0.55) score += 5;
      if (r.top > window.innerHeight * 0.65) score += 5;
      if (r.width > 140 && r.height > 36) score += 2;
      if (cls.includes("primary") || cls.includes("entbutton")) score += 3;
      return { el, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const target = candidates[0]?.el || null;
  return target;
}

function isElementDisabledLike(el) {
  if (!el) return true;
  const cls = normalizeText(el.className?.toString() || "");
  return (
    Boolean(el.disabled) ||
    cls.includes("disabled") ||
    el.getAttribute("aria-disabled") === "true"
  );
}

function clickPreorderButtonStrict() {
  const words = ["预购", "預購", "preorder", "pre-order"];
  const target = getPreorderButtonStrict();
  if (!target) {
    // fallback: bottom-right primary button with strict preorder keywords
    if (clickBottomRightPrimaryButton(words)) return true;
    if (clickByKeywords(words)) return true;
    return false;
  }
  forceClick(target);
  clickAtCenter(target);
  clickElement(target);
  return true;
}

function hasPreorderActionAvailable() {
  return Boolean(getPreorderButtonStrict());
}

async function runPriceStep() {
  const flowKey = `${location.host}${location.pathname}${location.search}`;
  if (state.priceFlowKey !== flowKey) {
    state.priceFlowKey = flowKey;
    state.priceBaseQuantity = null;
    state.pricePreorderClicked = false;
    state.pricePlusClickCount = 0;
    state.priceLastPreorderClickAt = 0;
  }

  if (hasMoveToOrderConfirmPrompt()) {
    log("检测到訂購確認弹窗，暂停价格页点击");
    return;
  }

  const target = Math.max(1, Number(state.config.quantity || 1));
  if (state.priceBaseQuantity === null) {
    const firstQty = getCurrentPriceQuantity();
    state.priceBaseQuantity = Number.isFinite(firstQty) && firstQty >= 0 ? firstQty : null;
    log(`价格页初始数量: ${Number.isFinite(state.priceBaseQuantity) ? state.priceBaseQuantity : "未知"}`);
  }

  for (let i = 0; i < 12; i += 1) {
    const beforeQty = getCurrentPriceQuantity();
    if (Number.isFinite(beforeQty) && beforeQty >= target) break;
    const plus = findPlusButton();
    if (!plus) {
      log(`未找到数量加号按钮(${state.pricePlusClickCount}/目标${target})`);
      break;
    }
    clickElement(plus);
    await sleep(180);
    const afterQty = getCurrentPriceQuantity();
    if (Number.isFinite(beforeQty) && Number.isFinite(afterQty)) {
      if (afterQty > beforeQty) {
        const delta = Math.max(1, afterQty - beforeQty);
        state.pricePlusClickCount += delta;
        log(`已点击数量加号并生效(${state.pricePlusClickCount}/目标${target})`);
      } else {
        log(`加号点击未生效，当前数量: ${afterQty}/${target}`);
      }
    } else {
      // 少数场景数量文本读取不到，退化为点击计数。
      state.pricePlusClickCount += 1;
      log(`已点击数量加号(无法验证数量变化)(${state.pricePlusClickCount}/目标${target})`);
    }
    await sleep(120);
  }

  const qtyAfterAdjust = getCurrentPriceQuantity();
  const quantityReady = Number.isFinite(qtyAfterAdjust)
    ? qtyAfterAdjust >= target
    : state.pricePlusClickCount >= target;
  if (!quantityReady) {
    log(
      `数量未达到目标，暂不点击訂購: 当前 ${Number.isFinite(qtyAfterAdjust) ? qtyAfterAdjust : "?"}/${target}`
    );
    return;
  }

  const preorderBtn = getPreorderButtonStrict();
  if (preorderBtn && isElementDisabledLike(preorderBtn)) {
    log("訂購按钮仍不可点，等待下一轮");
    return;
  }

  const now = Date.now();
  if (now - state.priceLastPreorderClickAt < 420) return;
  state.priceLastPreorderClickAt = now;

  if (clickPreorderButtonStrict()) {
    state.pricePreorderClicked = true;
    log("已点击 预购");
    await sleep(260);
  } else {
    log("未命中预购按钮，等待下一轮重试");
  }
}

function parseMonthParts(value) {
  const nums = String(value || "")
    .trim()
    .match(/\d+/g);
  if (!nums?.length) return { year: null, month: null };
  if (nums.length >= 2) {
    const year = nums[0].length >= 4 ? Number(nums[0]) : null;
    const month = Number(nums[nums.length - 1]);
    return { year, month: Number.isNaN(month) ? null : month };
  }
  const month = Number(nums[0]);
  return { year: null, month: Number.isNaN(month) ? null : month };
}

function getDisplayedMonthParts() {
  const nodes = Array.from(document.querySelectorAll("h1, h2, h3, strong, p, div, span"))
    .filter(visible)
    .slice(0, 200);
  for (const el of nodes) {
    const text = (el.textContent || "").trim();
    if (!text || text.length > 16) continue;
    const match = text.match(/(\d{4})\s*[./-]\s*(\d{1,2})/);
    if (!match) continue;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      return { year, month };
    }
  }
  return null;
}

function isConfiguredMonthVisible() {
  const targetRaw = String(state.config.dateMonth || "").trim();
  if (!targetRaw) return true;

  const target = parseMonthParts(targetRaw);
  if (!target.month) return true;

  const displayed = getDisplayedMonthParts();
  if (!displayed?.month) return true;

  if (displayed.month !== target.month) return false;
  if (target.year && displayed.year !== target.year) return false;
  return true;
}

function tryAdjustCalendarMonth() {
  const targetRaw = String(state.config.dateMonth || "").trim();
  if (!targetRaw) return false;
  const target = parseMonthParts(targetRaw);
  const displayed = getDisplayedMonthParts();
  if (!target.month || !displayed?.month) return false;

  let direction = 0;
  if (target.year && displayed.year) {
    const delta = (target.year - displayed.year) * 12 + (target.month - displayed.month);
    direction = delta > 0 ? 1 : delta < 0 ? -1 : 0;
  } else {
    direction = target.month > displayed.month ? 1 : target.month < displayed.month ? -1 : 0;
  }
  if (direction === 0) return false;

  const wordsNext = ["next", "다음", "下个月", "下月", "＞", ">", "→", "›", "»"];
  const wordsPrev = ["prev", "previous", "이전", "上个月", "上月", "＜", "<", "←", "‹", "«"];
  const words = direction > 0 ? wordsNext : wordsPrev;

  const candidates = Array.from(
    document.querySelectorAll("button, [role='button'], div, span")
  )
    .filter(visible)
    .map((el) => {
      const text = normalizeText(el.textContent || "");
      const bag = normalizeText(
        [text, el.getAttribute("aria-label"), el.getAttribute("title"), el.className?.toString()]
          .filter(Boolean)
          .join(" ")
      );
      if (!words.some((w) => bag.includes(normalizeText(w)))) return null;
      const r = el.getBoundingClientRect();
      if (r.left > window.innerWidth * 0.68) return null;
      if (r.top > window.innerHeight * 0.62) return null;
      let score = 0;
      if (r.width <= 56 && r.height <= 56) score += 4;
      if (r.top < window.innerHeight * 0.4) score += 3;
      if (r.left < window.innerWidth * 0.5) score += 2;
      if (bag.includes("month") || bag.includes("월")) score += 2;
      return { el, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const targetEl = candidates[0]?.el;
  if (!targetEl) return false;
  forceClick(targetEl);
  clickAtCenter(targetEl);
  clickElement(targetEl);
  log(`已尝试切换月份: ${displayed.year}.${displayed.month} -> ${targetRaw}`);
  return true;
}

function getDateDayCandidates() {
  const nodes = Array.from(
    document.querySelectorAll("button, [role='button'], td, div, span, li")
  ).filter(visible);

  const raw = nodes
    .map((el) => {
      const text = (el.textContent || "").trim();
      if (!/^\d{1,2}$/.test(text)) return null;
      const day = Number(text);
      if (!Number.isFinite(day) || day < 1 || day > 31) return null;
      const cls = normalizeText(el.className?.toString() || "");
      const disabled =
        el.disabled ||
        cls.includes("disabled") ||
        cls.includes("disable") ||
        cls.includes("unavailable") ||
        cls.includes("sold") ||
        cls.includes("closed") ||
        el.getAttribute("aria-disabled") === "true";
      if (disabled) return null;
      const r = el.getBoundingClientRect();
      if (r.left > window.innerWidth * 0.68) return null;
      if (r.top < 90 || r.top > window.innerHeight * 0.9) return null;
      if (r.width < 18 || r.width > 90 || r.height < 18 || r.height > 90) return null;

      const selected =
        cls.includes("selected") ||
        cls.includes("active") ||
        cls.includes("on") ||
        cls.includes("checked") ||
        el.getAttribute("aria-selected") === "true" ||
        el.getAttribute("aria-pressed") === "true";

      let score = 0;
      if (selected) score += 6;
      if (el.tagName.toLowerCase() === "button" || el.tagName.toLowerCase() === "td") score += 2;
      if (r.width >= 24 && r.width <= 64 && r.height >= 24 && r.height <= 64) score += 2;
      return { el, day, selected, score, r };
    })
    .filter(Boolean)
    .sort((a, b) => a.day - b.day || b.score - a.score || a.r.top - b.r.top || a.r.left - b.r.left);

  // 同一天可能命中多个节点，只保留最优一个
  const byDay = new Map();
  for (const item of raw) {
    const prev = byDay.get(item.day);
    if (!prev || item.score > prev.score) byDay.set(item.day, item);
  }
  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

function clickDateDayCandidate(candidate, reason = "") {
  if (!candidate?.el) return false;
  forceClick(candidate.el);
  clickAtCenter(candidate.el);
  clickElement(candidate.el);
  state.dateLastDayClickAt = Date.now();
  log(reason || `已选择日期: ${candidate.day}`);
  return true;
}

function isDateDaySelectedLikely() {
  return getDateDayCandidates().some((x) => x.selected);
}

function selectEarliestDateDay() {
  const days = getDateDayCandidates();
  if (!days.length) return false;
  const selected = days.find((x) => x.selected);
  if (selected && selected.day === days[0].day) return true;
  return clickDateDayCandidate(days[0], `已选择最早日期: ${days[0].day}`);
}

function selectNextDateDay() {
  const days = getDateDayCandidates();
  if (!days.length) return false;
  const selected = days.find((x) => x.selected);
  if (!selected) return clickDateDayCandidate(days[0], `已切换日期: ${days[0].day}`);
  const idx = days.findIndex((x) => x.day === selected.day);
  const next = idx >= 0 ? days[idx + 1] : null;
  if (!next) return false;
  return clickDateDayCandidate(next, `当前场次不可选，切换下一日期: ${next.day}`);
}

function selectConfiguredDateDay() {
  const raw = String(state.config.dateDay || "").trim();
  if (!raw) return true;
  const dayNum = Number(raw);
  if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > 31) return true;

  const target = getDateDayCandidates().find((x) => x.day === dayNum);
  if (!target) return false;
  if (target.selected) return true;
  return clickDateDayCandidate(target, `已选择日期: ${dayNum}`);
}

function normalizeTimeToken(text) {
  return normalizeText(text).replace(/\s+/g, "");
}

function isConfiguredTimeMatch(targetRaw, candidateText) {
  const targetMinutes = parseTimeMinutes(targetRaw);
  const candidateMinutes = parseTimeMinutes(candidateText);
  if (Number.isFinite(targetMinutes) && Number.isFinite(candidateMinutes)) {
    return targetMinutes === candidateMinutes;
  }
  const targetToken = normalizeTimeToken(targetRaw);
  const candidateToken = normalizeTimeToken(candidateText);
  if (!targetToken || !candidateToken) return false;
  return candidateToken.includes(targetToken) || targetToken.includes(candidateToken);
}

function hasNeedChooseSessionHint() {
  const text = getWholeText();
  return (
    text.includes("请选择场次") ||
    text.includes("請選擇場次") ||
    text.includes("请选择场次。") ||
    text.includes("please select a time") ||
    text.includes("please select a session") ||
    text.includes("회차를 선택")
  );
}

function parseTimeMinutes(text) {
  const m = String(text || "").match(/(\d{1,2})\s*[:：.]\s*(\d{2})\s*([ap]m)?/i);
  if (!m) return Number.POSITIVE_INFINITY;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return Number.POSITIVE_INFINITY;
  const ap = (m[3] || "").toLowerCase();
  if (ap) {
    if (ap === "pm" && hour < 12) hour += 12;
    if (ap === "am" && hour === 12) hour = 0;
  }
  return hour * 60 + minute;
}

function getDateTimeOptionCandidates(sortMode = "score") {
  const timePattern = /\b\d{1,2}\s*[:：.]\s*\d{2}\s*(?:am|pm)?\b/i;
  const nodes = Array.from(
    document.querySelectorAll("button, [role='button'], div, span, li, p")
  ).filter(visible);

  const scored = nodes
    .map((el) => {
      const text = (el.textContent || "").trim();
      if (!text || text.length > 120) return null;
      if (!timePattern.test(text)) return null;
      const cls = normalizeText(el.className?.toString() || "");
      const disabled =
        el.disabled ||
        cls.includes("disabled") ||
        cls.includes("disable") ||
        cls.includes("unavailable") ||
        el.getAttribute("aria-disabled") === "true";
      if (disabled) return null;
      const r = el.getBoundingClientRect();
      if (r.left < window.innerWidth * 0.35) return null;
      if (r.top < 70 || r.top > window.innerHeight * 0.85) return null;
      if (r.width < 100 || r.height < 30) return null;

      const selected =
        cls.includes("selected") ||
        cls.includes("active") ||
        cls.includes("on") ||
        cls.includes("checked") ||
        el.getAttribute("aria-selected") === "true" ||
        el.getAttribute("aria-pressed") === "true";

      let score = 0;
      if (selected) score += 8;
      if (r.left > window.innerWidth * 0.45) score += 5;
      if (r.width > 160 && r.height > 36) score += 3;
      if (text.toLowerCase().includes("standing")) score += 2;
      const timeMinutes = parseTimeMinutes(text);
      return { el, text, r, selected, score, timeMinutes };
    })
    .filter(Boolean);

  // 去掉同一卡片内多层嵌套元素造成的重复
  const deduped = [];
  for (const item of scored) {
    const isDup = deduped.some(
      (x) => Math.abs(x.r.left - item.r.left) < 8 && Math.abs(x.r.top - item.r.top) < 8
    );
    if (!isDup) deduped.push(item);
  }
  if (sortMode === "time") {
    deduped.sort(
      (a, b) =>
        a.timeMinutes - b.timeMinutes || a.r.top - b.r.top || a.r.left - b.r.left || b.score - a.score
    );
    return deduped;
  }
  deduped.sort((a, b) => b.score - a.score || a.r.top - b.r.top || a.r.left - b.r.left);
  return deduped;
}

function isDateTimeSelectedLikely() {
  const options = getDateTimeOptionCandidates();
  return options.some((x) => x.selected);
}

function selectAnyDateTimeOption() {
  const options = getDateTimeOptionCandidates("time");
  if (!options.length) return false;
  const target = options[0];
  if (target.selected) return true;
  const el = target.el;
  forceClick(el);
  clickAtCenter(el);
  clickElement(el);
  state.dateLastSlotClickAt = Date.now();
  log(`已选择最早场次: ${target.text}`);
  return true;
}

function hasAvailableDateTimeOption() {
  return getDateTimeOptionCandidates("time").length > 0;
}

function selectEarliestDateTimeOption() {
  const options = getDateTimeOptionCandidates("time");
  if (!options.length) return false;
  const target = options[0];
  if (target.selected) return true;
  const el = target.el;
  forceClick(el);
  clickAtCenter(el);
  clickElement(el);
  state.dateLastSlotClickAt = Date.now();
  log(`已选择最早场次: ${target.text}`);
  return true;
}

function selectConfiguredDateTime() {
  const targetRaw = String(state.config.dateTime || "").trim();
  if (!targetRaw) return true;

  const candidates = Array.from(
    document.querySelectorAll("button, [role='button'], div, span, li, p")
  )
    .filter(visible)
    .map((el) => {
      const text = (el.textContent || "").trim();
      if (!text || text.length > 80) return null;
      if (!isConfiguredTimeMatch(targetRaw, text)) return null;
      const cls = normalizeText(el.className?.toString() || "");
      const disabled =
        el.disabled ||
        cls.includes("disabled") ||
        cls.includes("disable") ||
        el.getAttribute("aria-disabled") === "true";
      if (disabled) return null;
      const r = el.getBoundingClientRect();
      let score = 0;
      if (r.left > window.innerWidth * 0.42) score += 6;
      if (r.top > 90 && r.top < window.innerHeight * 0.72) score += 3;
      if (r.width > 120 && r.height > 34) score += 4;
      if (cls.includes("selected") || cls.includes("active")) score += 1;
      const timeMinutes = parseTimeMinutes(text);
      const targetMinutes = parseTimeMinutes(targetRaw);
      if (Number.isFinite(timeMinutes) && Number.isFinite(targetMinutes) && timeMinutes === targetMinutes) {
        score += 5;
      }
      return { el, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const target = candidates[0]?.el;
  if (!target) return false;
  forceClick(target);
  clickAtCenter(target);
  clickElement(target);
  state.dateLastSlotClickAt = Date.now();
  log(`已选择场次: ${targetRaw}`);
  return true;
}

async function runDateStep() {
  const monthRaw = String(state.config.dateMonth || "").trim();
  const dayRaw = String(state.config.dateDay || "").trim();
  const timeRaw = String(state.config.dateTime || "").trim();
  const hasDateConfig = Boolean(
    monthRaw ||
      dayRaw ||
      timeRaw
  );
  const hasTimeConfig = Boolean(timeRaw);
  const isDefaultDateMode = !monthRaw && !dayRaw && !timeRaw;

  if (hasDateConfig) {
    if (!isConfiguredMonthVisible()) {
      if (!tryAdjustCalendarMonth()) {
        log(`当前月份与配置不一致，等待切换到 ${state.config.dateMonth}`);
      }
      return;
    }
    if (!selectConfiguredDateDay()) return;
    await sleep(120);
    if (hasTimeConfig) {
      if (!selectConfiguredDateTime()) {
        log(`未命中配置场次: ${state.config.dateTime}，等待下一轮`);
        return;
      }
      await sleep(120);
    }
  }

  // 默认模式（无配置）：最早日期 -> 最早场次；卖完则切下一日期
  if (isDefaultDateMode) {
    if (!isDateDaySelectedLikely()) {
      if (Date.now() - state.dateLastDayClickAt > 700) {
        if (!selectEarliestDateDay()) {
          log("未找到可选日期，等待下一轮");
        }
      }
      return;
    }

    if (!hasAvailableDateTimeOption()) {
      if (Date.now() - state.dateLastDayClickAt > 700 && selectNextDateDay()) {
        await sleep(150);
        return;
      }
      log("当前日期无可选场次，等待下一轮");
      return;
    }

    if (!isDateTimeSelectedLikely()) {
      if (Date.now() - state.dateLastSlotClickAt > 900) {
        selectEarliestDateTimeOption();
      }
      if (hasNeedChooseSessionHint() || !isDateTimeSelectedLikely()) {
        log("场次尚未确认选中，暂停点击下一步");
        return;
      }
    }
  }

  // 日期页必须先选场次，否则会一直 toast“请选择场次”
  if (!isDefaultDateMode && !isDateTimeSelectedLikely()) {
    const slotClickedRecently = Date.now() - state.dateLastSlotClickAt < 1200;
    if (!slotClickedRecently) {
      if (hasTimeConfig) {
        if (!selectConfiguredDateTime()) {
          if (!selectEarliestDateTimeOption()) {
            log("未找到可选场次，等待下一轮");
            return;
          }
        }
      } else if (!selectEarliestDateTimeOption()) {
        log("未找到可选场次，等待下一轮");
        return;
      }
    }
    // 有些页面选中态会延迟渲染，给它一点时间，不急着点下一步
    if (hasNeedChooseSessionHint() || !isDateTimeSelectedLikely()) {
      log("场次尚未确认选中，暂停点击下一步");
      return;
    }
  }

  if (Date.now() - state.dateLastNextAt < 500) return;
  if (
    clickBottomRightPrimaryButton(STEP_TEXT.nextStep) ||
    clickByKeywords(STEP_TEXT.nextStep)
  ) {
    state.dateLastNextAt = Date.now();
    log("已点击 日期页下一步");
    await sleep(300);
    if (isDatePage() && hasNeedChooseSessionHint()) {
      log("下一步提示需先选场次，回退到场次选择");
    }
  }
}

function collectVisibleInputs() {
  return Array.from(document.querySelectorAll("input")).filter(visible);
}

function nearbyText(el) {
  const row = el.closest("div, li, section, form");
  if (!row) return "";
  return normalizeText(row.innerText || "");
}

// ===================== 修复：国家码 + 手机号 核心逻辑 =====================
function currentCountryIsChina() {
  // 严格判定：只认已选中的国家码显示为 +86 / China
  return isCountryCodeSelectedStrict();
}

function isCountryCodeSelectedStrict() {
  const phoneRow = getPhoneRowContainer();
  if (!phoneRow) return false;
  const optionBtns = Array.from(phoneRow.querySelectorAll("button")).filter(visible);
  for (const btn of optionBtns) {
    if (!hasClassPrefix(btn, "GlobalSelect_optionItem")) continue;
    const t = getOptionTextsFromButton(btn);
    const number = t.number.replace(/\s+/g, "");
    if (number === "+86") return true;
    if (t.country === "china" || t.country === "中国" || t.country === "中國") return true;
  }
  return false;
}

function hasInfoValidationError() {
  const text = getWholeText();
  return (
    text.includes("请输入正确的手机号") ||
    text.includes("請輸入正確的手機號碼") ||
    text.includes("휴대폰 번호") ||
    text.includes("invalid phone")
  );
}

function isCountryDropdownOpened() {
  const known =
    document.querySelector(".GlobalSelect_optionListInner__HZvmu") ||
    document.querySelector("[class*='GlobalSelect_optionListInner__']");
  if (known && visible(known)) return true;

  const generic = Array.from(document.querySelectorAll("[role='listbox']")).filter((el) => {
    if (!visible(el)) return false;
    const text = normalizeText((el.innerText || "").slice(0, 500));
    return (
      (text.includes("china") || text.includes("中国") || text.includes("中國")) &&
      text.includes("+86")
    );
  });
  return generic.length > 0;
}

function getPhoneRowContainer() {
  const rows = Array.from(document.querySelectorAll("div, section, form, li")).filter(visible);
  return (
    rows.find((row) => {
      const text = normalizeText((row.innerText || "").slice(0, 400));
      return (
        text.includes("手機號碼") ||
        text.includes("手机号") ||
        text.includes("phone number") ||
        text.includes("phone")
      );
    }) || null
  );
}

function hasClassPrefix(el, prefix) {
  const cls = String(el?.className || "");
  const reg = new RegExp(`(?:^|\\s)${prefix}__[A-Za-z0-9_]+(?:\\s|$)`);
  return reg.test(cls);
}

function getOptionTextsFromButton(btn) {
  const spans = Array.from(btn.querySelectorAll("span"));
  const countryEl =
    spans.find((s) => hasClassPrefix(s, "GlobalSelect_optionCountry")) || spans[0] || null;
  const numberEl =
    spans.find((s) => hasClassPrefix(s, "GlobalSelect_optionNumber")) || spans[1] || null;
  return {
    country: normalizeText(countryEl?.textContent || ""),
    number: normalizeText(numberEl?.textContent || "")
  };
}

function findOptionButtonByTexts(countryPredicate, numberPredicate) {
  const spans = Array.from(document.querySelectorAll("span")).filter(visible);
  for (const span of spans) {
    if (!hasClassPrefix(span, "GlobalSelect_optionCountry")) continue;
    const country = normalizeText(span.textContent || "");
    if (!countryPredicate(country)) continue;
    const row = span.closest("button, div, li") || span.parentElement;
    if (!row) continue;
    const numberSpan =
      Array.from(row.querySelectorAll("span")).find((s) =>
        hasClassPrefix(s, "GlobalSelect_optionNumber")
      ) || null;
    const number = normalizeText(numberSpan?.textContent || "");
    if (!numberPredicate(number)) continue;

    const btn = row.closest("button") || row;
    if (!visible(btn)) continue;
    if (!hasClassPrefix(btn, "GlobalSelect_optionItem")) continue;
    return btn;
  }
  return null;
}

async function waitForChinaOptionVisible(timeoutMs = 1800) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const btn = findOptionButtonByTexts(
      (country) => country === "china",
      (number) => /^\+\s*86$/.test(number.replace(/\s+/g, " "))
    );
    if (btn) return true;
    await sleep(90);
  }
  return false;
}

function findSelectTextElementInPhoneRow() {
  const phoneRow = getPhoneRowContainer();
  if (!phoneRow) return null;
  const textNodes = Array.from(phoneRow.querySelectorAll("span, div, p")).filter(
    visible
  );
  return (
    textNodes.find((el) => {
      const t = normalizeText(el.textContent || "");
      return t === "選擇" || t === "选择";
    }) || null
  );
}

function getPhoneCountryPicker() {
  const labels = Array.from(
    document.querySelectorAll("label, div, span, strong, p")
  ).filter(visible);
  const phoneLabel = labels.find((el) => {
    const t = normalizeText(el.textContent || "");
    return t.includes("手機號碼") || t.includes("手机号") || t.includes("phone");
  });

  const phoneRow = getPhoneRowContainer();
  const basePool = phoneRow
    ? Array.from(
        phoneRow.querySelectorAll("button, [role='button'], [class*='GlobalSelect'], div, span")
      )
    : [];
  const globalPool = Array.from(
    document.querySelectorAll(
      "button, [role='button'], [class*='GlobalSelect'], div, span"
    )
  );
  const candidates = Array.from(new Set([...basePool, ...globalPool])).filter(visible);

  const scored = candidates
    .map((el) => {
      const txt = normalizeText(el.textContent || "");
      const cls = normalizeText(el.className?.toString() || "");
      let score = 0;
      if (txt.includes("選擇") || txt.includes("选择")) score += 8;
      if (txt.includes("+86") || txt.includes("china")) score += 8;
      if (cls.includes("globalselect")) score += 5;
      const r = el.getBoundingClientRect();
      if (r.width > 180 && r.height > 36) score += 2;
      if (phoneLabel) {
        const lr = phoneLabel.getBoundingClientRect();
        if (r.left > lr.right - 40) score += 3;
        if (Math.abs(r.top - lr.top) < 120) score += 4;
      }
      return { el, score };
    })
    .filter((x) => x.score >= 10)
    .sort((a, b) => b.score - a.score);

  const hit = scored[0]?.el || null;
  if (hit) return hit;

  if (phoneRow) {
    const fallback = Array.from(phoneRow.querySelectorAll("button, [role='button'], div, span"))
      .filter(visible)
      .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    if (fallback) return fallback;
  }
  return null;
}

function openCountryCodeDropdown() {
  if (isCountryDropdownOpened()) return true;

  // Strict match: button class /^GlobalSelect_optionItem__.+$/ and text exactly "選擇/选择".
  const chooseBtn =
    findOptionButtonByTexts(
      (country) => country === "選擇" || country === "选择",
      (number) => !number
    ) ||
    Array.from(document.querySelectorAll("button"))
      .filter(visible)
      .filter((btn) => hasClassPrefix(btn, "GlobalSelect_optionItem"))
      .find((btn) => {
        const t = getOptionTextsFromButton(btn);
        return (t.country === "選擇" || t.country === "选择") && !t.number;
      });
  if (chooseBtn) {
    log("尝试点击国家码「選擇」按钮");
    forceClick(chooseBtn);
    clickAtCenter(chooseBtn);
    clickElement(chooseBtn);
    try {
      chooseBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      chooseBtn.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));
      chooseBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    } catch (_) {}
    if (isCountryDropdownOpened()) {
      log("通过固定DOM点击「選擇」打开国家码下拉");
      return true;
    }
    log("点击「選擇」后下拉未打开，尝试兜底路径");
  }

  // Priority: lock to the "選擇/选择" text in the phone row and click ancestor chain.
  const selectTextEl = findSelectTextElementInPhoneRow();
  if (selectTextEl) {
    let cur = selectTextEl;
    for (let i = 0; i < 8 && cur; i += 1) {
      if (visible(cur)) {
        forceClick(cur);
        clickAtCenter(cur);
        clickElement(cur);
        try {
          cur.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
          cur.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));
          cur.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
        } catch (_) {}
        if (isCountryDropdownOpened()) {
          log("通过選擇文本祖先链打开了国家码下拉");
          return true;
        }
      }
      cur = cur.parentElement;
    }
  }

  const el = getPhoneCountryPicker();
  if (!el) {
    log("未锁定到手机号国家码框(選擇)");
    return false;
  }
  forceClick(el);
  clickAtCenter(el);
  clickElement(el);
  try {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  } catch (_) {}
  const rect = el.getBoundingClientRect();
  const arrowX = rect.right - 22;
  const arrowY = rect.top + rect.height / 2;
  const arrowTarget = document.elementFromPoint(arrowX, arrowY);
  if (arrowTarget) {
    forceClick(arrowTarget);
    clickElement(arrowTarget);
  }
  const phoneRow = getPhoneRowContainer();
  if (phoneRow) {
    const rightBtn = Array.from(phoneRow.querySelectorAll("button, [role='button'], span, div"))
      .filter(visible)
      .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)[0];
    if (rightBtn) {
      forceClick(rightBtn);
      clickAtCenter(rightBtn);
      clickElement(rightBtn);
    }
  }
  if (isCountryDropdownOpened()) {
    return true;
  }
  log("国家码框点击后下拉仍未打开");
  return false;
}

function searchCountryInDropdown() {
  const inputs = collectVisibleInputs().filter((input) => {
    const bag = normalizeText(
      [
        input.placeholder,
        input.getAttribute("aria-label"),
        input.className?.toString()
      ]
        .filter(Boolean)
        .join(" ")
    );
    return (
      bag.includes("查找国家代码") ||
      bag.includes("country code") ||
      bag.includes("search") ||
      bag.includes("globalselect")
    );
  });
  if (inputs.length > 0) {
    // 优先选最近打开下拉附近的搜索框
    const target =
      inputs.find((i) => normalizeText(i.placeholder || "").includes("country")) || inputs[0];
    typeInInput(target, "china");
    log("国家码搜索输入: china");
    return true;
  }
  return false;
}

function selectChinaOption() {
  const container =
    document.querySelector(".GlobalSelect_optionListInner__HZvmu") ||
    document.querySelector("[class*='GlobalSelect_optionListInner__']") ||
    document.querySelector("[role='listbox']") ||
    document.body;

  // Strict match: button class /^GlobalSelect_optionItem__.+$/, country text "China", number text "+ 86".
  const chinaBtn =
    findOptionButtonByTexts(
      (country) => country === "china",
      (number) => /^\+\s*86$/.test(number.replace(/\s+/g, " "))
    ) ||
    Array.from(document.querySelectorAll("button"))
      .filter(visible)
      .filter((btn) => hasClassPrefix(btn, "GlobalSelect_optionItem"))
      .find((btn) => {
        const t = getOptionTextsFromButton(btn);
        const countryStrict = t.country === "china";
        const numberStrict = /^\+\s*86$/.test(t.number.replace(/\s+/g, " "));
        return countryStrict && numberStrict;
      });
  if (chinaBtn) {
    forceClick(chinaBtn);
    clickAtCenter(chinaBtn);
    clickElement(chinaBtn);
    log("已通过固定DOM选择 China +86");
    return true;
  }

  const items = Array.from(
    container.querySelectorAll(
      "[class*='GlobalSelect_optionItem__'], li, [role='option'], button, div, span"
    )
  ).filter(visible);
  for (const item of items) {
    const txt = normalizeText(item.textContent || "");
    if (!txt) continue;
    if (txt.includes("china") || txt.includes("+86") || txt.includes("中国") || txt.includes("中國")) {
      forceClick(item);
      clickAtCenter(item);
      clickElement(item);
      log("已选择 China/+86 选项");
      return true;
    }
  }
  log("未命中 China/+86 选项");
  return false;
}

async function selectChinaCountryCodeRobust() {
  if (currentCountryIsChina()) return true;

  for (let i = 0; i < 4; i += 1) {
    log(`开始国家码选择流程，第 ${i + 1}/4 次`);
    const opened = openCountryCodeDropdown();
    if (!opened) {
      log(`国家码下拉打开失败，第 ${i + 1}/4 次`);
      await sleep(180);
      continue;
    }
    await sleep(260 + i * 120);
    log(`等待国家码列表加载，第 ${i + 1}/4 次`);

    const hasChinaBeforeSearch = await waitForChinaOptionVisible(900);
    if (!hasChinaBeforeSearch) {
      searchCountryInDropdown();
      await sleep(260);
      await waitForChinaOptionVisible(1200);
    }

    const ok = selectChinaOption();
    await sleep(220);
    if (ok || currentCountryIsChina()) return true;
    log(`China +86 选取失败，第 ${i + 1}/4 次`);
  }
  return currentCountryIsChina();
}

async function fillPhoneSection() {
  const inputs = collectVisibleInputs();
  const phoneInputs = inputs.filter((input) => {
    const bag = normalizeText(
      [
        input.name, input.id, input.placeholder,
        input.getAttribute("aria-label"), nearbyText(input)
      ].filter(Boolean).join(" ")
    );
    return (
      bag.includes("phone") ||
      bag.includes("tel") ||
      bag.includes("mobile") ||
      bag.includes("휴대폰") ||
      bag.includes("번호") ||
      bag.includes("手机号") ||
      bag.includes("手機")
    );
  });

  if (phoneInputs.length >= 2) {
    const v0 = (phoneInputs[0].value || "").trim();
    const v1 = (phoneInputs[1].value || "").trim();
    if (v0 !== state.config.countryCode) {
      typeInInput(phoneInputs[0], state.config.countryCode);
      log("已填写国家码");
    }
    if (v1 !== state.config.phoneNumber) {
      typeInInput(phoneInputs[1], state.config.phoneNumber);
      log("已填写手机号");
    }
    return;
  }

  if (phoneInputs.length === 1) {
    const v = (phoneInputs[0].value || "").trim();
    if (v !== state.config.phoneNumber) {
      typeInInput(phoneInputs[0], state.config.phoneNumber);
      log("已填写手机号");
    }
  }
}

function checkAllTermsAgreement() {
  const allAgree = findClickableByText([
    "同意全部使用條款", "同意全部使用条款",
    "同意全部條款", "同意全部条款", "agree to all"
  ]);
  if (allAgree) {
    clickElement(allAgree.closest("label, div, li, button") || allAgree);
    log("已勾选同意全部条款");
    return true;
  }
  return false;
}

function clickInfoSubmitButtonRobust() {
  const btn = findClickableByText(["下一步", "確認", "确认", "next", "submit", "예매하기"]);
  if (btn) {
    clickElement(btn);
    log("已点击信息提交按钮");
    return true;
  }
  return false;
}

async function clickTotalButtonImmediately() {
  const buttons = Array.from(document.querySelectorAll("button")).filter(visible);
  const candidates = buttons
    .map((btn) => {
      const text = normalizeText(btn.textContent || "");
      if (!(text.includes("總計") || text.includes("总计"))) return null;
      const cls = normalizeText(btn.className?.toString() || "");
      const disabled =
        btn.disabled ||
        cls.includes("disabled") ||
        btn.getAttribute("aria-disabled") === "true";
      if (disabled) return null;
      const r = btn.getBoundingClientRect();
      let score = 0;
      if (cls.includes("entbutton_primary")) score += 8;
      if (cls.includes("entbuttonglobal")) score += 4;
      if (r.left > window.innerWidth * 0.5) score += 3;
      if (r.top > window.innerHeight * 0.65) score += 3;
      if (text.startsWith("總計") || text.startsWith("总计")) score += 2;
      return { btn, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const target = candidates[0]?.btn || null;
  if (!target) return false;

  const rect = target.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const topEl = document.elementFromPoint(x, y);

  if (topEl) {
    forceClick(topEl);
    clickAtCenter(topEl);
  }
  forceClick(target);
  clickAtCenter(target);
  clickElement(target);
  state.totalClickedAt = Date.now();
  state.totalButtonClicked = true;
  log("已点击 總計/总计 按钮(按成功处理)");
  return true;
}

function checkAgreement() {
  checkAllTermsAgreement();
  const checkboxes = Array.from(
    document.querySelectorAll("input[type='checkbox']")
  ).filter(visible);
  for (const cb of checkboxes) {
    if (!cb.checked) {
      cb.click();
      log("已勾选条款checkbox");
    }
  }
  const agreeElements = findAllByText(STEP_TEXT.agreement);
  for (const el of agreeElements) {
    const wrap = el.closest("label, div, li");
    if (wrap) clickElement(wrap);
  }
}

async function runInfoStep() {
  const key = `${location.host}${location.pathname}${location.search}`;
  if (state.infoFlowKey !== key) {
    state.infoFlowKey = key;
    state.infoFlowDone = false;
    state.totalClickedAt = 0;
    state.totalButtonClicked = false;
  }
  if (state.infoFlowDone) {
    return;
  }

  const chinaOk = await selectChinaCountryCodeRobust();
  if (!chinaOk) {
    log("国家码选择失败，稍后重试");
    return;
  }
  if (!isCountryCodeSelectedStrict()) {
    log("国家码尚未选中 +86，暂停提交");
    return;
  }

  await fillPhoneSection();
  checkAgreement();
  const submitOk = clickInfoSubmitButtonRobust();

  if (submitOk) {
    await sleep(220);
    if (hasInfoValidationError()) {
      log("信息校验未通过，稍后重试");
      state.infoFlowDone = false;
      return;
    }
    state.infoFlowDone = true;
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        ...state.config,
        enabled: false,
        stoppedAt: Date.now()
      }
    });
    log("信息步骤完成，已停止自动化（不再点击总计/支付）");
    stopLoop("信息步骤完成");
  }
}
// ======================================================================

function findBuyNowButtonStrict() {
  const words = STEP_TEXT.buyNow.map((w) => normalizeText(w));
  const nodes = Array.from(
    document.querySelectorAll("button, a, [role='button'], div, span")
  ).filter(visible);
  const candidates = nodes
    .map((el) => {
      const text = normalizeText(el.textContent || "");
      if (!text || !words.some((w) => text.includes(w))) return null;
      const cls = normalizeText(el.className?.toString() || "");
      const disabled =
        el.disabled ||
        el.getAttribute("aria-disabled") === "true" ||
        cls.includes("disabled");
      if (disabled) return null;
      const r = el.getBoundingClientRect();
      let score = 0;
      if (r.left > window.innerWidth * 0.55) score += 4;
      if (r.top > window.innerHeight * 0.62) score += 4;
      if (r.width > 180 && r.height > 40) score += 3;
      if (cls.includes("joint-rectangle-button") || cls.includes("entbutton")) score += 3;
      if (text.startsWith("立即购买") || text.startsWith("立即購買")) score += 2;
      return { el, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.el || null;
}

function isBuyNowElement(el) {
  if (!isDomElement(el) || !visible(el)) return false;
  const text = normalizeText(el.textContent || "");
  if (!text) return false;
  return STEP_TEXT.buyNow.some((w) => text.includes(normalizeText(w)));
}

function getCachedOrFindBuyNowButton() {
  const cached = state.buyNowCachedEl;
  if (isBuyNowElement(cached)) return cached;
  const found = findBuyNowButtonStrict() || findButtonByClassAndText(STEP_TEXT.buyNow);
  state.buyNowCachedEl = found || null;
  return found || null;
}

function findReserveEntryButtonStrict() {
  const words = STEP_TEXT.reserveEntry.map((w) => normalizeText(w));
  const buyWords = STEP_TEXT.buyNow.map((w) => normalizeText(w));
  const nodes = Array.from(
    document.querySelectorAll("button, a, [role='button'], div, span")
  ).filter(visible);
  const candidates = nodes
    .map((el) => {
      const text = normalizeText(el.textContent || "");
      if (!text || !words.some((w) => text.includes(w))) return null;
      // 排除“立即购买”类按钮，避免韩文 예매/예매하기 重叠误判
      if (buyWords.some((w) => text.includes(w))) return null;
      // 避免误点价格页“预购”
      if (text.includes("预购") || text.includes("預購")) return null;
      const cls = normalizeText(el.className?.toString() || "");
      const disabled =
        el.disabled ||
        el.getAttribute("aria-disabled") === "true" ||
        cls.includes("disabled");
      if (disabled) return null;
      const r = el.getBoundingClientRect();
      let score = 0;
      if (r.left > window.innerWidth * 0.5) score += 3;
      if (r.top > window.innerHeight * 0.45) score += 3;
      if (r.width > 140 && r.height > 34) score += 3;
      if (
        text.startsWith("预约") ||
        text.startsWith("預約") ||
        text.includes("一般预订") ||
        text.includes("一般預訂") ||
        text.includes("一般预定") ||
        text.includes("一般預定") ||
        text.includes("general reservation") ||
        text.includes("normal reservation") ||
        text.startsWith("reservation") ||
        text.startsWith("reserve") ||
        text.includes("일반예매")
      ) {
        score += 4;
      }
      if (cls.includes("primary") || cls.includes("button")) score += 2;
      return { el, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.el || null;
}

function clickReserveEntryAggressive() {
  const target = findReserveEntryButtonStrict();
  if (!target) return false;
  for (let i = 0; i < 2; i += 1) {
    forceClick(target);
    clickAtCenter(target);
    clickElement(target);
    try {
      target.focus();
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })
      );
      target.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true })
      );
    } catch (_) {}
  }
  return true;
}

function isScavengeRoundWarmupWindow(windowMs = 20000) {
  if (!state.config.enabled || state.config.scavengeLoopEnabled !== true || state.scavengeLoopSuccess) {
    return false;
  }
  const startedAt = Number(state.scavengeLoopLastRestartAt || 0);
  if (!startedAt) return false;
  return Date.now() - startedAt <= Math.max(1000, Number(windowMs) || 20000);
}

function clickBuyNowAggressive() {
  const inScavengeWarmup = isScavengeRoundWarmupWindow(20000);
  const now = Date.now();
  const minGap = inScavengeWarmup
    ? state.tickMode === "critical"
      ? 60
      : 90
    : state.tickMode === "critical"
      ? 110
      : 320;
  if (now - state.productBuyClickedAt < minGap) return false;
  const target = getCachedOrFindBuyNowButton();
  if (!target) {
    state.buyNowCachedEl = null;
    return false;
  }

  const bursts = inScavengeWarmup
    ? state.tickMode === "critical"
      ? 4
      : 5
    : state.tickMode === "critical"
      ? 2
      : 3;
  for (let i = 0; i < bursts; i += 1) {
    forceClick(target);
    clickAtCenter(target);
    clickElement(target);
    try {
      target.focus();
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })
      );
      target.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true })
      );
    } catch (_) {}
  }
  state.productBuyClickedAt = now;
  if (!state.firstBuyNowClickAt) state.firstBuyNowClickAt = now;
  return true;
}

async function runProductStep() {
  const flowKey = `${location.host}${location.pathname}${location.search}`;
  if (state.productFlowKey !== flowKey) {
    state.productFlowKey = flowKey;
    state.productBuyClickedAt = 0;
    state.productLastCountdownLogAt = 0;
    state.buyNowCachedEl = null;
    state.firstBuyNowClickAt = 0;
  }

  const countdownMs = getSaleCountdownMs();
  if (countdownMs !== null && countdownMs > 0) {
    if (countdownMs <= getCriticalPreMs()) {
      setTickMode("critical");
    } else {
      setTickMode("fast");
    }
    if (clickBuyNowAggressive()) {
      log("商品页已点击立即购买，优先进入 Interpark gates 待命");
      await sleep(state.tickMode === "critical" ? 35 : 140);
      return;
    }
    const now = Date.now();
    const remainSec = Math.ceil(countdownMs / 1000);
    const logInterval = countdownMs <= 10000 ? 500 : 4000;
    if (now - state.productLastCountdownLogAt >= logInterval) {
      log(`距开抢 ${remainSec}s，等待进入 Interpark gates`);
      state.productLastCountdownLogAt = now;
    }
    return;
  }

  if (countdownMs !== null && countdownMs > -getCriticalPostMs()) {
    setTickMode("critical");
  } else {
    setTickMode("fast");
  }

  if (clickBuyNowAggressive()) {
    log("已点击 立即购买");
    await sleep(state.tickMode === "critical" ? 35 : 140);
    return;
  }
}

function clickEximbayWechatOption() {
  const nodes = Array.from(
    document.querySelectorAll("button, [role='button'], div, li, span")
  ).filter(visible);
  const candidates = nodes
    .map((el) => {
      const text = normalizeText(el.textContent || "");
      if (!(text.includes("wechat pay") || text.includes("微信支付"))) return null;
      if (text.includes("you have selected wechat pay")) return null;
      const cls = normalizeText(el.className?.toString() || "");
      const r = el.getBoundingClientRect();
      let score = 0;
      if (cls.includes("button") || cls.includes("item") || cls.includes("option")) score += 5;
      if (r.top < window.innerHeight * 0.6) score += 4;
      if (r.width > 120 && r.height > 50) score += 4;
      if (r.top > 40) score += 1;
      return { el, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const target = candidates[0]?.el || null;
  if (!target) return false;
  forceClick(target);
  clickAtCenter(target);
  clickElement(target);
  state.eximbayWechatClicked = true;
  log("已选择微信支付");
  return true;
}

function clickEximbayConsentCircle() {
  const checkboxes = Array.from(
    document.querySelectorAll("input[type='checkbox']")
  ).filter(visible);
  for (const cb of checkboxes) {
    if (!cb.checked) {
      cb.click();
      state.eximbayConsentClicked = true;
      log("已点击确认圆圈(checkbox)");
      return true;
    }
  }
  if (checkboxes.some((cb) => cb.checked)) {
    state.eximbayConsentClicked = true;
    return true;
  }

  const rows = Array.from(document.querySelectorAll("div, section, label, li, p"))
    .filter(visible)
    .map((el) => {
      const text = normalizeText(el.innerText || "");
      if (
        !text.includes("i confirm") ||
        !text.includes("terms") ||
        !text.includes("privacy")
      ) {
        return null;
      }
      const r = el.getBoundingClientRect();
      let score = 0;
      if (r.top > window.innerHeight * 0.45) score += 6;
      if (r.left < window.innerWidth * 0.3) score += 2;
      if (r.width > 220) score += 2;
      return { el, score, r };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const row = rows[0];
  if (!row) return false;

  const circleCandidates = Array.from(
    row.el.querySelectorAll(
      "[role='checkbox'], [aria-checked], [class*='checkbox'], [class*='check'], svg, span, div"
    )
  ).filter(visible);
  for (const item of circleCandidates) {
    const ir = item.getBoundingClientRect();
    if (ir.width < 12 || ir.height < 12 || ir.width > 60 || ir.height > 60) continue;
    if (ir.left > row.r.left + Math.min(120, row.r.width * 0.28)) continue;
    forceClick(item);
    clickAtCenter(item);
    state.eximbayConsentClicked = true;
    log("已点击确认圆圈");
    return true;
  }

  const x = row.r.left + Math.min(24, Math.max(14, row.r.width * 0.08));
  const y = row.r.top + Math.min(30, Math.max(16, row.r.height * 0.3));
  const pointEl = document.elementFromPoint(x, y);
  if (pointEl) {
    forceClick(pointEl);
    clickAtCenter(pointEl);
    state.eximbayConsentClicked = true;
    log("已点击确认圆圈(坐标回退)");
    return true;
  }
  return false;
}

function clickEximbayPayButton() {
  const candidates = Array.from(
    document.querySelectorAll("button, [role='button'], div")
  )
    .filter(visible)
    .map((el) => {
      const text = normalizeText(el.textContent || "");
      if (!(text.startsWith("pay") || text.includes(" pay ") || text.includes("결제"))) {
        return null;
      }
      const cls = normalizeText(el.className?.toString() || "");
      const disabled =
        el.disabled ||
        cls.includes("disabled") ||
        el.getAttribute("aria-disabled") === "true";
      if (disabled) return null;
      const r = el.getBoundingClientRect();
      let score = 0;
      if (text.startsWith("pay")) score += 8;
      if (r.top > window.innerHeight * 0.7) score += 6;
      if (r.width > 220 && r.height > 40) score += 4;
      if (cls.includes("button") || cls.includes("primary")) score += 2;
      return { el, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const payBtn = candidates[0]?.el || null;
  if (!payBtn) return false;
  forceClick(payBtn);
  clickAtCenter(payBtn);
  clickElement(payBtn);
  state.eximbayPayClicked = true;
  log("已点击 Pay 按钮");
  return true;
}

async function runEximbayStep() {
  const flowKey = `${location.host}${location.pathname}${location.search}`;
  if (state.eximbayFlowKey !== flowKey) {
    state.eximbayFlowKey = flowKey;
    state.eximbayWechatClicked = false;
    state.eximbayConsentClicked = false;
    state.eximbayPayClicked = false;
  }

  await signalEximbayActive();
  const pageText = getWholeText();
  if (
    pageText.includes("二维码") ||
    pageText.includes("qrcode") ||
    pageText.includes("scan")
  ) {
    log("已到微信二维码页面，流程完成");
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        ...state.config,
        enabled: false
      }
    });
    return;
  }

  if (!state.eximbayWechatClicked) {
    clickEximbayWechatOption();
    await sleep(120);
    return;
  }

  if (!state.eximbayConsentClicked) {
    clickEximbayConsentCircle();
    await sleep(120);
    return;
  }

  if (!state.eximbayPayClicked) {
    const payClicked = clickEximbayPayButton();
    if (payClicked) {
      state.paymentClicked = true;
      await sleep(220);
    }
  }
}

function getOcrApiUrl() {
  return normalizeOcrApiUrl(state.config.ocrApiUrl, DEFAULT_OCR_API_URL);
}

function getOcrApiToken() {
  return String(state.config.ocrApiToken || "").trim();
}

function getCaptchaSearchDocuments(preferredDoc = null) {
  const out = [];
  const seen = new Set();

  const isDocVisibleFromTop = (doc) => {
    if (!doc) return false;
    try {
      let win = doc.defaultView;
      while (win && win !== window) {
        const frameEl = win.frameElement;
        if (!isDomElement(frameEl) || !visible(frameEl)) return false;
        win = frameEl.ownerDocument?.defaultView || null;
      }
      return true;
    } catch (_) {
      return false;
    }
  };

  const pushDoc = (doc) => {
    if (!doc || seen.has(doc)) return;
    if (!isDocVisibleFromTop(doc)) return;
    seen.add(doc);
    out.push(doc);
  };

  const collectFromRoot = (rootDoc, depth = 0, maxDepth = 2) => {
    if (!rootDoc || depth > maxDepth) return;
    pushDoc(rootDoc);
    if (depth === maxDepth) return;
    const frames = Array.from(rootDoc.querySelectorAll("iframe, frame"));
    for (const frame of frames) {
      try {
        const subDoc = frame.contentDocument || frame.contentWindow?.document || null;
        if (!subDoc) continue;
        collectFromRoot(subDoc, depth + 1, maxDepth);
      } catch (_) {}
    }
  };

  const seatFrame = document.querySelector("#ifrmSeat");
  if (seatFrame) {
    try {
      const seatDoc = seatFrame.contentDocument || seatFrame.contentWindow?.document || null;
      if (seatDoc) collectFromRoot(seatDoc, 0, 2);
    } catch (_) {}
  }

  if (preferredDoc) {
    collectFromRoot(preferredDoc, 0, 2);
    // 旧版主要运行在 iframe 内；当已定位到具体文档时，优先只在该文档树里判定，
    // 避免混入顶层 document 的残留文案/节点导致误判。
    if (preferredDoc !== document && out.length > 0) {
      return out;
    }
  }
  collectFromRoot(document, 0, 2);
  return out;
}

function isLegacyCaptchaLayerVisible(preferredDoc = null) {
  const inViewport = (el) => {
    if (!isDomElement(el)) return false;
    const view = el.ownerDocument?.defaultView || window;
    const rect = el.getBoundingClientRect();
    const vw = Math.max(320, view.innerWidth || window.innerWidth || 0);
    const vh = Math.max(240, view.innerHeight || window.innerHeight || 0);
    return rect.right > 4 && rect.bottom > 4 && rect.left < vw - 4 && rect.top < vh - 4;
  };
  const isBlockingLayer = (layer) => {
    if (!isDomElement(layer) || !visible(layer) || !inViewport(layer)) return false;
    const view = layer.ownerDocument?.defaultView || window;
    const style = view.getComputedStyle(layer);
    const opacity = Number(style.opacity || "1");
    const ariaHidden = normalizeText(layer.getAttribute("aria-hidden") || "");
    if (style.pointerEvents === "none") return false;
    if (Number.isFinite(opacity) && opacity <= 0.05) return false;
    if (ariaHidden === "true") return false;
    return true;
  };

  const docs = getCaptchaSearchDocuments(preferredDoc);
  return docs.some((doc) => {
    const layer = doc.querySelector(".capchaLayer");
    return Boolean(layer && isBlockingLayer(layer));
  });
}

function isLegacyCaptchaImage(el) {
  if (!isDomElement(el)) return false;
  if (el.id === "imgCaptcha") return true;
  if (el.closest?.(".capchaLayer")) return true;
  return false;
}

async function triggerLegacyCaptchaAction(action) {
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "LEGACY_CAPTCHA_ACTION",
      action: String(action || "").trim()
    });
    return Boolean(resp?.ok && resp?.result?.ok);
  } catch (_) {
    return false;
  }
}

async function triggerLegacyScriptMainWorld(script, label = "") {
  const normalized = normalizeLegacyScriptCode(script);
  if (!normalized) return { ok: false, error: "empty_script" };
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "LEGACY_RUN_SCRIPT_MAIN",
      script: normalized,
      label: String(label || "")
    });
    return resp?.result || { ok: false, error: "no_result" };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function triggerLegacySeatSelectMainWorld(candidate) {
  const seat = candidate?.el;
  if (!seat) return { ok: false, error: "no_seat" };
  const onclick = String(seat.getAttribute("onclick") || "").trim();
  const title = String(seat.getAttribute("title") || "").trim();
  const areaCode = String(
    state.legacySeatCurrentAreaCode || extractLegacySeatAreaCode(onclick) || ""
  ).trim();
  const payload = {
    title,
    onclick,
    areaCode,
    key: String(candidate?.key || "").trim()
  };
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "LEGACY_SELECT_SEAT_MAIN",
      payload
    });
    return resp?.result || { ok: false, error: "no_result" };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

function runLegacyCaptchaActionInDoc(action, doc) {
  const targetDoc = doc || document;
  if (!targetDoc) return false;
  const view = targetDoc.defaultView;
  if (!view) return false;
  const act = String(action || "").trim();
  try {
    const input = targetDoc.querySelector("#txtCaptcha");
    if (act === "refresh") {
      if (typeof view.fnCapchaRefresh === "function") {
        view.fnCapchaRefresh();
        return true;
      }
      const refreshBtn = targetDoc.querySelector(".capchaLayer .refreshBtn");
      if (refreshBtn && clickElement(refreshBtn)) return true;
    }
    if (act === "submit") {
      if (typeof view.fnCheck === "function") {
        view.fnCheck();
        return true;
      }
      const submitBtn =
        targetDoc.querySelector(".capchaLayer a[onclick*='fnCheck']") ||
        targetDoc.querySelector(".capchaLayer .capchaBtns a:last-child");
      if (submitBtn) {
        if (!hasJavascriptHref(submitBtn) && clickElement(submitBtn)) return true;
        if (runLegacyHandlerScript(submitBtn, ["fncheck"])) return true;
      }
    }
    if (act === "enter" && input) {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })
      );
      input.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true })
      );
      if (typeof view.IsEnterGo === "function") {
        view.IsEnterGo();
      }
      return true;
    }
  } catch (_) {}
  return false;
}

function findCaptchaImageElement() {
  const docs = getCaptchaSearchDocuments();
  const inViewport = (el) => {
    if (!isDomElement(el)) return false;
    const view = el.ownerDocument?.defaultView || window;
    const rect = el.getBoundingClientRect();
    const vw = Math.max(320, view.innerWidth || window.innerWidth || 0);
    const vh = Math.max(240, view.innerHeight || window.innerHeight || 0);
    return rect.right > 4 && rect.bottom > 4 && rect.left < vw - 4 && rect.top < vh - 4;
  };
  const isLikelyLegacyCaptchaAsset = (el) => {
    if (!isDomElement(el)) return false;
    const tag = String(el.tagName || "").toLowerCase();
    if (tag === "canvas") return true;
    if (tag !== "img") return false;
    const src = String(el.currentSrc || el.src || "").toLowerCase();
    const id = String(el.id || "").toLowerCase();
    const cls = String(el.className || "").toLowerCase();
    const bag = `${src} ${id} ${cls}`;
    if (bag.includes("imgcaptcha")) return true;
    if (bag.includes("captcha") || bag.includes("capcha") || bag.includes("kaptcha") || bag.includes("verify")) {
      return true;
    }
    if (src.includes("btn_") || src.includes("theater") || src.includes("icon") || src.includes("seat")) {
      return false;
    }
    const r = el.getBoundingClientRect();
    return r.width >= 80 && r.width <= 360 && r.height >= 24 && r.height <= 120;
  };

  for (const doc of docs) {
    const legacyImg = doc.querySelector("#imgCaptcha");
    if (!legacyImg) continue;
    const layer = legacyImg.closest(".capchaLayer") || doc.querySelector(".capchaLayer");
    // 旧版以 capchaLayer 是否可见作为是否阻塞的主判定，避免成功后残留 DOM 误判。
    if (layer && !visible(layer)) continue;
    if (!inViewport(legacyImg)) continue;
    if (visible(legacyImg)) return legacyImg;
  }

  // 旧版兜底：仅在 capchaLayer 内挑选“最像验证码”的 img/canvas，避免误选页面普通图片。
  for (const doc of docs) {
    const layer = doc.querySelector(".capchaLayer");
    if (!layer || !visible(layer)) continue;
    const input =
      layer.querySelector("#txtCaptcha") ||
      layer.querySelector("input[name='txtCaptcha']") ||
      layer.querySelector("input[type='text']");
    const inputRect = input?.getBoundingClientRect?.() || null;
    const candidates = Array.from(layer.querySelectorAll("img, canvas"))
      .filter((el) => visible(el) && inViewport(el))
      .filter((el) => isLikelyLegacyCaptchaAsset(el))
      .map((el) => {
        const r = el.getBoundingClientRect();
        let score = 0;
        const src = String(el.currentSrc || el.src || "").toLowerCase();
        if (src.includes("imgcaptcha") || src.includes("captcha") || src.includes("capcha")) score += 10;
        if ((el.tagName || "").toLowerCase() === "canvas") score += 4;
        if (r.width >= 90 && r.width <= 300) score += 3;
        if (r.height >= 24 && r.height <= 90) score += 3;
        if (inputRect) {
          const dy = Math.abs((r.top + r.height / 2) - (inputRect.top + inputRect.height / 2));
          const dx = Math.abs((r.left + r.width / 2) - (inputRect.left + inputRect.width / 2));
          if (dy < 160) score += 4;
          if (dx < 240) score += 3;
          if (r.bottom <= inputRect.top + 24) score += 2;
        }
        return { el, score };
      })
      .sort((a, b) => b.score - a.score);
    if (candidates[0]?.el) return candidates[0].el;
  }

  for (const doc of docs) {
    const modalCaptchaImg = doc.querySelector(
      ".ModalCaptchaText_captchaImage__Mitgq img"
    );
    if (modalCaptchaImg && visible(modalCaptchaImg)) return modalCaptchaImg;
  }

  const legacyContextLikely =
    location.host === "gpoticket.globalinterpark.com" ||
    isLegacyBookingUrl() ||
    Boolean(document.querySelector("#ifrmSeat, #ifrmBookStep, #divBookMain"));
  if (legacyContextLikely) {
    const hasBlockingLegacyLayer = docs.some((doc) => {
      const layer = doc.querySelector(".capchaLayer");
      return Boolean(layer && visible(layer));
    });
    if (!hasBlockingLegacyLayer) {
      return null;
    }
  }

  const canvases = docs.flatMap((doc) => Array.from(doc.querySelectorAll("canvas"))).filter(visible);
  const canvasScored = canvases
    .map((cv) => {
      const nearby = normalizeText(
        (cv.closest("div, section, form, td, li")?.innerText || "").slice(0, 280)
      );
      let score = 0;
      if (nearby.includes("請輸入畫面的文字")) score += 10;
      if (nearby.includes("请输入画面的文字")) score += 10;
      if (nearby.includes("验证码") || nearby.includes("captcha") || nearby.includes("보안문자")) {
        score += 7;
      }
      const r = cv.getBoundingClientRect();
      if (r.width >= 100 && r.width <= 420) score += 4;
      if (r.height >= 24 && r.height <= 180) score += 4;
      return { el: cv, score };
    })
    .filter((x) => x.score >= 9)
    .sort((a, b) => b.score - a.score);
  if (canvasScored[0]?.el) return canvasScored[0].el;

  const imgs = docs.flatMap((doc) => Array.from(doc.querySelectorAll("img"))).filter(visible);
  const scored = imgs
    .map((img) => {
      const src = String(img.currentSrc || img.src || "").toLowerCase();
      if (src.includes("btn_theater.gif")) return null;
      const alt = String(img.alt || "").toLowerCase();
      const nearby = normalizeText(
        (img.closest("div, section, form, td, li")?.innerText || "").slice(0, 240)
      );
      let score = 0;
      if (src.includes("captcha") || src.includes("kaptcha") || src.includes("verify")) score += 8;
      if (alt.includes("captcha") || alt.includes("验证码")) score += 5;
      if (nearby.includes("验证码") || nearby.includes("captcha") || nearby.includes("보안문자")) {
        score += 7;
      }
      const r = img.getBoundingClientRect();
      if (r.width >= 70 && r.width <= 360) score += 3;
      if (r.height >= 24 && r.height <= 160) score += 3;
      if (r.top > 40 && r.top < window.innerHeight * 0.85) score += 1;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) score += 1;
      return { img, score };
    })
    .filter(Boolean)
    .filter((x) => x.score >= 7)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.img || null;
}

function findCaptchaInput(imageEl) {
  const ownerDoc = imageEl?.ownerDocument || null;
  const docs = getCaptchaSearchDocuments(ownerDoc);
  const legacyDoc = ownerDoc || document;
  const legacyContext =
    isLegacyCaptchaImage(imageEl) || Boolean(legacyDoc.querySelector(".capchaLayer"));

  // 旧版验证码优先：固定 ID/name，不依赖 visible，避免被样式判定误杀。
  if (legacyContext) {
    const strictLegacy =
      legacyDoc.querySelector("#txtCaptcha") ||
      legacyDoc.querySelector("input[name='txtCaptcha']") ||
      legacyDoc.querySelector(".capchaLayer input[type='text']");
    if (strictLegacy) return strictLegacy;
  }

  for (const doc of docs) {
    const legacyInput = doc.querySelector("#txtCaptcha");
    if (legacyInput && visible(legacyInput)) return legacyInput;
  }

  for (const doc of docs) {
    const byStableClass = doc.querySelector(
      "input[class*='ModalCaptchaText_captchaInput']"
    );
    if (byStableClass && visible(byStableClass)) return byStableClass;
  }

  for (const doc of docs) {
    const hardMatch = Array.from(doc.querySelectorAll("input")).find((input) => {
      if (!visible(input)) return false;
      const p = normalizeText(input.getAttribute("placeholder") || "");
      return (
        p.includes("請輸入畫面的文字") ||
        p.includes("请输入画面的文字") ||
        p.includes("不區分大小寫")
      );
    });
    if (hardMatch) return hardMatch;
  }

  const modalScope =
    imageEl?.closest(
      "[class*='ModalCaptchaText'], [role='dialog'], [class*='modal'], [class*='Modal']"
    ) || null;
  if (legacyContext) {
    const layer = imageEl?.closest?.(".capchaLayer") || legacyDoc.querySelector(".capchaLayer");
    if (layer) {
      const layerInput = layer.querySelector("input[type='text'], input:not([type]), input[type='search']");
      if (layerInput) return layerInput;
    }
  }
  const scopedCandidates = modalScope
    ? Array.from(
        modalScope.querySelectorAll("input[type='text'], input:not([type]), input[type='search']")
      ).filter(visible)
    : [];
  const globalCandidates = docs
    .flatMap((doc) =>
      Array.from(doc.querySelectorAll("input[type='text'], input:not([type]), input[type='search']"))
    )
    .filter(visible);
  const candidates = scopedCandidates.length ? scopedCandidates : globalCandidates;
  const scored = candidates
    .map((input) => {
      const bag = normalizeText(
        [
          input.name,
          input.id,
          input.placeholder,
          input.getAttribute("aria-label"),
          input.getAttribute("title"),
          nearbyText(input)
        ]
          .filter(Boolean)
          .join(" ")
      );
      const r = input.getBoundingClientRect();
      const ir = imageEl.getBoundingClientRect();
      let score = 0;
      if (bag.includes("captcha") || bag.includes("验证码") || bag.includes("인증")) score += 8;
      if (
        bag.includes("請輸入畫面的文字") ||
        bag.includes("请输入画面的文字") ||
        bag.includes("畫面的文字") ||
        bag.includes("不區分大小寫") ||
        bag.includes("captcha image")
      ) {
        score += 8;
      }
      const nearHorizontally = Math.abs(r.left - ir.left) < 260;
      const nearVertically = Math.abs(r.top - ir.bottom) < 170 || Math.abs(r.top - ir.top) < 140;
      if (nearHorizontally && nearVertically) score += 6;
      const centerDist = Math.hypot(
        r.left + r.width / 2 - (ir.left + ir.width / 2),
        r.top + r.height / 2 - (ir.top + ir.height / 2)
      );
      if (centerDist < 420) score += 4;
      if (r.width >= 90 && r.height >= 24) score += 2;
      if (bag.includes("phone") || bag.includes("手机号") || bag.includes("mobile")) score -= 8;
      return { input, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score >= 2 ? scored[0].input : null;
}

function findCaptchaSubmitButton(imageEl, inputEl) {
  const doc = inputEl?.ownerDocument || imageEl?.ownerDocument || document;
  const legacySubmit =
    doc.querySelector(".capchaLayer a[onclick*='fnCheck']") ||
    doc.querySelector(".capchaLayer .capchaBtns a:last-child");
  if (legacySubmit && visible(legacySubmit)) return legacySubmit;

  const scope =
    inputEl?.closest("form, section, div, li, td") ||
    imageEl?.closest("form, section, div, li, td") ||
    doc;
  const words = [
    "验证",
    "驗證",
    "確認",
    "确认",
    "完成輸入",
    "完成输入",
    "submit",
    "verify",
    "ok",
    "확인"
  ];
  const buttons = Array.from(
    scope.querySelectorAll("button, [role='button'], a, div, span")
  ).filter(visible);
  const scored = buttons
    .map((el) => {
      const text = normalizeText(el.textContent || "");
      if (!text) return null;
      if (!words.some((w) => text.includes(normalizeText(w)))) return null;
      const r = el.getBoundingClientRect();
      let score = 0;
      if (r.width >= 56 && r.height >= 28) score += 2;
      if (inputEl) {
        const ir = inputEl.getBoundingClientRect();
        if (Math.abs(r.top - ir.top) < 120) score += 4;
        if (r.left > ir.left - 60) score += 2;
      }
      return { el, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.el || null;
}

function makeCaptchaSignature(imageEl) {
  const src = String(imageEl?.currentSrc || imageEl?.src || "");
  const rect = imageEl?.getBoundingClientRect?.();
  if (!rect) return src;
  return `${src}|${Math.round(rect.width)}x${Math.round(rect.height)}`;
}

async function loadCaptchaBytes(imageEl) {
  if (imageEl?.tagName?.toLowerCase() === "canvas") {
    log("验证码源: canvas，开始导出 PNG");
    const canvas = imageEl;
    const blob = await new Promise((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), "image/png");
      } catch (_) {
        resolve(null);
      }
    });
    if (!blob) return null;
    log("canvas 导出成功");
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  const src = String(imageEl?.currentSrc || imageEl?.src || "");
  if (!src) return null;
  if (src.startsWith("data:image/")) {
    log("验证码源: data:image base64");
    const commaIdx = src.indexOf(",");
    if (commaIdx <= 0) return null;
    const meta = src.slice(0, commaIdx).toLowerCase();
    const data = src.slice(commaIdx + 1);
    if (meta.includes(";base64")) {
      const binary = atob(data);
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
      return out;
    }
    const decoded = decodeURIComponent(data);
    const out = new TextEncoder().encode(decoded);
    return out;
  }
  log("验证码源: 普通图片 URL，开始 fetch");
  try {
    const resp = await fetch(src, {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      return new Uint8Array(buf);
    }
  } catch (_) {}

  // 页面上下文可能被 CORS 拦截，改走 extension background 拉取图片字节。
  log("页面 fetch 失败，尝试通过 background 拉取验证码图片");
  try {
    const viaBg = await chrome.runtime.sendMessage({
      type: "FETCH_IMAGE_BYTES",
      url: src
    });
    if (viaBg?.ok && Array.isArray(viaBg.bytes) && viaBg.bytes.length > 0) {
      return new Uint8Array(viaBg.bytes);
    }
  } catch (_) {}
  return null;
}

async function requestCaptchaOcr(imageBytes) {
  const apiUrl = getOcrApiUrl();
  log(`发送 OCR 请求到: ${apiUrl}`);
  const resp = await chrome.runtime.sendMessage({
    type: "OCR_REQUEST",
    apiUrl,
    ocrApiToken: getOcrApiToken(),
    bytes: Array.from(imageBytes)
  });
  if (!resp?.ok) {
    throw new Error(resp?.error || "OCR request failed");
  }
  const code = String(resp.code || "").trim();
  const candidates = Array.isArray(resp.candidates)
    ? resp.candidates.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  if (!code && !candidates.length) throw new Error("OCR code is empty");
  return { code, candidates };
}

function hasCaptchaRetryErrorText(preferredDoc = null) {
  const docs = getCaptchaSearchDocuments(preferredDoc);
  const isRetryText = (text) =>
    text.includes("請再次確認輸入的文字") ||
    text.includes("请再次确认输入的文字") ||
    text.includes("請重新輸入") ||
    text.includes("请重新输入") ||
    text.includes("incorrect captcha");

  return docs.some((doc) => {
    const layer = doc.querySelector(".capchaLayer");
    if (layer && visible(layer)) {
      const alertText = normalizeText(layer.querySelector(".alertNotice")?.innerText || "");
      if (isRetryText(alertText)) return true;
      const layerText = normalizeText(layer.innerText || "");
      return isRetryText(layerText);
    }
    const text = normalizeText(doc.body?.innerText || "");
    return isRetryText(text);
  });
}

async function clickCaptchaRefresh(imageEl) {
  const doc = imageEl?.ownerDocument || document;
  if (isLegacyCaptchaImage(imageEl) || isLegacyCaptchaLayerVisible(doc)) {
    if (runLegacyCaptchaActionInDoc("refresh", doc)) return true;
    const viaMain = await triggerLegacyCaptchaAction("refresh");
    if (viaMain) return true;
    const legacyRefresh = doc.querySelector(".capchaLayer .refreshBtn");
    if (legacyRefresh && visible(legacyRefresh) && clickElement(legacyRefresh)) return true;
  }

  const scope = imageEl?.closest("form, section, div, li, td") || doc;
  const words = ["刷新", "换一张", "重新", "refresh", "reload"];
  const nodes = Array.from(
    scope.querySelectorAll("button, [role='button'], a, span, div")
  ).filter(visible);
  for (const el of nodes) {
    const text = normalizeText(el.textContent || "");
    if (!text) continue;
    if (!words.some((w) => text.includes(normalizeText(w)))) continue;
    if (clickElement(el)) return true;
  }
  return clickElement(imageEl);
}

let captchaEngine = null;

function getCaptchaEngine() {
  if (captchaEngine) return captchaEngine;
  if (typeof window.createCaptchaEngine !== "function") {
    log("验证码引擎未加载，跳过本轮验证码处理");
    return null;
  }
  captchaEngine = window.createCaptchaEngine({
    state,
    log,
    sleep,
    findCaptchaImageElement,
    isLegacyCaptchaLayerVisible,
    isLegacyCaptchaImage,
    findCaptchaInput,
    makeCaptchaSignature,
    hasCaptchaRetryErrorText,
    loadCaptchaBytes,
    requestCaptchaOcr,
    typeInInput,
    runLegacyCaptchaActionInDoc,
    triggerLegacyCaptchaAction,
    findCaptchaSubmitButton,
    hasJavascriptHref,
    clickElement,
    runLegacyHandlerScript,
    clickCaptchaRefresh
  });
  return captchaEngine;
}

async function runCaptchaStep() {
  const engine = getCaptchaEngine();
  if (!engine) return false;
  return await engine.runStep();
}

function isSeatPage() {
  const text = getWholeText();
  const hasCompleteBtn = Boolean(findButtonByClassAndText(STEP_TEXT.completeSeat));
  const seatBlockCount = document.querySelectorAll("g[id^='seat_block_']").length;
  const seatSvgCount = document.querySelectorAll("[class*='SeatMap_seatSvg__'], [class*='seatSvg']").length;
  const hasSeatMapDom = seatBlockCount > 0 || seatSvgCount >= 20;
  const hasSeatKeyword =
    text.includes("选择座位") ||
    text.includes("選擇座位") ||
    text.includes("尚未選擇座位") ||
    text.includes("尚未选择座位") ||
    text.includes("좌석");
  const hasPriceKeyword = text.includes("选择价格") || text.includes("選擇價格");
  const hasInfoKeyword =
    text.includes("订票者资讯") ||
    text.includes("訂購者資訊") ||
    text.includes("手機號碼") ||
    text.includes("手机号");

  if (hasCompleteBtn) return true;
  if (hasSeatMapDom && hasSeatKeyword && !hasPriceKeyword && !hasInfoKeyword) return true;
  return false;
}

function isQueuePage() {
  const text = getWholeText();
  return (
    text.includes("等候人数过多待机中") ||
    text.includes("等候人數過多待機中") ||
    text.includes("請稍候片刻") ||
    text.includes("请稍候片刻") ||
    text.includes("我的等候順位") ||
    text.includes("目前等候順位") ||
    text.includes("現在等候人數") ||
    text.includes("현재 대기") ||
    (text.includes("queue") && text.includes("waiting"))
  );
}

function isDatePage() {
  if (isInterparkSchedulePage()) return true;
  const text = getWholeText();
  if (
    text.includes("选择日期") ||
    text.includes("選擇日期") ||
    text.includes("날짜 선택")
  ) {
    return true;
  }
  const dayCount = getDateDayCandidates().length;
  const timeCount = getDateTimeOptionCandidates("time").length;
  return dayCount >= 6 && (timeCount >= 1 || !hasPreorderActionAvailable());
}

function isPricePage() {
  const href = String(location.href || "").toLowerCase();
  return href.includes("price");
}

function isInfoPage() {
  const text = getWholeText();
  if (
    text.includes("订票者资讯") ||
    text.includes("訂購者資訊") ||
    text.includes("手機號碼") ||
    text.includes("手机号")
  ) {
    return true;
  }
  const phoneRow = getPhoneRowContainer();
  if (phoneRow) return true;
  const hasPhoneInput = collectVisibleInputs().some((input) => {
    const bag = normalizeText(
      [
        input.name,
        input.id,
        input.placeholder,
        input.getAttribute("aria-label"),
        nearbyText(input)
      ]
        .filter(Boolean)
        .join(" ")
    );
    return (
      bag.includes("phone") ||
      bag.includes("mobile") ||
      bag.includes("tel") ||
      bag.includes("휴대폰") ||
      bag.includes("번호") ||
      bag.includes("手机号") ||
      bag.includes("手機")
    );
  });
  return hasPhoneInput && Boolean(getPhoneCountryPicker() || findSelectTextElementInPhoneRow());
}

function detectCurrentStage() {
  if (isSeatPage()) return "seat";
  if (isInfoPage()) return "info";
  if (isPricePage()) return "price";
  if (isDatePage()) return "date";
  return "unknown";
}

function isLegacyBookingUrl() {
  const href = String(location.href || "").toLowerCase();
  const path = String(location.pathname || "").toLowerCase();
  return (
    href.includes("/global/play/book/bookmain.asp") ||
    path.includes("/global/play/book/bookmain.asp")
  );
}

function isInterparkGatePage() {
  const host = String(location.host || "").toLowerCase();
  const path = String(location.pathname || "").toLowerCase();
  return host === "tickets.interpark.com" && path.includes("/gates/");
}

function isInterparkSchedulePage() {
  const host = String(location.host || "").toLowerCase();
  const path = String(location.pathname || "").toLowerCase();
  return host === "tickets.interpark.com" && path.includes("/onestop/schedule");
}

function isInterparkGateWithoutBizCode() {
  if (!isInterparkGatePage()) return false;
  try {
    const params = new URLSearchParams(String(location.search || ""));
    return !String(params.get("bizCode") || "").trim();
  } catch (_) {
    return !String(location.search || "").toLowerCase().includes("bizcode=");
  }
}

function isInterparkGateWithBizCode() {
  return isInterparkGatePage() && !isInterparkGateWithoutBizCode();
}

function detectInterparkBookingVariant() {
  const host = String(location.host || "").toLowerCase();
  const path = String(location.pathname || "").toLowerCase();

  if (host === "gpoticket.globalinterpark.com") return "legacy";
  if (isLegacyBookingUrl()) return "legacy";

  if (host === "tickets.interpark.com") {
    if (path.includes("/onestop/seat")) return "new";
    return "new";
  }

  return "unknown";
}

function rememberBookingVariant(variant) {
  if (!variant || variant === state.lastBookingPageVariant) return;
  state.lastBookingPageVariant = variant;
  if (variant === "new") {
    const path = String(location.pathname || "").trim() || "/";
    log(`识别到 Interpark 新版订票页面 (${path})，进入新版流程`);
    return;
  }
  if (variant === "legacy") {
    log("识别到 Interpark 旧版订票页面 (BookMain.asp)，进入旧版流程分支");
  }
}

async function stopAtPriceByConfigIfNeeded() {
  if (state.config.fullFlowEnabled !== false) return false;
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...state.config,
      enabled: false,
      stoppedAt: Date.now()
    }
  });
  log("已进入价格页，按配置停止自动化");
  stopLoop("按配置在价格页停止");
  return true;
}

async function runImmediatePostQueueBurst() {
  // 排队放行后，用短间隔连续抢占第一轮交互机会。
  for (let i = 0; i < 3; i += 1) {
    const captchaHandled = await runCaptchaStep();
    if (captchaHandled) return;

    const stage = detectCurrentStage();
    const done = await runBookingStageByType(stage, {
      updateLastStage: false,
      notifyPriceEntered: true,
      enablePriceStopByConfig: true,
      enableUnknownReserveClick: false
    });
    if (done) return;
    await sleep(60);
  }
}

function clearQueueRuntimeState() {
  state.queueActive = false;
  state.queueNextKeepAliveAt = 0;
  state.queueKeepAliveCount = 0;
  state.queueLastRemaining = null;
  state.queueHealth.consecutiveFail = 0;
  state.queueHealth.alertActive = false;
}

async function runBookingStageByType(stage, options = {}) {
  const {
    updateLastStage = true,
    notifyPriceEntered = false,
    enablePriceStopByConfig = false,
    enableUnknownReserveClick = true
  } = options;

  if (stage === "seat") {
    if (updateLastStage) state.lastStage = "seat";
    if (!state.priceLockedSlow) setTickMode("fast");
    await runSeatStep();
    return false;
  }

  if (stage === "price") {
    if (notifyPriceEntered || state.lastStage !== "price") {
      await maybeNotifyEnteredPrice();
    }
    if (updateLastStage) state.lastStage = "price";
    if (enablePriceStopByConfig && (await stopAtPriceByConfigIfNeeded())) return true;
    if (!state.priceLockedSlow) {
      state.priceLockedSlow = true;
      setTickMode("normal");
    }
    await runPriceStep();
    return true;
  }

  if (stage === "info") {
    if (updateLastStage) state.lastStage = "info";
    if (!state.priceLockedSlow) {
      state.priceLockedSlow = true;
      setTickMode("normal");
    }
    await runInfoStep();
    return true;
  }

  if (stage === "date") {
    if (updateLastStage) state.lastStage = "date";
    if (!state.priceLockedSlow) setTickMode("fast");
    await runDateStep();
    return false;
  }

  if (updateLastStage) state.lastStage = "unknown";
  if (enableUnknownReserveClick && clickReserveEntryAggressive()) {
    log("未知阶段命中预约入口，已点击 预约");
    await sleep(180);
    return true;
  }
  log("未命中页面阶段，等待下一轮识别");
  return false;
}

async function runNewInterparkTick() {
  if (isInterparkGateWithoutBizCode()) {
    if (clickBuyNowAggressive()) {
      log("Interpark gates: 已点击立即购买，进入带 bizCode 的一般预订页");
      await sleep(140);
      return;
    }
    if (Date.now() - state.productLastCountdownLogAt > 4000) {
      log("Interpark gates: 等待进入带 bizCode 的一般预订页（未命中立即购买按钮）");
      state.productLastCountdownLogAt = Date.now();
    }
    return;
  }

  if (isInterparkGateWithBizCode()) {
    const countdownMs = getSaleCountdownMs();
    if (Number.isFinite(countdownMs) && countdownMs > 0) {
      if (countdownMs <= getCriticalPreMs()) {
        setTickMode("critical");
      } else {
        setTickMode("fast");
      }
      const now = Date.now();
      const remainSec = Math.ceil(countdownMs / 1000);
      const logInterval = countdownMs <= 10000 ? 500 : 4000;
      if (now - state.productLastCountdownLogAt >= logInterval) {
        log(`Interpark gates 距一般预订 ${remainSec}s，待命中`);
        state.productLastCountdownLogAt = now;
      }
      return;
    }
    if (clickReserveEntryAggressive()) {
      log("Interpark gates: 已点击一般预订");
      await sleep(state.tickMode === "critical" ? 40 : 160);
      return;
    }
  }

  if (isQueuePage()) {
    state.lastStage = "queue";
    if (!state.priceLockedSlow) setTickMode("fast");
    if (!state.queueActive) {
      state.queueActive = true;
      state.queueKeepAliveCount = 0;
      state.queueLastRemaining = null;
      scheduleNextQueueKeepAlive(true);
      if (state.firstBuyNowClickAt) {
        const cost = Date.now() - state.firstBuyNowClickAt;
        log(`检测到排队页，进入等待(点击到入队 ${cost}ms)`);
      } else {
        log("检测到排队页，进入等待");
      }
      state.queueHealth.lastProbeAt = 0;
      state.queueHealth.consecutiveFail = 0;
      state.queueHealth.lastSuccessAt = Date.now();
      state.queueHealth.alertActive = false;
      state.queueHealth.lastAlertAt = 0;
    }
    if (state.queueNextKeepAliveAt && Date.now() >= state.queueNextKeepAliveAt) {
      runQueueKeepAliveAction();
      scheduleNextQueueKeepAlive(false);
    }
    await runQueueHealthGuard();
    await maybeNotifyQueueThresholds();
    if (Date.now() - state.queueLastLogAt > 5000) {
      log("排队中，等待放行...");
      state.queueLastLogAt = Date.now();
    }
    return;
  }

  if (state.queueActive) {
    clearQueueRuntimeState();
    if (!state.priceLockedSlow) setTickMode("critical");
    log("排队已放行，立即开始点击选取");
    await runImmediatePostQueueBurst();
    return;
  }

  const captchaHandled = await runCaptchaStep();
  if (captchaHandled) {
    if (!state.priceLockedSlow) setTickMode("fast");
    await sleep(260);
    return;
  }
  const stage = detectCurrentStage();
  await runBookingStageByType(stage, {
    updateLastStage: true,
    notifyPriceEntered: false,
    enablePriceStopByConfig: true,
    enableUnknownReserveClick: true
  });
}

function getLegacyBookFrameDocument() {
  const frame = document.querySelector("iframe#ifrmBookStep");
  if (!frame) return null;
  try {
    return frame.contentDocument || frame.contentWindow?.document || null;
  } catch (_) {
    return null;
  }
}

function getLegacyCandidateDocs(frameDoc) {
  if (!frameDoc) return [];
  const docs = [frameDoc];
  const innerFrames = Array.from(frameDoc.querySelectorAll("iframe, frame"));
  for (const fr of innerFrames) {
    try {
      const doc = fr.contentDocument || fr.contentWindow?.document || null;
      if (doc) docs.push(doc);
    } catch (_) {}
  }
  return docs;
}

function getLegacyHandlerCode(el) {
  if (!el) return "";
  const raw = getLegacyRawHandlerSnippets(el).join(" ");
  return normalizeText(
    [
      raw,
      el.id,
      el.className?.toString()
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getLegacyRawHandlerSnippets(el) {
  if (!el) return [];
  return [
    el.getAttribute?.("href"),
    el.getAttribute?.("onclick"),
    el.getAttribute?.("onmouseup"),
    el.getAttribute?.("onmousedown"),
    el.getAttribute?.("onchange")
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean);
}

function runLegacyHandlerScript(el, keywords = []) {
  if (!isDomElement(el)) return false;
  const view = el.ownerDocument?.defaultView;
  if (!view) return false;
  const checks = Array.isArray(keywords)
    ? keywords.map((x) => normalizeText(String(x || ""))).filter(Boolean)
    : [];
  const snippets = getLegacyRawHandlerSnippets(el);
  for (const raw of snippets) {
    const bag = normalizeText(raw);
    if (checks.length && !checks.some((k) => bag.includes(k))) continue;
    let code = String(raw || "").trim();
    code = code.replace(/^javascript:\s*/i, "");
    if (!code) continue;
    code = code.replace(/\breturn\s+false\b\s*;?/gi, "");
    if (!code.trim()) continue;
    try {
      const fn = view.Function(code);
      fn.call(el);
      return true;
    } catch (_) {
      try {
        view.eval(code);
        return true;
      } catch (_) {}
    }
  }
  return false;
}

function extractLegacyDayFromHandler(code) {
  const raw = String(code || "");
  if (!raw) return null;
  const yyyymmdd = raw.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (yyyymmdd) {
    const day = Number(yyyymmdd[3]);
    if (Number.isFinite(day) && day >= 1 && day <= 31) return day;
  }
  return null;
}

function extractLegacyTimeTextFromHandler(code) {
  const raw = String(code || "");
  if (!raw) return "";
  const hhmm = raw.match(/\b([01]?\d|2[0-3])[:.]?([0-5]\d)\b/);
  if (!hhmm) return "";
  const hh = String(Number(hhmm[1])).padStart(2, "0");
  const mm = String(Number(hhmm[2])).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getLegacyActiveStepNumber() {
  const imgs = Array.from(document.querySelectorAll(".step img"));
  for (const img of imgs) {
    const src = String(img.getAttribute("src") || "");
    const m = src.match(/step_0?(\d+)_on/i);
    if (m) return Number(m[1]);
  }
  return null;
}

function getLegacyDateMonthParts(frameDoc) {
  if (!frameDoc) return null;
  const nodes = Array.from(frameDoc.querySelectorAll("strong, b, h3, h4, div, p, span"));
  for (const el of nodes) {
    const text = String(el.textContent || "").trim();
    const m = text.match(/(20\d{2})\s*[/.-]\s*(1[0-2]|0?[1-9])/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      if (Number.isFinite(year) && Number.isFinite(month)) return { year, month };
    }
  }
  return null;
}

function extractLegacyChangeMonthCode(raw) {
  const src = String(raw || "");
  if (!src) return "";
  const match = src.match(/fnchangemonth\s*\(\s*['"]?(\d{6})['"]?\s*\)/i);
  return match ? String(match[1]) : "";
}

async function clickLegacyMonthNav(frameDoc, direction = 1, targetParts = null) {
  if (!frameDoc) return false;
  const displayed = getLegacyDateMonthParts(frameDoc);
  const targetYearRaw = Number(targetParts?.year);
  const targetYear =
    Number.isFinite(targetYearRaw) && targetYearRaw >= 2000 && targetYearRaw <= 2099
      ? targetYearRaw
      : Number(displayed?.year);
  const targetMonth = Number(targetParts?.month);
  let targetYyyymm =
    Number.isFinite(targetYear) && Number.isFinite(targetMonth) && targetMonth >= 1 && targetMonth <= 12
      ? `${String(targetYear)}${String(targetMonth).padStart(2, "0")}`
      : "";
  if (!targetYyyymm) {
    const nodes = Array.from(frameDoc.querySelectorAll("a, [onclick], [href]"));
    const monthHits = nodes
      .map((el) => getLegacyRawHandlerSnippets(el))
      .flat()
      .map((x) => extractLegacyChangeMonthCode(x))
      .filter(Boolean);
    const picked =
      monthHits.find((x) => Number.isFinite(targetMonth) && Number(x.slice(4, 6)) === targetMonth) ||
      monthHits[0] ||
      "";
    targetYyyymm = picked;
  }
  if (!targetYyyymm) return false;
  const script = `javascript:fnChangeMonth('${targetYyyymm}');`;
  const main = await triggerLegacyScriptMainWorld(script, `date_month_${targetYyyymm}`);
  return Boolean(main?.ok);
}

function getLegacyDayCandidates(frameDoc) {
  if (!frameDoc) return [];
  const docs = getLegacyCandidateDocs(frameDoc);
  const fnOut = [];
  const textOut = [];

  for (const doc of docs) {
    // 旧版常见：点击事件挂在 fnSelectPlayDate(...) 上，优先走函数特征。
    const eventNodes = Array.from(
      doc.querySelectorAll(
        "a[href*='fnSelectPlayDate'], a[onclick*='fnSelectPlayDate'], [onclick*='fnSelectPlayDate'], [href*='SelectPlayDate']"
      )
    );
    for (const el of eventNodes) {
      if (!isDomElement(el)) continue;
      const code = getLegacyHandlerCode(el);
      const text = String(el.textContent || "").trim();
      const textDay = /^\d{1,2}$/.test(text) ? Number(text) : null;
      const codeDay = extractLegacyDayFromHandler(code);
      const day = Number.isFinite(textDay) ? textDay : codeDay;
      if (!Number.isFinite(day) || day < 1 || day > 31) continue;
      const classBag = normalizeText(el.className?.toString() || "");
      const bag = normalizeText(
        [classBag, el.id, el.getAttribute("aria-disabled"), el.getAttribute("style"), el.getAttribute("title")]
          .filter(Boolean)
          .join(" ")
      );
      if (
        el.disabled ||
        bag.includes("disabled") ||
        bag.includes("unavailable") ||
        bag.includes("sold")
      ) {
        continue;
      }
      const r = el.getBoundingClientRect();
      const selected =
        classBag.includes("selected") ||
        classBag.includes("choice") ||
        classBag.includes("active") ||
        classBag.includes("picked") ||
        classBag.includes("on") ||
        bag.includes("selected") ||
        bag.includes("choice") ||
        el.getAttribute("aria-selected") === "true";
      fnOut.push({ el, day, selected, top: r.top, left: r.left, from: "fn" });
    }

    const nodes = Array.from(doc.querySelectorAll("a, button, td, span, div")).filter(visible);
    for (const el of nodes) {
      const text = String(el.textContent || "").trim();
      if (!/^\d{1,2}$/.test(text)) continue;
      const day = Number(text);
      if (!Number.isFinite(day) || day < 1 || day > 31) continue;
      const code = getLegacyHandlerCode(el);
      const classBag = normalizeText(el.className?.toString() || "");
      const bag = normalizeText(
        [classBag, el.id, code, el.getAttribute("aria-disabled"), el.getAttribute("style")]
          .filter(Boolean)
          .join(" ")
      );
      if (
        el.disabled ||
        bag.includes("disabled") ||
        bag.includes("unavailable") ||
        bag.includes("sold")
      ) {
        continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      const selected =
        classBag.includes("selected") ||
        classBag.includes("choice") ||
        classBag.includes("active") ||
        classBag.includes("picked") ||
        classBag.includes("on") ||
        bag.includes("selected") ||
        bag.includes("choice") ||
        el.getAttribute("aria-selected") === "true";
      textOut.push({ el, day, selected, top: r.top, left: r.left, from: "text" });
    }
  }

  const out = fnOut.length ? fnOut : textOut;
  const byDay = new Map();
  for (const item of out) {
    const prev = byDay.get(item.day);
    if (!prev || (item.selected && !prev.selected)) byDay.set(item.day, item);
  }
  return Array.from(byDay.values()).sort((a, b) => a.day - b.day || a.top - b.top || a.left - b.left);
}

function clickLegacyDayCandidate(candidate) {
  if (!candidate?.el) return false;
  runLegacyHandlerScript(candidate.el, ["fnselectplaydate", "selectplaydate"]);
  forceClick(candidate.el);
  clickAtCenter(candidate.el);
  clickElement(candidate.el);
  state.dateLastDayClickAt = Date.now();
  log(`旧版已选择日期: ${candidate.day}`);
  return true;
}

function getLegacyTimeCandidates(frameDoc) {
  if (!frameDoc) return [];
  const docs = getLegacyCandidateDocs(frameDoc);
  const timePattern = /\b\d{1,2}\s*[:：.]\s*\d{2}\s*(?:am|pm)?\b/i;
  const fnOut = [];
  const textOut = [];

  for (const doc of docs) {
    const eventNodes = Array.from(
      doc.querySelectorAll(
        "a[href*='fnSelectPlaySeq'], a[onclick*='fnSelectPlaySeq'], [onclick*='fnSelectPlaySeq'], [href*='SelectPlaySeq']"
      )
    );
    for (const el of eventNodes) {
      if (!isDomElement(el)) continue;
      const code = getLegacyHandlerCode(el);
      const textRaw = String(el.textContent || "").trim();
      const text = timePattern.test(textRaw) ? textRaw : extractLegacyTimeTextFromHandler(code);
      if (!text || !timePattern.test(text)) continue;
      const classBag = normalizeText(el.className?.toString() || "");
      const bag = normalizeText(
        [classBag, el.id, el.getAttribute("aria-disabled"), el.getAttribute("style"), el.getAttribute("title")]
          .filter(Boolean)
          .join(" ")
      );
      if (
        el.disabled ||
        bag.includes("disabled") ||
        bag.includes("unavailable") ||
        bag.includes("sold")
      ) {
        continue;
      }
      const selected =
        classBag.includes("selected") ||
        classBag.includes("choice") ||
        classBag.includes("active") ||
        classBag.includes("picked") ||
        classBag.includes("on") ||
        bag.includes("selected") ||
        bag.includes("choice") ||
        el.getAttribute("aria-selected") === "true";
      fnOut.push({ el, text, selected, minutes: parseTimeMinutes(text), from: "fn" });
    }

    const nodes = Array.from(doc.querySelectorAll("a, button, li, td, div, span")).filter(visible);
    for (const el of nodes) {
      const text = String(el.textContent || "").trim();
      if (!timePattern.test(text)) continue;
      const code = getLegacyHandlerCode(el);
      const classBag = normalizeText(el.className?.toString() || "");
      const bag = normalizeText(
        [classBag, el.id, code, el.getAttribute("aria-disabled"), el.getAttribute("style")]
          .filter(Boolean)
          .join(" ")
      );
      if (
        el.disabled ||
        bag.includes("disabled") ||
        bag.includes("unavailable") ||
        bag.includes("sold")
      ) {
        continue;
      }
      const selected =
        classBag.includes("selected") ||
        classBag.includes("choice") ||
        classBag.includes("active") ||
        classBag.includes("picked") ||
        classBag.includes("on") ||
        bag.includes("selected") ||
        bag.includes("choice") ||
        el.getAttribute("aria-selected") === "true";
      textOut.push({ el, text, selected, minutes: parseTimeMinutes(text), from: "text" });
    }
  }

  const out = fnOut.length ? fnOut : textOut;
  out.sort((a, b) => a.minutes - b.minutes);
  return out;
}

function clickLegacyTimeCandidate(candidate) {
  if (!candidate?.el) return false;
  runLegacyHandlerScript(candidate.el, ["fnselectplayseq", "selectplayseq"]);
  forceClick(candidate.el);
  clickAtCenter(candidate.el);
  clickElement(candidate.el);
  state.dateLastSlotClickAt = Date.now();
  log(`旧版已选择场次: ${candidate.text}`);
  return true;
}

function getLegacyBookingFormState() {
  return {
    playDate: String(document.querySelector("#PlayDate")?.value || "").trim(),
    playSeq: String(document.querySelector("#PlaySeq")?.value || "").trim(),
    playTime: String(document.querySelector("#PlayTime")?.value || "").trim(),
    myPlayDate: String(document.querySelector("#MyPlayDate")?.textContent || "").trim(),
    myCancelableDate: String(document.querySelector("#MyCancelableDate")?.textContent || "").trim()
  };
}

function isLegacyMyPlayDateReady(stateObj) {
  const s = stateObj || getLegacyBookingFormState();
  const myDate = String(s.myPlayDate || "").trim();
  if (!myDate) return false;
  const cancelText = normalizeText(s.myCancelableDate || "");
  if (
    cancelText.includes("首先") &&
    (cancelText.includes("选择观赏日期") || cancelText.includes("請選擇觀賞日期"))
  ) {
    return false;
  }
  return /\d{4}.*\d{1,2}.*\d{1,2}/.test(myDate);
}

function hasJavascriptHref(el) {
  const anchor =
    String(el?.tagName || "").toLowerCase() === "a" ? el : el?.closest?.("a");
  const href = String(anchor?.getAttribute?.("href") || "").trim();
  return /^javascript\s*:/i.test(href);
}

async function runLegacyNextInPageContext(reason = "") {
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "LEGACY_NEXT_MAIN",
      reason: String(reason || "")
    });
    const data = resp?.result || {};
    if (resp?.ok && data?.ok) {
      log(
        `旧版Next主世界触发: fn=${data.fnInvoked ? "Y" : "N"}, target=${data.target || "-"}, step ${data.stepBefore ?? "-"}->${data.stepAfter ?? "-"}, seatSrc=${data.seatSrc || "-"}`
      );
      return true;
    }
    if (data?.error) {
      log(`旧版Next主世界触发失败: ${data.error}`);
    }
  } catch (_) {}

  const shown = (el) => {
    if (!isDomElement(el)) return false;
    try {
      const s = window.getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden";
    } catch (_) {
      return false;
    }
  };

  const largeWrap = document.getElementById("LargeNextBtn");
  const smallWrap = document.getElementById("SmallNextBtn");
  const large = document.getElementById("LargeNextBtnLink");
  const small = document.getElementById("SmallNextBtnLink");
  const target =
    (shown(largeWrap) && isDomElement(large) ? large : null) ||
    (shown(smallWrap) && isDomElement(small) ? small : null) ||
    (isDomElement(large) ? large : null) ||
    (isDomElement(small) ? small : null);
  if (!target) return false;

  if (hasJavascriptHref(target)) {
    // 避免触发 javascript: URL 导航（会被 CSP 拦截并刷报错）。
    return false;
  }

  const anchor =
    String(target.tagName || "").toLowerCase() === "a" ? target : target.closest?.("a");
  let hit = false;
  hit = forceClick(target) || hit;
  hit = clickAtCenter(target) || hit;
  hit = clickElement(target) || hit;
  if (anchor && isDomElement(anchor)) {
    hit = forceClick(anchor) || hit;
    hit = clickAtCenter(anchor) || hit;
    hit = clickElement(anchor) || hit;
    hit = runLegacyHandlerScript(anchor, ["fnnextstep"]) || hit;
  }
  if (hit) {
    log(`旧版Next兜底点击已触发 (${reason || "direct"})`);
  }
  return hit;
}

async function clickLegacyNextByVisibleArea() {
  if (await runLegacyNextInPageContext("visible_area")) {
    state.dateLastNextAt = Date.now();
    log("旧版日期页已点击 Next (visible-area/main-world)");
    return true;
  }

  const root =
    document.querySelector("#divBookMain .contR .buy_info") ||
    document.querySelector("#divBookMain") ||
    document.body;
  if (!root) return false;

  const words = ["next", "下一步", "다음"];
  const nodes = Array.from(
    root.querySelectorAll("a, button, [role='button'], div, span, p, img")
  ).filter((el) => {
    if (!visible(el)) return false;
    if (el.closest("#nol-ticket-bot-log-panel, #nol-ticket-bot-badge")) return false;
    return true;
  });

  const candidates = nodes
    .map((el) => {
      const text = normalizeText(el.textContent || "");
      const id = normalizeText(el.id || "");
      const cls = normalizeText(el.className?.toString() || "");
      const href = normalizeText(el.getAttribute?.("href") || "");
      const src = normalizeText(el.getAttribute?.("src") || "");
      const bag = `${text} ${id} ${cls} ${href} ${src}`;

      const looksLikeNext =
        bag.includes("largenextbtn") ||
        bag.includes("smallnextbtn") ||
        bag.includes("btn_next") ||
        bag.includes("fnnextstep") ||
        words.some((w) => text.includes(normalizeText(w)));
      if (!looksLikeNext) return null;
      if (
        bag.includes("smallprevbtn") ||
        text.includes("prev") ||
        text.includes("previous") ||
        text.includes("上一") ||
        text.includes("이전")
      ) {
        return null;
      }

      const r = el.getBoundingClientRect();
      let score = 0;
      if (bag.includes("largenextbtnlink") || bag.includes("smallnextbtnlink")) score += 14;
      if (bag.includes("largenextbtnimage") || bag.includes("smallnextbtnimage")) score += 12;
      if (bag.includes("fnnextstep")) score += 10;
      if (bag.includes("btn_next")) score += 8;
      if (r.left > window.innerWidth * 0.55) score += 4;
      if (r.top > window.innerHeight * 0.62) score += 4;
      if (r.width > 60 && r.height > 20) score += 2;
      if (text.startsWith("next") || text.startsWith("下一")) score += 2;
      return { el, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const target = candidates[0]?.el;
  if (!target || candidates[0].score < 8) return false;

  let actionEl = target;
  const targetTag = String(target.tagName || "").toLowerCase();
  if (!["a", "button", "img"].includes(targetTag)) {
    const inner =
      target.querySelector?.(
        "#LargeNextBtnLink, #SmallNextBtnLink, #LargeNextBtnImage, #SmallNextBtnImage, a[href*='fnNextStep']"
      ) || null;
    if (inner) actionEl = inner;
  }
  const anchor =
    String(actionEl.tagName || "").toLowerCase() === "a"
      ? actionEl
      : actionEl.closest?.("a");

  if (hasJavascriptHref(actionEl) || hasJavascriptHref(anchor)) {
    return false;
  }

  forceClick(actionEl);
  clickAtCenter(actionEl);
  clickElement(actionEl);
  if (anchor && anchor !== actionEl) {
    forceClick(anchor);
    clickAtCenter(anchor);
    clickElement(anchor);
    runLegacyHandlerScript(anchor, ["fnnextstep"]);
  }
  await runLegacyNextInPageContext("visible_area_fallback");
  state.dateLastNextAt = Date.now();
  log("旧版日期页已点击 Next (visible-area)");
  return true;
}

async function clickLegacyNextButton() {
  if (await runLegacyNextInPageContext("button_entry")) {
    state.dateLastNextAt = Date.now();
    log("旧版日期页已点击 Next (main-world)");
    return true;
  }

  if (await clickLegacyNextByVisibleArea()) return true;

  const selectors = [
    "#LargeNextBtnLink",
    "#LargeNextBtnImage",
    "#SmallNextBtnLink",
    "#SmallNextBtnImage",
    "#LargeNextBtn a",
    "#SmallNextBtn a",
    "a[href*=\"fnNextStep('P')\"]",
    "a[href*=\"fnNextStep\"]"
  ];
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (!isDomElement(node)) continue;
    const anchor =
      String(node.tagName || "").toLowerCase() === "img"
        ? node.closest("a")
        : String(node.tagName || "").toLowerCase() === "a"
          ? node
          : node.closest?.("a");
    if (anchor && !isDomElement(anchor)) continue;

    const container = (anchor || node).closest?.("#LargeNextBtn, #SmallNextBtn, p.btn");
    const styleText = normalizeText(container?.getAttribute?.("style") || "");
    if (styleText.includes("display:none")) continue;
    if (hasJavascriptHref(node) || hasJavascriptHref(anchor)) continue;

    forceClick(node);
    clickAtCenter(node);
    clickElement(node);
    if (anchor && anchor !== node) {
      forceClick(anchor);
      clickAtCenter(anchor);
      clickElement(anchor);
    }
    // 旧版常见是 href="javascript:fnNextStep('P');"，点击后再直接执行一次同源脚本，避免事件链被拦截。
    if (anchor && runLegacyHandlerScript(anchor, ["fnnextstep"])) {
      log(`旧版日期页已执行 Next 脚本 (${selector})`);
    }
    await runLegacyNextInPageContext(`selector:${selector}`);

    state.dateLastNextAt = Date.now();
    log(`旧版日期页已点击 Next (${selector})`);
    return true;
  }
  return false;
}

async function clickLegacySeatCompleteButton() {
  const mainScripts = ["fnSelect();", "javascript:fnSelect();"];
  for (const script of mainScripts) {
    const main = await triggerLegacyScriptMainWorld(script, "seat_complete");
    if (main?.ok) {
      const frameInfo = main.frameId ?? "-";
      log(`旧版座位完成主世界触发: mode=${main.mode || "-"}, frame=${frameInfo}`);
      return true;
    }
  }
  if (Date.now() - state.legacySeatLastClickFailLogAt > 1200) {
    log("旧版座位完成主世界触发失败: fnSelect 未执行成功（已禁用兜底点击）");
    state.legacySeatLastClickFailLogAt = Date.now();
  }
  return false;
}

function getLegacyNextUiState() {
  const large = document.querySelector("#LargeNextBtn");
  const small = document.querySelector("#SmallNextBtn");
  const largeLink = document.querySelector("#LargeNextBtnLink");
  const smallLink = document.querySelector("#SmallNextBtnLink");
  const largeImg = document.querySelector("#LargeNextBtnImage");
  const smallImg = document.querySelector("#SmallNextBtnImage");

  const largeStyle = normalizeText(large?.getAttribute?.("style") || "");
  const smallStyle = normalizeText(small?.getAttribute?.("style") || "");
  const largeVisible = Boolean(large && !largeStyle.includes("display:none"));
  const smallVisible = Boolean(small && !smallStyle.includes("display:none"));

  const largeHref = String(largeLink?.getAttribute?.("href") || "");
  const smallHref = String(smallLink?.getAttribute?.("href") || "");
  const largeImgSrc = String(largeImg?.getAttribute?.("src") || "");
  const smallImgSrc = String(smallImg?.getAttribute?.("src") || "");

  const hasNextHref =
    largeHref.includes("fnNextStep('P')") ||
    smallHref.includes("fnNextStep('P')") ||
    largeHref.includes("fnNextStep") ||
    smallHref.includes("fnNextStep");
  const imgOn =
    /btn_next_on\.gif/i.test(largeImgSrc) ||
    /btn_next_02\.gif/i.test(smallImgSrc) ||
    /btn_next\.gif/i.test(largeImgSrc);

  return {
    largeVisible,
    smallVisible,
    largeHref,
    smallHref,
    largeImgSrc,
    smallImgSrc,
    hasNextHref,
    imgOn
  };
}

function isLegacyNextReady() {
  const s = getLegacyNextUiState();
  if (isLegacyNextProcessing()) return false;
  if (!s.hasNextHref) return false;
  if (!s.largeVisible && !s.smallVisible) return false;
  return true;
}

async function runLegacyNextByScriptFallback() {
  const before = getLegacyBookingFormState();
  let hit = false;
  for (let i = 0; i < 2; i += 1) {
    hit = (await runLegacyNextInPageContext(`fallback_${i + 1}`)) || hit;
    await sleep(120);
  }

  const after = getLegacyBookingFormState();
  if (hit) {
    log(
      `旧版Next兜底诊断: PlayDate ${before.playDate || "-"} -> ${after.playDate || "-"}, PlaySeq ${before.playSeq || "-"} -> ${after.playSeq || "-"}, seatSrc=${String(document.querySelector("#ifrmSeat")?.getAttribute("src") || "-")}`
    );
  }
  return hit;
}

function isLegacySeatLayerVisible() {
  const layer = document.querySelector("#divBookSeat");
  if (!isDomElement(layer)) return false;
  const styleText = normalizeText(layer.getAttribute("style") || "");
  if (styleText.includes("display:none")) return false;
  if (visible(layer)) return true;
  return false;
}

function isLegacySeatIframeReady() {
  const ifrm = document.querySelector("#ifrmSeat");
  if (!isDomElement(ifrm)) return false;
  const src = String(ifrm.getAttribute("src") || "").trim();
  if (!src) return false;
  if (src === "about:blank") return false;
  return true;
}

function isLegacyCertifyLayerVisible() {
  const layer = document.querySelector("#divBookCertify");
  if (!isDomElement(layer)) return false;
  const styleText = normalizeText(layer.getAttribute("style") || "");
  if (styleText.includes("display:none")) return false;
  if (visible(layer)) return true;
  return false;
}

function isLegacyNextProcessing() {
  const proc = document.querySelector("#LargeProcBtn");
  if (isDomElement(proc)) {
    const styleText = normalizeText(proc.getAttribute("style") || "");
    if (!styleText.includes("display:none")) return true;
  }
  return false;
}

async function waitLegacyNextTransition(timeoutMs = 8000, intervalMs = 250) {
  const startedAt = Date.now();
  let seenProcessing = false;
  let processingSince = 0;
  while (Date.now() - startedAt < timeoutMs) {
    if (isLegacySeatLayerVisible() || isLegacySeatIframeReady()) return "seat";
    if (isLegacyCertifyLayerVisible()) return "certify";
    if (isLegacyNextProcessing()) {
      if (!seenProcessing) {
        seenProcessing = true;
        processingSince = Date.now();
      }
      await sleep(intervalMs);
      continue;
    }
    if (seenProcessing) {
      // 出现过 processing 且刚消失，通常是即将切层，给额外窗口避免误判失败。
      if (Date.now() - processingSince < 9000) {
        await sleep(intervalMs);
        continue;
      }
    }
    await sleep(intervalMs);
  }
  return seenProcessing ? "processing_timeout" : "timeout";
}

function tryLegacyHeaderDateSelectFallback() {
  const sel = document.querySelector("#SelPlayDate");
  if (!sel || !isDomElement(sel)) return false;
  const options = Array.from(sel.querySelectorAll("option"));
  if (!options.length) return false;

  const current = String(sel.value || "");
  const curIdx = options.findIndex((o) => String(o.value || "") === current);
  const nextIdx = options.length > 1 ? ((curIdx >= 0 ? curIdx : -1) + 1) % options.length : 0;
  const target = options[nextIdx];
  if (!target) return false;

  sel.value = String(target.value || "");
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  state.dateLastDayClickAt = Date.now();
  log(`旧版日期兜底: 通过 SelPlayDate 切换到 ${target.value || target.textContent || ""}`);
  return true;
}

function isLegacyDateStepLikely(frameDoc) {
  if (!frameDoc) return false;
  const text = normalizeText(frameDoc.body?.innerText || "");
  if (text.includes("select date") || text.includes("选择日期") || text.includes("請選擇觀賞日期")) {
    return true;
  }
  const docs = getLegacyCandidateDocs(frameDoc);
  const dateFnCount = docs.reduce(
    (acc, doc) =>
      acc +
      doc.querySelectorAll(
        "a[href*='fnSelectPlayDate'], a[onclick*='fnSelectPlayDate'], [onclick*='fnSelectPlayDate'], [href*='SelectPlayDate']"
      ).length,
    0
  );
  return dateFnCount > 0;
}

async function runLegacyDateStep() {
  if (isLegacySeatLayerVisible() || isLegacySeatIframeReady()) return;
  if (isLegacyCertifyLayerVisible()) {
    if (Date.now() - state.queueLastLogAt > 4000) {
      log("旧版检测到认证层(divBookCertify)，请先手动完成认证");
      state.queueLastLogAt = Date.now();
    }
    return;
  }
  if (isLegacyNextProcessing()) return;
  if (state.legacyNextPendingUntil && Date.now() < state.legacyNextPendingUntil) {
    return;
  }
  if (state.legacyNextPendingUntil && Date.now() >= state.legacyNextPendingUntil) {
    state.legacyNextPendingUntil = 0;
  }
  if (state.dateLastNextAt && Date.now() - state.dateLastNextAt < 1500) {
    // Next 后给页面内部状态流转留窗口，避免高频重点日期/场次把流程打断。
    return;
  }

  const frameDoc = getLegacyBookFrameDocument();
  if (!frameDoc) {
    if (Date.now() - state.queueLastLogAt > 5000) {
      log("旧版日期页: ifrmBookStep 未就绪，等待加载");
      state.queueLastLogAt = Date.now();
    }
    return;
  }

  const monthRaw = String(state.config.dateMonth || "").trim();
  const dayRaw = String(state.config.dateDay || "").trim();
  const timeRaw = String(state.config.dateTime || "").trim();

  if (monthRaw) {
    const monthParts = parseMonthParts(monthRaw);
    const targetMonth = Number(monthParts.month);
    const displayed = getLegacyDateMonthParts(frameDoc);
    if (Number.isFinite(targetMonth) && displayed?.month && displayed.month !== targetMonth) {
      let direction = targetMonth > displayed.month ? 1 : -1;
      const targetYear = Number(monthParts.year);
      if (Number.isFinite(targetYear) && Number.isFinite(displayed.year)) {
        const delta = (targetYear - displayed.year) * 12 + (targetMonth - displayed.month);
        direction = delta > 0 ? 1 : delta < 0 ? -1 : 0;
      }
      if (Date.now() - state.dateLastDayClickAt > 700 && direction !== 0) {
        const switched = await clickLegacyMonthNav(frameDoc, direction, monthParts);
        state.dateLastDayClickAt = Date.now();
        if (switched) {
          await sleep(140);
          const after = getLegacyDateMonthParts(frameDoc);
          if (after?.month === targetMonth) {
            log(`旧版日期页切换月份成功: ${displayed.month} -> ${targetMonth}`);
          } else {
            log(`旧版日期页切换月份请求已发出: ${displayed.month} -> ${targetMonth}（等待页面刷新）`);
          }
        } else if (Date.now() - state.queueLastLogAt > 1200) {
          log(`旧版日期页切换月份失败: ${displayed.month} -> ${targetMonth}（fnChangeMonth未执行）`);
          state.queueLastLogAt = Date.now();
        }
      }
      return;
    }
  }

  const dayCandidates = getLegacyDayCandidates(frameDoc);
  if (!dayCandidates.length) {
    if (Date.now() - state.dateLastDayClickAt > 1200 && tryLegacyHeaderDateSelectFallback()) {
      return;
    }
    const docs = getLegacyCandidateDocs(frameDoc);
    const hitByFn = docs.reduce(
      (acc, doc) =>
        acc +
        doc.querySelectorAll(
          "a[href*='fnSelectPlayDate'], a[onclick*='fnSelectPlayDate'], [onclick*='fnSelectPlayDate'], [href*='SelectPlayDate']"
        ).length,
      0
    );
    log(`旧版日期页未找到可选日期，等待下一轮 (fnSelectPlayDate节点=${hitByFn})`);
    return;
  }

  let bookingState = getLegacyBookingFormState();
  const panelReady = isLegacyMyPlayDateReady(bookingState);

  let dayDone = false;
  if (panelReady && !dayRaw && !timeRaw) {
    dayDone = true;
  } else if (dayRaw) {
    const targetDay = Number(dayRaw);
    const target = dayCandidates.find((x) => x.day === targetDay);
    if (target) {
      dayDone = target.selected || clickLegacyDayCandidate(target);
    } else {
      log(`旧版日期页未命中配置日期: ${dayRaw}`);
      return;
    }
  } else {
    const selected = dayCandidates.find((x) => x.selected);
    if (selected) {
      dayDone = true;
    } else if (Date.now() - state.dateLastDayClickAt > 600) {
      dayDone = clickLegacyDayCandidate(dayCandidates[0]);
    }
  }
  if (!dayDone) return;

  await sleep(120);

  const timeCandidates = getLegacyTimeCandidates(frameDoc);
  if (!timeCandidates.length) {
    if (panelReady) {
      // 右侧已显示完整日期时间时，场次列表可能被折叠/异步隐藏，可直接进入下一步。
      bookingState = getLegacyBookingFormState();
    } else {
    if (Date.now() - state.dateLastDayClickAt > 700 && dayCandidates.length) {
      const selected = dayCandidates.find((x) => x.selected);
      let fallback = selected || dayCandidates[0];
      if (!dayRaw && dayCandidates.length > 1) {
        const idx = selected ? dayCandidates.findIndex((x) => x.day === selected.day) : -1;
        if (idx >= 0) {
          fallback = dayCandidates[(idx + 1) % dayCandidates.length] || fallback;
        }
      }
      clickLegacyDayCandidate(fallback);
      log(`旧版日期页未发现场次，重触发日期点击: ${fallback.day}`);
      return;
    }
    log("旧版日期页当前日期无可选场次，等待下一轮");
    return;
    }
  }

  let timeDone = false;
  if (panelReady && !timeRaw) {
    timeDone = true;
  } else if (timeRaw) {
    const matches = timeCandidates.filter((x) => isConfiguredTimeMatch(timeRaw, x.text));
    const target = matches.find((x) => x.selected) || matches[0];
    if (target) {
      timeDone = target.selected || clickLegacyTimeCandidate(target);
    } else {
      log(`旧版日期页未命中配置场次: ${timeRaw}`);
      return;
    }
  } else {
    const selected = timeCandidates.find((x) => x.selected);
    if (selected) {
      timeDone = true;
    } else if (Date.now() - state.dateLastSlotClickAt > 700) {
      timeDone = clickLegacyTimeCandidate(timeCandidates[0]);
    }
  }
  if (!timeDone) return;

  bookingState = getLegacyBookingFormState();
  if (!bookingState.playDate || !bookingState.playSeq) {
    const selectedDay = dayCandidates.find((x) => x.selected) || dayCandidates[0];
    const selectedTime = timeCandidates.find((x) => x.selected) || timeCandidates[0];
    runLegacyHandlerScript(selectedDay?.el, ["fnselectplaydate", "selectplaydate"]);
    await sleep(90);
    runLegacyHandlerScript(selectedTime?.el, ["fnselectplayseq", "selectplayseq"]);
    await sleep(140);
    bookingState = getLegacyBookingFormState();
    if (!bookingState.playDate || !bookingState.playSeq) {
      log(
        `旧版日期状态未就绪: PlayDate=${bookingState.playDate || "-"}, PlaySeq=${bookingState.playSeq || "-"}, PlayTime=${bookingState.playTime || "-"}`
      );
      return;
    }
    log(
      `旧版日期状态已就绪: PlayDate=${bookingState.playDate}, PlaySeq=${bookingState.playSeq}, PlayTime=${bookingState.playTime || "-"}`
    );
  }
  if (Date.now() - state.lastInfoStepAt > 2000) {
    log(
      `旧版日期状态检查: PlayDate=${bookingState.playDate || "-"}, PlaySeq=${bookingState.playSeq || "-"}, PlayTime=${bookingState.playTime || "-"}, MyPlayDate=${bookingState.myPlayDate || "-"}`
    );
    state.lastInfoStepAt = Date.now();
  }

  if (!isLegacyNextReady()) {
    const now = Date.now();
    if (now - state.legacyNextWaitLogAt > 1200) {
      const s = getLegacyNextUiState();
      log(
        `旧版日期页等待 Next 激活: large=${s.largeVisible ? "Y" : "N"}, small=${s.smallVisible ? "Y" : "N"}, href=${s.hasNextHref ? "Y" : "N"}, processing=${isLegacyNextProcessing() ? "Y" : "N"}`
      );
      state.legacyNextWaitLogAt = now;
    }
    return;
  }

  if (Date.now() - state.dateLastNextAt < 500) return;
  if (!(await clickLegacyNextButton())) return;
  state.legacyNextPendingUntil = Date.now() + 12000;
  const firstTransition = await waitLegacyNextTransition(14000, 250);
  if (firstTransition === "seat") {
    log("旧版Next后已进入座位层");
    return;
  }
  if (firstTransition === "certify") {
    log("旧版Next后触发认证层，请先手动完成认证");
    return;
  }
  if (firstTransition === "processing_timeout") {
    state.legacyNextPendingUntil = Date.now() + 10000;
    log("旧版Next后仍在加载态，继续等待，不触发兜底");
    return;
  }

  if (getLegacyActiveStepNumber() === 1 && (await runLegacyNextByScriptFallback())) {
    log("旧版日期页 Next 点击后仍在 step1，已触发 CSP-safe 兜底点击");
    const secondTransition = await waitLegacyNextTransition(12000, 250);
    if (secondTransition === "seat") {
      log("旧版兜底后已进入座位层");
      return;
    }
    if (secondTransition === "certify") {
      log("旧版兜底后触发认证层，请先手动完成认证");
      return;
    }
    if (secondTransition === "processing_timeout") {
      state.legacyNextPendingUntil = Date.now() + 10000;
      log("旧版兜底后仍在加载态，继续等待");
      return;
    }
    state.legacyNextPendingUntil = Date.now() + 8000;
    log("旧版兜底后仍未进入下一步，等待下轮重试");
  }
}

function resetLegacySeatRuntime() {
  state.legacySeatFlowKey = "";
  state.legacySeatAreaIndex = 0;
  state.legacySeatCurrentAreaCode = "";
  state.legacySeatLastAreaSwitchAt = 0;
  state.legacySeatAreaNextSwitchAt = 0;
  state.legacySeatLastSeatClickAt = 0;
  state.legacySeatLastNextAt = 0;
  state.legacySeatSelectedAssumed = 0;
  state.legacySeatClickedKeys = [];
  state.legacySeatAttemptedKeys = {};
  state.legacySeatNoSeatCycles = 0;
  state.legacySeatLastLogAt = 0;
  state.legacySeatLastClickFailLogAt = 0;
  state.legacySeatLastGradeClickAt = 0;
  state.legacySeatCurrentGrade = "";
  state.legacySeatGradeIndex = 0;
  state.legacySeatLastAreaDiscoveryAt = 0;
  state.legacySeatAreaSettleUntil = 0;
  state.legacySeatSinglePickPendingUntil = 0;
}

function getLegacySeatFrameDocument() {
  const frame = document.querySelector("iframe#ifrmSeat");
  if (!frame) return null;
  try {
    return frame.contentDocument || frame.contentWindow?.document || null;
  } catch (_) {
    return null;
  }
}

function getLegacySeatSearchDocuments(preferredDoc = null) {
  const out = [];
  const seen = new Set();
  const push = (doc) => {
    if (!doc || seen.has(doc)) return;
    seen.add(doc);
    out.push(doc);
  };

  const walkFrames = (doc, depth = 0, maxDepth = 3) => {
    if (!doc || depth > maxDepth) return;
    push(doc);
    if (depth === maxDepth) return;
    const frames = Array.from(doc.querySelectorAll("iframe, frame"));
    for (const fr of frames) {
      try {
        const sub = fr.contentDocument || fr.contentWindow?.document || null;
        if (sub) walkFrames(sub, depth + 1, maxDepth);
      } catch (_) {}
    }
  };

  const seatDoc = getLegacySeatFrameDocument();
  if (seatDoc) walkFrames(seatDoc, 0, 3);
  if (preferredDoc) walkFrames(preferredDoc, 0, 3);
  walkFrames(document, 0, 2);
  return out;
}

function extractLegacySeatAreaCode(raw) {
  const text = String(raw || "");
  if (!text) return "";
  const byFn = text.match(/fnblockseatupdate\s*\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([^']+)'\s*\)/i);
  if (byFn?.[1]) return String(byFn[1]).trim();
  const lastQuoted = Array.from(text.matchAll(/'([^']+)'/g)).map((m) => String(m[1] || "").trim());
  if (!lastQuoted.length) return "";
  return lastQuoted[lastQuoted.length - 1] || "";
}

function normalizeLegacyScriptCode(raw) {
  let code = String(raw || "").trim();
  if (!code) return "";
  code = code.replace(/^javascript:\s*/i, "").trim();
  code = code.replace(/\breturn\s+false\b\s*;?/gi, "").trim();
  if (!code) return "";
  return code;
}

function runLegacyScriptCode(view, code, thisArg = null) {
  if (!view) return false;
  const script = normalizeLegacyScriptCode(code);
  if (!script) return false;
  try {
    const fn = view.Function(script);
    fn.call(thisArg || view);
    return true;
  } catch (_) {
    try {
      view.eval(script);
      return true;
    } catch (_) {}
  }
  return false;
}

function collectLegacyAreaScripts(el) {
  if (!isDomElement(el)) return [];
  const out = [];
  const seen = new Set();
  const pushScriptsFromNode = (node) => {
    if (!isDomElement(node)) return;
    const raws = getLegacyRawHandlerSnippets(node);
    for (const raw of raws) {
      const code = normalizeLegacyScriptCode(raw);
      if (!code) continue;
      const bag = normalizeText(code);
      if (bag.includes("fnswapgrade")) continue;
      if (!/[a-z_][\w$]*\s*\(/i.test(code)) continue;
      if (seen.has(code)) continue;
      seen.add(code);
      out.push(code);
    }
  };

  pushScriptsFromNode(el);
  const anchor =
    String(el.tagName || "").toLowerCase() === "a" ? el : el.closest?.("a");
  if (anchor) pushScriptsFromNode(anchor);
  const li = el.closest?.("li");
  if (li) pushScriptsFromNode(li);
  const nested = Array.from(
    el.querySelectorAll?.("a[href^='javascript:'], a[onclick], [onclick]") || []
  );
  for (const node of nested) pushScriptsFromNode(node);
  return out;
}

function parseLegacyRemainCount(raw) {
  const n = Number(String(raw || "").replace(/[^\d-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return n;
}

function collectLegacySeatGradeCandidates(preferredDoc = null) {
  const docs = getLegacySeatSearchDocuments(preferredDoc);
  const out = [];
  const seen = new Set();

  for (const doc of docs) {
    const nodes = Array.from(
      doc.querySelectorAll(
        ".watch_info [onclick*='fnSwapGrade'], #SeatGradeInfo [onclick*='fnSwapGrade'], a[href*='fnSwapGrade'], a[onclick*='fnSwapGrade']"
      )
    );
    for (const el of nodes) {
      if (!isDomElement(el) || !visible(el)) continue;
      const raw = getLegacyRawHandlerSnippets(el).join(" ");
      const bag = normalizeText(raw);
      if (!bag.includes("fnswapgrade")) continue;

      const gradeMatch = raw.match(/fnswapgrade\s*\(\s*'?(\d+)'?\s*\)/i);
      const gradeId = String(gradeMatch?.[1] || "").trim();

      let detail = null;
      if (gradeId) {
        const detailNodes = Array.from(
          doc.querySelectorAll("#GradeDetail[seatgrade], td#GradeDetail[seatgrade]")
        );
        detail =
          detailNodes.find(
            (node) => String(node.getAttribute("seatgrade") || "").trim() === gradeId
          ) || null;
      }
      if (!detail) {
        const tr = el.closest("tr");
        const next = tr?.nextElementSibling;
        detail =
          next?.querySelector?.("#GradeDetail[seatgrade], td#GradeDetail[seatgrade]") || null;
      }

      const remain = parseLegacyRemainCount(detail?.getAttribute?.("remaincnt") || "");
      const label = String(el.textContent || "").replace(/\s+/g, " ").trim() || gradeId || "-";
      const key = `${gradeId || "-"}|${label}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let score = 0;
      if (Number.isFinite(remain) && remain > 0) score += 10;
      if (Number.isFinite(remain) && remain <= 0) score -= 3;
      if (label.toLowerCase().includes("vip")) score += 2;
      out.push({ el, gradeId, label, remain, score });
    }
  }

  out.sort((a, b) => {
    const ar = Number.isFinite(a.remain) ? a.remain : -1;
    const br = Number.isFinite(b.remain) ? b.remain : -1;
    if (ar !== br) return br - ar;
    if (a.score !== b.score) return b.score - a.score;
    return String(a.gradeId || "").localeCompare(String(b.gradeId || ""));
  });
  return out;
}

async function clickLegacySeatGradeCandidate(grade) {
  if (!grade?.el) return false;
  const now = Date.now();
  const current = String(grade.gradeId || grade.label || "").trim();
  if (now - state.legacySeatLastGradeClickAt < 320 && state.legacySeatCurrentGrade === current) {
    return false;
  }

  let hit = runLegacyHandlerScript(grade.el, ["fnswapgrade", "swapgrade"]);
  const anchor =
    String(grade.el.tagName || "").toLowerCase() === "a" ? grade.el : grade.el.closest?.("a");
  if (!hit && anchor) {
    hit = runLegacyHandlerScript(anchor, ["fnswapgrade", "swapgrade"]);
  }
  if (!hit && !hasJavascriptHref(grade.el)) {
    hit = forceClick(grade.el) || clickAtCenter(grade.el) || clickElement(grade.el);
  }
  if (!hit && anchor && !hasJavascriptHref(anchor)) {
    hit = forceClick(anchor) || clickAtCenter(anchor) || clickElement(anchor);
  }
  if (!hit) return false;

  state.legacySeatLastGradeClickAt = now;
  state.legacySeatCurrentGrade = current;
  log(
    `旧版选座先切等级: ${grade.label}${
      Number.isFinite(grade.remain) ? ` (remain=${grade.remain})` : ""
    }`
  );
  return true;
}

function collectLegacySeatAreaCandidates(preferredDoc = null) {
  const docs = getLegacySeatSearchDocuments(preferredDoc);
  const out = [];
  const seen = new Set();
  for (const doc of docs) {
    const nodes = Array.from(
      doc.querySelectorAll(
        "a[href*='fnBlockSeatUpdate'], a[onclick*='fnBlockSeatUpdate'], [onclick*='fnBlockSeatUpdate'], .watch_info li, .watch_info a, #SeatGradeInfo li, #SeatGradeInfo a, #GradeDetail li, #GradeDetail a"
      )
    );
    for (const el of nodes) {
      if (!isDomElement(el)) continue;
      const scripts = collectLegacyAreaScripts(el);
      if (!scripts.length) continue;
      const raw = scripts.join("; ");
      const handlerBag = normalizeText(raw);
      const metaBag = normalizeText(
        [handlerBag, el.id, el.className?.toString(), el.getAttribute("href"), el.textContent]
          .filter(Boolean)
          .join(" ")
      );
      if (!metaBag) continue;
      if (metaBag.includes("fnswapgrade")) continue;
      const inWatchInfo = Boolean(el.closest(".watch_info, #SeatGradeInfo"));
      const hasAreaAction =
        metaBag.includes("fnblockseatupdate") ||
        metaBag.includes("blockseatupdate") ||
        inWatchInfo;
      if (!hasAreaAction) continue;

      const code = extractLegacySeatAreaCode(raw || metaBag);
      const label = String(el.textContent || "").replace(/\s+/g, " ").trim();
      const key = code || scripts[0] || label;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      let score = 0;
      if (metaBag.includes("fnblockseatupdate")) score += 8;
      if (inWatchInfo) score += 3;
      if (code) score += 2;
      if (visible(el)) score += 1;
      out.push({ el, code, key, scripts, label: label || code || "-", score });
    }
  }
  out.sort((a, b) => b.score - a.score || String(a.label).localeCompare(String(b.label)));
  return out;
}

function mergeLegacySeatAreaCandidates(base = [], extra = []) {
  const out = [];
  const seen = new Set();
  const push = (item) => {
    if (!item) return;
    const key = String(item.code || item.key || item.scripts?.[0] || item.label || "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };
  (Array.isArray(base) ? base : []).forEach(push);
  (Array.isArray(extra) ? extra : []).forEach(push);
  out.sort(
    (a, b) =>
      Number(b?.score || 0) - Number(a?.score || 0) ||
      String(a?.label || "").localeCompare(String(b?.label || ""))
  );
  return out;
}

function applyLegacyAreaOrderByConfig(areas = []) {
  const list = Array.isArray(areas) ? areas.slice() : [];
  if (!list.length) return list;
  const mode = state.config.legacyAreaOrderMode === "custom" ? "custom" : "default";
  if (mode !== "custom") return list;

  const customCodes = normalizeLegacyAreaCustomCodes(state.config.legacyAreaCustomCodes || []);
  if (!customCodes.length) return list;

  const orderMap = new Map(customCodes.map((code, idx) => [code, idx]));
  const matched = list.filter((area) => orderMap.has(String(area?.code || "").trim()));
  if (!matched.length) return list;

  matched.sort((a, b) => {
    const ai = orderMap.get(String(a?.code || "").trim());
    const bi = orderMap.get(String(b?.code || "").trim());
    if (ai !== bi) return ai - bi;
    return String(a?.label || "").localeCompare(String(b?.label || ""));
  });
  return matched;
}

async function discoverLegacySeatAreasByGradeSweep(seatDoc, initialAreas = []) {
  let mergedAreas = mergeLegacySeatAreaCandidates(initialAreas, []);
  const grades = collectLegacySeatGradeCandidates(seatDoc);
  if (!grades.length) return mergedAreas;

  const startIdx = Number.isFinite(state.legacySeatGradeIndex)
    ? state.legacySeatGradeIndex % grades.length
    : 0;

  for (let i = 0; i < grades.length; i += 1) {
    const idx = (startIdx + i) % grades.length;
    const grade = grades[idx];
    await clickLegacySeatGradeCandidate(grade);
    await sleep(500);
    mergedAreas = mergeLegacySeatAreaCandidates(
      mergedAreas,
      collectLegacySeatAreaCandidates(seatDoc)
    );
  }
  state.legacySeatGradeIndex = (startIdx + grades.length) % grades.length;

  if (mergedAreas.length) {
    const preview = mergedAreas
      .slice(0, 10)
      .map((x) => String(x.code || x.label || "-"))
      .join(", ");
    log(`旧版区域脚本收集完成: 共${mergedAreas.length}个，示例=${preview}`);
  } else {
    log("旧版已轮询全部 GradeRow，但仍未收集到 fnBlockSeatUpdate 区域脚本");
  }
  return applyLegacyAreaOrderByConfig(mergedAreas);
}

function hasLegacySeatClickedKey(key) {
  return state.legacySeatClickedKeys.includes(String(key || ""));
}

function rememberLegacySeatClickedKey(key) {
  const k = String(key || "").trim();
  if (!k || hasLegacySeatClickedKey(k)) return;
  state.legacySeatClickedKeys.push(k);
  if (state.legacySeatClickedKeys.length > 800) {
    state.legacySeatClickedKeys = state.legacySeatClickedKeys.slice(-500);
  }
}

function rememberLegacySeatAttemptKey(key) {
  const k = String(key || "").trim();
  if (!k) return;
  const now = Date.now();
  state.legacySeatAttemptedKeys[k] = now;
  const entries = Object.entries(state.legacySeatAttemptedKeys || {});
  if (entries.length > 1200) {
    const pruned = {};
    for (const [ek, ts] of entries) {
      if (now - Number(ts || 0) < 30000) pruned[ek] = Number(ts || 0);
    }
    state.legacySeatAttemptedKeys = pruned;
  }
}

function hasLegacySeatRecentAttempt(key, cooldownMs = 5000) {
  const k = String(key || "").trim();
  if (!k) return false;
  const ts = Number(state.legacySeatAttemptedKeys?.[k] || 0);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return Date.now() - ts < cooldownMs;
}

function isLegacySeatDashedSelected(el) {
  if (!isDomElement(el)) return false;
  const inlineStyle = normalizeText(el.getAttribute("style") || "");
  if (inlineStyle.includes("border") && inlineStyle.includes("dashed")) return true;
  try {
    const view = el.ownerDocument?.defaultView || window;
    const st = view.getComputedStyle(el);
    const borderStyle = normalizeText(st.borderStyle || "");
    const borderWidth = Number.parseFloat(String(st.borderWidth || "0"));
    if (borderStyle.includes("dashed") && Number.isFinite(borderWidth) && borderWidth > 0.4) {
      return true;
    }
  } catch (_) {}
  return false;
}

function isLegacySeatSpanAvailable(el) {
  if (!isDomElement(el) || !visibleForSeat(el)) return false;
  const tag = String(el.tagName || "").toLowerCase();
  if (tag !== "span") return false;
  const clsRaw =
    typeof el.className === "string"
      ? el.className
      : typeof el.className?.baseVal === "string"
        ? el.className.baseVal
        : String(el.className || "");
  const cls = normalizeText(clsRaw);
  const value = normalizeText(el.getAttribute("value") || "");
  const title = normalizeText(el.getAttribute("title") || "");
  const onclick = normalizeText(el.getAttribute("onclick") || "");
  const handler = getLegacyHandlerCode(el);
  const hasSelectSeatHandler = handler.includes("selectseat") || onclick.includes("selectseat");
  const isSeatLike =
    cls.includes("seat") ||
    normalizeText(el.id || "") === "seats" ||
    normalizeText(el.getAttribute("name") || "") === "seats" ||
    hasSelectSeatHandler;
  if (!isSeatLike) return false;
  if (cls.includes("seatr") || cls.includes("seatb") || cls.includes("sold")) return false;
  if (isLegacySeatDashedSelected(el)) return false;
  if (cls.includes("seatn") || value === "n") return true;
  if (title.includes("구역") && hasSelectSeatHandler && !value) return true;
  if (!hasSelectSeatHandler) return false;
  if (value && value !== "n") return false;
  return true;
}

function isLegacySeatSpanSelected(el) {
  if (!isDomElement(el) || !visibleForSeat(el)) return false;
  if (isLegacySeatDashedSelected(el)) return true;
  const cls = normalizeText(el.className || "");
  if (!cls.includes("seat")) return false;
  if (cls.includes("seatn") || cls.includes("seatr") || cls.includes("seatb")) return false;
  return true;
}

function getLegacySeatKey(el) {
  if (!isDomElement(el)) return "";
  const rect = el.getBoundingClientRect();
  const title = String(el.getAttribute("title") || "").trim();
  const fromHandler = extractLegacySeatAreaCode(getLegacyHandlerCode(el));
  const code = String(fromHandler || state.legacySeatCurrentAreaCode || "").trim();
  const token = title || String(el.getAttribute("onclick") || "").trim();
  return `${code || "-"}|${token || "-"}|${Math.round(rect.left)}:${Math.round(rect.top)}`;
}

function getLegacySelectedSeatCount() {
  let textCount = 0;
  const docs = getLegacySeatSearchDocuments();
  const patterns = [
    /선택\s*좌석\s*[:：]?\s*(\d+)/i,
    /selected\s*seats?\s*[:：]?\s*(\d+)/i,
    /선택\s*(\d+)\s*매/i
  ];
  for (const doc of docs) {
    const text = String(doc.body?.innerText || "").replace(/\u00a0/g, " ");
    for (const re of patterns) {
      const m = text.match(re);
      if (!m) continue;
      const n = Number(String(m[1] || "").replace(/,/g, ""));
      if (Number.isFinite(n) && n >= 0) {
        textCount = Math.max(textCount, n);
      }
    }
  }

  const seatNodes = docs.flatMap((doc) => Array.from(doc.querySelectorAll("span#Seats, span[name='Seats']")));
  const domSelected = seatNodes.filter((el) => isLegacySeatSpanSelected(el)).length;
  return Math.max(textCount, domSelected, Number(state.legacySeatSelectedAssumed) || 0);
}

function getLegacyAvailableSeatCandidates(preferredDoc = null) {
  const docs = getLegacySeatSearchDocuments(preferredDoc);
  const out = [];
  for (const doc of docs) {
    const view = doc.defaultView || window;
    const centerX = Math.max(240, view.innerWidth || window.innerWidth || 1024) / 2;
    const nodes = Array.from(
      doc.querySelectorAll(
        "span#Seats, span[name='Seats'], span[class*='Seat'], span[onclick*='SelectSeat'], span[onclick*='selectseat'], span[value='N'], span[value='n']"
      )
    );
    for (const el of nodes) {
      if (!isLegacySeatSpanAvailable(el)) continue;
      const key = getLegacySeatKey(el);
      if (!key) continue;
      const rect = el.getBoundingClientRect();
      out.push({
        el,
        key,
        rect,
        centerDist: Math.abs(rect.left + rect.width / 2 - centerX)
      });
    }
  }

  out.sort((a, b) => {
    if (Math.abs(a.rect.top - b.rect.top) > 1) return a.rect.top - b.rect.top;
    if (Math.abs(a.centerDist - b.centerDist) > 1) return a.centerDist - b.centerDist;
    return a.rect.left - b.rect.left;
  });
  return out;
}

function getLegacySeatScanStats(preferredDoc = null) {
  const docs = getLegacySeatSearchDocuments(preferredDoc);
  let total = 0;
  let seatN = 0;
  let available = 0;
  for (const doc of docs) {
    const nodes = Array.from(
      doc.querySelectorAll(
        "span#Seats, span[name='Seats'], span[class*='Seat'], span[onclick*='SelectSeat'], span[onclick*='selectseat'], span[value='N'], span[value='n']"
      )
    );
    total += nodes.length;
    for (const el of nodes) {
      const clsRaw =
        typeof el.className === "string"
          ? el.className
          : typeof el.className?.baseVal === "string"
            ? el.className.baseVal
            : String(el.className || "");
      const cls = normalizeText(clsRaw);
      const value = normalizeText(el.getAttribute("value") || "");
      if (cls.includes("seatn") || value === "n") seatN += 1;
      if (isLegacySeatSpanAvailable(el)) available += 1;
    }
  }
  return { total, seatN, available, docs: docs.length };
}

async function switchLegacySeatArea(area) {
  if (!area?.el) return false;
  const now = Date.now();
  const areaIdentity = String(area.code || area.key || area.label || "").trim();
  if (
    now - state.legacySeatLastAreaSwitchAt < 220 &&
    state.legacySeatCurrentAreaCode === areaIdentity
  ) {
    return true;
  }

  let hit = false;
  let mainResult = null;
  let mainLastResult = null;
  const areaLabel = String(area.code || area.label || area.key || "").trim();
  const mainScripts = (Array.isArray(area.scripts) ? area.scripts : []).slice().sort((a, b) => {
    const aa = /fnblockseatupdate\s*\(/i.test(String(a || "")) ? 1 : 0;
    const bb = /fnblockseatupdate\s*\(/i.test(String(b || "")) ? 1 : 0;
    return bb - aa;
  });
  for (const script of mainScripts) {
    const main = await triggerLegacyScriptMainWorld(script, areaLabel);
    mainLastResult = main;
    if (main?.ok) {
      hit = true;
      mainResult = main;
      break;
    }
  }
  if (!hit) {
    hit = runLegacyHandlerScript(area.el, [
    "fnblockseatupdate",
    "blockseatupdate",
    "selectblock"
    ]);
  }
  const anchor = String(area.el.tagName || "").toLowerCase() === "a" ? area.el : area.el.closest?.("a");
  if (!hit && anchor) {
    hit = runLegacyHandlerScript(anchor, [
      "fnblockseatupdate",
      "blockseatupdate",
      "selectblock"
    ]);
  }
  if (!hit && !hasJavascriptHref(area.el)) {
    hit = forceClick(area.el) || clickAtCenter(area.el) || clickElement(area.el);
  }
  if (!hit && anchor && !hasJavascriptHref(anchor)) {
    hit = forceClick(anchor) || clickAtCenter(anchor) || clickElement(anchor);
  }
  if (!hit) return false;

  state.legacySeatCurrentAreaCode = areaIdentity;
  state.legacySeatLastAreaSwitchAt = now;
  state.legacySeatAreaNextSwitchAt = now + getLegacyAreaSwitchIntervalMs();
  state.legacySeatAreaSettleUntil = now + getLegacyAreaSettleMs();
  const srcChanged =
    mainResult && mainResult.beforeSeatSrc !== mainResult.afterSeatSrc ? "Y" : "N";
  const mainExec = (() => {
    if (mainResult) {
      return `, main=Y, fn=${mainResult.fnBlockSeatUpdateDefined ? "Y" : "N"}, host=${
        mainResult.fnHost || "-"
      }, srcChanged=${srcChanged}, frame=${mainResult.frameId ?? "-"}, mode=${
        mainResult.mode || "-"
      }`;
    }
    if (mainLastResult) {
      return `, main=N, fn=${mainLastResult.fnBlockSeatUpdateDefined ? "Y" : "N"}, host=${
        mainLastResult.fnHost || "-"
      }, frame=${mainLastResult.frameId ?? "-"}, err=${String(mainLastResult.error || "-")}`;
    }
    return "";
  })();
  log(`旧版选座切换区域: ${area.label}${area.code ? `(${area.code})` : ""}${mainExec}`);
  return true;
}

async function clickLegacySeatCandidate(candidate, target) {
  const seat = candidate?.el;
  if (!seat) return false;
  const key = candidate.key || getLegacySeatKey(seat);
  if (key) rememberLegacySeatAttemptKey(key);

  const before = getLegacySelectedSeatCount();
  const main = await triggerLegacySeatSelectMainWorld(candidate);
  if (!main?.ok) await sleep(120);
  await sleep(140);

  const after = getLegacySelectedSeatCount();
  const visuallySelected = isLegacySeatSpanSelected(seat);
  const stillAvailable = isLegacySeatSpanAvailable(seat);
  const success = after > before || visuallySelected || !stillAvailable;
  if (success) {
    if (key) rememberLegacySeatClickedKey(key);
    if (after > state.legacySeatSelectedAssumed) {
      state.legacySeatSelectedAssumed = after;
    } else {
      state.legacySeatSelectedAssumed = Math.min(target, Math.max(before + 1, state.legacySeatSelectedAssumed));
    }
    log(`旧版选座进度: ${Math.min(target, getLegacySelectedSeatCount())}/${target}`);
  } else if (main && Date.now() - state.legacySeatLastClickFailLogAt > 900) {
    log(
      `旧版SeatN点击未生效: matched=${main.matched ? "Y" : "N"}, mode=${main.mode || "-"}, selectSeat=${main.selectSeatDefined ? "Y" : "N"}@${main.selectSeatHost || "-"}, class=${main.beforeClass || "-"}->${main.afterClass || "-"}, frame=${main.frameId ?? "-"}, err=${main.error || "-"}`
    );
    state.legacySeatLastClickFailLogAt = Date.now();
  }
  return success;
}

async function runLegacySeatStep() {
  // Do not include #ifrmSeat src in flow key: switching area updates iframe src frequently,
  // which would reset seat runtime and lose selected-seat state (can cause over-selection).
  const flowKey = `${location.host}${location.pathname}${location.search}|step=${getLegacyActiveStepNumber() || 2}`;
  if (state.legacySeatFlowKey !== flowKey) {
    resetLegacySeatRuntime();
    state.legacySeatFlowKey = flowKey;
  }

  const seatDoc = getLegacySeatFrameDocument();
  if (!seatDoc) {
    if (Date.now() - state.legacySeatLastLogAt > 2500) {
      log("旧版选座: ifrmSeat 文档未就绪，等待加载");
      state.legacySeatLastLogAt = Date.now();
    }
    return;
  }

  const target = normalizeQuantity(state.config.quantity, 1);
  const selected = Math.max(getLegacySelectedSeatCount(), Number(state.legacySeatSelectedAssumed) || 0);
  if (selected >= target) {
    state.legacySeatSinglePickPendingUntil = 0;
    if (Date.now() - state.legacySeatLastNextAt < 900) return;
    if (await clickLegacySeatCompleteButton()) {
      state.legacySeatLastNextAt = Date.now();
      markLegacySeatSubmitTriggered(selected, target);
      log(`旧版座位已满足目标(${selected}/${target})，尝试提交座位确认`);
    }
    return;
  }

  let areas = applyLegacyAreaOrderByConfig(collectLegacySeatAreaCandidates(seatDoc));
  if (!areas.length) {
    const now = Date.now();
    if (now - state.legacySeatLastAreaDiscoveryAt > 3000) {
      state.legacySeatLastAreaDiscoveryAt = now;
      areas = await discoverLegacySeatAreasByGradeSweep(seatDoc, areas);
    }
  }
  if (areas.length) {
    if (state.legacySeatAreaIndex >= areas.length) state.legacySeatAreaIndex = 0;
    const currentArea = areas[state.legacySeatAreaIndex];
    if (!state.legacySeatCurrentAreaCode) {
      if (await switchLegacySeatArea(currentArea)) {
        await sleep(150);
      }
    }
  }
  const currentAreaDebug = (() => {
    if (state.legacySeatCurrentAreaCode) return state.legacySeatCurrentAreaCode;
    if (!areas.length) return "unknown";
    const a = areas[state.legacySeatAreaIndex] || areas[0];
    return String(a?.code || a?.label || "unknown");
  })();
  const currentAreaPos = areas.length
    ? `${state.legacySeatAreaIndex + 1}/${areas.length}`
    : "0/0";

  if (state.legacySeatAreaSettleUntil && Date.now() < state.legacySeatAreaSettleUntil) {
    return;
  }
  const candidates = getLegacyAvailableSeatCandidates(seatDoc);
  const cooled = candidates.filter((x) => !hasLegacySeatRecentAttempt(x.key, 6000));
  const untried = cooled.filter((x) => !hasLegacySeatClickedKey(x.key));
  const clickPool = untried.length ? untried : cooled;
  const now = Date.now();

  if (target === 1 && state.legacySeatSinglePickPendingUntil > now) {
    if (now - state.legacySeatLastNextAt > 900) {
      if (await clickLegacySeatCompleteButton()) {
        state.legacySeatLastNextAt = Date.now();
        // Keep single-seat lock during transition latency to prevent any second seat click.
        state.legacySeatSinglePickPendingUntil = Date.now() + 5000;
        markLegacySeatSubmitTriggered(1, target);
        log("旧版单票模式: 已触发 Seat selection completed，等待页面切换");
      }
    }
    if (now - state.legacySeatLastLogAt > 1200) {
      const waitMs = Math.max(0, state.legacySeatSinglePickPendingUntil - now);
      log(`旧版单票模式: 当前区域=${currentAreaDebug} 锁定中，仅提交completed(${waitMs}ms)`);
      state.legacySeatLastLogAt = now;
    }
    return;
  }

  if (!clickPool.length) {
    if (candidates.length) {
      if (Date.now() - state.legacySeatLastLogAt > 1200) {
        log(`旧版选座: 当前区域=${currentAreaDebug} 检测到SeatN(${candidates.length})，等待单击冷却`);
        state.legacySeatLastLogAt = Date.now();
      }
      return;
    }
  if (
      areas.length > 1 &&
      Date.now() >=
        (Number(state.legacySeatAreaNextSwitchAt || 0) ||
          state.legacySeatLastAreaSwitchAt + getLegacyAreaSwitchIntervalMs())
    ) {
      state.legacySeatAreaIndex = (state.legacySeatAreaIndex + 1) % areas.length;
      if (state.legacySeatAreaIndex === 0) {
        state.legacySeatNoSeatCycles += 1;
        if (state.legacySeatNoSeatCycles % 2 === 0) {
          state.legacySeatClickedKeys = [];
        }
      }
      const nextArea = areas[state.legacySeatAreaIndex];
      await switchLegacySeatArea(nextArea);
      return;
    }
    if (Date.now() - state.legacySeatLastLogAt > 2400) {
      const seatStats = getLegacySeatScanStats(seatDoc);
      log(
        `旧版选座: 当前区域=${currentAreaDebug} (${currentAreaPos}) 暂无可选 SeatN，已轮询圈数=${state.legacySeatNoSeatCycles}, seat扫描=${seatStats.available}/${seatStats.seatN}/${seatStats.total}, docs=${seatStats.docs}`
      );
      state.legacySeatLastLogAt = Date.now();
    }
    return;
  }
  if (!untried.length && candidates.length && Date.now() - state.legacySeatLastLogAt > 2400) {
    log(`旧版选座: 当前区域=${currentAreaDebug} 检测到可选SeatN(${candidates.length})，重试已尝试座位`);
    state.legacySeatLastLogAt = Date.now();
  }

  const clickBudget = Math.max(1, Math.min(target - selected, 2));
  for (let i = 0; i < Math.min(clickPool.length, clickBudget); i += 1) {
    if (Date.now() - state.legacySeatLastSeatClickAt < 120) break;
    const ok = await clickLegacySeatCandidate(clickPool[i], target);
    state.legacySeatLastSeatClickAt = Date.now();
    if (target === 1) {
      state.legacySeatSinglePickPendingUntil = Date.now() + 8000;
    }
    const selectedNow = Math.max(
      getLegacySelectedSeatCount(),
      Number(state.legacySeatSelectedAssumed) || 0
    );
    if (ok && selectedNow >= target && Date.now() - state.legacySeatLastNextAt > 500) {
      if (await clickLegacySeatCompleteButton()) {
        state.legacySeatSinglePickPendingUntil = 0;
        state.legacySeatLastNextAt = Date.now();
        markLegacySeatSubmitTriggered(selectedNow, target);
        log(`旧版选座已点击右下角 Seat selection completed (${selectedNow}/${target})`);
        return;
      }
    }
    if (selectedNow >= target) break;
  }
}

async function runLegacyInterparkTick() {
  state.lastStage = "legacy";
  await maybeNotifyLegacySeatCompletedOnTransition();
  if (!state.priceLockedSlow) setTickMode("fast");
  if (state.queueActive) {
    clearQueueRuntimeState();
  }

  if (isLegacySeatLayerVisible() || isLegacySeatIframeReady()) {
    state.legacyNextPendingUntil = 0;
    state.legacyNextWaitLogAt = 0;
    const captchaHandled = await runCaptchaStep();
    if (captchaHandled) {
      await sleep(180);
      return;
    }
    await runLegacySeatStep();
    return;
  }

  if (state.legacySeatFlowKey) {
    resetLegacySeatRuntime();
    state.legacySeatSelectedAssumed = 0;
    state.legacySeatSinglePickPendingUntil = 0;
  }

  const stepNo = getLegacyActiveStepNumber();
  const frameDoc = getLegacyBookFrameDocument();
  if (stepNo === 1 || (!stepNo && isLegacyDateStepLikely(frameDoc))) {
    await runLegacyDateStep();
    return;
  }

  if (Date.now() - state.queueLastLogAt > 5000) {
    log(`旧版页面当前处于 step ${stepNo || "unknown"}，日期流程仅在 step 1 执行`);
    state.queueLastLogAt = Date.now();
  }
}

async function tick() {
  if (!IS_TOP_FRAME) return;
  if (!isBotOwner() && !tryClaimBotOwner()) return;
  touchBotOwner();
  if (!state.config.enabled || state.busy) return;
  state.busy = true;
  try {
    await maybeNotifySale3Minutes();
    if (await maybeAbortScavengeRoundByTimeout()) {
      return;
    }
    const sliderPaused = await runSliderCaptchaPauseGuard();
    if (sliderPaused) {
      await sleep(180);
      return;
    }
    const humanVerifyHandled = await runHumanVerifyStep();
    if (humanVerifyHandled) {
      await sleep(120);
      return;
    }
    if (await maybeRunScavengeLoopRestart()) {
      return;
    }
    const host = location.host;
    if (host === "world.nol.com") {
      state.lastStage = "product";
      state.priceLockedSlow = false;
      state.queueActive = false;
      state.queueNextKeepAliveAt = 0;
      state.queueKeepAliveCount = 0;
      state.queueHealth.consecutiveFail = 0;
      state.queueHealth.alertActive = false;
      if (location.pathname.includes("/login")) {
        if (!state.loginHinted) {
          log("检测到登录页，请先登录账号");
          state.loginHinted = true;
        }
        setBadge("请先登录 NOL 账号", false);
        return;
      }
      if (shouldHoldOnWorldForScavengeWaiting()) {
        return;
      }
      state.loginHinted = false;
      await runProductStep();
    } else if (
      host === "tickets.interpark.com" ||
      host === "gpoticket.globalinterpark.com" ||
      isLegacyBookingUrl()
    ) {
      const variant = detectInterparkBookingVariant();
      rememberBookingVariant(variant);
      if (variant === "legacy") {
        await runLegacyInterparkTick();
      } else {
        await runNewInterparkTick();
      }
    } else if (host === "secureapi.ext.eximbay.com") {
      state.lastStage = "payment";
      // 总计与支付自动化已移除
      return;
    }
  } catch (err) {
    log(`执行错误: ${String(err.message || err)}`);
  } finally {
    state.busy = false;
  }
}

function ensureLoop() {
  if (!IS_TOP_FRAME) return;
  if (state.intervalId || !state.config.enabled) return;
  if (!tryClaimBotOwner()) return;
  state.intervalId = window.setInterval(tick, state.tickIntervalMs || TICK_MS_FAST);
  log("自动流程已启动");
  setBadge("NOL BOT 运行中", true);
}

function stopLoop(reason = "") {
  const ownerBeforeStop = isBotOwner();
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
    const suffix = reason ? ` (原因: ${reason})` : "";
    log(`自动流程已停止${suffix}`);
  }
  if (ownerBeforeStop) {
    delete window[BOT_OWNER_KEY];
  }
  if (ownerBeforeStop || !window[BOT_OWNER_KEY]) {
    setBadge("NOL BOT 已停止", false);
  }
}

async function loadConfig() {
  const all = await chrome.storage.local.get(STORAGE_KEY);
  const config = all[STORAGE_KEY];
  if (!config) return;
  state.config = {
    enabled: Boolean(config.enabled),
    startedAt: Number(config.startedAt || 0),
    eventUrl: config.eventUrl || "",
    fullFlowEnabled: config.fullFlowEnabled !== false,
    saleStartTime: String(config.saleStartTime || "").trim(),
    preEnterSeconds: normalizePreEnterSeconds(config.preEnterSeconds, 30),
    criticalPreSeconds: normalizeCriticalSeconds(config.criticalPreSeconds, 2.5, 0.5, 10),
    criticalPostSeconds: normalizeCriticalSeconds(config.criticalPostSeconds, 8, 1, 20),
    criticalTickMs: normalizeCriticalTickMs(config.criticalTickMs, TICK_MS_CRITICAL_DEFAULT),
    scavengeLoopEnabled: config.scavengeLoopEnabled === true,
    scavengeLoopIntervalSec: normalizeScavengeLoopIntervalSec(config.scavengeLoopIntervalSec, 600),
    scavengeRoundMaxSec: normalizeScavengeRoundMaxSec(config.scavengeRoundMaxSec, 0),
    quantity: normalizeQuantity(config.quantity, 1),
    dateMonth: String(config.dateMonth || "").trim(),
    dateDay: String(config.dateDay || "").trim(),
    dateTime: String(config.dateTime || "").trim(),
    legacyAreaOrderMode: String(config.legacyAreaOrderMode || "default").trim().toLowerCase() === "custom" ? "custom" : "default",
    legacyAreaCustomCodes: normalizeLegacyAreaCustomCodes(config.legacyAreaCustomCodes || []),
    legacyAreaSwitchIntervalMs: normalizeLegacyAreaTimingMs(
      config.legacyAreaSwitchIntervalMs,
      LEGACY_AREA_SWITCH_INTERVAL_MS
    ),
    legacyAreaSettleMs: normalizeLegacyAreaTimingMs(
      config.legacyAreaSettleMs,
      LEGACY_AREA_SETTLE_MS
    ),
    legacyAreaRandomJitterMs: normalizeLegacyAreaRandomJitterMs(
      config.legacyAreaRandomJitterMs,
      LEGACY_AREA_RANDOM_JITTER_MS
    ),
    countryCode: String(config.countryCode || "86"),
    phoneNumber: String(config.phoneNumber || ""),
    ocrApiUrl: normalizeOcrApiUrl(config.ocrApiUrl, DEFAULT_OCR_API_URL),
    ocrActivationCode: String(config.ocrActivationCode || "").trim(),
    ocrApiToken: String(config.ocrApiToken || "").trim(),
    ocrDeviceId: String(config.ocrDeviceId || "").trim(),
    ocrAccessToken: String(config.ocrAccessToken || "").trim(),
    ocrAccessTokenExpiresAt: Number(config.ocrAccessTokenExpiresAt || 0),
    ocrLicenseExpiresAt: Number(config.ocrLicenseExpiresAt || 0),
    ocrLicenseActivatedAt: Number(config.ocrLicenseActivatedAt || 0),
    vpnApiUrl: String(config.vpnApiUrl || "http://127.0.0.1:8000").trim(),
    vpnAutoSwitchEnabled: config.vpnAutoSwitchEnabled !== false,
    dingTalkWebhookUrl: String(config.dingTalkWebhookUrl || "").trim(),
    dingTalkSecret: String(config.dingTalkSecret || "").trim()
  };
  const storedScavengeNextRestartAt = Number(config.scavengeLoopNextRestartAt || 0);
  const storedScavengeLastRestartAt = Number(config.scavengeLoopLastRestartAt || 0);
  const storedScavengeRuntimeStartedAt = Number(config.scavengeLoopRuntimeStartedAt || 0);
  state.tickMode = "fast";
  state.tickIntervalMs = TICK_MS_FAST;
  state.priceLockedSlow = false;
  state.queueActive = false;
  state.queueNextKeepAliveAt = 0;
  state.queueKeepAliveCount = 0;
  state.queueHealth.lastProbeAt = 0;
  state.queueHealth.consecutiveFail = 0;
  state.queueHealth.lastSuccessAt = 0;
  state.queueHealth.alertActive = false;
  state.queueHealth.lastAlertAt = 0;
  state.queueHealth.switching = false;
  state.buyNowCachedEl = null;
  state.firstBuyNowClickAt = 0;
  state.lastStage = "unknown";
  state.lastBookingPageVariant = "unknown";
  state.humanVerifyAttempted = false;
  state.humanVerifyAlertActive = false;
  state.humanVerifyLastNotifyAt = 0;
  state.sliderCaptchaPaused = false;
  state.sliderCaptchaLastLogAt = 0;
  state.sliderCaptchaLastNotifyAt = 0;
  state.legacyNextPendingUntil = 0;
  state.legacyNextWaitLogAt = 0;
  state.notifySale3mSent = false;
  state.notifyPriceEnteredSent = false;
  state.notifyLegacySeatCompletedSent = false;
  state.scavengeLoopSuccess = false;
  state.scavengeLoopLastWaitLogAt = 0;
  state.scavengeLoopLastWaitTargetAt = 0;
  const now = Date.now();
  const runtimeMatchesCurrentRun =
    Number(state.config.startedAt || 0) > 0 &&
    storedScavengeRuntimeStartedAt === Number(state.config.startedAt || 0);
  if (
    state.config.enabled &&
    state.config.scavengeLoopEnabled === true &&
    runtimeMatchesCurrentRun &&
    storedScavengeNextRestartAt > now
  ) {
    state.scavengeLoopNextRestartAt = storedScavengeNextRestartAt;
    state.scavengeLoopLastRestartAt =
      storedScavengeLastRestartAt > 0 ? storedScavengeLastRestartAt : 0;
  } else {
    state.scavengeLoopNextRestartAt = 0;
    state.scavengeLoopLastRestartAt = 0;
    if (storedScavengeNextRestartAt || storedScavengeLastRestartAt) {
      clearScavengeRuntime();
    }
  }
  state.notifyQueueThresholdSent = { 1000: false, 100: false, 10: false };
  state.queueTop50FastestSwitchDone = false;
  state.queueLastRemaining = null;
  state.legacySeatFlowKey = "";
  state.legacySeatAreaIndex = 0;
  state.legacySeatCurrentAreaCode = "";
  state.legacySeatLastAreaSwitchAt = 0;
  state.legacySeatAreaNextSwitchAt = 0;
  state.legacySeatLastSeatClickAt = 0;
  state.legacySeatLastNextAt = 0;
  state.legacySeatSelectedAssumed = 0;
  state.legacySeatClickedKeys = [];
  state.legacySeatAttemptedKeys = {};
  state.legacySeatNoSeatCycles = 0;
  state.legacySeatLastLogAt = 0;
  state.legacySeatLastGradeClickAt = 0;
  state.legacySeatCurrentGrade = "";
  state.legacySeatGradeIndex = 0;
  state.legacySeatLastAreaDiscoveryAt = 0;
  state.legacySeatAreaSettleUntil = 0;
  state.legacySeatSinglePickPendingUntil = 0;
  state.legacySeatSubmitTriggeredAt = 0;
  state.legacySeatSubmitSelectedAtTrigger = 0;
  state.legacySeatSubmitTargetAtTrigger = 0;
  state.captcha.lastImageSig = "";
  state.captcha.lastAttemptAt = 0;
  state.captcha.submitCount = 0;
  state.captcha.solvedAt = 0;
  state.captcha.lastPassLogAt = 0;
  state.captcha.candidates = [];
  state.captcha.candidateIndex = 0;
  state.captcha.legacyFirstInputDelayDone = false;
  if (state.config.enabled) {
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    ensureLoop();
  } else {
    stopLoop("配置 enabled=false");
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]) return;
  loadConfig();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "FORCE_START") {
    loadConfig()
      .then(() => tick())
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (message?.type === "PING_BOT") {
    sendResponse({
      ok: true,
      enabled: state.config.enabled,
      host: location.host,
      pageVariant: detectInterparkBookingVariant()
    });
    return;
  }
  return false;
});

loadConfig();

chrome.runtime
  .sendMessage({
    type: "CONTENT_READY",
    url: location.href,
    host: location.host,
    frame: window.top === window ? "top" : "iframe"
  })
  .catch(() => {});
