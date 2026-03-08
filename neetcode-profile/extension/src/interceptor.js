(function () {
  const FUNCTION_MAP = {
    getUserInfo:        "userInfo",
    getUserStats:       "userStats",
    getUserStreakData:  "streakData",
    getLeaderboardData: "leaderboard",
  };

  const _captured = {
    userInfo: null, userStats: null, streakData: null, leaderboard: null
  };

  function tryCapture(url, reqBody, responseText) {
    try {
      if (!url.includes("callableFunctionHttp")) return;

      console.log("[NeetCode Interceptor] 🎯 Matched callableFunctionHttp!");
      console.log("[NeetCode Interceptor] 📤 Request body:", typeof reqBody === "string" ? reqBody.substring(0, 300) : reqBody);
      console.log("[NeetCode Interceptor] 📥 Response:", responseText?.substring(0, 300));

      const json = JSON.parse(responseText);
      const parsed = typeof reqBody === "string" ? JSON.parse(reqBody) : reqBody;
      const fnId = parsed?.functionId || parsed?.data?.functionId;
      const key = FUNCTION_MAP[fnId];

      console.log("[NeetCode Interceptor] 🔑 functionId:", fnId, "→ key:", key);

      if (key && json?.data) {
        _captured[key] = json.data;
        window.dispatchEvent(new CustomEvent("__neetcode_capture__", {
          detail: { key, data: json.data, all: _captured }
        }));
        console.log("[NeetCode Profile Share] ✅ Captured:", fnId);
      }
    } catch (err) {
      console.warn("[NeetCode Interceptor] ⚠️ tryCapture error:", err.message);
    }
  }

  // ── Intercept fetch() ─────────────────────────────────────────────────────
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    const response = await originalFetch(...args);
    try {
      const url = (typeof args[0] === "string" ? args[0] : args[0]?.url) || "";
      const reqBody = args[1]?.body;
      if (url.includes("callableFunctionHttp")) {
        const clone = response.clone();
        clone.text().then(text => tryCapture(url, reqBody, text)).catch(() => {});
      }
    } catch (_) {}
    return response;
  };

  // ── Intercept XMLHttpRequest ──────────────────────────────────────────────
  const OriginalXHR = window.XMLHttpRequest;
  function InterceptedXHR() {
    const xhr = new OriginalXHR();
    let _url = "";
    let _body = "";

    const originalOpen = xhr.open.bind(xhr);
    xhr.open = function (method, url, ...rest) {
      _url = url;
      return originalOpen(method, url, ...rest);
    };

    const originalSend = xhr.send.bind(xhr);
    xhr.send = function (body) {
      _body = body;
      xhr.addEventListener("load", function () {
        if (_url.includes("callableFunctionHttp")) {
          console.log("[NeetCode Interceptor] 📡 XHR matched:", _url);
          console.log("[NeetCode Interceptor] 📤 XHR body:", typeof _body === "string" ? _body.substring(0, 300) : _body);
          console.log("[NeetCode Interceptor] 📥 XHR response:", xhr.responseText?.substring(0, 300));
          tryCapture(_url, _body, xhr.responseText);
        }
      });
      return originalSend(body);
    };

    return xhr;
  }
  InterceptedXHR.prototype = OriginalXHR.prototype;
  window.XMLHttpRequest = InterceptedXHR;

  console.log("[NeetCode Profile Share] 🎣 fetch() + XHR interceptors installed (MAIN world)");
})();