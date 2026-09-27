// Operations are grouped into independent tracks. Inside a track the order is
// a ladder (win one to open the next); across tracks the only gate is the
// school's gate lesson (`requires`), so a racer never has to shoot bots first.
// Op ids that predate the tracks (school/patrol/waves/race/recon/final) are
// kept verbatim: `progress.done` and the server leaderboard key on them.
import { dailyOp, isDailyId } from "./daily.js";
import { MANUAL_LESSONS, ACRO_LESSONS, ENVIRONMENT_LESSONS, ADVANCED_RACES } from "./curriculum.js";

const SCHOOL = [
  {
    id: "hover",
    kind: "school",
    name: "Havada kal",
    blurb: "3 küre: gir, 4 sn tut. Sonra pade in.",
    map: "indoor",
    drone: "whoop",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    limit: 300,
    drain: 0.35,
    wind: null,
    spawn: { x: 0, y: 2.8, z: 6 },
    steps: [
      { t: "hover", x: 0, y: 3, z: -6, r: 2.2, hold: 4, hint: "1. küre — gir, 4 sn tut" },
      { t: "hover", x: 7, y: 5.5, z: -18, r: 2.2, hold: 4, hint: "2. küre — yüksel" },
      { t: "hover", x: -7, y: 2.4, z: -18, r: 2.2, hold: 3, hint: "3. küre — alçal" },
      { t: "land", hint: "Pade in, ARM kapat" },
    ],
  },
  {
    id: "school",
    kind: "school",
    name: "Kapılar",
    blurb: "4 kapıdan geç, pade in. Kapalı hangar; drone serbest.",
    map: "indoor",
    drone: "whoop",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    limit: 900,
    drain: 0.35,
    wind: null,
    spawn: { x: 0, y: 2.8, z: 6 },
    steps: [
      { t: "gate", x: 0, y: 3.4, z: -8, r: 2.8, hint: "1. kapı — içinden geç" },
      { t: "gate", x: 0, y: 3.2, z: -22, r: 2.8, hint: "2. kapı" },
      { t: "gate", x: 10, y: 3.4, z: -40, r: 2.8, hint: "3. kapı" },
      { t: "gate", x: -16, y: 4.2, z: -64, r: 2.8, hint: "4. kapı" },
      { t: "land", hint: "Pade in, ARM kapat" },
    ],
  },
  {
    id: "school-wind",
    kind: "school",
    name: "Rüzgârda kapı",
    blurb: "Pistte 5 kapı, hafif yan rüzgâr. Yaw ile karşıla.",
    map: "airfield",
    drone: "toothpick",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    limit: 420,
    drain: 0.5,
    wind: { x: 0.7, z: 0.2 },
    spawn: { x: 0, y: 4, z: 8 },
    steps: [
      { t: "gate", x: 0, y: 4, z: -6, r: 2.8, hint: "1. kapı — pist başı" },
      { t: "gate", x: 5, y: 5, z: -24, r: 2.8, hint: "2. kapı — rüzgâr sağdan" },
      { t: "gate", x: -6, y: 4.5, z: -42, r: 2.8, hint: "3. kapı" },
      { t: "gate", x: 4, y: 6, z: -62, r: 2.8, hint: "4. kapı — yüksel" },
      { t: "gate", x: 0, y: 4, z: -78, r: 2.8, hint: "5. kapı — pist sonu" },
      { t: "land", hint: "Pade dön, iniş" },
    ],
  },
  {
    id: "school-street",
    kind: "school",
    name: "Dar geçit",
    blurb: "Sanayi sokakları, binalar arası 6 kapı.",
    map: "city",
    drone: "cinewhoop",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    limit: 420,
    drain: 0.45,
    wind: null,
    spawn: { x: 0, y: 4, z: 8 },
    steps: [
      { t: "gate", x: 0, y: 4, z: -4, r: 2.6, hint: "1. kapı — ana cadde" },
      { t: "gate", x: 8, y: 5, z: -20, r: 2.6, hint: "2. kapı — sağ şerit" },
      { t: "gate", x: -8, y: 6, z: -36, r: 2.4, hint: "3. kapı — sol şerit" },
      { t: "gate", x: 9, y: 5, z: -52, r: 2.4, hint: "4. kapı — bina dibi" },
      { t: "gate", x: 0, y: 8, z: -58, r: 2.4, hint: "5. kapı — blok üstü" },
      { t: "gate", x: -9, y: 5, z: -66, r: 2.4, hint: "6. kapı — ara sokak" },
      { t: "land", hint: "Pade dön, iniş" },
    ],
  },
  {
    id: "school-acro",
    kind: "school",
    name: "Acro'ya geçiş",
    blurb: "Gerçekçi fizik zorunlu: motor gecikmesi, sag. Depo, 5 dar kapı.",
    map: "yard",
    drone: "freestyle",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    real: true,
    limit: 360,
    drain: 0.6,
    wind: { x: 0.3, z: 0.1 },
    spawn: { x: 0, y: 6, z: 6 },
    steps: [
      { t: "gate", x: 0, y: 4, z: -8, r: 2.4, hint: "1. kapı — yol üstü" },
      { t: "gate", x: 4, y: 3, z: -30, r: 2.2, hint: "2. kapı — alçak" },
      { t: "gate", x: 0, y: 6.5, z: -48, r: 2.2, hint: "3. kapı — konteyner üstü" },
      { t: "gate", x: 6, y: 3, z: -62, r: 2.2, hint: "4. kapı" },
      { t: "gate", x: 0, y: 4, z: -76, r: 2.2, hint: "5. kapı — yol sonu" },
      { t: "land", hint: "Pade dön, iniş" },
    ],
  },
  {
    id: "school-night",
    kind: "school",
    name: "Gece seyri",
    blurb: "Orman, gece. Patika ve gölet üstünden 5 kapı.",
    map: "forest",
    drone: "toothpick",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    night: true,
    limit: 480,
    drain: 0.6,
    wind: { x: 0.2, z: 0.3 },
    spawn: { x: 6, y: 6, z: 8 },
    steps: [
      { t: "gate", x: 6, y: 6, z: -12, r: 2.8, hint: "1. kapı — patika" },
      { t: "gate", x: 6, y: 7, z: -36, r: 2.8, hint: "2. kapı — patika" },
      { t: "gate", x: -12, y: 8, z: -56, r: 3, hint: "3. kapı — gölete dön" },
      { t: "gate", x: -24.5, y: 5, z: -65, r: 3, hint: "4. kapı — gölet üstü" },
      { t: "gate", x: -16, y: 8, z: -86, r: 3, hint: "5. kapı — derin orman" },
      { t: "land", hint: "Pade dön, iniş" },
    ],
  },
];

