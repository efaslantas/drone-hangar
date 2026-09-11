import { test } from "node:test";
import assert from "node:assert/strict";
import { createSimulationClock, advanceSimulationClock, resetSimulationClock } from "../src/simulation-clock.js";

test("fixed simulation advances equally at 60 and 120 fps", () => {
  const run = (fps) => {
    const clock = createSimulationClock(120);
    let ticks = 0;
    let time = 0;
    for (let i = 0; i < fps * 3; i += 1) {
      advanceSimulationClock(clock, 1 / fps, (dt) => { ticks += 1; time += dt; });
    }
    return { ticks, time };
  };
  assert.deepEqual(run(60), run(120));
  assert.equal(run(60).ticks, 360);
});

test("fixed simulation caps stalls and can be reset between flights", () => {
  const clock = createSimulationClock(120, 0.1, 8);
  let ticks = 0;
  const result = advanceSimulationClock(clock, 2, () => { ticks += 1; });
  assert.equal(ticks, 8);
  assert.ok(result.dropped > 0);
  resetSimulationClock(clock);
  assert.equal(clock.accumulator, 0);
  assert.equal(clock.dropped, 0);
});
