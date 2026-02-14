const STORAGE_KEY = "nolBotConfig";
const EXIMBAY_ACTIVE_KEY = "nolBotEximbayActive";

const state = {
  config: {
    enabled: false,
    eventUrl: "",
    quantity: 2,
    dateMonth: "",
    dateDay: "",
    dateTime: "",
    countryCode: "86",
    phoneNumber: "",
    ocrApiUrl: "http://127.0.0.1:8000/ocr/file"
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
  pricePreorderClicked: false,
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
  nextStep: ["下一步", "下一步", "next", "다음"],
  completeSeat: ["完成选择", "完成選擇", "done", "confirm seat", "좌석선택완료"],
  priceStep: ["选择价格", "選擇價格", "price selection", "가격 선택"],
  preorder: ["预购", "預購"],
  totalButton: ["总计", "總計", "total"],
  agreement: ["同意条款", "同意條款", "同意", "약관", "agree"],
  wechat: ["wechat pay", "微信支付", "we chat pay"],
  confirmPay: ["确认并支付", "確認並支付", "confirm", "pay", "결제"]
};

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

function log(text) {
  const msg = `[NOL BOT] ${text}`;
  console.log(msg);
  chrome.runtime.sendMessage({ type: "LOG_EVENT", text }).catch(() => {});
  pushVisibleLog(text);
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

function detectSelectedSeatCount() {
  const now = Date.now();
  if (now - state.selectedSeatCountCache.ts < 120) {
    return state.selectedSeatCountCache.count;
  }
  const text = getWholeText();
  const match1 = text.match(/全席\s*(\d+)\s*\/\s*(\d+)/);
  if (match1) {
    const count = Number(match1[1]);
    state.selectedSeatCountCache = { ts: now, count };
    return count;
  }
  const match2 = text.match(/(选择座位|選擇座位)\s*(\d+)/);
  if (match2) {
    const count = Number(match2[2]);
    state.selectedSeatCountCache = { ts: now, count };
    return count;
  }
  state.selectedSeatCountCache = { ts: now, count: 0 };
  return 0;
}

function getSeatCandidates() {
  const all = Array.from(
    document.querySelectorAll(
      "circle[id*='seat'], circle[class*='seat'], path[id*='seat'], [data-seat], [class*='seat'], [id*='seat']"
    )
  );
  return all.filter((el) => {
    if (!visible(el)) return false;
    const cls = normalizeText(el.className?.toString() || "");
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
    const looksLikeSeat =
      bag.includes("seat") ||
      bag.includes("좌석") ||
      bag.includes("席") ||
      el.tagName.toLowerCase() === "circle";
    const blocked =
      bag.includes("disable") ||
      bag.includes("sold") ||
      bag.includes("reserved") ||
      bag.includes("unavailable") ||
      bag.includes("occupied") ||
      bag.includes("선택됨") ||
      bag.includes("selected") ||
      bag.includes("已选");
    return looksLikeSeat && !blocked;
  });
}

function shuffle(arr) {
  const clone = [...arr];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function clickSeatCandidate(el) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "circle" || tag === "path" || el.ownerSVGElement) {
    return clickAtCenter(el) || forceClick(el);
  }
  return clickElement(el);
}

async function chooseSeatsByClick(quantity) {
  const initial = detectSelectedSeatCount();
  if (initial >= quantity) return true;

  const candidates = shuffle(getSeatCandidates());
  let clicked = 0;
  const maxClicks = Math.max(quantity * 8, 12);
  for (const seat of candidates) {
    if (clicked >= maxClicks) break;
    const current = detectSelectedSeatCount();
    if (current >= quantity) {
      break;
    }
    // 只点还差的张数，避免过量点击
    const remaining = quantity - current;
    if (clicked >= remaining + 1) break;
    if (clickSeatCandidate(seat)) {
      clicked += 1;
      await sleep(90);
    }
  }
  await sleep(120);
  return detectSelectedSeatCount() >= quantity;
}

async function runSeatStep() {
  log("开始执行选座步骤");
  const selected = detectSelectedSeatCount();
  if (selected < state.config.quantity) {
    await chooseSeatsByClick(state.config.quantity);
  }
  if (clickByKeywords(STEP_TEXT.completeSeat)) {
    log("已点击 完成选择");
    await sleep(300);
  }
}

function findPlusButton() {
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

function hasMoveToOrderConfirmPrompt() {
  const text = getWholeText();
  return (
    text.includes("確定要移動至訂購確認") ||
    text.includes("移动至订购确认") ||
    text.includes("移動時會失去現在的訂購")
  );
}

function findMinusButton() {
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

function clickPreorderButtonStrict() {
  const words = ["预购", "預購"];
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

async function runPriceStep() {
  const flowKey = `${location.host}${location.pathname}${location.search}`;
  if (state.priceFlowKey !== flowKey) {
    state.priceFlowKey = flowKey;
    state.pricePreorderClicked = false;
  }

  if (hasMoveToOrderConfirmPrompt()) {
    log("检测到訂購確認弹窗，暂停价格页点击");
    return;
  }

  let current = detectCurrentQuantityFromText();
  const target = state.config.quantity;
  for (let i = 0; i < 12 && current < target; i += 1) {
    const plus = findPlusButton();
    if (!plus) {
      log("未找到数量加号按钮");
      break;
    }
    clickElement(plus);
    await sleep(220);
    current = detectCurrentQuantityFromText();
  }

  for (let i = 0; i < 8 && current > target; i += 1) {
    const minus = findMinusButton();
    if (!minus) break;
    clickElement(minus);
    await sleep(220);
    current = detectCurrentQuantityFromText();
  }

  if (current !== target) {
    log(`价格页数量未对齐: ${current}/${target}，继续尝试预购`);
  }

  if (!state.pricePreorderClicked && clickPreorderButtonStrict()) {
    state.pricePreorderClicked = true;
    log("已点击 预购");
    await sleep(300);
  } else if (!state.pricePreorderClicked) {
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

function selectConfiguredDateDay() {
  const raw = String(state.config.dateDay || "").trim();
  if (!raw) return true;
  const dayNum = Number(raw);
  if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > 31) return true;
  const dayText = String(dayNum);

  const candidates = Array.from(
    document.querySelectorAll("button, [role='button'], td, div, span, li")
  )
    .filter(visible)
    .map((el) => {
      const text = (el.textContent || "").trim();
      if (!(text === dayText || text === raw)) return null;
      const cls = normalizeText(el.className?.toString() || "");
      const disabled =
        el.disabled ||
        cls.includes("disabled") ||
        cls.includes("disable") ||
        cls.includes("unavailable") ||
        el.getAttribute("aria-disabled") === "true";
      if (disabled) return null;
      const r = el.getBoundingClientRect();
      let score = 0;
      if (r.left < window.innerWidth * 0.62) score += 5;
      if (r.top > 120) score += 2;
      if (r.width >= 20 && r.width <= 80) score += 4;
      if (r.height >= 20 && r.height <= 80) score += 4;
      if (el.tagName.toLowerCase() === "button" || el.tagName.toLowerCase() === "td") score += 2;
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
  log(`已选择日期: ${dayText}`);
  return true;
}

function normalizeTimeToken(text) {
  return normalizeText(text).replace(/\s+/g, "");
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
  log(`已选择场次: ${targetRaw}`);
  return true;
}

async function runDateStep() {
  const hasDateConfig = Boolean(
    String(state.config.dateMonth || "").trim() ||
      String(state.config.dateDay || "").trim() ||
      String(state.config.dateTime || "").trim()
  );

  if (hasDateConfig) {
    if (!isConfiguredMonthVisible()) {
      if (!tryAdjustCalendarMonth()) {
        log(`当前月份与配置不一致，等待切换到 ${state.config.dateMonth}`);
      }
      return;
    }
    if (!selectConfiguredDateDay()) return;
    await sleep(120);
    if (!selectConfiguredDateTime()) return;
    await sleep(120);
  }

  if (
    clickBottomRightPrimaryButton(STEP_TEXT.nextStep) ||
    clickByKeywords(STEP_TEXT.nextStep)
  ) {
    log("已点击 日期页下一步");
    await sleep(300);
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
    if (state.totalButtonClicked) return;
    if (await isEximbayFlowLikelyActive()) {
      state.totalButtonClicked = true;
      return;
    }
    if (Date.now() - state.totalClickedAt > 1500) {
      await clickTotalButtonImmediately();
    }
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
      log("信息校验未通过，暂不点击总计");
      state.infoFlowDone = false;
      return;
    }
    state.infoFlowDone = true;
    log("信息步骤完成");
    await clickTotalButtonImmediately();
  }
}
// ======================================================================

async function runProductStep() {
  if (clickByKeywords(STEP_TEXT.buyNow)) {
    log("已点击 立即购买");
    await sleep(500);
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
  if (!code) throw new Error("OCR empty code");
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

function buildCaptchaAttemptList(primary, candidates) {
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
  const rawList = [primary, ...(Array.isArray(candidates) ? candidates : [])]
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const out = [];
  const seen = new Set();
  for (const item of rawList) {
    const upper = item.toUpperCase().replace(/\s+/g, "");
    const alnum = upper.replace(/[^A-Z0-9]/g, "");
    const lettersOnly = upper.replace(/[^A-Z]/g, "");
    const mapped = alnum
      .split("")
      .map((ch) => (digitToLetter[ch] ? digitToLetter[ch] : ch))
      .join("")
      .replace(/[^A-Z]/g, "");
    for (const cand of [mapped, lettersOnly, alnum]) {
      if (!cand) continue;
      const key = cand.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cand);
    }
  }
  return out;
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
      code = ocrResult.code.replace(/\s+/g, "").trim();
      state.captcha.candidates = buildCaptchaAttemptList(code, ocrResult.candidates);
      if (!state.captcha.candidates.length) state.captcha.candidates = [code];
      const lettersOnlyMode = isLettersOnlyCaptchaContext();
      if (lettersOnlyMode) {
        state.captcha.candidates = state.captcha.candidates
          .map((x) => x.replace(/[^A-Z]/gi, "").toUpperCase())
          .filter(Boolean);
      }
      const exactIndex = state.captcha.candidates.findIndex(
        (x) => x.toLowerCase() === code.toLowerCase()
      );
      state.captcha.candidateIndex = exactIndex >= 0 ? exactIndex : 0;
      log(
        `后端候选数: ${state.captcha.candidates.length}, 当前尝试: ${state.captcha.candidates[state.captcha.candidateIndex]}`
      );
      code = state.captcha.candidates[state.captcha.candidateIndex] || code;
    }

    if (!code) return true;

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
      const submitEl = findCaptchaSubmitButton(imageEl, inputEl);
      if (submitEl) {
        clickElement(submitEl);
        log("回车后验证码仍存在，已补点确认按钮");
      } else {
        log("回车后验证码仍存在，未命中确认按钮");
      }
      return true;
    }

    state.captcha.solvedAt = Date.now();
    state.captcha.submitCount = 0;
    log("验证码已通过，继续选座流程");
    return false;

    state.captcha.submitCount += 1;
    if (state.captcha.submitCount >= 3) {
      clickCaptchaRefresh(imageEl);
      state.captcha.submitCount = 0;
      log("连续验证码提交后触发刷新");
    }
  } catch (err) {
    log(`验证码处理失败: ${String(err?.message || err)}`);
  }
  return true;
}

function isSeatPage() {
  const text = getWholeText();
  // 价格页也会出现大量座位元素，不能只靠元素判断
  if (text.includes("选择价格") || text.includes("選擇價格")) return false;
  if (
    text.includes("选择座位") ||
    text.includes("選擇座位") ||
    text.includes("尚未選擇座位") ||
    text.includes("좌석")
  ) {
    return true;
  }
  // 兜底：只有在页面上确实有“完成选择”按钮时才认为是选座页
  return Boolean(findButtonByClassAndText(STEP_TEXT.completeSeat));
}

function isDatePage() {
  const text = getWholeText();
  return (
    text.includes("选择日期") ||
    text.includes("選擇日期") ||
    text.includes("날짜 선택")
  );
}

function isPricePage() {
  const text = getWholeText();
  return (
    text.includes("选择价格") ||
    text.includes("選擇價格") ||
    text.includes("全席 0/")
  );
}

function isInfoPage() {
  const text = getWholeText();
  return (
    text.includes("订票者资讯") ||
    text.includes("訂購者資訊") ||
    text.includes("手機號碼") ||
    text.includes("手机号")
  );
}

async function tick() {
  if (!state.config.enabled || state.busy) return;
  state.busy = true;
  try {
    const host = location.host;
    if (host === "world.nol.com") {
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
      const captchaHandled = await runCaptchaStep();
      if (captchaHandled) {
        await sleep(260);
        return;
      }
      // 优先选座：部分页面会残留“日期/价格”文案，按文案会误判
      if (isSeatPage()) {
        await runSeatStep();
      } else if (isPricePage()) {
        await runPriceStep();
      } else if (isInfoPage()) {
        await runInfoStep();
      } else if (isDatePage()) {
        await runDateStep();
      } else {
        log("未命中页面阶段，等待下一轮识别");
      }
    } else if (host === "secureapi.ext.eximbay.com") {
      await runEximbayStep();
    }
  } catch (err) {
    log(`执行错误: ${String(err.message || err)}`);
  } finally {
    state.busy = false;
  }
}

function ensureLoop() {
  if (state.intervalId || !state.config.enabled) return;
  state.intervalId = window.setInterval(tick, 350);
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
    quantity: Number(config.quantity || 2),
    dateMonth: String(config.dateMonth || "").trim(),
    dateDay: String(config.dateDay || "").trim(),
    dateTime: String(config.dateTime || "").trim(),
    countryCode: String(config.countryCode || "86"),
    phoneNumber: String(config.phoneNumber || ""),
    ocrApiUrl: String(config.ocrApiUrl || "http://127.0.0.1:8000/ocr/file").trim()
  };
  if (state.config.enabled) {
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
