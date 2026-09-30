import test from "node:test";
import assert from "node:assert/strict";
import {
  STARTER_BUILD,
  emptyPilotStory,
  loadPilotStory,
  completeStoryFlight,
  availableParts,
  storyMission,
} from "../src/pilot-story.js";

function storage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}

test("a new pilot starts at the rebuild bench with the recovered freestyle kit", () => {
  const story = loadPilotStory(storage());
  assert.deepEqual(story, emptyPilotStory());
  assert.deepEqual(story.build, STARTER_BUILD);
  assert.equal(storyMission(story).id, "story-power-test");
  assert.deepEqual(availableParts(story), {
    frame: ["freestyle"], motors: ["1900"], battery: ["4s1500"], props: ["bi"],
  });
});

test("each successful story flight unlocks the next repair options without a currency grind", () => {
  let story = emptyPilotStory();
  story = completeStoryFlight(story, "story-power-test");
  assert.equal(storyMission(story).id, "story-follow-line");
  assert.deepEqual(availableParts(story).props.sort(), ["bi", "tri"]);
  story = completeStoryFlight(story, "story-follow-line");
  assert.deepEqual(availableParts(story).motors.sort(), ["1900", "2450"]);
  story = completeStoryFlight(story, "story-lost-shot");
  assert.equal(story.complete, true);
  assert.deepEqual(availableParts(story).frame.sort(), ["freestyle", "longrange", "race"]);
});

test("existing campaign or FPV build players migrate to a complete story without losing their records", () => {
  const campaign = loadPilotStory(storage(), { progress: { done: { hover: { t: 30 } } }, fpvBuilds: {} });
  assert.equal(campaign.complete, true);
  const build = loadPilotStory(storage(), { progress: { done: {} }, fpvBuilds: { racer: STARTER_BUILD } });
  assert.equal(build.complete, true);
});

test("out-of-order story reports and malformed storage cannot skip the narrative", () => {
  const saved = storage({ "efa-hangar-pilot-v1": JSON.stringify({ completed: ["story-lost-shot"], build: { motors: "nope" } }) });
  const story = loadPilotStory(saved);
  assert.equal(story.complete, false);
  assert.equal(storyMission(story).id, "story-power-test");
  assert.deepEqual(completeStoryFlight(story, "story-lost-shot"), story);
});

test("a stale completion flag alone cannot bypass the opening flights", () => {
  const story = loadPilotStory(storage({
    "efa-hangar-pilot-v1": JSON.stringify({ complete: true, completed: [], build: STARTER_BUILD }),
  }));
  assert.equal(story.complete, false);
  assert.equal(storyMission(story).id, "story-power-test");
});