const COMBAT = [
  {
    id: "patrol",
    kind: "patrol",
    name: "Devriye",
    blurb: "Depoda 6 hedef. Batarya bitince pade dön.",
    map: "yard",
    drone: "freestyle",
    lockMap: true,
    lockDrone: false,
    fire: true,
    bots: 0,
    need: 6,
    limit: 1500,
    drain: 1.15,
    targets: [
      { x: 7, y: 1.1, z: -16 },
      { x: -6, y: 1.1, z: -20 },
      { x: 11, y: 1.1, z: -38 },
      { x: -9, y: 1.1, z: -44 },
      { x: 4, y: 1.1, z: -8 },
      { x: -5, y: 1.1, z: -32 },
    ],
    steps: [{ t: "shoot", hint: "6 hedefi vur, pade in" }],
  },
  {
    id: "waves",
    kind: "waves",
    name: "Köpek dövüşü",
    blurb: "Pistte 3 dalga bot. Arada 20 sn ARM.",
    map: "airfield",
    drone: "racer",
    lockMap: true,
    lockDrone: false,
    fire: true,
    waves: [3, 5, 7],
    waveBreak: 20,
    limit: 1800,
    drain: 0.7,
    steps: [{ t: "waves", hint: "Dalgaları temizle" }],
  },
  {
    id: "final",
    kind: "final",
    name: "Depo çatışması",
    blurb: "8 isabet, pade dön. Kendi drone / depo.",
    map: "yard",
    drone: null,
    lockMap: false,
    lockDrone: false,
    fire: true,
    bots: 5,
    scoreNeed: 8,
    limit: 720,
    drain: 0.85,
    steps: [{ t: "score", hint: "8 skor + iniş" }],
  },
  {
    id: "arena",
    kind: "final",
    name: "Arena",
    blurb: "Pistte 8 bot, 15 skor, 7 dakika. Botlar geri doğar.",
    map: "airfield",
    drone: "racer",
    lockMap: true,
    lockDrone: false,
    fire: true,
    bots: 8,
    scoreNeed: 15,
    limit: 420,
    drain: 0.8,
    steps: [{ t: "score", hint: "15 skor + iniş" }],
  },
  {
    id: "boss",
    kind: "waves",
    name: "Ağır tank",
    blurb: "Heavy lift gövdeli zırhlı bot: önce 1, sonra 2. Her biri 10 isabet.",
    map: "yard",
    drone: "freestyle",
    lockMap: true,
    lockDrone: false,
    fire: true,
    waves: [1, 2],
    waveBreak: 12,
    botDrone: "heavy",
    botHp: 10,
    limit: 600,
    drain: 0.7,
    steps: [{ t: "waves", hint: "Tankı düşür" }],
  },
];

