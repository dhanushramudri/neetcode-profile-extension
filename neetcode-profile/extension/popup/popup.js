// popup.js — NeetCode Profile Share (production)

const BACKEND = "https://neetcard.vercel.app";
const $ = (id) => document.getElementById(id);

let profilePayload = null;

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

  // Restore saved username, link, and last sync time
  const stored = await chrome.storage.local.get(["savedUsername", "published", "lastSynced"]);

  if (stored.savedUsername) {
    $("usernameInput").value  = stored.savedUsername;
    $("publishBtn").disabled  = false;
  }
  if (stored.published && stored.savedUsername) {
    showLink(stored.savedUsername);
  }
  if (stored.lastSynced) {
    showSyncTime(stored.lastSynced);
  }

  // Listen for live updates from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "DATA_UPDATE" && msg.payload) {
      profilePayload = msg.payload;
      renderProfile(profilePayload);
    }
    if (msg.type === "SYNC_OK") {
      showSyncTime(msg.ts || new Date().toISOString());
    }
  });
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

  if (userInfo) {
    $("profileSection").style.display = "block";
    $("profileName").textContent      = userInfo.displayName || "—";
    const year = userInfo.joined ? new Date(userInfo.joined).getFullYear() : "—";
    $("profileMeta").textContent = `${userInfo.country || ""} · Joined ${year}`;
    if (userInfo.photoURL) {
      $("avatarImg").src                    = userInfo.photoURL;
      $("avatarImg").style.display          = "block";
      $("avatarPlaceholder").style.display  = "none";
    }
  }

  if (userStats || leaderboard) {
    $("statsSection").style.display     = "block";
    const solved  = userStats?.problems?.NeetCode150?.completed ?? leaderboard?.userSolvedCount ?? 0;
    const pct     = leaderboard?.percentile;
    const streak  = streakData?.currentStreak ?? 0;
    $("statSolved").textContent     = solved;
    $("statPercentile").textContent = pct ? `Top ${(100 - pct).toFixed(1)}%` : "—";
    $("statStreak").textContent     = streak + " 🔥";
  }

  // Auto-populate username from displayName if not already saved
  chrome.storage.local.get(["savedUsername"], (stored) => {
    if (!stored.savedUsername && userInfo?.displayName) {
      const suggested = userInfo.displayName
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 30);
      if (suggested.length >= 2) {
        $("usernameInput").value = suggested;
        $("publishBtn").disabled = false;
      }
    }
  });

  $("publishBtn").disabled = false;
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
      chrome.tabs.sendMessage(tab.id, { type: "MANUAL_PUSH", username }, (r) => {
        $("syncBtn").textContent = r?.ok ? "✅" : "⚠️";
        setTimeout(() => ($("syncBtn").textContent = "🔄 Sync"), 2000);
        showSyncTime(new Date().toISOString());
      });
    } else {
      $("syncBtn").textContent = "⚠️";
      setTimeout(() => ($("syncBtn").textContent = "🔄 Sync"), 2000);
    }
  };
}

$("usernameInput").addEventListener("input", () => {
  const v = $("usernameInput").value.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
  $("usernameInput").value = v;
  $("publishBtn").disabled = v.length < 2 || !profilePayload;
});

$("publishBtn").addEventListener("click", async () => {
  const username = $("usernameInput").value.trim();
  if (!username || !profilePayload) return;

  $("publishBtn").disabled    = true;
  $("publishBtn").textContent = "Publishing…";
  $("publishHint").textContent = "";

  const { userInfo, userStats, streakData, leaderboard } = profilePayload;

  const body = {
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
  };

  try {
    const res = await fetch(`${BACKEND}/api/profile`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`${res.status}`);

    await chrome.storage.local.set({ savedUsername: username, published: true });
    showLink(username);
    showSyncTime(new Date().toISOString());
    $("publishBtn").textContent = "✅ Published!";

  } catch (e) {
    // Still save locally and show link even if backend is unreachable
    await chrome.storage.local.set({ savedUsername: username, published: true });
    showLink(username);
    $("publishBtn").textContent  = "✅ Preview Ready";
    $("publishHint").textContent = "⚠️ Sync failed — will retry on next visit.";
  }
});

init();