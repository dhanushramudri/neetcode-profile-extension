// content.js — NeetCode Profile Share
// Intercepts NeetCode's own fetch() calls silently on every page visit.
// Handles Angular SPA navigation (no full page reloads).

(function () {
  const BACKEND = "https://neetcode-profile.vercel.app"; // ← update after deploy

  const captured = {
    userInfo:    null,
    userStats:   null,
    streakData:  null,
    leaderboard: null,
  };

  const FUNCTION_MAP = {
    getUserInfo:         "userInfo",
    getUserStats:        "userStats",
    getUserStreakData:   "streakData",
    getLeaderboardData:  "leaderboard",
  };

  let debounceTimer = null;

  // ── Wrap window.fetch to intercept NeetCode API responses ─────────────────
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = (typeof args[0] === "string" ? args[0] : args[0]?.url) || "";
      if (url.includes("callableFunctionHttp")) {
        const clone   = response.clone();
        const reqBody = args[1]?.body;

        clone.json().then((json) => {
          try {
            const parsed = typeof reqBody === "string" ? JSON.parse(reqBody) : reqBody;
            const fnId   = parsed?.functionId;
            const key    = FUNCTION_MAP[fnId];
            if (key && json?.data) {
              captured[key] = json.data;
              console.log(`[NeetCode Profile Share] ✅ Captured: ${fnId}`);
              scheduleSync();
            }
          } catch (_) {}
        }).catch(() => {});
      }
    } catch (_) {}

    return response;
  };

  // ── Debounce: batch all 4 API calls into one backend push ─────────────────
  function scheduleSync() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const payload = { capturedAt: new Date().toISOString(), ...captured };

      // Cache for popup
      chrome.storage.local.set({
        neetcodeProfile: payload,
        lastUpdated: new Date().toISOString(),
      });

      // Notify popup if open
      chrome.runtime.sendMessage({ type: "DATA_UPDATE", payload }).catch(() => {});

      // Auto push to backend if user already published
      const allReady = captured.userInfo && captured.userStats &&
                       captured.streakData && captured.leaderboard;
      if (allReady) {
        chrome.storage.local.get(["savedUsername", "published"], (s) => {
          if (s.published && s.savedUsername) {
            silentPush(s.savedUsername, payload);
          }
        });
      }
    }, 800);
  }

  // ── Push data to backend silently ─────────────────────────────────────────
  async function silentPush(username, payload) {
    const { userInfo, userStats, streakData, leaderboard } = payload;
    try {
      const res = await originalFetch(`${BACKEND}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          displayName:        userInfo?.displayName,
          photoURL:           userInfo?.photoURL,
          country:            userInfo?.country,
          joined:             userInfo?.joined,
          solved:             userStats?.problems?.NeetCode150?.completed
                              ?? leaderboard?.userSolvedCount ?? 0,
          totalProblems:      userStats?.problems?.NeetCode150?.total ?? 533,
          percentile:         leaderboard?.percentile,
          leaderboardBuckets: leaderboard?.buckets,
          totalActiveUsers:   leaderboard?.totalActiveUsers,
          currentStreak:      streakData?.currentStreak,
          maxStreak:          streakData?.maxStreak,
          activityByDate:     streakData?.activityByDate,
          courses:            userStats?.courses,
          problems:           userStats?.problems,
          updatedAt:          new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const now = new Date().toISOString();
        chrome.storage.local.set({ lastSynced: now });
        chrome.runtime.sendMessage({ type: "SYNC_OK", ts: now }).catch(() => {});
        console.log("[NeetCode Profile Share] ✅ Synced silently");
      }
    } catch (e) {
      console.warn("[NeetCode Profile Share] ⚠️ Sync failed:", e.message);
    }
  }

  // ── Watch for Angular SPA route changes ───────────────────────────────────
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log(`[NeetCode Profile Share] 📍 Route changed: ${location.pathname}`);
      // fetch() intercept handles re-capture automatically
    }
  }).observe(document.body, { childList: true, subtree: true });

  // ── Respond to popup messages ─────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GET_CAPTURED_DATA") {
      sendResponse({ payload: { capturedAt: new Date().toISOString(), ...captured } });
    }
    if (msg.type === "MANUAL_PUSH") {
      silentPush(msg.username, { capturedAt: new Date().toISOString(), ...captured })
        .then(() => sendResponse({ ok: true }));
      return true;
    }
  });

  console.log("[NeetCode Profile Share] 👀 Watching NeetCode API silently...");
})();