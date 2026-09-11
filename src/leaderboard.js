import { OPS, trackOf } from "./missions.js";
import { dailyId, dailyOp, isDailyId, dailyLabel, sortBoards } from "./daily.js";

const POLL_MS = 10000;
const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");

// Track order, then rung order — same as the hangar's op panel.
const ORDER = OPS.map((o) => o.id);
const BLURB = Object.fromEntries(OPS.map((o) => [o.id, `${trackOf(o.id)?.name || ""} · ${o.blurb}`]));
const NAME = Object.fromEntries(OPS.map((o) => [o.id, o.name]));

function fmtSeconds(s) {
  // Round to one decimal FIRST — rounding 59.96s to "60.0" after the mod
  // would print "1:60.0" instead of carrying into the next minute.
  const t = Math.max(0, Math.round((Number(s) || 0) * 10) / 10);
  let m = Math.floor(t / 60);
  let sec = t - m * 60;
  if (sec >= 60) {
    sec -= 60;
    m += 1;
  }
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function renderOp(op) {
  const card = document.createElement("div");
  card.className = "op";
  const laps = op.entries.some((e) => e.bestLap != null);
  const rows = op.entries
    .map(
      (e, i) =>
        `<tr><td class="rank">${i + 1}</td><td>${escapeHtml(e.name)}</td><td class="time">${fmtSeconds(e.seconds)}</td>${
          laps ? `<td class="time lap">${e.bestLap != null ? fmtSeconds(e.bestLap) : "—"}</td>` : ""
        }</tr>`,
    )
    .join("");
  const daily = isDailyId(op.opId);
  const name = NAME[op.opId] || (daily ? `Günün görevi · ${dailyLabel(op.opId, { year: true })}` : op.opName);
  const blurb = BLURB[op.opId] || (daily ? dailyOp(op.opId)?.blurb || "" : "");
  const runs = `${op.runs} koşu${op.opId === dailyId() ? " · bugün" : ""}`;
  card.innerHTML = `
    <h2>${escapeHtml(name)}<span class="runs">${escapeHtml(runs)}</span></h2>
    <p class="blurb">${escapeHtml(blurb)}</p>
    ${
      op.entries.length
        ? `<table><thead><tr><th>#</th><th>Pilot</th><th>Süre</th>${laps ? "<th>En iyi tur</th>" : ""}</tr></thead><tbody>${rows}</tbody></table>`
        : `<p class="empty">Henüz kayıt yok.</p>`
    }
  `;
  return card;
}

async function poll() {
  try {
    const res = await fetch("/api/leaderboard");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Today's daily on top, then the campaign rungs, then the last few dailies.
    const ops = sortBoards(data.ops || [], ORDER);
    gridEl.innerHTML = "";
    if (!ops.length) {
      gridEl.innerHTML = `<p class="empty">Henüz hiç görev tamamlanmadı.</p>`;
    } else {
      for (const op of ops) gridEl.appendChild(renderOp(op));
    }
    statusEl.textContent = `güncel · ${new Date().toLocaleTimeString("tr-TR", { hour12: false })}`;
    statusEl.className = "live";
  } catch (err) {
    statusEl.textContent = `bağlantı hatası: ${err.message}`;
    statusEl.className = "err";
  } finally {
    setTimeout(poll, POLL_MS);
  }
}

poll();
