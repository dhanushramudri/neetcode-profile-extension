// content.js — NeetCode Profile Share
// Runs in ISOLATED world. Listens for events dispatched by interceptor.js (MAIN world).

(function () {
  const BACKEND = "https://neetcode-profile-extension.vercel.app";

  // ── Step 1 is handled by interceptor.js in MAIN world ────────────────────

  // ── Step 2: Listen for captured data via custom events ────────────────────
  const captured = {
    userInfo: null, userStats: null, streakData: null, leaderboard: null
  };

  let debounceTimer = null;

  window.addEventListener("__neetcode_capture__", (e) => {
    const { key, data } = e.detail;
    captured[key] = data;

    console.log("[NeetCode Profile Share] 📨 Received from page:", key);

    // Save to extension storage immediately
    chrome.storage.local.set({
      neetcodeProfile: { capturedAt: new Date().toISOString(), ...captured },
      lastUpdated: new Date().toISOString(),
    });

    // Notify popup
    chrome.runtime.sendMessage({
      type: "DATA_UPDATE",
      payload: { capturedAt: new Date().toISOString(), ...captured }
    }).catch(() => {});

    // Debounced backend push
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const allReady = captured.userInfo && captured.userStats &&
                       captured.streakData && captured.leaderboard;
      if (allReady) {
        chrome.storage.local.get(["savedUsername", "published"], (s) => {
          if (s.published && s.savedUsername) {
            silentPush(s.savedUsername, captured);
          }
        });
      }
    }, 800);
  });

  // ── Step 3: Push to backend ───────────────────────────────────────────────
  async function silentPush(username, data) {
    const { userInfo, userStats, streakData, leaderboard } = data;
    console.log("[NeetCode Profile Share] 📤 Pushing to backend...");
    try {
      const res = await fetch(`${BACKEND}/api/profile`, {
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
        console.log("[NeetCode Profile Share] ✅ Synced to backend!");
      } else {
        console.warn("[NeetCode Profile Share] ⚠️ Backend returned:", res.status);
      }
    } catch (e) {
      console.warn("[NeetCode Profile Share] ⚠️ Sync failed:", e.message);
    }
  }

  // ── Step 4: Respond to popup ──────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GET_CAPTURED_DATA") {
      console.log("[NeetCode Profile Share] 📡 Popup requested data:", JSON.stringify({
        hasUserInfo: !!captured.userInfo,
        hasUserStats: !!captured.userStats,
        hasStreakData: !!captured.streakData,
        hasLeaderboard: !!captured.leaderboard,
      }));
      sendResponse({ payload: { capturedAt: new Date().toISOString(), ...captured } });
    }
    if (msg.type === "MANUAL_PUSH") {
      silentPush(msg.username, captured).then(() => sendResponse({ ok: true }));
      return true;
    }
  });

  console.log("[NeetCode Profile Share] 👀 Content script ready (document_start)");
})();