const base = (id, name, blurb, map, drone, steps, extra = {}) => ({
  id, kind: "school", name, blurb, map, drone, steps,
  lockMap: true, lockDrone: false, fire: false, bots: 0,
  limit: 360, drain: 0.5, spawn: { x: 0, y: 4, z: 7 }, ...extra,
});
const land = { t: "land", hint: "Pade yumuşak in ve DISARM" };
const gate = (x, y, z, hint, r = 2.7) => ({ t: "gate", x, y, z, r, hint });
const hold = (t, x, y, z, hint, extra = {}) => ({ t, x, y, z, r: 2.8, hold: 3, hint, ...extra });

export const MANUAL_LESSONS = [
  base("manual-takeoff", "Kontrollü kalkış", "Pad üzerinde ARM, dikey kalkış, 3 metre sabitleme ve iniş.", "indoor", "whoop", [{ t: "takeoff", y: 2.5, hint: "ARM ve dikey kalk" }, hold("altitude", 0, 3, 0, "3 m irtifayı tut", { tolerance: 0.45 }), land], { assists: { altitude: false, tiltComp: false, brake: true } }),
  base("manual-ladder", "İrtifa merdiveni", "Gazla 2, 5 ve 8 metre seviyelerini kesintisiz tut.", "indoor", "whoop", [hold("altitude", 0, 2, -8, "2 m", { tolerance: 0.4 }), hold("altitude", 0, 5, -18, "5 m", { tolerance: 0.5 }), hold("altitude", 0, 8, -30, "8 m", { tolerance: 0.6 }), land], { assists: { altitude: false, tiltComp: false, brake: true } }),
  base("manual-heading", "Sabit heading", "Dört ana yöne dön, konumu bozmadan üçer saniye tut.", "indoor", "whoop", [hold("heading", 0, 4, -10, "Kuzey", { heading: 0 }), hold("heading", 0, 4, -10, "Doğu", { heading: -Math.PI / 2 }), hold("heading", 0, 4, -10, "Güney", { heading: Math.PI }), hold("heading", 0, 4, -10, "Batı", { heading: Math.PI / 2 }), land], { assists: { altitude: false, tiltComp: false, brake: true } }),
  base("manual-square", "Kare koordinasyon", "Manuel gazla dört köşe; irtifa sapmasını yönet.", "indoor", "micro", [gate(-10, 4, -12, "Sol ön"), gate(10, 4, -12, "Sağ ön"), gate(10, 4, -34, "Sağ arka"), gate(-10, 4, -34, "Sol arka"), land], { assists: { altitude: false, tiltComp: false, brake: false } }),
  base("manual-descent", "Kontrollü alçalma", "Yüksekten iki karar noktasına alçal ve pad yaklaşmasını sabitle.", "indoor", "whoop", [hold("altitude", 0, 8, -24, "8 m", { tolerance: 0.6 }), hold("altitude", 0, 4, -12, "4 m", { tolerance: 0.45 }), hold("altitude", 0, 2, -5, "2 m son yaklaşma", { tolerance: 0.35 }), land], { assists: { altitude: false, tiltComp: false, brake: true } }),
  base("manual-check", "Manuel gaz kontrolü", "Kalkış, irtifa değişimi, kare rota ve yumuşak inişi birleştir.", "indoor", "whoop", [{ t: "takeoff", y: 2.5, hint: "Kalkış" }, gate(0, 3, -10, "Alçak kapı"), gate(12, 7, -28, "Yüksel"), gate(-12, 4, -48, "Alçal"), hold("altitude", 0, 2.2, -6, "Son yaklaşma", { tolerance: 0.4 }), land], { assists: { altitude: false, tiltComp: false, brake: false }, limit: 300 }),
];

export const ACRO_LESSONS = [
  base("acro-level", "Acro kalkış", "Manuel rate kontrolüyle kalk, merkezde üç saniye sabitle.", "indoor", "toothpick", [{ t: "takeoff", y: 2.5, hint: "Acro kalkış" }, hold("hover", 0, 4, -8, "Rate'leri sakin tut"), land]),
  base("acro-pitch", "Pitch ve frenleme", "İleri pitch ver, ters komutla iki hız noktasında dur.", "airfield", "freestyle", [hold("speed", 0, 5, -18, "4–8 m/s hız bandı", { min: 4, max: 8, r: 10 }), hold("hover", 0, 5, -40, "Frenle ve sabitle"), land]),
  base("acro-roll", "Roll çizgisi", "Sağ ve sol ofset kapılarında roll açısını kontrollü kur.", "airfield", "freestyle", [gate(0, 5, -8, "Merkez"), gate(14, 6, -26, "Sağ ofset"), gate(-14, 6, -44, "Sol ofset"), gate(0, 5, -64, "Merkez"), land]),
  base("acro-yaw", "Yaw koordinasyonu", "Köşelerde yaw ile gövde yönünü rota üzerine taşı.", "coast", "freestyle", [gate(0, 5, -10, "Giriş"), gate(14, 5.5, -22, "Sağ dönüş"), gate(0, 5, -36, "Arka"), gate(-14, 5.5, -22, "Sol dönüş"), land]),
  base("acro-speed", "Hız yönetimi", "Aynı çizgide düşük ve yüksek hız bantlarını tut.", "airfield", "racer", [hold("speed", 0, 5, -18, "3–6 m/s", { min: 3, max: 6, r: 10 }), hold("speed", 0, 6, -48, "9–14 m/s", { min: 9, max: 14, r: 12 }), hold("speed", 0, 4, -72, "4–7 m/s fren", { min: 4, max: 7, r: 10 }), land]),
  base("acro-check", "Acro yeterlilik", "Rate, hız, yön ve inişi tek kesintisiz uçuşta birleştir.", "yard", "freestyle", [gate(0, 4, -8, "Giriş", 2.4), gate(4, 3, -30, "Alçak", 2.2), gate(0, 7, -48, "Yüksek", 2.2), gate(-12, 5, -64, "Dönüş", 2.2), hold("hover", 0, 3, -8, "Yaklaşmayı sabitle", { hold: 2 }), land], { limit: 300 }),
].map((op) => ({ ...op, real: true, requiredFlightMode: "acro", assists: { altitude: false, tiltComp: false, brake: false } }));

