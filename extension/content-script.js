const STORAGE_KEY = "nolBotConfig";
const EXIMBAY_ACTIVE_KEY = "nolBotEximbayActive";

const state = {
  config: {
    enabled: false,
    eventUrl: "",
    fullFlowEnabled: true,
    saleStartTime: "",
    preEnterSeconds: 30,
    criticalPreSeconds: 2.5,
    criticalPostSeconds: 8,
    criticalTickMs: 65,
    quantity: 2,
    dateMonth: "",
    dateDay: "",
    dateTime: "",
    countryCode: "86",
    phoneNumber: "",
    ocrApiUrl: "http://127.0.0.1:8000/ocr/file",
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
  tickMode: "fast",
  tickIntervalMs: 180,
  priceLockedSlow: false,
  buyNowCachedEl: null,
  firstBuyNowClickAt: 0,
  humanVerifyLastClickAt: 0,
  humanVerifyLastLogAt: 0,
  lastStage: "unknown",
  notifySale3mSent: false,
  notifyPriceEnteredSent: false,
  notifyQueueThresholdSent: {
    1000: false,
    100: false,
    10: false
  },
  selectedSeatCountCache: {
    ts: 0,
    count: 0
  },
  captcha: {
    lastImageSig: "",
    lastAttemptAt: 0,
    submitCount: 0,
    solvedAt: 0,
    candidates: [],
    candidateIndex: 0
  }
};

const STEP_TEXT = {
  buyNow: ["立即购买", "立即購買", "buy now", "book now", "예매하기"],
  reserveEntry: ["预约", "預約", "reservation", "reserve", "book reservation", "예매"],
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

function normalizeText(text) {
  return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function visible(el) {
  if (!el || !(el instanceof Element)) return false;
  const style = window.getComputedStyle(el);
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
  if (!el || !(el instanceof Element)) return false;
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return (
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    style.pointerEvents !== "none" &&
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
  const topEl = document.elementFromPoint(x, y) || el;
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
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

async function triggerVpnAutoSwitch(reason, currentQueue) {
  if (!state.config.vpnAutoSwitchEnabled) return { ok: false, skipped: "disabled" };
  if (state.queueHealth.switching) return { ok: false, skipped: "switching" };
  const now = Date.now();
  // 冷却 10 分钟，避免来回切换
  if (now - state.queueHealth.lastSwitchAt < 10 * 60 * 1000) {
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
      sourceUrl: location.href
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
  if (!el || !(el instanceof Element)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

function findHumanVerifyCheckbox() {
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

  const text = normalizeText(document.body?.innerText || "");
  if (!text.includes("verify you are human")) return null;
  return (
    Array.from(document.querySelectorAll("input[type='checkbox']")).find((input) =>
      isElementShown(input.closest("label") || input)
    ) || null
  );
}

function isHumanVerifyWidgetPresent() {
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
  return Boolean(document.querySelector("#content[aria-live='polite'] .cb-c, #verifying, #success, #fail"));
}

async function runHumanVerifyStep() {
  if (!isHumanVerifyWidgetPresent()) return false;

  const verifying = document.querySelector("#verifying");
  if (isElementShown(verifying)) {
    if (Date.now() - state.humanVerifyLastLogAt > 2000) {
      log("人机验证进行中，等待通过");
      state.humanVerifyLastLogAt = Date.now();
    }
    return true;
  }

  const checkbox = findHumanVerifyCheckbox();
  if (!checkbox) {
    if (Date.now() - state.humanVerifyLastLogAt > 2000) {
      log("检测到人机验证框，暂未定位到 checkbox");
      state.humanVerifyLastLogAt = Date.now();
    }
    return true;
  }

  const now = Date.now();
  if (checkbox.checked) return true;
  if (now - state.humanVerifyLastClickAt < 1200) return true;
  state.humanVerifyLastClickAt = now;

  const clickable = checkbox.closest("label") || checkbox;
  forceClick(clickable);
  clickAtCenter(clickable);
  clickElement(clickable);
  log("检测到人机验证，已点击 Verify checkbox");
  return true;
}

function ensureLogPanel() {
  if (state.logPanelEl || !document.body) return;
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
      await sleep(95);

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

async function runSeatStep() {
  log("开始执行选座步骤");
  const target = normalizeQuantity(state.config.quantity, 2);
  const selected = detectSelectedSeatCount();
  if (selected < target) {
    log(`选座目标: ${target}, 当前已选: ${selected}`);
    await chooseSeatsByClick(target);
  }
  const finalCount = detectSelectedSeatCount();
  if (finalCount <= 0) {
    log("未检测到已选座位，跳过 完成选择");
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
  const words = ["预购", "預購", "订购", "訂購"];
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
  const words = ["预购", "預購", "订购", "訂購"];
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
  const words = ["预购", "預購", "订购", "訂購"];
  return Boolean(findButtonByClassAndText(words) || findClickableByText(words));
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

  const nowQty = getCurrentPriceQuantity();
  const quantityReady = Number.isFinite(nowQty) ? nowQty >= target : state.pricePlusClickCount >= target;
  if (!quantityReady) {
    log(
      `数量未达到目标，暂不点击訂購: 当前 ${Number.isFinite(nowQty) ? nowQty : "?"}/${target}`
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
  const m = String(text || "").match(/(\d{1,2})\s*:\s*(\d{2})\s*([ap]m)?/i);
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
  const timePattern = /\b\d{1,2}\s*:\s*\d{2}\s*(?:am|pm)?\b/i;
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
  const targetToken = normalizeTimeToken(targetRaw);
  if (!targetToken) return true;

  const candidates = Array.from(
    document.querySelectorAll("button, [role='button'], div, span, li, p")
  )
    .filter(visible)
    .map((el) => {
      const text = (el.textContent || "").trim();
      if (!text || text.length > 80) return null;
      const token = normalizeTimeToken(text);
      if (!token.includes(targetToken)) return null;
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
    stopLoop();
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
  if (!el || !(el instanceof Element) || !visible(el)) return false;
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
  const nodes = Array.from(
    document.querySelectorAll("button, a, [role='button'], div, span")
  ).filter(visible);
  const candidates = nodes
    .map((el) => {
      const text = normalizeText(el.textContent || "");
      if (!text || !words.some((w) => text.includes(w))) return null;
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
        text.startsWith("reservation") ||
        text.startsWith("reserve")
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

function clickBuyNowAggressive() {
  const now = Date.now();
  const minGap = state.tickMode === "critical" ? 110 : 320;
  if (now - state.productBuyClickedAt < minGap) return false;
  const target = getCachedOrFindBuyNowButton();
  if (!target) {
    state.buyNowCachedEl = null;
    return false;
  }

  const bursts = state.tickMode === "critical" ? 2 : 3;
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
    const now = Date.now();
    const remainSec = Math.ceil(countdownMs / 1000);
    const logInterval = countdownMs <= 10000 ? 500 : 4000;
    if (now - state.productLastCountdownLogAt >= logInterval) {
      log(`距开抢 ${remainSec}s，待命中`);
      state.productLastCountdownLogAt = now;
    }
    return;
  }

  if (countdownMs !== null && countdownMs > -getCriticalPostMs()) {
    setTickMode("critical");
  } else {
    setTickMode("fast");
  }

  if (clickReserveEntryAggressive()) {
    log("已点击 预约");
    await sleep(state.tickMode === "critical" ? 40 : 160);
    return;
  }

  if (clickBuyNowAggressive()) {
    log("已点击 立即购买");
    await sleep(state.tickMode === "critical" ? 35 : 140);
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
  const raw = String(state.config.ocrApiUrl || "").trim();
  return raw || "http://127.0.0.1:8000/ocr/file";
}

function findCaptchaImageElement() {
  const modalCaptchaImg = document.querySelector(
    ".ModalCaptchaText_captchaImage__Mitgq img"
  );
  if (modalCaptchaImg && visible(modalCaptchaImg)) return modalCaptchaImg;

  const canvases = Array.from(document.querySelectorAll("canvas")).filter(visible);
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

  const imgs = Array.from(document.querySelectorAll("img")).filter(visible);
  const scored = imgs
    .map((img) => {
      const src = String(img.currentSrc || img.src || "").toLowerCase();
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
    .filter((x) => x.score >= 7)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.img || null;
}

function findCaptchaInput(imageEl) {
  const byStableClass = document.querySelector(
    "input[class*='ModalCaptchaText_captchaInput']"
  );
  if (byStableClass && visible(byStableClass)) return byStableClass;

  const hardMatch = Array.from(document.querySelectorAll("input")).find((input) => {
    if (!visible(input)) return false;
    const p = normalizeText(input.getAttribute("placeholder") || "");
    return (
      p.includes("請輸入畫面的文字") ||
      p.includes("请输入画面的文字") ||
      p.includes("不區分大小寫")
    );
  });
  if (hardMatch) return hardMatch;

  const modalScope =
    imageEl?.closest(
      "[class*='ModalCaptchaText'], [role='dialog'], [class*='modal'], [class*='Modal']"
    ) || null;
  const scopedCandidates = modalScope
    ? Array.from(
        modalScope.querySelectorAll("input[type='text'], input:not([type]), input[type='search']")
      ).filter(visible)
    : [];
  const globalCandidates = Array.from(
    document.querySelectorAll("input[type='text'], input:not([type]), input[type='search']")
  ).filter(visible);
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
  const scope =
    inputEl?.closest("form, section, div, li, td") ||
    imageEl?.closest("form, section, div, li, td") ||
    document;
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
  const resp = await fetch(src, {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });
  if (!resp.ok) return null;
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

async function requestCaptchaOcr(imageBytes) {
  const apiUrl = getOcrApiUrl();
  log(`发送 OCR 请求到: ${apiUrl}`);
  const resp = await chrome.runtime.sendMessage({
    type: "OCR_REQUEST",
    apiUrl,
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

function hasCaptchaRetryErrorText() {
  const text = getWholeText();
  return (
    text.includes("請再次確認輸入的文字") ||
    text.includes("请再次确认输入的文字") ||
    text.includes("incorrect captcha")
  );
}

function isLettersOnlyCaptchaContext() {
  const text = getWholeText();
  return text.includes("只能包含字母") || text.includes("only letters");
}

function normalizeCaptchaToSixLetters(raw) {
  const digitToLetter = {
    0: "O",
    1: "I",
    2: "Z",
    3: "B",
    4: "A",
    5: "S",
    6: "G",
    7: "T",
    8: "B",
    9: "P"
  };
  const src = String(raw || "").trim().toUpperCase();
  if (!src) return "";
  const letters = [];
  for (const ch of src) {
    if (/[A-Z]/.test(ch)) {
      letters.push(ch);
      continue;
    }
    if (digitToLetter[ch]) letters.push(digitToLetter[ch]);
  }
  if (letters.length < 6) return "";
  return letters.slice(0, 6).join("");
}

function expandLetterCaptchaVariants(text, maxVariants = 12) {
  const src = String(text || "").trim();
  if (!/^[A-Z]{6}$/.test(src)) return [];

  const swapMap = {
    O: ["Q"],
    Q: ["O"],
    G: ["B", "C"],
    B: ["G"],
    C: ["G"]
  };
  const chars = src.split("");
  const out = [];
  const seen = new Set([src]);
  for (let i = 0; i < chars.length; i += 1) {
    const swaps = swapMap[chars[i]] || [];
    for (const s of swaps) {
      const cand = chars.slice();
      cand[i] = s;
      const next = cand.join("");
      if (seen.has(next)) continue;
      seen.add(next);
      out.push(next);
      if (out.length >= maxVariants) return out;
    }
  }
  return out.slice(0, maxVariants);
}

function buildCaptchaAttemptList(primary, candidates) {
  const rawList = [primary, ...(Array.isArray(candidates) ? candidates : [])]
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const out = [];
  const seen = new Set();
  const pushUnique = (cand) => {
    if (!cand) return;
    const key = String(cand);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  for (const item of rawList) {
    const normalized = normalizeCaptchaToSixLetters(item);
    if (!/^[A-Z]{6}$/.test(normalized)) continue;
    pushUnique(normalized);
    const variants = expandLetterCaptchaVariants(normalized, 12);
    variants.forEach(pushUnique);
  }
  return out.slice(0, 24);
}

function clickCaptchaRefresh(imageEl) {
  const scope = imageEl?.closest("form, section, div, li, td") || document;
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

async function runCaptchaStep() {
  const imageEl = findCaptchaImageElement();
  if (!imageEl) return false;
  log(`检测到验证码元素: ${imageEl.tagName.toLowerCase()}`);
  const inputEl = findCaptchaInput(imageEl);
  if (!inputEl) {
    log("检测到验证码图，但未找到输入框");
    // 验证码弹窗出现时，阻断后续流程点击，避免误点“完成选择”
    return true;
  }
  log("已定位验证码输入框");

  const now = Date.now();
  const sig = makeCaptchaSignature(imageEl);
  const sameImage = sig === state.captcha.lastImageSig;
  if (!sameImage) {
    state.captcha.lastImageSig = sig;
    state.captcha.candidates = [];
    state.captcha.candidateIndex = 0;
  }
  const retryByError = sameImage && hasCaptchaRetryErrorText();
  if (sameImage && !retryByError && now - state.captcha.lastAttemptAt < 1200) {
    log("验证码图未变化，跳过重复识别");
    return true;
  }
  state.captcha.lastAttemptAt = now;

  try {
    let code = "";

    if (retryByError && state.captcha.candidateIndex + 1 < state.captcha.candidates.length) {
      state.captcha.candidateIndex += 1;
      code = state.captcha.candidates[state.captcha.candidateIndex];
      log(`验证码错误，切换候选(${state.captcha.candidateIndex + 1}/${state.captcha.candidates.length}): ${code}`);
    } else {
      const imageBytes = await loadCaptchaBytes(imageEl);
      if (!imageBytes?.length) {
        log("验证码图片读取失败");
        return true;
      }
      log(`验证码字节长度: ${imageBytes.length}`);
      const ocrResult = await requestCaptchaOcr(imageBytes);
      code = normalizeCaptchaToSixLetters(ocrResult.code);
      state.captcha.candidates = buildCaptchaAttemptList(code, ocrResult.candidates);
      if (!state.captcha.candidates.length && /^[A-Z]{6}$/.test(code)) state.captcha.candidates = [code];
      const exactIndex = state.captcha.candidates.findIndex(
        (x) => String(x) === String(code)
      );
      state.captcha.candidateIndex = exactIndex >= 0 ? exactIndex : 0;
      log(
        `后端候选数: ${state.captcha.candidates.length}, 当前尝试: ${state.captcha.candidates[state.captcha.candidateIndex]}`
      );
      code = state.captcha.candidates[state.captcha.candidateIndex] || code;
    }

    code = normalizeCaptchaToSixLetters(code);
    if (!/^[A-Z]{6}$/.test(code)) {
      log(`OCR结果非6位字母，当前值: ${String(code || "") || "(empty)"}，刷新验证码重试`);
      clickCaptchaRefresh(imageEl);
      return true;
    }

    typeInInput(inputEl, code);
    log(`验证码已填写: ${code}`);

    // 该页面回车可直接提交，优先按真实交互走
    inputEl.focus();
    inputEl.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })
    );
    inputEl.dispatchEvent(
      new KeyboardEvent("keypress", { key: "Enter", code: "Enter", bubbles: true })
    );
    inputEl.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true })
    );
    log("已尝试回车提交验证码");

    await sleep(180);
    const stillHasCaptcha = Boolean(findCaptchaImageElement());
    if (stillHasCaptcha) {
      state.captcha.submitCount += 1;
      const submitEl = findCaptchaSubmitButton(imageEl, inputEl);
      if (submitEl) {
        clickElement(submitEl);
        log("回车后验证码仍存在，已补点确认按钮");
      } else {
        log("回车后验证码仍存在，未命中确认按钮");
      }
      if (state.captcha.submitCount >= 3) {
        clickCaptchaRefresh(imageEl);
        state.captcha.submitCount = 0;
        log("连续验证码提交后触发刷新");
      }
      return true;
    }

    state.captcha.solvedAt = Date.now();
    state.captcha.submitCount = 0;
    log("验证码已通过，继续选座流程");
    return false;
  } catch (err) {
    const msg = String(err?.message || err);
    log(`验证码处理失败: ${msg}`);
    if (msg.includes("OCR code is empty")) {
      clickCaptchaRefresh(imageEl);
      state.captcha.lastImageSig = "";
      state.captcha.lastAttemptAt = 0;
      log("OCR空结果，已刷新验证码重试");
    }
  }
  return true;
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
  const text = getWholeText();
  const step = String(new URLSearchParams(location.search).get("step") || "").toLowerCase();
  const hasPriceKeyword = text.includes("选择价格") || text.includes("選擇價格");
  const hasSeatCountText = /全席\s*\d+\s*\/\s*\d+/i.test(text) || /seats?\s*\d+\s*\/\s*\d+/i.test(text);
  const preorderAvailable = hasPreorderActionAvailable();
  const hasQtyControl = Boolean(findPlusButton() || findMinusButton());
  const hasMoneyLike = /[\d,]+\s*(元|won)/i.test(text);
  const hasInfoKeyword =
    text.includes("订票者资讯") ||
    text.includes("訂購者資訊") ||
    text.includes("手機號碼") ||
    text.includes("手机号");

  // URL 已显式指向价格步骤时，直接判定为价格页。
  if (step === "price") return true;

  if (
    hasPriceKeyword ||
    hasSeatCountText
  ) {
    return true;
  }
  // 强兜底：右侧价格卡常见结构是“数量控件 + 金额文案”。
  if (hasQtyControl && hasMoneyLike && !hasInfoKeyword) return true;
  // 兜底：有预购动作且具备数量/金额特征时，按价格页处理
  if (preorderAvailable && (hasQtyControl || hasMoneyLike) && !hasInfoKeyword) return true;
  return false;
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
  if (hasPreorderActionAvailable()) return "price";
  return "unknown";
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
  stopLoop();
  return true;
}

async function runImmediatePostQueueBurst() {
  // 排队放行后，用短间隔连续抢占第一轮交互机会。
  for (let i = 0; i < 3; i += 1) {
    const captchaHandled = await runCaptchaStep();
    if (captchaHandled) return;

    const stage = detectCurrentStage();
    if (stage === "seat") {
      await runSeatStep();
    } else if (stage === "price") {
      await maybeNotifyEnteredPrice();
      if (await stopAtPriceByConfigIfNeeded()) return;
      state.priceLockedSlow = true;
      setTickMode("normal");
      await runPriceStep();
      return;
    } else if (stage === "info") {
      state.priceLockedSlow = true;
      setTickMode("normal");
      await runInfoStep();
      return;
    } else if (stage === "date") {
      await runDateStep();
    }
    await sleep(60);
  }
}

async function tick() {
  if (!state.config.enabled || state.busy) return;
  state.busy = true;
  try {
    await maybeNotifySale3Minutes();
    const humanVerifyHandled = await runHumanVerifyStep();
    if (humanVerifyHandled) {
      await sleep(120);
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
      state.loginHinted = false;
      await runProductStep();
    } else if (host === "tickets.interpark.com") {
      if (isQueuePage()) {
        state.lastStage = "queue";
        if (!state.priceLockedSlow) setTickMode("fast");
        if (!state.queueActive) {
          state.queueActive = true;
          state.queueKeepAliveCount = 0;
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
        state.queueActive = false;
        state.queueNextKeepAliveAt = 0;
        state.queueKeepAliveCount = 0;
        state.queueHealth.consecutiveFail = 0;
        state.queueHealth.alertActive = false;
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
      if (stage === "seat") {
        state.lastStage = "seat";
        if (!state.priceLockedSlow) setTickMode("fast");
        await runSeatStep();
      } else if (stage === "price") {
        if (state.lastStage !== "price") {
          await maybeNotifyEnteredPrice();
        }
        state.lastStage = "price";
        if (await stopAtPriceByConfigIfNeeded()) return;
        if (!state.priceLockedSlow) {
          state.priceLockedSlow = true;
          setTickMode("normal");
        }
        await runPriceStep();
      } else if (stage === "info") {
        state.lastStage = "info";
        if (!state.priceLockedSlow) {
          state.priceLockedSlow = true;
          setTickMode("normal");
        }
        await runInfoStep();
      } else if (stage === "date") {
        state.lastStage = "date";
        if (!state.priceLockedSlow) setTickMode("fast");
        await runDateStep();
      } else {
        state.lastStage = "unknown";
        if (clickReserveEntryAggressive()) {
          log("未知阶段命中预约入口，已点击 预约");
          await sleep(180);
          return;
        }
        log("未命中页面阶段，等待下一轮识别");
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
  if (state.intervalId || !state.config.enabled) return;
  state.intervalId = window.setInterval(tick, state.tickIntervalMs || TICK_MS_FAST);
  log("自动流程已启动");
  setBadge("NOL BOT 运行中", true);
}

function stopLoop() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
    log("自动流程已停止");
  }
  setBadge("NOL BOT 已停止", false);
}

async function loadConfig() {
  const all = await chrome.storage.local.get(STORAGE_KEY);
  const config = all[STORAGE_KEY];
  if (!config) return;
  state.config = {
    enabled: Boolean(config.enabled),
    eventUrl: config.eventUrl || "",
    fullFlowEnabled: config.fullFlowEnabled !== false,
    saleStartTime: String(config.saleStartTime || "").trim(),
    preEnterSeconds: normalizePreEnterSeconds(config.preEnterSeconds, 30),
    criticalPreSeconds: normalizeCriticalSeconds(config.criticalPreSeconds, 2.5, 0.5, 10),
    criticalPostSeconds: normalizeCriticalSeconds(config.criticalPostSeconds, 8, 1, 20),
    criticalTickMs: normalizeCriticalTickMs(config.criticalTickMs, TICK_MS_CRITICAL_DEFAULT),
    quantity: normalizeQuantity(config.quantity, 2),
    dateMonth: String(config.dateMonth || "").trim(),
    dateDay: String(config.dateDay || "").trim(),
    dateTime: String(config.dateTime || "").trim(),
    countryCode: String(config.countryCode || "86"),
    phoneNumber: String(config.phoneNumber || ""),
    ocrApiUrl: String(config.ocrApiUrl || "http://127.0.0.1:8000/ocr/file").trim(),
    vpnApiUrl: String(config.vpnApiUrl || "http://127.0.0.1:8000").trim(),
    vpnAutoSwitchEnabled: config.vpnAutoSwitchEnabled !== false,
    dingTalkWebhookUrl: String(config.dingTalkWebhookUrl || "").trim(),
    dingTalkSecret: String(config.dingTalkSecret || "").trim()
  };
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
  state.notifySale3mSent = false;
  state.notifyPriceEnteredSent = false;
  state.notifyQueueThresholdSent = { 1000: false, 100: false, 10: false };
  if (state.config.enabled) {
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    ensureLoop();
  } else {
    stopLoop();
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
    sendResponse({ ok: true, enabled: state.config.enabled, host: location.host });
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