const RACE = [
  {
    id: "race",
    kind: "race",
    name: "Kıyı GP",
    blurb: "Kıyı, 3 tur kapı. Rüzgâr var.",
    map: "coast",
    drone: "racer",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    laps: 3,
    countdown: 3,
    limit: 1500,
    drain: 0.55,
    wind: { x: 1.1, z: 0.4 },
    spawn: { x: 0, y: 5, z: 6 },
    gates: [
      { x: 0, y: 5, z: -10, r: 3.1 },
      { x: 14, y: 5.5, z: -22, r: 3.1 },
      { x: 0, y: 5, z: -36, r: 3.1 },
      { x: -14, y: 5.5, z: -22, r: 3.1 },
    ],
    steps: [{ t: "race", hint: "3 tur" }],
  },
  {
    id: "race-airfield",
    kind: "race",
    name: "Pist sprint",
    blurb: "Pist boyu uzun oval, 4 tur. Doğudan rüzgâr.",
    map: "airfield",
    drone: "racer",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    laps: 4,
    countdown: 3,
    limit: 900,
    drain: 0.6,
    wind: { x: -0.9, z: 0.3 },
    spawn: { x: 0, y: 5, z: 6 },
    gates: [
      { x: 0, y: 5, z: -10, r: 3.1 },
      { x: 12, y: 6, z: -40, r: 3.1 },
      { x: 0, y: 5, z: -72, r: 3.1 },
      { x: -12, y: 6, z: -40, r: 3.1 },
    ],
    steps: [{ t: "race", hint: "4 tur" }],
  },
  {
    id: "race-forest",
    kind: "race",
    name: "Orman rallisi",
    blurb: "Ağaç arası 5 kapı, gölet üstünden döner. 3 tur.",
    map: "forest",
    drone: "freestyle",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    laps: 3,
    countdown: 3,
    limit: 900,
    drain: 0.6,
    wind: { x: 0.3, z: 0.2 },
    spawn: { x: 6, y: 6, z: 6 },
    gates: [
      { x: 6, y: 6, z: -14, r: 3 },
      { x: 20, y: 7, z: -44, r: 3 },
      { x: -4, y: 8, z: -70, r: 3 },
      { x: -24.5, y: 6, z: -65, r: 3 },
      { x: -22, y: 7, z: -30, r: 3 },
    ],
    steps: [{ t: "race", hint: "3 tur" }],
  },
  {
    id: "race-city",
    kind: "race",
    name: "Sokak devresi",
    blurb: "Bloklar arası dar devre, 3 tur. Cinewhoop işi.",
    map: "city",
    drone: "cinewhoop",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    laps: 3,
    countdown: 3,
    limit: 900,
    drain: 0.55,
    wind: null,
    spawn: { x: 0, y: 5, z: 6 },
    gates: [
      { x: 0, y: 5, z: -6, r: 2.8 },
      { x: 9, y: 6, z: -34, r: 2.8 },
      { x: 0, y: 7, z: -56, r: 2.8 },
      { x: -9, y: 6, z: -34, r: 2.8 },
    ],
    steps: [{ t: "race", hint: "3 tur" }],
  },
];

