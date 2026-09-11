// Team deathmatch, client side (pure): scoreboard text, match clock, enemy
// target list for the local shot test, and the end-of-match card model.
// Damage, deaths, scores and the clock are the server's (server/team.mjs);
// this file only formats and filters.

export const TEAM_NAME = { red: "KIRMIZI", blue: "MAVİ" };
export const TEAM_TITLE = { red: "Kırmızı", blue: "Mavi" };
export const TEAM_HEX = { red: 0xff5a4a, blue: 0x4aa8ff };
export const TEAM_CSS = { red: "#ff5a4a", blue: "#4aa8ff" };
// Each side lifts off from its own end of the runway apron (airfield: hangars sit at z -3..19).
export const TEAM_SPAWN = { red: { x: -30, y: 6, z: -22 }, blue: { x: 30, y: 6, z: -22 } };

export function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "KIRMIZI 7 : 5 MAVİ" — always red on the left so the line never jumps. */
export function scoreLine(match) {
  const s = match?.scores || { red: 0, blue: 0 };
  return `${TEAM_NAME.red} ${s.red} : ${s.blue} ${TEAM_NAME.blue}`;
}

/**
 * What the HUD says about the match right now.
 * phase: waiting (fewer than two pilots) | running | ended (intermission).
 */
export function matchStatus(match, now = Date.now(), mine = null) {
  const you = mine ? `Sen: ${TEAM_NAME[mine]}` : "";
  if (!match) return { phase: "waiting", clock: "", line: you || "Takım bekleniyor" };
  if (match.running && match.endsAt) {
    return { phase: "running", clock: fmtClock(match.endsAt - now), line: `${you} · ${match.target} sayıya`.replace(/^ · /, "") };
  }
  if (match.ended) {
    const w = match.winner === "draw" ? "Berabere" : `${TEAM_TITLE[match.winner] || "?"} kazandı`;
    return { phase: "ended", clock: "ARA", line: `${w} · yeni maç birazdan` };
  }
  const n = match.n || 0;
  return { phase: "waiting", clock: "", line: `${you} · rakip bekleniyor (${n}/2)`.replace(/^ · /, "") };
}

/** Alive pilots of the other side, as hit targets for the local shot test. */
export function enemyTargets(remotes, mine) {
  const out = [];
  for (const [id, r] of remotes) {
    if (!mine || !r?.team || r.team === mine || r.alive === false || !r.mesh) continue;
    const p = r.mesh.position;
    out.push({ id, x: p.x, y: p.y, z: p.z, hp: 1, alive: true });
  }
  return out;
}

/** End-of-match card. `won` is null on a draw. */
export function resultModel(match, mine, kills = 0, deaths = 0) {
  const s = match?.scores || { red: 0, blue: 0 };
  const winner = match?.winner || (s.red > s.blue ? "red" : s.blue > s.red ? "blue" : "draw");
  const won = winner === "draw" ? null : winner === mine;
  return {
    won,
    kicker: won === null ? "BERABERE" : won ? "MAÇ KAZANILDI" : "MAÇ KAYBEDİLDİ",
    title: winner === "draw" ? "Berabere" : `${TEAM_TITLE[winner]} kazandı`,
    score: `${s.red} : ${s.blue}`,
    rows: [
      { k: "Takımın", v: TEAM_TITLE[mine] || "—" },
      { k: "Vuruş", v: String(kills) },
      { k: "Düşme", v: String(deaths) },
      { k: "Skor", v: `${TEAM_NAME.red} ${s.red} · ${TEAM_NAME.blue} ${s.blue}` },
    ],
    hint: "Yeni maç birazdan başlar · Tekrar → sahaya dön",
  };
}
