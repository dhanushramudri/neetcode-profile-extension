// content.js — NeetCode Profile Share
// Runs in ISOLATED world. Listens for events dispatched by interceptor.js (MAIN world).

(function () {
  const BACKEND = "https://neetcard.vercel.app";

  const captured = {
    userInfo: null, userStats: null, streakData: null, leaderboard: null
  };

  let debounceTimer = null;

  window.addEventListener("__neetcode_capture__", (e) => {
    const { key, data } = e.detail;
    captured[key] = data;

    console.log("[NeetCode Profile Share] 📨 Received from page:", key);

    chrome.storage.local.set({
      neetcodeProfile: { capturedAt: new Date().toISOString(), ...captured },
      lastUpdated: new Date().toISOString(),
    });

    chrome.runtime.sendMessage({
      type: "DATA_UPDATE",
      payload: { capturedAt: new Date().toISOString(), ...captured }
    }).catch(() => {});

    // Debounced backend push — fires once all 4 keys are captured
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const allReady = captured.userInfo && captured.userStats &&
                       captured.streakData && captured.leaderboard;
      if (allReady) {
        chrome.storage.local.get(["published"], (s) => {
          if (s.published) {
            // Always derive username from the actual NeetCode profile data —
            // never from a user-typed field. This prevents anyone from
            // publishing under a username that isn't theirs.
            const profileUsername = getProfileUsername(captured);
            if (profileUsername) {
              silentPush(profileUsername, captured);
            } else {
              console.warn("[NeetCode Profile Share] ⚠️ Could not determine profile username from captured data.");
            }
          }
        });
      }
    }, 800);
  });

  /**
  /**
   * Derives username from the displayName shown in the popup "Signed In As" section.
   * Removes spaces, lowercases, strips chars invalid for the backend regex.
   */
  function getProfileUsername(data) {
    const raw = data.userInfo?.displayName || null;
    if (!raw) return null;
    const sanitised = raw
      .replace(/\s+/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 30);
    return sanitised.length >= 2 ? sanitised : null;
  }

  // ── Push to backend ───────────────────────────────────────────────────────
  async function silentPush(username, data) {
    const { userInfo, userStats, streakData, leaderboard } = data;
    console.log("[NeetCode Profile Share] 📤 Pushing as:", username);

    // Load the stored token for this username (may be undefined for new profiles)
    const tokenKey = `ownerToken_${username}`;
    chrome.storage.local.get([tokenKey], async (stored) => {
      const ownerToken = stored[tokenKey] || undefined;

      try {
        const res = await fetch(`${BACKEND}/api/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            ownerToken,                          // undefined on first push → backend creates profile
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

        const json = await res.json().catch(() => ({}));

        if (res.ok) {
          const now = new Date().toISOString();

          // If the server returned a token (new profile or legacy migration),
          // persist it immediately so future pushes are authenticated.
          if (json.ownerToken) {
            chrome.storage.local.set({ [tokenKey]: json.ownerToken });
            console.log("[NeetCode Profile Share] 🔑 Owner token saved for:", username);
          }

          chrome.storage.local.set({ lastSynced: now, savedUsername: username });
          chrome.runtime.sendMessage({ type: "SYNC_OK", ts: now }).catch(() => {});
          console.log("[NeetCode Profile Share] ✅ Synced to backend!");

        } else if (res.status === 403) {
          // Username is owned by someone else — surface this clearly
          console.error(
            "[NeetCode Profile Share] 🚫 Username taken by another account:",
            username,
            json.message || ""
          );
          chrome.runtime.sendMessage({
            type: "SYNC_ERROR",
            code: 403,
            message: `The username "${username}" is already registered by another user. ` +
                     `Your NeetCode profile username must match your registered username.`,
          }).catch(() => {});

        } else {
          console.warn("[NeetCode Profile Share] ⚠️ Backend returned:", res.status, json);
          chrome.runtime.sendMessage({
            type: "SYNC_ERROR",
            code: res.status,
            message: json.error || "Sync failed",
          }).catch(() => {});
        }

      } catch (e) {
        console.warn("[NeetCode Profile Share] ⚠️ Sync failed:", e.message);
      }
    });
  }

  // ── Respond to popup ──────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GET_CAPTURED_DATA") {
      sendResponse({ payload: { capturedAt: new Date().toISOString(), ...captured } });
    }
    if (msg.type === "MANUAL_PUSH") {
      const profileUsername = getProfileUsername(captured);
      if (!profileUsername) {
        sendResponse({ ok: false, error: "No profile username found in captured data." });
        return;
      }
      silentPush(profileUsername, captured).then(() => sendResponse({ ok: true }));
      return true;
    }
  });

  console.log("[NeetCode Profile Share] 👀 Content script ready (document_start)");
})();