const MISSION = [
  {
    id: "recon",
    kind: "recon",
    name: "Keşif",
    blurb: "Kentte 4 noktayı işaretle. Cine / kamera.",
    map: "city",
    drone: "camera",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    limit: 900,
    drain: 0.5,
    spawn: { x: 0, y: 4, z: 6 },
    marks: [
      { x: 0, y: 8, z: -6, r: 4.5 },
      { x: 2, y: 10, z: -42, r: 4.5 },
      { x: -4, y: 7, z: -72, r: 4.8 },
      { x: 6, y: 9, z: -28, r: 4.5 },
    ],
    steps: [{ t: "mark", hint: "4 noktayı tara, pade in" }],
  },
  {
    id: "sar",
    kind: "recon",
    name: "Arama-kurtarma",
    blurb: "Gece ormanda 5 nokta. Kamera quad, 10 dakika.",
    map: "forest",
    drone: "camera",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    night: true,
    limit: 600,
    drain: 0.6,
    wind: { x: 0.2, z: 0.2 },
    spawn: { x: 0, y: 5, z: 6 },
    marks: [
      { x: 6, y: 8, z: -20, r: 4.5 },
      { x: -24.5, y: 6, z: -65, r: 5 },
      { x: 30, y: 9, z: -100, r: 5 },
      { x: -30, y: 9, z: -120, r: 5 },
      { x: 10, y: 8, z: -132, r: 5 },
    ],
    steps: [{ t: "mark", hint: "5 noktayı tara, pade in" }],
  },
  {
    id: "range",
    kind: "school",
    name: "Menzil",
    blurb: "7\" ile uzak kapılar. Tek pil yetmez: pade in, pil değiştir, devam.",
    map: "forest",
    drone: "seven",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    limit: 600,
    drain: 3.2,
    wind: { x: 0.4, z: 0.3 },
    spawn: { x: 0, y: 8, z: 6 },
    steps: [
      { t: "gate", x: 6, y: 10, z: -60, r: 3.5, hint: "1. kapı — patika ucu" },
      { t: "gate", x: -30, y: 12, z: -120, r: 3.5, hint: "2. kapı — güneybatı" },
      { t: "gate", x: 40, y: 12, z: -130, r: 3.5, hint: "3. kapı — güneydoğu" },
      { t: "pad", hint: "Pade dön, pil değiştir" },
      { t: "gate", x: -40, y: 10, z: -100, r: 3.5, hint: "4. kapı — batı" },
      { t: "gate", x: 30, y: 10, z: -50, r: 3.5, hint: "5. kapı — doğu" },
      { t: "land", hint: "Pade dön, iniş" },
    ],
  },
  {
    id: "cargo",
    kind: "cargo",
    name: "Kargo",
    blurb: "Heavy lift ile 3 koli: alçal, al, çatıya / kuleye / pade bırak. Yük gazı ve pili yer.",
    map: "yard",
    drone: "heavy",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    limit: 600,
    drain: 0.9,
    // Parcel mass as a fraction of the airframe's own mass (see physics.withPayload).
    payload: 0.45,
    wind: { x: 0.3, z: 0.1 },
    spawn: { x: 0, y: 4, z: 6 },
    parcels: [
      { name: "Palet", from: { x: 4, y: 0, z: -14, r: 2.2 }, toName: "Depo çatısı", to: { x: 22, y: 9.33, z: -8, r: 3 } },
      { name: "Yedek parça", from: { x: -22, y: 0, z: -42, r: 2.2 }, toName: "Kule tepesi", to: { x: 36, y: 12, z: -36, r: 2.6 } },
      { name: "Numune", from: { x: -6, y: 0, z: -70, r: 2.2 }, toName: "Helipad", to: { x: 0, y: 0, z: 0, r: 3 } },
    ],
    steps: [{ t: "cargo", hint: "3 koli teslim, pade in" }],
  },
  {
    id: "precision-landing",
    kind: "school",
    name: "Hassas iniş",
    blurb: "Yan rüzgârda trafik paterni: yaklaşma kapıları, sabit son yaklaşma ve yumuşak pad teması.",
    map: "airfield",
    drone: "freestyle",
    lockMap: true,
    lockDrone: false,
    fire: false,
    bots: 0,
    limit: 360,
    drain: 0.55,
    wind: { x: 0.8, z: 0.15 },
    spawn: { x: 0, y: 4, z: 8 },
    steps: [
      { t: "gate", x: 16, y: 9, z: -20, r: 3.2, hint: "Rüzgâr altı kolu — irtifayı koru" },
      { t: "gate", x: 16, y: 7, z: -52, r: 3, hint: "Esas kola dön — hızı azalt" },
      { t: "gate", x: 0, y: 5, z: -30, r: 2.8, hint: "Son yaklaşma — pad eksenini tut" },
      { t: "hover", x: 0, y: 2.2, z: -8, r: 2.1, hold: 2, hint: "Karar noktası — 2 sn sabitle" },
      { t: "land", hint: "Pade yumuşak in ve DISARM" },
    ],
  },
  {
    id: "infrastructure",
    kind: "recon",
    name: "Altyapı denetimi",
    blurb: "Sanayi tesisinde beş denetim noktasını düşük hızla tara, enerji payıyla üsse dön.",
    map: "city",
    drone: "camera",
    lockMap: true,
    lockDrone: true,
    fire: false,
    bots: 0,
    limit: 540,
    drain: 0.65,
    wind: { x: 0.25, z: -0.15 },
    spawn: { x: 0, y: 4, z: 8 },
    marks: [
      { x: 8, y: 8, z: -20, r: 3.2 },
      { x: 2, y: 12, z: -42, r: 3.2 },
      { x: -8, y: 9, z: -66, r: 3.2 },
      { x: 8, y: 10, z: -90, r: 3.2 },
      { x: 0, y: 8, z: -56, r: 3.2 },
    ],
    steps: [{ t: "mark", hint: "5 denetim noktasını tara, pade dön" }],
  },
];

