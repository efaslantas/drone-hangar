import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../server/rate-limit.mjs";

test("a limiter permits a bounded burst then resets its window", () => {
  let now = 0;
  const limit = createRateLimiter({ now: () => now });
  assert.equal(limit.allow("ghost", "1.2.3.4", 2, 100), true);
  assert.equal(limit.allow("ghost", "1.2.3.4", 2, 100), true);
  assert.equal(limit.allow("ghost", "1.2.3.4", 2, 100), false);
  now = 101;
  assert.equal(limit.allow("ghost", "1.2.3.4", 2, 100), true);
});
