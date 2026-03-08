// api/profile.js — no npm packages, uses Supabase REST API via fetch directly
//
// OWNERSHIP MODEL:
//   - On first POST (new username), a random `owner_token` is generated and
//     stored in the DB. It is returned ONCE to the caller.
//   - Every subsequent POST (update) must supply that same `owner_token` in
//     the request body, otherwise the update is rejected with 403.
//   - GET requests are always public — no token needed.
//   - This prevents any other user from claiming or overwriting an existing
//     username without knowing its secret token.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function dbFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    ...(options.headers || {}),
  };
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers,
  });
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

  // ─── POST: create or update profile ────────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body || {};
    const { username, ownerToken } = body;

    // Validate username format
    if (!username || !/^[a-z0-9_-]{2,30}$/.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }

    const lowerUsername = username.toLowerCase();

    // Check whether this username already exists
    const checkRes = await dbFetch(
      `profiles?username=eq.${encodeURIComponent(lowerUsername)}&limit=1`
    );
    if (!checkRes.ok) {
      const err = await checkRes.text();
      console.error("Supabase check error:", err);
      return res.status(500).json({ error: "Database error", detail: err });
    }
    const existing = await checkRes.json();

    // ── USERNAME ALREADY TAKEN ──────────────────────────────────────────────
    if (existing.length > 0) {
      const storedToken = existing[0].owner_token;

      // Require the correct owner token to update
      if (!ownerToken || ownerToken !== storedToken) {
        return res.status(403).json({
          error: "Username already taken",
          message:
            "This username is already registered. " +
            "Supply the correct ownerToken to update your own profile.",
        });
      }

      // Token matches — allow update (owner_token stays the same, never rotated)
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

      // On updates we do NOT return the token again (owner already has it)
      return res.status(200).json({ ok: true, username: lowerUsername });
    }

    // ── NEW USERNAME — create profile & generate token ──────────────────────
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

    // Return the token ONCE — the extension must persist this locally
    return res.status(200).json({
      ok: true,
      username: lowerUsername,
      ownerToken: newToken,
      message:
        "Profile created. Save your ownerToken — it is required for future updates " +
        "and will not be shown again.",
    });
  }

  // ─── GET: fetch public profile by username ──────────────────────────────────
  if (req.method === "GET") {
    const username = (req.query.username || "").toLowerCase();
    if (!username) return res.status(400).json({ error: "Missing username" });

    const r = await dbFetch(
      `profiles?username=eq.${encodeURIComponent(username)}&limit=1`
    );
    if (!r.ok) return res.status(500).json({ error: "Database error" });

    const rows = await r.json();
    if (!rows.length) return res.status(404).json({ error: "Profile not found" });

    const d = rows[0];
    // IMPORTANT: owner_token is NEVER returned in GET responses
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

// ─── Helper: build a DB row from request body ─────────────────────────────────
function buildRow(username, body, ownerToken) {
  return {
    username,
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