export const TRACKS = [
  {
    id: "school",
    name: "Uçuş Okulu",
    short: "Okul",
    kicker: "Beceri",
    blurb: "Hover'dan gece seyrine 6 ders. Kapılar bitince diğer pistler açılır; 6/6 diploma.",
    requires: null,
    ops: SCHOOL,
  },
  {
    id: "manual",
    name: "Manuel gaz",
    short: "Manuel",
    kicker: "Kolektif",
    blurb: "Otomatik irtifa ve yatış telafisi olmadan kalkış, seviye, heading ve iniş.",
    requires: "school-night",
    ops: MANUAL_LESSONS,
  },
  {
    id: "acro",
    name: "Acro kontrol",
    short: "Acro",
    kicker: "Rate",
    blurb: "Gerçekçi motor, manuel rate ve gazla pitch, roll, yaw ve hız yönetimi.",
    requires: "manual-check",
    ops: ACRO_LESSONS,
  },
  {
    id: "environment",
    name: "Çevre yönetimi",
    short: "Çevre",
    kicker: "Koşul",
    blurb: "Yan ve karşı rüzgâr, türbülans, dar alan ile gece referansları.",
    requires: "acro-check",
    ops: ENVIRONMENT_LESSONS,
  },
  {
    id: "advanced",
    name: "İleri parkur",
    short: "Parkur",
    kicker: "Çizgi",
    blurb: "Altı pistte tutarlı çizgi, kapı yönü, tur süresi ve enerji yönetimi.",
    requires: "env-check",
    ops: [...RACE, ...ADVANCED_RACES],
  },
  {
    id: "mission",
    name: "Görev",
    short: "Görev",
    kicker: "Seyir",
    blurb: "Keşif, gece arama-kurtarma, menzil, yük, hassas iniş ve altyapı denetimi: 6 operasyon.",
    requires: "manual-check",
    ops: MISSION,
  },
];

for (const t of TRACKS) {
  for (const op of t.ops) {
    op.track = t.id;
    if (t.id !== "combat") {
      op.academy = true;
      op.version ??= 1;
      op.physicsVersion ??= 2;
      op.mapVersion ??= 1;
      op.startGrounded = true;
      op.requiredFlightMode ??= op.kind === "race" || op.real ? "acro" : "angle";
      if (op.requiredFlightMode === "acro") op.real = true;
    }
    // Every campaign op starts on a 3-2-1 (physics, mission clock and bots wait for GO).
    op.countdown ??= 3;
  }
}

export const OPS = TRACKS.flatMap((t) => t.ops);
export const LEGACY_OPS = COMBAT;

