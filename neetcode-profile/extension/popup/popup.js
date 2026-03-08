// popup.js — NeetCode Profile Share

const BACKEND = "https://neetcard.vercel.app";
const $ = (id) => document.getElementById(id);

const log = (...args) => console.log("[NeetCode Popup]", ...args);
const err = (...args) => console.error("[NeetCode Popup]", ...args);

let profilePayload = null;

async function init() {
  log("🚀 Popup opened");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  log("📍 Current tab:", tab?.url);

  const onNeetCode = tab?.url?.includes("neetcode.io");
  if (!onNeetCode) {
    log("⚠️ Not on neetcode.io — showing warning");
    $("mainUI").style.display = "none";
    $("notOnSite").style.display = "block";
    return;
  }

  // Ask content script for live captured data
  log("📡 Asking content script for captured data...");
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "GET_CAPTURED_DATA" });
    log("📡 Content script response:", JSON.stringify(resp?.payload ? {
      hasUserInfo: !!resp.payload.userInfo,
      hasUserStats: !!resp.payload.userStats,
      hasStreakData: !!resp.payload.streakData,
      hasLeaderboard: !!resp.payload.leaderboard,
      capturedAt: resp.payload.capturedAt,
    } : null));

    if (resp?.payload) {
      profilePayload = resp.payload;
      renderProfile(profilePayload);
    } else {
      log("⚠️ Content script returned empty payload");
    }
  } catch (e) {
    err("❌ Could not reach content script:", e.message);
    err("   → Is the extension loaded? Is neetcode.io fully loaded?");
  }

  // Fall back to extension storage cache
  if (!profilePayload) {
    log("💾 Trying extension storage cache...");
    const cached = await chrome.storage.local.get(["neetcodeProfile"]);
    log("💾 Cache result:", JSON.stringify(cached.neetcodeProfile ? {
      hasUserInfo: !!cached.neetcodeProfile.userInfo,
      hasUserStats: !!cached.neetcodeProfile.userStats,
      hasStreakData: !!cached.neetcodeProfile.streakData,
      hasLeaderboard: !!cached.neetcodeProfile.leaderboard,
      capturedAt: cached.neetcodeProfile.capturedAt,
    } : "EMPTY - nothing cached yet"));

    if (cached.neetcodeProfile) {
      profilePayload = cached.neetcodeProfile;
      renderProfile(profilePayload);
    } else {
      log("⚠️ No cache found — user needs to visit neetcode.io/profile");
      setStatus("loading", "Waiting for data…");
      $("statusHint").textContent = "Visit neetcode.io/profile to capture your data.";
    }
  }

  // Restore saved username & link
  const stored = await chrome.storage.local.get(["savedUsername", "published", "lastSynced"]);
  log("💾 Stored settings:", JSON.stringify({
    savedUsername: stored.savedUsername,
    published: stored.published,
    lastSynced: stored.lastSynced,
  }));

  if (stored.savedUsername) {
    $("usernameInput").value = stored.savedUsername;
    $("publishBtn").disabled = false;
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
      log("🔄 Live update received from content script:", JSON.stringify({
        hasUserInfo: !!msg.payload.userInfo,
        hasUserStats: !!msg.payload.userStats,
        hasStreakData: !!msg.payload.streakData,
        hasLeaderboard: !!msg.payload.leaderboard,
      }));
      profilePayload = msg.payload;
      renderProfile(profilePayload);
    }
    if (msg.type === "SYNC_OK") {
      log("✅ Sync OK received, ts:", msg.ts);
      showSyncTime(msg.ts || new Date().toISOString());
    }
  });
}

