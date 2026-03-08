// popup.js — NeetCode Profile Share

const BACKEND = "https://neetcard.vercel.app";
const $ = (id) => document.getElementById(id);

let profilePayload  = null;
let lockedUsername  = null;   // derived from NeetCode API — never user-typed

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const onNeetCode = tab?.url?.includes("neetcode.io");
  if (!onNeetCode) {
    $("mainUI").style.display    = "none";
    $("notOnSite").style.display = "block";
    return;
  }

  // Ask content script for live captured data
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "GET_CAPTURED_DATA" });
    if (resp?.payload) {
      profilePayload = resp.payload;
      renderProfile(profilePayload);
    }
  } catch (_) {}

  // Fall back to extension storage cache
  if (!profilePayload) {
    const cached = await chrome.storage.local.get(["neetcodeProfile"]);
    if (cached.neetcodeProfile) {
      profilePayload = cached.neetcodeProfile;
      renderProfile(profilePayload);
    } else {
      setStatus("loading", "Capturing… visit <strong>neetcode.io/profile</strong>");
      $("statusHint").textContent = "Visit neetcode.io/profile to capture your data.";
    }
  }

  // Restore published link and last sync time
  const stored = await chrome.storage.local.get(["savedUsername", "published", "lastSynced", "syncError"]);

  if (stored.published && stored.savedUsername) {
    showLink(stored.savedUsername);
  }
  if (stored.lastSynced) {
    showSyncTime(stored.lastSynced);
  }
  // Show any persisted sync error (e.g. 403 from a previous session)
  if (stored.syncError) {
    showError(stored.syncError);
  }

  // Live updates from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "DATA_UPDATE" && msg.payload) {
      profilePayload = msg.payload;
      renderProfile(profilePayload);
    }
    if (msg.type === "SYNC_OK") {
      hideError();
      showSyncTime(msg.ts || new Date().toISOString());
    }
    if (msg.type === "SYNC_ERROR" && msg.code === 403) {
      showError(msg.message);
    }
  });
}

// ── Derive username from the display name shown in "Signed In As" ────────────
// Remove spaces, lowercase, strip invalid chars — same as what the user sees.
function getProfileUsername(data) {
  const raw = data?.userInfo?.displayName || null;
  if (!raw) return null;
  const sanitised = raw
    .replace(/\s+/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 30);
  return sanitised.length >= 2 ? sanitised : null;
}

