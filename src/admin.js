const POLL_MS = 3000;
const RECENT_MS = 5 * 60 * 1000;

const gate = document.getElementById("gate");
const gateErr = document.getElementById("gate-err");
const userInput = document.getElementById("user-input");
const keyInput = document.getElementById("key-input");
const app = document.getElementById("app");
const statusEl = document.getElementById("status");
const logoutButton = document.getElementById("logout");

history.replaceState(null, "", location.pathname);

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
  logoutButton.hidden = true;
  gate.hidden = false;
  gateErr.textContent = err || "";
  statusEl.textContent = err ? "anahtar gerekli" : "bağlanıyor…";
  statusEl.className = err ? "err" : "";
}

function renderOnline(online) {
  const tbody = document.querySelector("#t-online tbody");
  tbody.innerHTML = "";
  document.getElementById("online-empty").hidden = online.length > 0;
  for (const p of online) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.drone)}</td><td class="room">${escapeHtml(p.room)}</td>`;
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
    tr.innerHTML = `<td>${fmtTime(e.ts)}</td><td class="type ev-${e.type}">${EVENT_LABEL[e.type] || e.type}</td><td>${escapeHtml(e.name || "-")}</td><td class="room">${escapeHtml(roomOrOp)}</td><td>${escapeHtml(detail)}</td>`;
    tbody.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

async function poll() {
  try {
    const res = await fetch("/api/admin/state", { credentials: "same-origin" });
    if (res.status === 401) {
      showGate("Kullanıcı adı veya parola yanlış.");
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    app.hidden = false;
    logoutButton.hidden = false;
    gate.hidden = true;
    statusEl.textContent = `canlı · ${new Date().toLocaleTimeString("tr-TR", { hour12: false })}`;
    statusEl.className = "live";
    renderOnline(data.online || []);
    renderEvents(data.events || []);
  } catch (err) {
    statusEl.textContent = `bağlantı hatası: ${err.message}`;
    statusEl.className = "err";
  } finally {
    timer = setTimeout(poll, POLL_MS);
  }
}

document.getElementById("gate-go").addEventListener("click", async () => {
  const u = userInput.value.trim() || "admin";
  const v = keyInput.value.trim();
  if (!v) {
    gateErr.textContent = "Parola gerekli.";
    return;
  }
  const response = await fetch("/api/admin/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ user: u, key: v }),
  });
  if (!response.ok) {
    showGate("Kullanıcı adı veya parola yanlış.");
    return;
  }
  // A poll() from before this click may still have a retry timer pending
  // (poll() always reschedules itself, even on a 401) — without clearing it
  // first, that stale timer fires later and runs alongside this fresh one,
  // doubling the polling rate for the rest of the session.
  clearTimeout(timer);
  poll();
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
  showGate("");
});
userInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") keyInput.focus();
});
keyInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") document.getElementById("gate-go").click();
});

showGate("");
