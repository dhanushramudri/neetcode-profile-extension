// api/u.js — serves the public profile page for /u/:username
// This avoids static file routing issues with Vercel

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
.heatmap-wrap{overflow-x:auto}
.heatmap-months{display:flex;gap:3px;margin-bottom:4px}
.month-lbl{font-size:9px;color:var(--text3);flex:1}
.heatmap-grid{display:flex;gap:3px}
.heatmap-week{display:flex;flex-direction:column;gap:3px}
.cell{width:12px;height:12px;border-radius:2px;background:var(--border);cursor:default;position:relative}
.cell[data-l="1"]{background:#033a16}.cell[data-l="2"]{background:#196c2e}.cell[data-l="3"]{background:#2ea043}.cell[data-l="4"]{background:#56d364}
.cell:hover::after{content:attr(data-tip);position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:#1a1f35;border:1px solid var(--border);color:var(--text);font-size:10px;padding:4px 8px;border-radius:6px;white-space:nowrap;pointer-events:none;z-index:10;font-family:'Inter',sans-serif}
.heatmap-footer{display:flex;justify-content:space-between;margin-top:8px}
.heatmap-footer span{font-size:11px;color:var(--text3)}
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
@media(max-width:600px){.stats-row{grid-template-columns:repeat(2,1fr)}.courses-grid{grid-template-columns:1fr}.banner{flex-direction:column;text-align:center}.banner-meta{justify-content:center}.banner-right{text-align:center}}
</style>
</head>
<body>
<div class="page" id="root">
  <div class="center-page"><div class="spinner"></div></div>
</div>
<script>
const BACKEND = "https://neetcode-profile-extension.vercel.app";
const USERNAME = "${username}";

async function loadProfile() {
  if (!USERNAME) { renderError("404","Profile not found","No username in URL."); return; }
  document.title = "@" + USERNAME + " — NeetCode Profile";
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
  const joinYear = d.joined ? new Date(d.joined).getFullYear() : "—";
  const ago = d.updatedAt ? timeAgo(new Date(d.updatedAt)) : "";
  const activeDays = d.activityByDate ? Object.keys(d.activityByDate).length : 0;

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
      <div class="stat-card"><div class="stat-val blue">\${topPct ? "Top "+topPct+"%" : "—"}</div><div class="stat-lbl">Global Rank</div></div>
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
    \${d.activityByDate ? renderHeatmap(d.activityByDate, activeDays) : ""}
    \${d.courses && Object.keys(d.courses).length ? renderCourses(d.courses) : ""}
    <div class="share-footer"><p>Generated by <a href="https://github.com" target="_blank">NeetCode Profile Share</a> · Unofficial · Updated \${ago}</p></div>
  \`;
}

function renderDist(buckets) {
  const max = Math.max(...buckets.map(b=>b.percentage));
  const bars = buckets.map(b=>\`<div class="dist-col"><div class="dist-pct">\${b.percentage.toFixed(1)}%</div><div class="dist-bar \${b.isUserBucket?"me":""}" style="height:\${Math.round((b.percentage/max)*68)}px"></div><div class="dist-lbl">\${b.label}</div></div>\`).join("");
  return \`<div class="card"><div class="sec-label">Leaderboard Distribution</div><div style="font-size:12px;color:var(--text2)">Your bucket highlighted</div><div class="dist-bars">\${bars}</div></div>\`;
}

function renderHeatmap(activityByDate, activeDays) {
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(today); start.setDate(start.getDate()-364-start.getDay());
  const weeks=[]; const cur=new Date(start);
  while(cur<=today){const week=[];for(let d=0;d<7;d++){const key=cur.toISOString().slice(0,10);const count=activityByDate[key]?.count??0;const level=count===0?0:count<=3?1:count<=10?2:count<=20?3:4;week.push({key,count,level,future:cur>today});cur.setDate(cur.getDate()+1);}weeks.push(week);}
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];let lastM=-1;
  const ml=weeks.map(w=>{const m=w[0].date?.getMonth()??new Date(w[0].key).getMonth();if(m!==lastM){lastM=m;return \`<span class="month-lbl">\${MONTHS[m]}</span>\`;}return \`<span class="month-lbl"></span>\`;}).join("");
  const grid=weeks.map(w=>\`<div class="heatmap-week">\${w.map(c=>c.future?\`<div class="cell" style="background:transparent"></div>\`:\`<div class="cell" data-l="\${c.level}" data-tip="\${c.count} submissions on \${c.key}"></div>\`).join("")}</div>\`).join("");
  return \`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div class="sec-label" style="margin-bottom:0">Submission Activity</div><div style="font-size:12px;color:var(--text3)">\${activeDays} active days</div></div><div class="heatmap-wrap"><div class="heatmap-months">\${ml}</div><div class="heatmap-grid">\${grid}</div></div><div class="heatmap-footer"><span>Less</span><span style="display:flex;gap:3px">\${[0,1,2,3,4].map(l=>\`<span style="width:12px;height:12px;border-radius:2px;background:\${["var(--border)","#033a16","#196c2e","#2ea043","#56d364"][l]};display:inline-block"></span>\`).join("")}</span><span>More</span></div></div>\`;
}

function renderCourses(courses) {
  const cards=Object.values(courses).map(c=>{const pct=c.total>0?Math.round((c.completed/c.total)*100):0;return \`<div class="course-card"><div class="course-name">\${esc(c.name)}</div><div class="course-bar"><div class="course-fill \${pct===100?"done":""}" style="width:\${pct}%"></div></div><div class="course-prog">\${c.completed}/\${c.total} · \${pct}%</div></div>\`;}).join("");
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