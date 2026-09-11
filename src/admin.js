const LS_USER = "dh-admin-user";
const LS_KEY = "dh-admin-key";
const POLL_MS = 3000;
const RECENT_MS = 5 * 60 * 1000;

const gate = document.getElementById("gate");
const gateErr = document.getElementById("gate-err");
const userInput = document.getElementById("user-input");
const keyInput = document.getElementById("key-input");
const app = document.getElementById("app");
const statusEl = document.getElementById("status");

const q = new URLSearchParams(location.search);
// The server's default ADMIN_USER is "admin"; a key-only link (?key=...) has
// to keep working, so fall back to that instead of sending an empty user.
let user = q.get("user") || localStorage.getItem(LS_USER) || "admin";
let key = q.get("key") || localStorage.getItem(LS_KEY) || "";
if (q.get("user")) localStorage.setItem(LS_USER, q.get("user"));
if (q.get("key")) localStorage.setItem(LS_KEY, q.get("key"));

let timer = 0;

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour12: false });
}

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

const EVENT_LABEL = {
  connect: "bağlandı",
  join: "girdi",
  leave: "çıktı",
  win: "kazandı",
  lost: "başarısız",
};

function showGate(err) {
  clearTimeout(timer);
  app.hidden = true;
  gate.hidden = false;
  gateErr.textContent = err || "";
  statusEl.textContent = err ? "anahtar gerekli" : "bağlanıyor…";
  statusEl.className = err ? "err" : "";
}

function fmtGeo(geo) {
  if (!geo) return "-";
  return [geo.city, geo.country].filter(Boolean).join(", ") || "-";
}

function renderOnline(online) {
  const tbody = document.querySelector("#t-online tbody");
  tbody.innerHTML = "";
  document.getElementById("online-empty").hidden = online.length > 0;
  for (const p of online) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.drone)}</td><td class="room">${escapeHtml(p.room)}</td><td class="ip">${escapeHtml(p.ip || "-")}</td><td class="geo">${escapeHtml(fmtGeo(p.geo))}</td>`;
    tbody.appendChild(tr);
  }
  document.getElementById("c-online").textContent = String(online.length);
  document.getElementById("c-rooms").textContent = String(new Set(online.map((p) => p.room)).size);
}

function renderEvents(events) {
  const tbody = document.querySelector("#t-events tbody");
  tbody.innerHTML = "";
  document.getElementById("events-empty").hidden = events.length > 0;
  const now = Date.now();
  let joins = 0;
  let wins = 0;
  for (const e of events) {
    if (now - e.ts < RECENT_MS) {
      if (e.type === "join") joins++;
      if (e.type === "win") wins++;
    }
  }
  document.getElementById("c-joins").textContent = String(joins);
  document.getElementById("c-wins").textContent = String(wins);

  for (const e of events.slice(0, 200)) {
    const tr = document.createElement("tr");
    const roomOrOp = e.opName || e.room || "-";
    let detail = "-";
    if (e.type === "win" || e.type === "lost") detail = fmtSeconds(e.seconds);
    else if (e.type === "join") detail = e.drone || "-";
    tr.innerHTML = `<td>${fmtTime(e.ts)}</td><td class="type ev-${e.type}">${EVENT_LABEL[e.type] || e.type}</td><td>${escapeHtml(e.name || "-")}</td><td class="room">${escapeHtml(roomOrOp)}</td><td>${escapeHtml(detail)}</td><td class="ip">${escapeHtml(e.ip || "-")}</td><td class="geo">${escapeHtml(fmtGeo(e.geo))}</td>`;
    tbody.appendChild(tr);
  }
}

function fmtDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("tr-TR", { hour12: false, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function renderReport(report) {
  const ips = report?.ips || [];
  const totals = report?.totals || {};
  const tbody = document.querySelector("#t-report tbody");
  tbody.innerHTML = "";
  document.getElementById("report-empty").hidden = ips.length > 0;

  document.getElementById("r-ips").textContent = String(totals.ips || 0);
  document.getElementById("r-pilots").textContent = String(totals.pilots || 0);
  document.getElementById("r-visits").textContent = String(totals.visits || 0);
  document.getElementById("r-joins").textContent = String(totals.joins || 0);
  document.getElementById("r-wins").textContent = String(totals.wins || 0);
  document.getElementById("r-scope").textContent = totals.since
    ? `Kayıtlı olay defterinin tamamı — ${fmtDate(totals.since)} tarihinden bu yana. Defter son 2000 olayla sınırlı, daha eskisi düşer.`
    : "";

  const chips = document.getElementById("r-countries");
  chips.innerHTML = (report?.countries || [])
    .map((c) => `<b>${escapeHtml(c.country)}<i>${c.ips} IP · ${c.visits} bağlantı</i></b>`)
    .join("");

  for (const r of ips) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td class="ip">${escapeHtml(r.ip)}</td>` +
      `<td class="geo">${escapeHtml(fmtGeo(r.geo))}</td>` +
      `<td class="names">${escapeHtml(r.names.join(", ") || "-")}</td>` +
      `<td class="num">${r.visits}</td><td class="num">${r.joins}</td><td class="num">${r.wins}</td>` +
      `<td>${fmtDate(r.first)}</td><td>${fmtDate(r.last)}</td>`;
    tbody.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

async function poll() {
  try {
    const res = await fetch(`/api/admin/state?user=${encodeURIComponent(user)}&key=${encodeURIComponent(key)}`);
    if (res.status === 401) {
      localStorage.removeItem(LS_USER);
      localStorage.removeItem(LS_KEY);
      showGate("Kullanıcı adı veya parola yanlış.");
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    app.hidden = false;
    gate.hidden = true;
    statusEl.textContent = `canlı · ${new Date().toLocaleTimeString("tr-TR", { hour12: false })}`;
    statusEl.className = "live";
    renderOnline(data.online || []);
    renderEvents(data.events || []);
    renderReport(data.report);
  } catch (err) {
    statusEl.textContent = `bağlantı hatası: ${err.message}`;
    statusEl.className = "err";
  } finally {
    timer = setTimeout(poll, POLL_MS);
  }
}

document.getElementById("gate-go").addEventListener("click", () => {
  const u = userInput.value.trim() || "admin";
  const v = keyInput.value.trim();
  if (!v) {
    gateErr.textContent = "Parola gerekli.";
    return;
  }
  user = u;
  key = v;
  localStorage.setItem(LS_USER, user);
  localStorage.setItem(LS_KEY, key);
  // A poll() from before this click may still have a retry timer pending
  // (poll() always reschedules itself, even on a 401) — without clearing it
  // first, that stale timer fires later and runs alongside this fresh one,
  // doubling the polling rate for the rest of the session.
  clearTimeout(timer);
  poll();
});
userInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") keyInput.focus();
});
keyInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") document.getElementById("gate-go").click();
});

if (user && key) poll();
else showGate("");
