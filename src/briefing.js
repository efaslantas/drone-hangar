// Pre-flight briefing model. Pure: takes the current selection, returns rows
// for the hangar card. main.js only renders what comes back.

const DIRS = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
const FROM = {
  K: "kuzeyden", KD: "kuzeydoğudan", D: "doğudan", GD: "güneydoğudan",
  G: "güneyden", GB: "güneybatıdan", B: "batıdan", KB: "kuzeybatıdan",
};
const LEVELS = ["Sakin", "Hafif", "Orta", "Kuvvetli"];

// Free flight has no op wind; the map still tells the pilot what to expect.
const MAP_DRONE = { indoor: "whoop", yard: "freestyle", airfield: "racer", coast: "seven", city: "cinewhoop", forest: "toothpick" };

export function modeGuide(selectedId, dailyId, schoolId = "hover") {
  return {
    quickLabel: "Hızlı başlangıç",
    trainingLabel: "Eğitim programı",
    quick: [
      { id: schoolId, intent: "İlk kez uçuyorum", detail: "Adım adım öğren" },
      { id: "free", intent: "Serbest uçuş", detail: "Kural yok, hemen uç" },
      { id: dailyId, intent: "Günün görevi", detail: "Bugünün rotasına katıl" },
    ].map((choice) => ({ ...choice, selected: choice.id === selectedId })),
  };
}

export function fmtTime(s) {
  if (s == null || !Number.isFinite(s)) return "—";
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m ? `${m}:${r.toFixed(0).padStart(2, "0")}` : `${r.toFixed(1)} s`;
}

/** Wind blows toward (x, z); -Z is north. Sailors name wind by where it comes from. */
export function windInfo(wind, { real = false, indoor = false } = {}) {
  if (indoor) return { level: 0, label: "Kapalı alan", detail: "rüzgâr yok", from: null, mag: 0 };
  const x = wind?.x || 0;
  const z = wind?.z || 0;
  const mag = Math.hypot(x, z);
  if (mag < 0.01) return { level: 0, label: LEVELS[0], detail: real ? "hafif türbülans" : "durgun hava", from: null, mag: 0 };
  const toward = Math.atan2(x, -z);
  const from = toward + Math.PI;
  const idx = ((Math.round((from / (Math.PI * 2)) * 8) % 8) + 8) % 8;
  const level = mag < 0.8 ? 1 : mag < 1.6 ? 2 : 3;
  return {
    level,
    label: LEVELS[level],
    detail: `${FROM[DIRS[idx]]}${real ? " · türbülans" : ""}`,
    from: DIRS[idx],
    mag: Math.round(mag * 10) / 10,
  };
}

export function suggestDrone(op, mapId) {
  if (op?.drone) return op.drone;
  return MAP_DRONE[mapId] || "freestyle";
}

export function objectiveText(op) {
  if(op?.inspection)return "3 bölgeyi gözle → başlangıca dön ve in";
  if (!op || op.kind === "free") return "Hedef yok — serbest uçuş";
  if (op.kind === "school") {
    const steps = op.steps || [];
    const n = (t) => steps.filter((s) => s.t === t).length;
    const parts = [];
    if (n("hover")) parts.push(`${n("hover")} hover`);
    if (n("takeoff")) parts.push("kalkış");
    if (n("altitude")) parts.push(`${n("altitude")} irtifa tutuş`);
    if (n("heading")) parts.push(`${n("heading")} heading`);
    if (n("speed")) parts.push(`${n("speed")} hız bandı`);
    if (n("gate")) parts.push(`${n("gate")} kapı`);
    if (n("pad")) parts.push(`${n("pad")} pil değişimi`);
    return `${parts.join(" · ")} → pad'e iniş`;
  }
  if (op.kind === "arcade") return "4 hareketli nesne · her temastan sonra yeni drone · sıra serbest";
  if (op.kind === "race") return `${op.laps || 3} tur × ${(op.gates || []).length} kapı`;
  if (op.kind === "recon") return `${(op.marks || []).length} nokta → pad'e iniş`;
  if (op.kind === "cargo") return `${(op.parcels || []).length} koli teslim → pad'e iniş`;
  return op.blurb || "";
}

/**
 * @param {object} a
 * @param {object} a.op        selected operation (FREE or one of OPS)
 * @param {number} a.opIndex   1-based rung in its track, 0 for free
 * @param {number} a.opTotal   rungs in that track
 * @param {string} a.trackName track display name ("Uçuş Okulu")
 * @param {object} a.map       { id, name }
 * @param {object} a.drone     selected catalog spec
 * @param {function} a.droneName  id → display name
 * @param {boolean} a.night
 * @param {boolean} a.real     realistic acro checkbox
 * @param {object} a.progress  loadProgress() result
 */
