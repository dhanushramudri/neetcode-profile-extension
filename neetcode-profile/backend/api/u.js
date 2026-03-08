// api/u.js — serves the public profile page for /u/:username
export default async function handler(req, res) {
  const username = req.query.username || "";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>@${username} — NeetCode Profile</title>
<meta property="og:title" content="@${username} — NeetCode Profile"/>
<meta property="og:description" content="Check out my NeetCode progress!"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --bg:#0f1117; --bg2:#141720; --bg3:#1a1f35; --border:#1e2235;
  --text:#e8eaf0; --text2:#8890b0; --text3:#4a5070;
  --green:#00d4aa; --blue:#627eff; --orange:#f5a623; --red:#f87171;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh}
.page{max-width:860px;margin:0 auto;padding:32px 20px 64px}
.banner{background:linear-gradient(135deg,#0d1226 0%,#141720 60%);border:1px solid var(--border);border-radius:16px;padding:28px 32px;display:flex;align-items:center;gap:24px;margin-bottom:20px;position:relative;overflow:hidden}
.banner::before{content:'';position:absolute;top:-80px;right:-80px;width:240px;height:240px;background:radial-gradient(circle,#627eff14 0%,transparent 70%);pointer-events:none}
.avatar{width:80px;height:80px;border-radius:50%;border:3px solid var(--border);object-fit:cover;flex-shrink:0}
.avatar-placeholder{width:80px;height:80px;border-radius:50%;background:var(--bg3);border:3px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:34px;flex-shrink:0}
.banner-info{flex:1}
.banner-name{font-size:26px;font-weight:700;color:#fff}
.banner-meta{display:flex;gap:16px;margin-top:8px;flex-wrap:wrap}
.meta-chip{font-size:12px;color:var(--text2);display:flex;align-items:center;gap:5px}
.banner-right{text-align:right;flex-shrink:0}
.top-pct{font-family:'IBM Plex Mono',monospace;font-size:34px;font-weight:700;color:var(--green)}
.top-label{font-size:12px;color:var(--text3);margin-top:2px}
.sec-label{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);font-weight:600;margin-bottom:12px}
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px 12px;text-align:center}
.stat-val{font-family:'IBM Plex Mono',monospace;font-size:26px;font-weight:700;line-height:1}
.stat-val.green{color:var(--green)}.stat-val.blue{color:var(--blue)}.stat-val.orange{color:var(--orange)}.stat-val.red{color:var(--red)}
.stat-lbl{font-size:11px;color:var(--text3);margin-top:6px}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px}
.progress-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.progress-title{font-size:15px;font-weight:600}
.progress-count{font-family:'IBM Plex Mono',monospace;font-size:14px;color:var(--text2)}
.progress-bar{height:10px;background:var(--border);border-radius:5px;overflow:hidden;margin-bottom:8px}
.progress-fill{height:100%;border-radius:5px;background:linear-gradient(90deg,var(--green),var(--blue));transition:width 1s ease}
.progress-sub{font-size:12px;color:var(--text3)}
.dist-bars{display:flex;gap:8px;align-items:flex-end;height:80px;margin:14px 0 8px}
.dist-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.dist-bar{width:100%;border-radius:4px 4px 0 0;background:var(--bg3);min-height:4px}
.dist-bar.me{background:linear-gradient(180deg,var(--blue),var(--green))}
.dist-pct{font-size:9px;color:var(--text3)}.dist-lbl{font-size:9px;color:var(--text3);white-space:nowrap}

/* ── Heatmap ── */
.heatmap-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px}
.year-filter{display:flex;gap:6px;flex-wrap:wrap}
.year-btn{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:var(--bg3);color:var(--text3);cursor:pointer;transition:all 0.15s ease;letter-spacing:0.5px}
.year-btn:hover{border-color:var(--blue);color:var(--blue)}
.year-btn.active{background:var(--blue);border-color:var(--blue);color:#fff}
.heatmap-wrap{overflow-x:auto}
.heatmap-months{display:flex;gap:3px;margin-bottom:4px}
.month-lbl{font-size:9px;color:var(--text3);flex:1}
.heatmap-grid{display:flex;gap:3px}
.heatmap-week{display:flex;flex-direction:column;gap:3px}
.cell{width:12px;height:12px;border-radius:2px;background:var(--border);cursor:default}
.cell[data-l="1"]{background:#033a16}.cell[data-l="2"]{background:#196c2e}.cell[data-l="3"]{background:#2ea043}.cell[data-l="4"]{background:#56d364}
.heatmap-footer{display:flex;justify-content:space-between;margin-top:8px;align-items:center}
.heatmap-footer span{font-size:11px;color:var(--text3)}
.year-stats{display:flex;gap:20px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}
.year-stat-val{font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:700;color:var(--green)}
.year-stat-lbl{font-size:10px;color:var(--text3);margin-top:2px}

/* ── Smart tooltip ── */
#hm-tip{position:fixed;background:#1a1f35;border:1px solid var(--border);color:var(--text);font-size:11px;font-family:'Inter',sans-serif;padding:5px 10px;border-radius:7px;white-space:nowrap;pointer-events:none;z-index:9999;opacity:0;transition:opacity 0.1s ease;box-shadow:0 4px 16px rgba(0,0,0,0.4)}

.courses-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.course-card{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.course-name{font-size:13px;font-weight:500;margin-bottom:8px}
.course-bar{height:5px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:5px}
.course-fill{height:100%;border-radius:3px;background:var(--blue)}
.course-fill.done{background:var(--green)}
.course-prog{font-size:11px;color:var(--text3)}
.share-footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid var(--border)}
.share-footer p{font-size:12px;color:var(--text3)}
.share-footer a{color:var(--blue);text-decoration:none}
.center-page{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:70vh;gap:16px;text-align:center}
.error-code{font-family:'IBM Plex Mono',monospace;font-size:64px;font-weight:700;color:var(--border)}
.error-msg{font-size:20px;color:var(--text2)}
.spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:600px){.stats-row{grid-template-columns:repeat(2,1fr)}.courses-grid{grid-template-columns:1fr}.banner{flex-direction:column;text-align:center}.banner-meta{justify-content:center}.banner-right{text-align:center}.heatmap-header{flex-direction:column;align-items:flex-start}}
</style>
</head>
<body>
<div class="page" id="root">
  <div class="center-page"><div class="spinner"></div></div>
</div>
<div id="hm-tip"></div>
<script>
const BACKEND = "https://neetcode-profile-extension.vercel.app";
const USERNAME = "${username}";

// ── Global heatmap state ──────────────────────────────────────────────────
let _activity = {};
let _selectedYear = null;

async function loadProfile() {
  if (!USERNAME) { renderError("404","Profile not found","No username in URL."); return; }
  document.title = "@" + USERNAME + " \u2014 NeetCode Profile";
  let data;
  try {
    const res = await fetch(BACKEND + "/api/profile/" + USERNAME);
    if (!res.ok) throw new Error("not found");
    data = await res.json();
  } catch {
    renderError("404","Profile not found","This profile doesn't exist yet. Install the NeetCode Profile Share extension to create yours!");
    return;
  }
  render(data);
}

function render(d) {
  const topPct = d.percentile ? (100 - d.percentile).toFixed(1) : null;
  const pct150 = Math.min(100, Math.round((d.solved / 150) * 100));
  const pctTotal = Math.min(100, Math.round((d.solved / (d.totalProblems || 533)) * 100));
  const joinYear = d.joined ? new Date(d.joined).getFullYear() : "\u2014";
  const ago = d.updatedAt ? timeAgo(new Date(d.updatedAt)) : "";

  _activity = d.activityByDate || {};
  const allYears = getYears(_activity);
  _selectedYear = allYears[allYears.length - 1] ?? new Date().getFullYear();

  document.getElementById("root").innerHTML = \`
    <div class="banner">
      \${d.photoURL ? \`<img class="avatar" src="\${esc(d.photoURL)}" onerror="this.style.display='none'">\` : \`<div class="avatar-placeholder">👤</div>\`}
      <div class="banner-info">
        <div class="banner-name">\${esc(d.displayName || d.username)}</div>
        <div class="banner-meta">
          <span class="meta-chip">👤 @\${esc(d.username)}</span>
          \${d.country ? \`<span class="meta-chip">🌍 \${esc(d.country)}</span>\` : ""}
          <span class="meta-chip">📅 Joined \${joinYear}</span>
          \${d.totalActiveUsers ? \`<span class="meta-chip">👥 Top \${topPct}% of \${fmt(d.totalActiveUsers)} users</span>\` : ""}
        </div>
      </div>
      \${topPct ? \`<div class="banner-right"><div class="top-pct">Top \${topPct}%</div><div class="top-label">Global Percentile</div></div>\` : ""}
    </div>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-val green">\${d.solved}</div><div class="stat-lbl">Problems Solved</div></div>
      <div class="stat-card"><div class="stat-val blue">\${topPct ? "Top "+topPct+"%" : "\u2014"}</div><div class="stat-lbl">Global Rank</div></div>
      <div class="stat-card"><div class="stat-val orange">\${(d.currentStreak??0)} 🔥</div><div class="stat-lbl">Current Streak</div></div>
      <div class="stat-card"><div class="stat-val red">\${d.maxStreak??0}</div><div class="stat-lbl">Max Streak</div></div>
    </div>
    <div class="card">
      <div class="progress-header">
        <div><div class="sec-label" style="margin-bottom:4px">NeetCode Practice</div><div class="progress-title">Overall Progress</div></div>
        <div class="progress-count">\${d.solved} / \${d.totalProblems??533}</div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:\${pctTotal}%"></div></div>
      <div class="progress-sub">\${pct150}% of NeetCode 150 complete · \${Math.max(0,150-d.solved)} problems to go</div>
    </div>
    \${d.leaderboardBuckets?.length ? renderDist(d.leaderboardBuckets) : ""}
    \${Object.keys(_activity).length ? renderHeatmapCard(allYears) : ""}
    \${d.courses && Object.keys(d.courses).length ? renderCourses(d.courses) : ""}
    <div class="share-footer"><p>Generated by <a href="https://github.com" target="_blank">NeetCode Profile Share</a> · Unofficial · Updated \${ago}</p></div>
  \`;

  attachYearListeners();
}

// ── Year helpers ──────────────────────────────────────────────────────────
function getYears(activity) {
  const s = new Set(Object.keys(activity).map(k => parseInt(k.slice(0,4))));
  s.add(new Date().getFullYear());
  return Array.from(s).sort();
}
function activeDays(activity, year) {
  return Object.keys(activity).filter(k => k.startsWith(String(year))).length;
}
function totalSubs(activity, year) {
  return Object.entries(activity).filter(([k]) => k.startsWith(String(year))).reduce((s,[,v]) => s + (v.count||0), 0);
}
function bestDay(activity, year) {
  let best = 0;
  Object.entries(activity).forEach(([k,v]) => { if(k.startsWith(String(year))) best = Math.max(best, v.count||0); });
  return best;
}

// ── Heatmap card (with year filter) ──────────────────────────────────────
function renderHeatmapCard(allYears) {
  const yearBtns = allYears.map(y =>
    \`<button class="year-btn \${y===_selectedYear?"active":""}" data-year="\${y}">\${y}</button>\`
  ).join("");
  return \`
    <div class="card">
      <div class="heatmap-header">
        <div class="sec-label" style="margin-bottom:0">Submission Activity</div>
        <div class="year-filter">\${yearBtns}</div>
      </div>
      <div id="hm-grid">\${renderHeatmapGrid(_activity, _selectedYear)}</div>
      <div class="year-stats">
        <div class="year-stat">
          <div class="year-stat-val" id="ys-days">\${activeDays(_activity,_selectedYear)}</div>
          <div class="year-stat-lbl">Active Days</div>
        </div>
        <div class="year-stat">
          <div class="year-stat-val" id="ys-subs">\${totalSubs(_activity,_selectedYear)}</div>
          <div class="year-stat-lbl">Total Submissions</div>
        </div>
        <div class="year-stat">
          <div class="year-stat-val" id="ys-best">\${bestDay(_activity,_selectedYear)}</div>
          <div class="year-stat-lbl">Best Day</div>
        </div>
      </div>
    </div>\`;
}

function renderHeatmapGrid(activity, year) {
  const isCur = year === new Date().getFullYear();
  const today = new Date(); today.setHours(0,0,0,0);
  let start, end;
  if (isCur) {
    end = new Date(today);
    start = new Date(today);
    start.setDate(start.getDate() - 364 - start.getDay());
  } else {
    start = new Date(year, 0, 1);
    start.setDate(start.getDate() - start.getDay());
    end = new Date(year, 11, 31);
  }

  const weeks = [], cur = new Date(start);
  while (cur <= end) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const key = cur.toISOString().slice(0,10);
      const inRange = isCur ? cur <= today : parseInt(key.slice(0,4)) === year;
      const count = inRange ? (activity[key]?.count ?? 0) : 0;
      const level = count===0?0:count<=3?1:count<=10?2:count<=20?3:4;
      const hide = isCur ? cur > today : parseInt(key.slice(0,4)) !== year;
      week.push({ key, count, level, hide });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let lastM = -1;
  const ml = weeks.map(w => {
    const m = new Date(w[0].key).getMonth();
    if (m !== lastM) { lastM = m; return \`<span class="month-lbl">\${MONTHS[m]}</span>\`; }
    return \`<span class="month-lbl"></span>\`;
  }).join("");

  const grid = weeks.map(w =>
    \`<div class="heatmap-week">\${w.map(c =>
      c.hide
        ? \`<div class="cell" style="background:transparent"></div>\`
        : \`<div class="cell" data-l="\${c.level}" data-tip="\${c.count} submissions on \${c.key}"></div>\`
    ).join("")}</div>\`
  ).join("");

  return \`
    <div class="heatmap-wrap">
      <div class="heatmap-months">\${ml}</div>
      <div class="heatmap-grid">\${grid}</div>
    </div>
    <div class="heatmap-footer">
      <span>Less</span>
      <span style="display:flex;gap:3px;align-items:center">
        \${["var(--border)","#033a16","#196c2e","#2ea043","#56d364"].map(c=>\`<span style="width:12px;height:12px;border-radius:2px;background:\${c};display:inline-block"></span>\`).join("")}
      </span>
      <span>More</span>
    </div>\`;
}

function attachYearListeners() {
  document.querySelectorAll(".year-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      _selectedYear = parseInt(btn.dataset.year);
      document.querySelectorAll(".year-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("hm-grid").innerHTML = renderHeatmapGrid(_activity, _selectedYear);
      document.getElementById("ys-days").textContent = activeDays(_activity, _selectedYear);
      document.getElementById("ys-subs").textContent = totalSubs(_activity, _selectedYear);
      document.getElementById("ys-best").textContent = bestDay(_activity, _selectedYear);
    });
  });
}

// ── Smart tooltip ─────────────────────────────────────────────────────────
(function() {
  const tip = document.getElementById("hm-tip");
  const M = 10;
  document.addEventListener("mouseover", e => {
    const c = e.target.closest(".cell[data-tip]");
    if (!c) return;
    tip.textContent = c.dataset.tip;
    tip.style.opacity = "1";
  });
  document.addEventListener("mousemove", e => {
    const c = e.target.closest(".cell[data-tip]");
    if (!c) { tip.style.opacity = "0"; return; }
    const tw = tip.offsetWidth, th = tip.offsetHeight, vw = window.innerWidth;
    let x = e.clientX - tw/2, y = e.clientY - th - M;
    if (y < M) y = e.clientY + M + 16;
    if (x < M) x = M;
    if (x + tw > vw - M) x = vw - tw - M;
    tip.style.left = x + "px";
    tip.style.top  = y + "px";
  });
  document.addEventListener("mouseout", e => {
    if (e.target.closest(".cell[data-tip]")) tip.style.opacity = "0";
  });
})();

// ── Other renderers ───────────────────────────────────────────────────────
function renderDist(buckets) {
  const max = Math.max(...buckets.map(b=>b.percentage));
  const bars = buckets.map(b=>\`<div class="dist-col"><div class="dist-pct">\${b.percentage.toFixed(1)}%</div><div class="dist-bar \${b.isUserBucket?"me":""}" style="height:\${Math.round((b.percentage/max)*68)}px"></div><div class="dist-lbl">\${b.label}</div></div>\`).join("");
  return \`<div class="card"><div class="sec-label">Leaderboard Distribution</div><div style="font-size:12px;color:var(--text2)">Your bucket highlighted</div><div class="dist-bars">\${bars}</div></div>\`;
}

function renderCourses(courses) {
  const cards = Object.values(courses).map(c => {
    const pct = c.total>0 ? Math.round((c.completed/c.total)*100) : 0;
    return \`<div class="course-card"><div class="course-name">\${esc(c.name)}</div><div class="course-bar"><div class="course-fill \${pct===100?"done":""}" style="width:\${pct}%"></div></div><div class="course-prog">\${c.completed}/\${c.total} · \${pct}%</div></div>\`;
  }).join("");
  return \`<div class="card"><div class="sec-label">Course Progress</div><div class="courses-grid">\${cards}</div></div>\`;
}

function renderError(code,msg,sub){document.getElementById("root").innerHTML=\`<div class="center-page"><div class="error-code">\${code}</div><div class="error-msg">\${msg}</div><div style="font-size:14px;color:var(--text3);max-width:400px;line-height:1.6">\${sub}</div></div>\`;}
function esc(s){const d=document.createElement("div");d.textContent=String(s??"");return d.innerHTML;}
function fmt(n){return n?.toLocaleString()??n;}
function timeAgo(d){const s=Math.round((Date.now()-d)/1000);if(s<60)return"just now";if(s<3600)return Math.round(s/60)+"m ago";if(s<86400)return Math.round(s/3600)+"h ago";return Math.round(s/86400)+"d ago";}

loadProfile();
</script>
</body>
</html>`);
}