function renderProfile(data) {
  log("🎨 renderProfile() called");
  const { userInfo, userStats, streakData, leaderboard } = data;

  log("   userInfo:", userInfo ? `✅ ${userInfo.displayName}` : "❌ null");
  log("   userStats:", userStats ? `✅ solved=${userStats?.problems?.NeetCode150?.completed}` : "❌ null");
  log("   streakData:", streakData ? `✅ streak=${streakData.currentStreak}` : "❌ null");
  log("   leaderboard:", leaderboard ? `✅ percentile=${leaderboard.percentile}` : "❌ null");

  const allReady = userInfo && userStats && streakData && leaderboard;
  log("   allReady:", allReady ? "✅ YES" : "⚠️ NO — some data missing");

  if (!userInfo && !userStats) {
    log("⚠️ No userInfo or userStats — showing capturing state");
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
    $("profileName").textContent = userInfo.displayName || "—";
    const year = userInfo.joined ? new Date(userInfo.joined).getFullYear() : "—";
    $("profileMeta").textContent = `${userInfo.country || ""} · Joined ${year}`;
    if (userInfo.photoURL) {
      $("avatarImg").src = userInfo.photoURL;
      $("avatarImg").style.display = "block";
      $("avatarPlaceholder").style.display = "none";
    }
  }

  if (userStats || leaderboard) {
    $("statsSection").style.display = "block";
    const solved = userStats?.problems?.NeetCode150?.completed ?? leaderboard?.userSolvedCount ?? 0;
    const pct    = leaderboard?.percentile;
    const streak = streakData?.currentStreak ?? 0;
    log(`   Displaying: solved=${solved}, percentile=${pct}, streak=${streak}`);
    $("statSolved").textContent     = solved;
    $("statPercentile").textContent = pct ? `Top ${(100 - pct).toFixed(1)}%` : "—";
    $("statStreak").textContent     = streak + " 🔥";
  }

  $("publishBtn").disabled = false;
}

function setStatus(type, html) {
  $("dot").className       = "dot " + type;
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
    log("🔄 Manual sync triggered");
    $("syncBtn").textContent = "⏳";
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    log("   Tab for sync:", tab?.url);

    if (tab?.url?.includes("neetcode.io") && profilePayload) {
      log("   Sending MANUAL_PUSH to content script, username:", username);
      chrome.tabs.sendMessage(tab.id, { type: "MANUAL_PUSH", username }, (r) => {
        log("   Manual push response:", r);
        $("syncBtn").textContent = r?.ok ? "✅" : "⚠️";
        setTimeout(() => ($("syncBtn").textContent = "🔄 Sync"), 2000);
        showSyncTime(new Date().toISOString());
      });
    } else {
      err("   ❌ Cannot sync — not on neetcode.io or no payload");
      err("   profilePayload:", !!profilePayload, "tab url:", tab?.url);
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
  log("🚀 Publish clicked, username:", username);
  log("   profilePayload exists:", !!profilePayload);

  if (!username || !profilePayload) {
    err("❌ Missing username or payload, aborting publish");
    return;
  }

  $("publishBtn").disabled     = true;
  $("publishBtn").textContent  = "Publishing…";
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

  log("📤 Sending to backend:", JSON.stringify({
    username: body.username,
    solved: body.solved,
    percentile: body.percentile,
    currentStreak: body.currentStreak,
    hasActivityByDate: !!body.activityByDate,
    activityDays: Object.keys(body.activityByDate || {}).length,
    hasCourses: !!body.courses,
  }));

  try {
    const res = await fetch(`${BACKEND}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    log("📥 Backend response status:", res.status);
    const responseText = await res.text();
    log("📥 Backend response body:", responseText);

    if (!res.ok) throw new Error(`Server error: ${res.status} ${responseText}`);

    await chrome.storage.local.set({ savedUsername: username, published: true });
    showLink(username);
    showSyncTime(new Date().toISOString());
    $("publishBtn").textContent = "✅ Published!";
    log("✅ Published successfully!");

  } catch (e) {
    err("❌ Publish failed:", e.message);
    await chrome.storage.local.set({ savedUsername: username, published: true });
    showLink(username);
    $("publishBtn").textContent  = "✅ Preview Ready";
    $("publishHint").textContent = "⚠️ Backend error: " + e.message;
  }
});

init();