export function briefingModel({ op, opIndex = 0, opTotal = 6, trackName = "Görev", map, drone, droneName = (id) => id, night = false, real = false, progress = null }) {
  const free = !op || op.kind === "free";
  // Track rungs read "Yarış 2/4"; daily and standalone flights name their activity.
  const standalone = !free && !op.daily && !opTotal;
  const rung = op?.daily
    ? `Günün görevi · ${op.dateLabel || ""}`.trim()
    : standalone
      ? "Görev"
      : `${trackName} ${opIndex}/${opTotal}`;
  const rungSub = standalone ? "" : rung.toLowerCase();
  // Missions bring their own wind; free flight takes the map breeze.
  const wind = windInfo(free ? map?.wind : op?.wind, { real, indoor: map?.id === "indoor" });
  const suggested = suggestDrone(op, map?.id);
  const match = drone?.id === suggested;
  const drain = op?.drain ?? 1;
  const hover = drone?.endurance ? Math.round(drone.endurance / drain) : null;
  const rows = [];
  rows.push({ k: "Harita", v: map?.name || "—", sub: night ? "gece" : "gündüz" });
  rows.push({ k: op?.inspection ? "Çalışma" : "Oyun modu", v: op?.inspection ? op.name : free ? "Serbest uçuş" : op.name, sub: free ? "" : rungSub });
  rows.push({ k: "Rüzgâr", v: wind.label, sub: wind.detail, tone: wind.level >= 2 ? "warn" : "" });
  rows.push({
    k: free ? "Drone" : "Önerilen drone",
    v: free ? drone?.name || "—" : droneName(suggested),
    sub: free ? `${drone?.class || ""}${drone?.defaultMode === "angle" ? " · angle" : " · acro"}` : match ? "seçili ✓" : `seçili: ${drone?.name || "—"}`,
    tone: !free && match ? "ok" : "",
  });
  if (!free) rows.push({ k: "Görev hedefi", v: objectiveText(op), tone: "accent" });
  if (!free && op.requiredFlightMode) rows.push({ k: "Uçuş modu", v: op.requiredFlightMode.toUpperCase(), sub: "ders boyunca kilitli", tone: op.requiredFlightMode === "acro" ? "warn" : "ok" });
  if (!free) {
    const best = progress?.best?.[op.id];
    rows.push({ k: "Süre limiti", v: op.limit ? fmtTime(op.limit) : "—", sub: best != null ? `en iyi ${fmtTime(best)}` : "ilk deneme" });
  }
  rows.push({ k: "Batarya", v: hover ? `~${fmtTime(hover)} hover` : "—", sub: drain === 1 ? "normal tüketim" : `tüketim ×${drain}` });
  if (free) rows.push({ k: "Fizik", v: real ? "Gerçekçi acro" : "Arcade", sub: real ? "motor gecikmesi · sag · türbülans" : "otomatik gaz, affedici" });
  else if (op.real) rows.push({ k: "Fizik", v: "Gerçekçi acro", sub: "bu görevde zorunlu", tone: "warn" });
  if (op?.kind === "race" && progress?.bestLap?.[op.id] != null) rows.push({ k: "En iyi tur", v: fmtTime(progress.bestLap[op.id]), tone: "ok" });
  if(op?.inspection){rows.push({k:"İnceleme",v:"3 bölge · yerel kayıt",sub:"12 m · ≤3 m/s · 3 sn kesintisiz · FPV ±15°"});rows.push({k:"Kamera",v:"Geçici 0° montaj",sub:"Kaydedilmiş FPV eğimin korunur; yalnız bu incelemede 0°."});}
  let note = "";
  if (!free && !match) note = `${op.name} için ${droneName(suggested)} önerilir; ${drone?.name || "seçili drone"} ile de uçabilirsin.`;
  else if (wind.level >= 1 && drone?.class === "Indoor") note = "Whoop sınıfı açık havada rüzgâra karşı zayıf kalır.";
  else if (wind.level >= 2) note = "Rüzgâr kapı yaklaşmalarını iter; yaw ile karşıla.";
  if (!note && op?.daily) note = "Bugün herkes aynı rotayı aynı gövdeyle uçar; sıralama günlük. Yeni rota 03:00'te (UTC gece yarısı).";
  return {
    title: op?.inspection ? "İLKE · Şile hazırlığı" : free ? "Uçuş koşulları" : "Uçuş brifingi",
    kicker: op?.inspection ? op.name : free ? "Serbest uçuş" : op.daily ? rung : `${rung} · ${op.name}`,
    rows,
    note: op?.inspection ? "Simülasyon katmanı · yerel telemetri ve simüle JPEG; gerçek İLKE aracı veya saha doğrulaması değildir. 80 m AGL / 20 dk demo sınırı." : note,
    wind,
    suggested,
  };
}