export const AUTONOMY_COAST_RESPONSE = {
  id: "autonomy-coast-response",
  kind: "autonomy",
  name: "Kıyı Gözetleme ve Müdahale",
  blurb: "İHA kıyıyı tarar; tespitte en yakın uygun İDA olaya sevk edilir.",
  map: "coast",
  drone: "camera",
  lockMap: true,
  lockDrone: true,
  fire: false,
  bots: 0,
  optional: true,
  ranked: false,
  limit: 300,
  drain: 0.45,
  detectRadius: 7,
  verifyRadius: 5,
  minSeaBattery: 30,
  spawn: { x: 0, y: 8, z: -28 },
  airRoute: [
    { x: -18, y: 8, z: -43 },
    { x: 0, y: 9, z: -36 },
    { x: 18, y: 8, z: -43 },
    { x: 0, y: 8, z: -32 },
  ],
  incidentCandidates: [
    { id: "olay-bati", x: -18, y: 0, z: -43 },
    { id: "olay-dogu", x: 18, y: 0, z: -43 },
  ],
  seaVehicles: [
    { id: "ida-1", name: "Kıyı-1", x: -34, z: -44, heading: Math.PI / 2, battery: 100 },
    { id: "ida-2", name: "Kıyı-2", x: 34, z: -44, heading: -Math.PI / 2, battery: 100 },
  ],
  phaseTimeouts: { AIR_SEARCH: 120, SEA_DISPATCH: 120, JOINT_VERIFY: 30 },
  steps: [],
};

export const FREE = {
  id: "free",
  kind: "free",
  name: "Serbest çalışma",
  blurb: "Amaç ve süre baskısı yok. Harita, drone ve uçuş ayarları serbest.",
  map: null,
  drone: null,
  lockMap: false,
  lockDrone: false,
  fire: false,
  bots: 0,
  optional: true,
  limit: 0,
  drain: 1,
  steps: [],
};

// Team deathmatch lives in the `team` room: the server assigns red/blue,
// owns HP/deaths/scores and runs 3-minute matches to 20. No bots, no timer
// on the client side (run stays null like free flight).
export const TEAM = {
  id: "team",
  kind: "team",
  name: "Takım savaşı",
  blurb: "Kırmızı–Mavi, 3 dakika, 20 sayı. Rakip pilotları vur; düşünce 4 sn sonra yeniden doğ. En az 2 oyuncu.",
  map: "airfield",
  drone: null,
  lockMap: true,
  lockDrone: false,
  fire: true,
  bots: 0,
  optional: true,
  limit: 0,
  drain: 0.8,
  steps: [],
};

export const ROOM_OP = {
  hangar: "free",
  training: "free",
  team: "team",
  race: "race",
  cine: "recon",
  lr: "range",
  indoor: "school",
};

export function opById(id) {
  if (id === "free") return FREE;
  if (id === "team") return TEAM;
  if (id === AUTONOMY_COAST_RESPONSE.id) return AUTONOMY_COAST_RESPONSE;
  // `daily-YYYY-MM-DD` is synthesised from the date; it lives outside the tracks.
  if (isDailyId(id)) return dailyOp(id);
  return OPS.find((o) => o.id === id) || LEGACY_OPS.find((o) => o.id === id) || FREE;
}

export function trackOf(opId) {
  return TRACKS.find((t) => t.ops.some((o) => o.id === opId)) || null;
}

export function trackById(id) {
  return TRACKS.find((t) => t.id === id) || null;
}

export function trackDone(track, progress) {
  return track.ops.filter((o) => !!progress?.done?.[o.id]).length;
}

/** The op this track waits on, or null when the track is open. */
export function trackGate(track, progress) {
  if (!track?.requires || progress?.done?.[track.requires]) return null;
  return opById(track.requires);
}

/**
 * Open = playable now. A won op never re-locks (ladder order may change
 * between releases); otherwise the track gate, then the previous rung.
 */
export function isOpOpen(op, progress) {
  if (!op || op.optional || op.kind === "free") return true;
  if (progress?.done?.[op.id]) return true;
  const track = trackOf(op.id);
  if (!track) return true;
  if (trackGate(track, progress)) return false;
  const i = track.ops.findIndex((o) => o.id === op.id);
  if (i <= 0) return true;
  return !!progress?.done?.[track.ops[i - 1].id];
}

export function nextInTrack(opId) {
  const t = trackOf(opId);
  if (!t) return null;
  const i = t.ops.findIndex((o) => o.id === opId);
  return t.ops[i + 1] || null;
}

/** First rung not yet won and open; falls back to the first rung. */
export function firstOpenOp(trackId, progress) {
  const t = trackById(trackId);
  if (!t) return null;
  return t.ops.find((o) => !progress?.done?.[o.id] && isOpOpen(o, progress)) || t.ops[0];
}

export function wantsBots(op) {
  if (!op || op.kind === "free") return false;
  return op.kind === "waves" || op.kind === "final";
}

export function playerCanBeHit(op) {
  if (!op || op.kind === "free") return false;
  return op.kind === "waves" || op.kind === "final";
}
