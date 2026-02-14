const STORAGE_KEY = "nolBotConfig";

const state = {
  config: {
    enabled: false,
    eventUrl: "",
    quantity: 2,
    countryCode: "86",
    phoneNumber: ""
  },
  intervalId: null,
  busy: false,
  hookInjected: false,
  fastPathLastTs: 0,
  paymentClicked: false,
  networkCache: {
    requests: [],
    responses: []
  },
  badgeEl: null,
  loginHinted: false,
  lastInfoStepAt: 0,
  totalClickedAt: 0,
  infoFlowDone: false,
  infoFlowKey: ""
};

const STEP_TEXT = {
  buyNow: ["立即购买", "立即購買", "buy now", "book now", "예매하기"],
  completeSeat: ["完成选择", "完成選擇", "done", "confirm seat", "좌석선택완료"],
  priceStep: ["选择价格", "選擇價格", "price selection", "가격 선택"],
  preorder: ["预购", "預購", "订购", "訂購", "purchase", "book"],
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
  const text = getWholeText();
  const match1 = text.match(/全席\s*(\d+)\s*\/\s*(\d+)/);
  if (match1) return Number(match1[1]);
  const match2 = text.match(/(选择座位|選擇座位)\s*(\d+)/);
  if (match2) return Number(match2[2]);
  return 0;
}

function getSeatCandidates() {
  const all = Array.from(
    document.querySelectorAll(
      "circle, path, [class*='seat'], [id*='seat'], button, [role='button']"
    )
  );
  return all.filter((el) => {
    if (!visible(el)) return false;
    const cls = normalizeText(el.className?.toString() || "");
    const id = normalizeText(el.id || "");
    const text = normalizeText(el.textContent || "");
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
    const bag = `${cls} ${id} ${text} ${attrs}`;
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

function extractSeatIds(node, result = new Set()) {
  if (!node) return result;
  if (Array.isArray(node)) {
    node.forEach((item) => extractSeatIds(item, result));
    return result;
  }
  if (typeof node !== "object") return result;

  const keys = Object.keys(node);
  const lowerKeys = keys.map((k) => k.toLowerCase());
  const statusRaw =
    String(
      node.status ??
        node.state ??
        node.available ??
        node.saleStatus ??
        node.sellYn ??
        ""
    ).toLowerCase();
  const available =
    statusRaw === "" ||
    statusRaw.includes("available") ||
    statusRaw.includes("open") ||
    statusRaw.includes("possible") ||
    statusRaw === "y" ||
    statusRaw === "true";
  const blocked =
    statusRaw.includes("sold") ||
    statusRaw.includes("block") ||
    statusRaw.includes("disable") ||
    statusRaw === "n" ||
    statusRaw === "false";

  let seatId = null;
  for (const key of lowerKeys) {
    if (
      key === "seatid" ||
      key === "seat_id" ||
      key === "seatno" ||
      key === "seat_no"
    ) {
      seatId = node[keys[lowerKeys.indexOf(key)]];
      break;
    }
  }

  if (seatId != null && available && !blocked) {
    result.add(String(seatId));
  }

  for (const key of keys) {
    extractSeatIds(node[key], result);
  }
  return result;
}

function cloneAndPatchSeatBody(body, seatIds, quantity) {
  const data = JSON.parse(JSON.stringify(body));
  const ref = { index: 0 };
  const replace = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item) => replace(item));
      return;
    }

    for (const key of Object.keys(node)) {
      const lower = key.toLowerCase();
      const value = node[key];
      if (lower === "seatids" && Array.isArray(value)) {
        node[key] = seatIds;
        continue;
      }
      if (
        (lower === "seatid" || lower === "seat_id" || lower === "seatno") &&
        (typeof value === "string" || typeof value === "number")
      ) {
        node[key] = seatIds[ref.index % seatIds.length];
        ref.index += 1;
        continue;
      }
      if (
        (lower.includes("qty") ||
          lower.includes("count") ||
          lower.includes("quantity")) &&
        typeof value === "number"
      ) {
        node[key] = quantity;
        continue;
      }
      replace(value);
    }
  };
  replace(data);
  return data;
}