function renderProfile(data) {
  const { userInfo, userStats, streakData, leaderboard } = data;
  const allReady = userInfo && userStats && streakData && leaderboard;

  if (!userInfo && !userStats) {
    setStatus("loading", "Capturing… visit <strong>neetcode.io/profile</strong>");
    return;
  }

  setStatus(
    allReady ? "ok" : "warn",
    allReady
      ? "<strong>All data captured</strong> — ready to publish"
      : "<strong>Partial data</strong> — visit neetcode.io/profile for full sync"
  );
  $("statusHint").textContent = "";

  // ── Profile card ────────────────────────────────────────────────────────
  if (userInfo) {
    $("profileSection").style.display = "block";
    $("profileName").textContent      = userInfo.displayName || "—";
    const year = userInfo.joined ? new Date(userInfo.joined).getFullYear() : "—";
    $("profileMeta").textContent = `${userInfo.country || ""} · Joined ${year}`.trim().replace(/^·\s*/, "");

    if (userInfo.photoURL) {
      $("avatarImg").src                   = userInfo.photoURL;
      $("avatarImg").style.display         = "block";
      $("avatarPlaceholder").style.display = "none";
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  if (userStats || leaderboard) {
    $("statsSection").style.display     = "block";
    const solved  = userStats?.problems?.NeetCode150?.completed ?? leaderboard?.userSolvedCount ?? 0;
    const pct     = leaderboard?.percentile;
    const streak  = streakData?.currentStreak ?? 0;
    $("statSolved").textContent     = solved;
    $("statPercentile").textContent = pct ? `Top ${(100 - pct).toFixed(1)}%` : "—";
    $("statStreak").textContent     = streak + " 🔥";
  }

  // ── Lock username to NeetCode profile ────────────────────────────────────
  const username = getProfileUsername(data);
  if (username) {
    lockedUsername = username;
    const display  = $("usernameDisplay");
    display.textContent  = username;
    display.classList.remove("placeholder");
    $("usernameBadge").style.display = "inline-block";
    $("publishBtn").disabled         = false;
  } else {
    // Username not yet available — keep button disabled
    $("usernameDisplay").textContent = "Waiting for profile data…";
    $("usernameDisplay").classList.add("placeholder");
    $("usernameBadge").style.display = "none";
    $("publishBtn").disabled         = true;
  }
}

function setStatus(type, html) {
  $("dot").className        = "dot " + type;
  $("statusText").innerHTML = html;
}

function showSyncTime(iso) {
  const d    = new Date(iso);
  const mins = Math.round((Date.now() - d) / 60000);
  $("lastSyncedText").textContent =
    mins < 1  ? "Synced just now ✓" :
    mins < 60 ? `Synced ${mins}m ago` :
    `Synced ${d.toLocaleTimeString()}`;
}

function showLink(username) {
  const url = `${BACKEND}/u/${username}`;
  $("linkUrl").textContent       = url;
  $("linkSection").style.display = "block";

  $("copyBtn").onclick = () => {
    navigator.clipboard.writeText(url);
    $("copyBtn").textContent = "✅ Copied!";
    setTimeout(() => ($("copyBtn").textContent = "📋 Copy"), 2000);
  };

  $("openBtn").onclick = () => chrome.tabs.create({ url });

  $("syncBtn").onclick = async () => {
    $("syncBtn").textContent = "⏳";
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.url?.includes("neetcode.io") && profilePayload) {
      // MANUAL_PUSH — content.js will derive username from captured data itself
      chrome.tabs.sendMessage(tab.id, { type: "MANUAL_PUSH" }, (r) => {
        $("syncBtn").textContent = r?.ok ? "✅" : "⚠️";
        setTimeout(() => ($("syncBtn").textContent = "🔄 Sync"), 2000);
        if (r?.ok) showSyncTime(new Date().toISOString());
      });
    } else {
      $("syncBtn").textContent = "⚠️";
      setTimeout(() => ($("syncBtn").textContent = "🔄 Sync"), 2000);
    }
  };
}

function showError(message) {
  $("errorBox").style.display = "block";
  $("errorMsg").textContent   = message;
  $("publishHint").textContent = "";
  setStatus("err", "<strong>Username conflict</strong>");
}

function hideError() {
  $("errorBox").style.display  = "none";
  $("errorMsg").textContent    = "";
  chrome.storage.local.remove("syncError");
}

// ── Publish button ────────────────────────────────────────────────────────────
$("publishBtn").addEventListener("click", async () => {
  if (!lockedUsername || !profilePayload) return;

  hideError();
  $("publishBtn").disabled     = true;
  $("publishBtn").textContent  = "Publishing…";
  $("publishHint").textContent = "";

  const { userInfo, userStats, streakData, leaderboard } = profilePayload;

  // Load stored token for this username (undefined = new profile)
  const tokenKey   = `ownerToken_${lockedUsername}`;
  const stored     = await chrome.storage.local.get([tokenKey]);
  const ownerToken = stored[tokenKey] || undefined;

  const body = {
    username:           lockedUsername,
    ownerToken,                                   // may be undefined on first publish
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
  };

  try {
    const res  = await fetch(`${BACKEND}/api/profile`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      // Persist token if server issued one (new profile or legacy migration)
      if (json.ownerToken) {
        await chrome.storage.local.set({ [tokenKey]: json.ownerToken });
      }

      await chrome.storage.local.set({ savedUsername: lockedUsername, published: true });
      showLink(lockedUsername);
      showSyncTime(new Date().toISOString());
      $("publishBtn").textContent = "✅ Published!";

    } else if (res.status === 403) {
      // Username belongs to a different NeetCode account
      const msg = `⛔ This username is already registered by another account. ` +
                  `Your NeetCode username "${lockedUsername}" cannot be used — ` +
                  `it may already be taken. Contact support if you believe this is an error.`;
      showError(msg);
      $("publishBtn").disabled    = false;
      $("publishBtn").textContent = "🚀 Generate Public Profile";

    } else {
      // Generic server error — still show the link locally
      await chrome.storage.local.set({ savedUsername: lockedUsername, published: true });
      showLink(lockedUsername);
      $("publishBtn").textContent  = "✅ Preview Ready";
      $("publishHint").textContent = "⚠️ Sync failed — will retry on next visit.";
    }

  } catch (e) {
    // Network error — still show the link locally
    await chrome.storage.local.set({ savedUsername: lockedUsername, published: true });
    showLink(lockedUsername);
    $("publishBtn").textContent  = "✅ Preview Ready";
    $("publishHint").textContent = "⚠️ Offline — will retry on next visit.";
  }
});

init();