export const ENVIRONMENT_LESSONS = [
  base("env-crosswind", "Yan rüzgâr hover", "Sabit noktada yan rüzgâr sapmasını karşıla.", "airfield", "toothpick", [hold("hover", 0, 5, -18, "Rüzgârda 5 sn", { hold: 5 }), land], { wind: { x: 0.8, z: 0 } }),
  base("env-headwind", "Karşı rüzgâr rota", "İleri ve dönüş bacaklarında farklı yer hızını yönet.", "airfield", "freestyle", [gate(0, 5, -10, "Karşı rüzgâr"), gate(0, 6, -60, "Uzak nokta"), gate(14, 5, -34, "Dönüş"), land], { wind: { x: 0, z: 1.1 } }),
  base("env-gust", "Türbülans düzeltmesi", "Gerçekçi Acro ve değişken rüzgârda geniş rotayı koru.", "coast", "freestyle", [gate(0, 5, -10, "Kıyı hattı"), gate(18, 7, -28, "Açık su"), gate(-18, 6, -30, "Geri dönüş"), land], { wind: { x: 1.1, z: 0.4 }, real: true, requiredFlightMode: "acro" }),
  base("env-tight", "Dar alan", "Cinewhoop ile bina arası düşük hızlı çizgi.", "city", "cinewhoop", [gate(0, 4, -4, "Cadde", 2.3), gate(8, 5, -20, "Sağ", 2.2), gate(-8, 6, -36, "Sol", 2.2), gate(9, 5, -52, "Bina dibi", 2.2), land]),
  base("env-night", "Gece görüşü", "Görsel referansların azaldığı orman hattında irtifayı koru.", "forest", "toothpick", [gate(6, 6, -14, "Patika"), gate(6, 7, -36, "Ağaç hattı"), gate(-12, 8, -56, "Gölet dönüşü"), gate(-16, 8, -86, "Derin orman"), land], { night: true, wind: { x: 0.2, z: 0.2 } }),
  base("env-check", "Çevre yeterlilik", "Rüzgâr, dar geçiş, hız ve gece referanslarını birlikte yönet.", "forest", "freestyle", [hold("speed", 6, 6, -14, "4–8 m/s", { min: 4, max: 8, r: 9 }), gate(20, 7, -44, "Ağaç arası", 2.5), gate(-4, 8, -70, "Gölet", 2.5), gate(-22, 7, -30, "Geri dönüş", 2.5), land], { night: true, wind: { x: 0.55, z: 0.25 }, limit: 420 }),
];

export const ADVANCED_RACES = [
  { id: "race-precision", kind: "race", name: "Hassas tur", blurb: "Dar kapılı teknik hangar devresi, 3 tur.", map: "indoor", drone: "toothpick", lockMap: true, lockDrone: false, fire: false, bots: 0, laps: 3, limit: 600, drain: 0.55, spawn: { x: 0, y: 4, z: 8 }, gates: [gate(0, 4, -8, ""), gate(12, 5, -24, ""), gate(0, 7, -48, ""), gate(-14, 4, -24, "")] },
  { id: "race-endurance", kind: "race", name: "Dayanıklılık turu", blurb: "Uzun menzil gövdesiyle rüzgârlı orman devresi, 3 tur.", map: "forest", drone: "seven", lockMap: true, lockDrone: true, fire: false, bots: 0, laps: 3, limit: 900, drain: 0.8, wind: { x: 0.6, z: 0.25 }, spawn: { x: 0, y: 6, z: 7 }, gates: [gate(6, 7, -36, "", 3.2), gate(30, 10, -50, "", 3.2), gate(10, 9, -132, "", 3.2), gate(-30, 9, -120, "", 3.2), gate(-22, 7, -30, "", 3.2)] },
];