async function tryFastRequestPath() {
  const now = Date.now();
  if (now - state.fastPathLastTs < 1800) return false;
  state.fastPathLastTs = now;

  const seatIds = [];
  for (const res of state.networkCache.responses.slice(-20)) {
    if (res?.json && typeof res.json === "object") {
      const ids = Array.from(extractSeatIds(res.json));
      if (ids.length) seatIds.push(...ids);
    }
  }
  if (!seatIds.length) return false;

  const template = [...state.networkCache.requests]
    .reverse()
    .find((req) => {
      if (!req || String(req.method).toUpperCase() !== "POST") return false;
      const u = normalizeText(req.url || "");
      return (
        u.includes("seat") ||
        u.includes("select") ||
        u.includes("reserve") ||
        u.includes("cart")
      );
    });

  if (!template || !template.body || typeof template.body !== "object") {
    return false;
  }

  const chosen = shuffle(Array.from(new Set(seatIds))).slice(
    0,
    state.config.quantity
  );
  if (!chosen.length) return false;

  try {
    const patchedBody = cloneAndPatchSeatBody(
      template.body,
      chosen,
      state.config.quantity
    );
    const headers = { ...(template.headers || {}) };
    delete headers["content-length"];
    delete headers["host"];

    const response = await fetch(template.url, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(patchedBody)
    });
    if (response.ok) {
      log(`快路径请求已发送: ${template.url}`);
      return true;
    }
  } catch (err) {
    log(`快路径失败，回退点击: ${String(err.message || err)}`);
  }
  return false;
}

async function chooseSeatsByClick(quantity) {
  const initial = detectSelectedSeatCount();
  if (initial >= quantity) return true;

  const candidates = shuffle(getSeatCandidates());
  let clicked = 0;
  for (const seat of candidates) {
    if (detectSelectedSeatCount() >= quantity) break;
    if (clickElement(seat)) {
      clicked += 1;
      await sleep(60);
    }
    if (clicked > quantity * 20) break;
  }
  return detectSelectedSeatCount() >= quantity;
}

async function runSeatStep() {
  await tryFastRequestPath();
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

  return scored[0]?.el || null;
}

function detectCurrentQuantityFromText() {
  const text = getWholeText();
  const match = text.match(/(全席|all seats?|seat)\s*(\d+)\s*\/\s*(\d+)/i);
  if (match) return Number(match[2]);
  const loose = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (loose) return Number(loose[1]);
  return 0;
}

