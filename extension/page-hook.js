(() => {
  if (window.__NOL_BOT_HOOK_INSTALLED__) return;
  window.__NOL_BOT_HOOK_INSTALLED__ = true;

  const KEYWORDS = [
    "ticket",
    "seat",
    "reserve",
    "select",
    "order",
    "payment",
    "price",
    "book"
  ];

  const MAX_LEN = 50000;

  const shouldTrack = (url) => {
    if (!url) return false;
    const text = String(url).toLowerCase();
    return KEYWORDS.some((word) => text.includes(word));
  };

  const trim = (text) => {
    const value = String(text ?? "");
    if (value.length <= MAX_LEN) return value;
    return `${value.slice(0, MAX_LEN)}...[TRUNCATED]`;
  };

  const parseBody = (body) => {
    if (!body) return null;
    try {
      if (typeof body === "string") {
        return JSON.parse(body);
      }
      if (body instanceof URLSearchParams) {
        return Object.fromEntries(body.entries());
      }
      return body;
    } catch {
      return trim(body);
    }
  };

  const normalizeHeaders = (headers) => {
    if (!headers) return {};
    if (headers instanceof Headers) {
      return Object.fromEntries(headers.entries());
    }
    if (Array.isArray(headers)) {
      return Object.fromEntries(headers);
    }
    return { ...headers };
  };

  const emitHookEvent = (kind, payload) => {
    window.postMessage(
      {
        source: "NOL_BOT_HOOK",
        kind,
        payload
      },
      "*"
    );
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = (init.method || (typeof input !== "string" && input?.method) || "GET").toUpperCase();
    const headers = normalizeHeaders(init.headers || (typeof input !== "string" && input?.headers));
    const body = parseBody(init.body || (typeof input !== "string" && input?.body));

    if (shouldTrack(url)) {
      emitHookEvent("request", {
        url,
        method,
        headers,
        body,
        ts: Date.now()
      });
    }

    const response = await originalFetch(input, init);
    if (shouldTrack(url)) {
      const clone = response.clone();
      const contentType = clone.headers.get("content-type") || "";
      let json = null;
      let text = null;

      try {
        if (contentType.includes("application/json")) {
          json = await clone.json();
        } else {
          text = trim(await clone.text());
        }
      } catch {
        text = null;
      }

      emitHookEvent("response", {
        url,
        method,
        status: response.status,
        json,
        text,
        ts: Date.now()
      });
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function open(method, url, ...rest) {
    this.__nolBotMeta = {
      method: String(method || "GET").toUpperCase(),
      url: String(url || "")
    };
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function send(body) {
    const meta = this.__nolBotMeta || {};
    if (shouldTrack(meta.url)) {
      emitHookEvent("request", {
        url: meta.url,
        method: meta.method || "GET",
        headers: {},
        body: parseBody(body),
        ts: Date.now()
      });
    }

    this.addEventListener("load", () => {
      if (!shouldTrack(meta.url)) return;
      const contentType = this.getResponseHeader("content-type") || "";
      let json = null;
      let text = null;
      try {
        if (contentType.includes("application/json")) {
          json = JSON.parse(this.responseText);
        } else {
          text = trim(this.responseText);
        }
      } catch {
        text = null;
      }
      emitHookEvent("response", {
        url: meta.url,
        method: meta.method || "GET",
        status: this.status,
        json,
        text,
        ts: Date.now()
      });
    });

    return originalSend.call(this, body);
  };
})();
