// api/profile.js — no npm packages, uses Supabase REST API via fetch directly

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function dbFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      ...(options.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // POST: save/update profile
  if (req.method === "POST") {
    const body = req.body || {};
    const { username } = body;

    if (!username || !/^[a-z0-9_-]{2,30}$/.test(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }

    const row = {
      username:            username.toLowerCase(),
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

    const r = await dbFetch("profiles", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify(row),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Supabase error:", err);
      return res.status(500).json({ error: "Database error", detail: err });
    }

    return res.status(200).json({ ok: true, username: username.toLowerCase() });
  }

  // GET: fetch profile by username
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