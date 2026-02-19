(function attachCaptchaEngine(global) {
  function normalizeLegacyCaptchaToken(raw) {
    const src = String(raw || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!src) return "";
    return src.slice(0, 8);
  }

  function buildLegacyCaptchaAttemptList(primary, candidates) {
    const rawList = [primary, ...(Array.isArray(candidates) ? candidates : [])]
      .map((x) => normalizeLegacyCaptchaToken(x))
      .filter((x) => /^[A-Z0-9]{4,8}$/.test(x));
    const out = [];
    const seen = new Set();
    for (const item of rawList) {
      if (seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
    return out.slice(0, 24);
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

  function createCaptchaEngine(deps) {
    const {
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
    } = deps;

    async function runStep() {
      const imageEl = findCaptchaImageElement();
      if (!imageEl) return false;
      const now = Date.now();
      log(`检测到验证码元素: ${imageEl.tagName.toLowerCase()}`);
      const captchaDoc = imageEl.ownerDocument || document;
      if (captchaDoc !== document) {
        log("验证码位于 iframe 文档，已切换 iframe 处理链路");
      }

      const isLegacyCaptcha = isLegacyCaptchaImage(imageEl) || isLegacyCaptchaLayerVisible(captchaDoc);
      const legacyLayerBlocking = isLegacyCaptcha && isLegacyCaptchaLayerVisible(captchaDoc);
      if (isLegacyCaptcha && !legacyLayerBlocking) {
        state.captcha.solvedAt = now;
        state.captcha.submitCount = 0;
        if (now - Number(state.captcha.lastPassLogAt || 0) > 1500) {
          log("旧版验证码层已非阻塞，放行后续选座");
          state.captcha.lastPassLogAt = now;
        }
        return false;
      }

      const inputEl = findCaptchaInput(imageEl);
      if (!inputEl) {
        log("检测到验证码图，但未找到输入框");
        return true;
      }
      log("已定位验证码输入框");

      const sig = makeCaptchaSignature(imageEl);
      const sameImage = sig === state.captcha.lastImageSig;
      const retryByErrorNow = hasCaptchaRetryErrorText(captchaDoc);
      const shouldForceReOcrByError = isLegacyCaptcha && retryByErrorNow;
      const shouldForceReOcrAfterSubmit =
        isLegacyCaptcha &&
        state.captcha.submitCount > 0 &&
        legacyLayerBlocking &&
        now - state.captcha.lastAttemptAt >= 700;

      if (shouldForceReOcrByError) {
        state.captcha.lastImageSig = "";
        state.captcha.candidates = [];
        state.captcha.candidateIndex = 0;
        log("检测到旧版验证码错误提示，强制重新识别新验证码");
      } else if (shouldForceReOcrAfterSubmit) {
        state.captcha.lastImageSig = "";
        state.captcha.candidates = [];
        state.captcha.candidateIndex = 0;
        log("旧版验证码提交后仍未通过，强制重新识别并重发后端");
      }

      if (!sameImage) {
        state.captcha.lastImageSig = sig;
        state.captcha.candidates = [];
        state.captcha.candidateIndex = 0;
      }

      const retryByError =
        !shouldForceReOcrByError && !shouldForceReOcrAfterSubmit && sameImage && retryByErrorNow;
      if (
        !shouldForceReOcrByError &&
        !shouldForceReOcrAfterSubmit &&
        sameImage &&
        !retryByError &&
        now - state.captcha.lastAttemptAt < 1200
      ) {
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
          if (isLegacyCaptcha) {
            code = normalizeLegacyCaptchaToken(ocrResult.code);
            state.captcha.candidates = buildLegacyCaptchaAttemptList(code, ocrResult.candidates);
            if (!state.captcha.candidates.length && /^[A-Z0-9]{4,8}$/.test(code)) {
              state.captcha.candidates = [code];
            }
          } else {
            code = normalizeCaptchaToSixLetters(ocrResult.code);
            state.captcha.candidates = buildCaptchaAttemptList(code, ocrResult.candidates);
            if (!state.captcha.candidates.length && /^[A-Z]{6}$/.test(code)) {
              state.captcha.candidates = [code];
            }
          }
          const exactIndex = state.captcha.candidates.findIndex((x) => String(x) === String(code));
          state.captcha.candidateIndex = exactIndex >= 0 ? exactIndex : 0;
          const currentTry = state.captcha.candidates[state.captcha.candidateIndex] || "(empty)";
          log(`后端候选数: ${state.captcha.candidates.length}, 当前尝试: ${currentTry}`);
          code = state.captcha.candidates[state.captcha.candidateIndex] || code;
        }

        code = isLegacyCaptcha ? normalizeLegacyCaptchaToken(code) : normalizeCaptchaToSixLetters(code);
        const valid = isLegacyCaptcha ? /^[A-Z0-9]{4,8}$/.test(code) : /^[A-Z]{6}$/.test(code);
        if (!valid) {
          log(`OCR结果格式不合法，当前值: ${String(code || "") || "(empty)"}，刷新验证码重试`);
          await clickCaptchaRefresh(imageEl);
          state.captcha.lastImageSig = "";
          state.captcha.lastAttemptAt = 0;
          return true;
        }

        if (isLegacyCaptcha && !state.captcha.legacyFirstInputDelayDone) {
          await sleep(500);
          state.captcha.legacyFirstInputDelayDone = true;
          log("旧版首次验证码输入前等待 0.5s");
        }

        typeInInput(inputEl, code);
        log(`验证码已填写: ${code}`);

        inputEl.focus();
        inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
        inputEl.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", code: "Enter", bubbles: true }));
        inputEl.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
        log("已尝试回车提交验证码");

        if (isLegacyCaptcha) {
          if (runLegacyCaptchaActionInDoc("submit", inputEl?.ownerDocument || captchaDoc)) {
            log("旧版验证码已调用 fnCheck() 提交");
          } else {
            const submitByMain = await triggerLegacyCaptchaAction("submit");
            if (submitByMain) {
              log("旧版验证码已调用 fnCheck() 提交(background)");
            } else {
              const submitEl = findCaptchaSubmitButton(imageEl, inputEl);
              if (submitEl) {
                if (!hasJavascriptHref(submitEl)) {
                  clickElement(submitEl);
                } else if (runLegacyHandlerScript(submitEl, ["fncheck"])) {
                  log("旧版验证码已执行提交脚本(fnCheck)");
                }
              }
            }
          }
        }

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
            await clickCaptchaRefresh(imageEl);
            state.captcha.lastImageSig = "";
            state.captcha.lastAttemptAt = 0;
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
        if (isLegacyCaptcha && /failed to fetch/i.test(msg)) {
          if (!isLegacyCaptchaLayerVisible(captchaDoc)) {
            state.captcha.solvedAt = Date.now();
            log("验证码请求失败但旧版已非阻塞态，放行后续选座流程");
            return false;
          }
        }
        if (msg.includes("OCR code is empty")) {
          await clickCaptchaRefresh(imageEl);
          state.captcha.lastImageSig = "";
          state.captcha.lastAttemptAt = 0;
          log("OCR空结果，已刷新验证码重试");
        }
      }
      return true;
    }

    return {
      runStep,
      normalizeLegacyCaptchaToken,
      normalizeCaptchaToSixLetters
    };
  }

  global.createCaptchaEngine = createCaptchaEngine;
})(window);
