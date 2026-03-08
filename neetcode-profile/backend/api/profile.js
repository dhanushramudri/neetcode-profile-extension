// api/profile.js — no npm packages, uses Supabase REST API via fetch directly
//
// OWNERSHIP MODEL:
//   - `username` is always the user's real NeetCode username — read from the
//     NeetCode page by the extension. Users cannot choose or change it.
//   - On first POST (new username), a random `owner_token` is generated,
//     stored in the DB, and returned ONCE to the extension.
//   - Every subsequent POST (update) must supply that same `owner_token`.
//     Wrong / missing token → 403 "Username already taken by another user."
//   - Legacy profiles (no token yet) get a token assigned on their next sync.
//   - Username is NEVER editable — permanently tied to the NeetCode account.
//   - GET requests are always public — token is never returned.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function dbFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    ...(options.headers || {}),
  };
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
}

/** Cryptographically random 48-char hex token */
function generateToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ─── POST: create or update profile ──────────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body || {};
    const { username, ownerToken } = body;

    // Username is read directly from NeetCode by the extension — never user input.
    if (!username || !/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
      return res.status(400).json({
        error: "Invalid username",
        message: "Username must be 2–30 characters and match your NeetCode profile username.",
      });
    }

    const lowerUsername = username.toLowerCase();

    // Check whether this username already exists in DB
    const checkRes = await dbFetch(
      `profiles?username=eq.${encodeURIComponent(lowerUsername)}&limit=1`
    );
    if (!checkRes.ok) {
      const err = await checkRes.text();
      console.error("Supabase check error:", err);
      return res.status(500).json({ error: "Database error", detail: err });
    }
    const existing = await checkRes.json();

    // ── USERNAME ALREADY EXISTS IN DB ─────────────────────────────────────────
    if (existing.length > 0) {
      const storedToken = existing[0].owner_token;

      // ── LEGACY PROFILE (no token yet) — assign token on first sync ──────────
      if (!storedToken) {
        const freshToken = generateToken();
        const row = buildRow(lowerUsername, body, freshToken);

        const r = await dbFetch(
          `profiles?username=eq.${encodeURIComponent(lowerUsername)}`,
          {
            method: "PATCH",
            headers: { "Prefer": "return=minimal" },
            body: JSON.stringify(row),
          }
        );

        if (!r.ok) {
          const err = await r.text();
          console.error("Supabase legacy-update error:", err);
          return res.status(500).json({ error: "Database error", detail: err });
        }

        // Return token once so the extension can persist it
        return res.status(200).json({
          ok: true,
          username: lowerUsername,
          ownerToken: freshToken,
          message:
            "Profile claimed. Save your ownerToken — it is required for all " +
            "future updates and will not be shown again.",
        });
      }

      // ── WRONG / MISSING TOKEN — someone else's profile ───────────────────────
      if (!ownerToken || ownerToken !== storedToken) {
        return res.status(403).json({
          error: "Username already taken",
          message:
            `The username "${lowerUsername}" is already registered by another user. ` +
            "Each NeetCode username can only have one profile. " +
            "You can only create a profile for your own NeetCode username.",
          code: "USERNAME_TAKEN",
        });
      }

      // ── CORRECT TOKEN — update existing profile ───────────────────────────────
      // Username is always kept as-is — it is not updatable.
      const row = buildRow(lowerUsername, body, storedToken);

      const r = await dbFetch(
        `profiles?username=eq.${encodeURIComponent(lowerUsername)}`,
        {
          method: "PATCH",
          headers: { "Prefer": "return=minimal" },
          body: JSON.stringify(row),
        }
      );

      if (!r.ok) {
        const err = await r.text();
        console.error("Supabase update error:", err);
        return res.status(500).json({ error: "Database error", detail: err });
      }

      return res.status(200).json({ ok: true, username: lowerUsername });
    }

    // ── NEW USERNAME — create profile & generate token ────────────────────────
    const newToken = generateToken();
    const row = buildRow(lowerUsername, body, newToken);

    const r = await dbFetch("profiles", {
      method: "POST",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify(row),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Supabase insert error:", err);
      return res.status(500).json({ error: "Database error", detail: err });
    }

    // Return token ONCE — extension must save to chrome.storage.local immediately
    return res.status(200).json({
      ok: true,
      username: lowerUsername,
      ownerToken: newToken,
      message:
        "Profile created. Save your ownerToken — it is required for future " +
        "updates and will not be shown again.",
    });
  }

  // ─── GET: fetch public profile by username ────────────────────────────────────
  if (req.method === "GET") {
    const username = (req.query.username || "").toLowerCase().trim();
    if (!username) return res.status(400).json({ error: "Missing username" });

    const r = await dbFetch(
      `profiles?username=eq.${encodeURIComponent(username)}&limit=1`
    );
    if (!r.ok) return res.status(500).json({ error: "Database error" });

    const rows = await r.json();
    if (!rows.length) {
      return res.status(404).json({
        error: "Profile not found",
        message: `No profile exists for "${username}". Install the NeetCode Profile Share extension to create yours.`,
      });
    }

    const d = rows[0];
    // owner_token is NEVER included in GET responses
    return res.status(200).json({
      username:           d.username,
      displayName:        d.display_name,
      photoURL:           d.photo_url,
      country:            d.country,
      joined:             d.joined,
      solved:             d.solved,
      totalProblems:      d.total_problems,
      percentile:         d.percentile,
      currentStreak:      d.current_streak,
      maxStreak:          d.max_streak,
      activityByDate:     d.activity_by_date,
      leaderboardBuckets: d.leaderboard_buckets,
      totalActiveUsers:   d.total_active_users,
      courses:            d.courses,
      problems:           d.problems,
      updatedAt:          d.updated_at,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ─── Helper: build a DB row from request body ──────────────────────────────────
// `username` is always passed explicitly — never read from body — so it
// cannot be changed via the request payload.
function buildRow(username, body, ownerToken) {
  return {
    username,                                          // immutable — always the NeetCode username
    owner_token:         ownerToken,
    display_name:        body.displayName        ?? null,
    photo_url:           body.photoURL           ?? null,
    country:             body.country            ?? null,
    joined:              body.joined             ?? null,
    solved:              body.solved             ?? 0,
    total_problems:      body.totalProblems      ?? 533,
    percentile:          body.percentile         ?? null,
    current_streak:      body.currentStreak      ?? 0,
    max_streak:          body.maxStreak          ?? 0,
    activity_by_date:    body.activityByDate     ?? {},
    leaderboard_buckets: body.leaderboardBuckets ?? [],
    total_active_users:  body.totalActiveUsers   ?? null,
    courses:             body.courses            ?? {},
    problems:            body.problems           ?? {},
    updated_at:          new Date().toISOString(),
  };
}