async function runPriceStep() {
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
  if (
    clickBottomRightPrimaryButton(STEP_TEXT.preorder) ||
    clickByKeywords(STEP_TEXT.preorder)
  ) {
    log("已点击 预购/订购");
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
  const picker = getPhoneCountryPicker();
  if (!picker) return false;
  const text = normalizeText(picker.textContent || "");
  return (
    text.includes("+86") &&
    (text.includes("china") || text.includes("中国") || text.includes("中國"))
  );
}

function isCountryDropdownOpened() {
  const list =
    document.querySelector(".GlobalSelect_optionListInner__HZvmu") ||
    document.querySelector("[class*='GlobalSelect_optionListInner__']");
  return Boolean(list && visible(list));
}

function findSelectTextElementInPhoneRow() {
  const rows = Array.from(document.querySelectorAll("div, section, form, li")).filter(
    visible
  );
  const phoneRow = rows.find((row) => {
    const text = normalizeText(row.innerText || "");
    return (
      text.includes("手機號碼") ||
      text.includes("手机号") ||
      text.includes("phone number") ||
      text.includes("phone")
    );
  });
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

  const candidates = Array.from(
    document.querySelectorAll(
      "button, [role='button'], [class*='GlobalSelect'], div, span"
    )
  ).filter(visible);

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

  return scored[0]?.el || null;
}

function openCountryCodeDropdown() {
  if (isCountryDropdownOpened()) return true;

  // Priority: lock to the "選擇/选择" text in the phone row and click ancestor chain.
  const selectTextEl = findSelectTextElementInPhoneRow();
  if (selectTextEl) {
    let cur = selectTextEl;
    for (let i = 0; i < 8 && cur; i += 1) {
      if (visible(cur)) {
        forceClick(cur);
        clickAtCenter(cur);
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
  const rect = el.getBoundingClientRect();
  const arrowX = rect.right - 22;
  const arrowY = rect.top + rect.height / 2;
  const arrowTarget = document.elementFromPoint(arrowX, arrowY);
  if (arrowTarget) {
    forceClick(arrowTarget);
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
    typeInInput(inputs[0], "china");
    log("国家码搜索输入: china");
    return true;
  }
  return false;
}

function selectChinaOption() {
  const container =
    document.querySelector(".GlobalSelect_optionListInner__HZvmu") ||
    document.querySelector("[class*='GlobalSelect_optionListInner__']");
  if (!container || !visible(container)) return false;

  const items = Array.from(
    container.querySelectorAll("[class*='GlobalSelect_optionItem__'], li, [role='option']")
  ).filter(visible);
  for (const item of items) {
    const txt = normalizeText(item.textContent || "");
    if (!txt) continue;
    if (txt.includes("china") || txt.includes("+86") || txt.includes("中国") || txt.includes("中國")) {
      forceClick(item);
      clickAtCenter(item);
      log("已选择 China/+86 选项");
      return true;
    }
  }
  return false;
}

async function selectChinaCountryCodeRobust() {
  if (currentCountryIsChina()) return true;

  const opened = openCountryCodeDropdown();
  if (!opened) return false;
  await sleep(300);

  searchCountryInDropdown();
  await sleep(250);

  const ok = selectChinaOption();
  await sleep(250);

  return ok || currentCountryIsChina();
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
  }
  if (state.infoFlowDone) return;

  const chinaOk = await selectChinaCountryCodeRobust();
  if (!chinaOk) {
    log("国家码选择失败，稍后重试");
    return;
  }

  await fillPhoneSection();
  checkAgreement();
  const submitOk = clickInfoSubmitButtonRobust();

  if (submitOk) {
    state.infoFlowDone = true;
    log("信息步骤完成");
  }
}
// ======================================================================

async function runProductStep() {
  if (clickByKeywords(STEP_TEXT.buyNow)) {
    log("已点击 立即购买");
    await sleep(500);
  }
}

async function runEximbayStep() {
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

  const wechat = findClickableByText(STEP_TEXT.wechat);
  if (wechat) {
    clickElement(wechat);
    log("已选择微信支付");
    await sleep(300);
  }

  if (!state.paymentClicked) {
    const confirm = findClickableByText(STEP_TEXT.confirmPay);
    if (confirm) {
      clickElement(confirm);
      state.paymentClicked = true;
      log("已点击确认并支付");
      await sleep(500);
    }
  }
}

function isSeatPage() {
  const text = getWholeText();
  return text.includes("选择座位") || text.includes("選擇座位");
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
      if (isSeatPage()) {
        await runSeatStep();
      } else if (isPricePage()) {
        await runPriceStep();
      } else if (isInfoPage()) {
        await runInfoStep();
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

function ensureHookInjected() {
  const host = location.host;
  if (
    state.hookInjected ||
    (host !== "world.nol.com" && host !== "tickets.interpark.com")
  ) {
    return;
  }
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page-hook.js");
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
  state.hookInjected = true;
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== "NOL_BOT_HOOK") return;
  if (data.kind === "request") {
    state.networkCache.requests.push(data.payload);
    state.networkCache.requests = state.networkCache.requests.slice(-80);
  } else if (data.kind === "response") {
    state.networkCache.responses.push(data.payload);
    state.networkCache.responses = state.networkCache.responses.slice(-80);
  }
});

async function loadConfig() {
  const all = await chrome.storage.local.get(STORAGE_KEY);
  const config = all[STORAGE_KEY];
  if (!config) return;
  state.config = {
    enabled: Boolean(config.enabled),
    eventUrl: config.eventUrl || "",
    quantity: Number(config.quantity || 2),
    countryCode: String(config.countryCode || "86"),
    phoneNumber: String(config.phoneNumber || "")
  };
  if (state.config.enabled) {
    ensureHookInjected();
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
