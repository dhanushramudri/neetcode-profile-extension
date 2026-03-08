// backend/api/profile.js — Vercel serverless function
// POST /api/profile         → save / upsert profile
// GET  /api/profile?username=x → fetch profile

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS — allow the extension and public to access this
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── POST: save/update profile ─────────────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body || {};
    const { username } = body;

    if (!username || !/^[a-z0-9_-]{2,30}$/.test(username)) {
      return res.status(400).json({ error: "Invalid username (2-30 chars, a-z 0-9 _ -)" });
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
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
        },
        { onConflict: "username" }
      );

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({ error: "Database error" });
    }

    return res.status(200).json({ ok: true, username: username.toLowerCase() });
  }

  // ── GET: fetch profile ────────────────────────────────────────────────────
  if (req.method === "GET") {
    const username = (req.query.username || "").toLowerCase();
    if (!username) return res.status(400).json({ error: "Missing username" });

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.status(200).json({
      username:           data.username,
      displayName:        data.display_name,
      photoURL:           data.photo_url,
      country:            data.country,
      joined:             data.joined,
      solved:             data.solved,
      totalProblems:      data.total_problems,
      percentile:         data.percentile,
      currentStreak:      data.current_streak,
      maxStreak:          data.max_streak,
      activityByDate:     data.activity_by_date,
      leaderboardBuckets: data.leaderboard_buckets,
      totalActiveUsers:   data.total_active_users,
      courses:            data.courses,
      problems:           data.problems,
      updatedAt:          data.updated_at,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}