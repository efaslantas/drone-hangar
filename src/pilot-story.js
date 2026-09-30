export const PILOT_STORY_KEY = "efa-hangar-pilot-v1";

export const STARTER_BUILD = Object.freeze({
  frame: "freestyle",
  motors: "1900",
  battery: "4s1500",
  props: "bi",
});

const ALL_PARTS = Object.freeze({
  frame: ["race", "freestyle", "longrange"],
  motors: ["1750", "1900", "2450"],
  battery: ["4s1500", "6s1100", "6s1300"],
  props: ["bi", "tri", "quad"],
});

export const STORY_MISSIONS = Object.freeze([
  {
    id: "story-power-test",
    name: "İlk güç",
    blurb: "Depoda güvenli hover yap, sonra yere in ve ARM'ı kapat.",
    map: "yard",
    kind: "school",
    drone: "freestyle",
    lockDrone: true,
    lockMap: true,
    fire: false,
    bots: 0,
    limit: 240,
    drain: 0.35,
    spawn: { x: 0, y: 3, z: 8 },
    story: true,
    ranked: false,
    steps: [
      { t: "hover", x: 0, y: 3.5, z: -8, r: 2.8, hold: 4, hint: "Güç testi — 4 sn sabit kal" },
      { t: "land", hint: "Pade in, ARM kapat" },
    ],
  },
  {
    id: "story-follow-line",
    name: "Çizgiyi takip et",
    blurb: "Kısa bir takip çekimi için depodaki çizgiyi temiz uç.",
    map: "yard",
    kind: "school",
    drone: "freestyle",
    lockDrone: true,
    lockMap: true,
    fire: false,
    bots: 0,
    limit: 300,
    drain: 0.45,
    spawn: { x: 0, y: 3, z: 8 },
    story: true,
    ranked: false,
    steps: [
      { t: "gate", x: 0, y: 3.5, z: -10, r: 2.8, hint: "1. kare — çizgiye gir" },
      { t: "gate", x: 5, y: 4, z: -28, r: 2.6, hint: "2. kare — sağa ak" },
      { t: "gate", x: -4, y: 4, z: -48, r: 2.6, hint: "3. kare — dönüş" },
      { t: "land", hint: "Pade in, ARM kapat" },
    ],
  },
  {
    id: "story-lost-shot",
    name: "Kayıp plan",
    blurb: "Yarım kalmış çekimin son rotasını tamamla ve güvenle dön.",
    map: "coast",
    kind: "school",
    drone: "freestyle",
    lockDrone: true,
    lockMap: true,
    fire: false,
    bots: 0,
    limit: 420,
    drain: 0.5,
    spawn: { x: 0, y: 4, z: 8 },
    story: true,
    ranked: false,
    steps: [
      { t: "gate", x: 0, y: 5, z: -12, r: 3, hint: "1. kare — kıyı çıkışı" },
      { t: "gate", x: 10, y: 7, z: -34, r: 3, hint: "2. kare — kayalık üstü" },
      { t: "gate", x: -8, y: 8, z: -58, r: 3, hint: "3. kare — sahili takip et" },
      { t: "gate", x: 4, y: 6, z: -82, r: 3, hint: "4. kare — son görüntü" },
      { t: "land", hint: "Pade dön, ARM kapat" },
    ],
  },
]);

function cleanBuild(build = {}) {
  return Object.fromEntries(Object.entries(STARTER_BUILD).map(([kind, fallback]) => [kind, ALL_PARTS[kind].includes(build?.[kind]) ? build[kind] : fallback]));
}

function orderedCompleted(value) {
  const completed = Array.isArray(value) ? value : [];
  const result = [];
  for (const mission of STORY_MISSIONS) {
    if (!completed.includes(mission.id)) break;
    result.push(mission.id);
  }
  return result;
}

export function emptyPilotStory() {
  return { completed: [], build: { ...STARTER_BUILD }, complete: false };
}

export function availableParts(story) {
  if (story?.complete) return Object.fromEntries(Object.entries(ALL_PARTS).map(([kind, ids]) => [kind, [...ids]]));
  const count = story?.completed?.length || 0;
  return {
    frame: ["freestyle"],
    motors: count >= 2 ? ["1900", "2450"] : ["1900"],
    battery: count >= 2 ? ["4s1500", "6s1100"] : ["4s1500"],
    props: count >= 1 ? ["bi", "tri"] : ["bi"],
  };
}

export function storyMission(story) {
  if (story?.complete) return null;
  return STORY_MISSIONS[story?.completed?.length || 0] || null;
}

export function completeStoryFlight(story, missionId) {
  const safe = normalizePilotStory(story);
  const mission = storyMission(safe);
  if (!mission || mission.id !== missionId) return safe;
  const completed = [...safe.completed, missionId];
  return { ...safe, completed, complete: completed.length === STORY_MISSIONS.length };
}

export function normalizePilotStory(value) {
  if (!value || typeof value !== "object") return emptyPilotStory();
  const completed = orderedCompleted(value.completed);
  // Completion is derived from the ordered mission list. Never trust a loose
  // boolean from local storage: otherwise a hand-edited/corrupt record could
  // bypass the entire opening sequence.
  return { completed, build: cleanBuild(value.build), complete: completed.length === STORY_MISSIONS.length };
}

function hasExistingProgress(progress, fpvBuilds) {
  return Object.keys(progress?.done || {}).length > 0 || Object.keys(progress?.assessments || {}).length > 0 || Object.keys(fpvBuilds || {}).length > 0;
}

export function loadPilotStory(storage, { progress, fpvBuilds } = {}) {
  try {
    const raw = storage?.getItem(PILOT_STORY_KEY);
    if (raw) return normalizePilotStory(JSON.parse(raw));
  } catch {
    // A corrupt story should never strand the pilot outside the hangar.
  }
  if (hasExistingProgress(progress, fpvBuilds)) return { ...emptyPilotStory(), completed: STORY_MISSIONS.map((mission) => mission.id), complete: true };
  return emptyPilotStory();
}

export function savePilotStory(story, storage) {
  const safe = normalizePilotStory(story);
  try { storage?.setItem(PILOT_STORY_KEY, JSON.stringify(safe)); } catch { /* storage unavailable */ }
  return safe;
}

export function canUsePart(story, kind, id) {
  return availableParts(story)[kind]?.includes(id) || false;
}
