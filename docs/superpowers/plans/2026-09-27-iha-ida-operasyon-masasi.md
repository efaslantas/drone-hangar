# İHA–İDA Operasyon Masası Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop-first operations console where one PlayStation controller manually operates one UAV and two USVs, edits and follows routes, and saves or reloads local scenarios.

**Architecture:** Keep the console independent from the autonomous mission state machine. Pure modules own fleet/control state, route validation, and scenario persistence; `main.js` remains the integration boundary for Three.js, physics, cameras, and input, while a focused DOM renderer owns the console UI.

**Tech Stack:** JavaScript ES modules, Three.js, browser Gamepad API, localStorage, Node test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-09-27-iha-ida-operasyon-masasi-design.md`

## Global Constraints

- The first release is personal, local, free-form simulation with no timer, score, leaderboard, or campaign progress.
- The active fleet is exactly `iha-1`, `ida-1`, and `ida-2`; only one vehicle may be in `MANUAL` at a time.
- Desktop/laptop is the primary full-console target; phone support is view/basic-access only.
- Routes and scenarios are stored locally; no account, cloud sync, multiplayer control, MAVLink, or SITL integration.
- The existing free flight, academy, daily mission, team mode, and `AUTONOMY_COAST_RESPONSE` must keep working.
- No new runtime dependency is introduced.

## Review Focus

- A noisy or drifting gamepad must not cancel a route: only stick magnitude at or above `0.22` transfers a `ROUTE` vehicle to `MANUAL` (Task 2).
- Repeated L1/R1 edges must wrap deterministically across all three vehicles without producing two manual owners (Tasks 1–2).
- A route with a valid first point and invalid later point must be rejected atomically, leaving the previous route unchanged (Task 3).
- A malformed, oversized, or unknown-version saved scenario must not mutate the current console session (Task 4).
- Emergency stop must remain latched across vehicle switches and ignore motion commands until explicit re-enable (Tasks 1–2).

---

### Task 1: Fleet control state model

**Files:**
- Create: `src/operations-console.js`
- Create: `tests/operations-console.test.js`

**Interfaces:**
- Consumes: vehicle definitions `{ id: string, kind: "air" | "sea" }[]`.
- Produces: `createConsoleSession(vehicles, selectedId)`, `selectVehicle(session, vehicleId)`, `cycleVehicle(session, direction)`, `setVehicleMode(session, vehicleId, mode)`, `emergencyStop(session)`, `reenableConsole(session)`, `handleControlLoss(session)`, and `vehicleMode(session, vehicleId)`.
- Modes are exactly `MANUAL`, `HOLD`, `ROUTE`, and `STOPPED`.

- [ ] **Step 1: Write failing state tests**

Add tests proving: initial selection gives exactly one `MANUAL`; selecting another vehicle moves the old owner to `HOLD`; forward/backward cycling wraps over `iha-1`, `ida-1`, `ida-2`; `emergencyStop` latches all three as `STOPPED`; selection and mode changes cannot clear the latch; `reenableConsole` restores the selected vehicle to `MANUAL` and others to `HOLD`; control loss puts the selected vehicle in `HOLD`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/operations-console.test.js`  
Expected: FAIL because `src/operations-console.js` and its exports do not exist.

- [ ] **Step 3: Implement the immutable session transitions**

Use plain serializable objects. Every transition returns a new session. Reject unknown vehicle ids and invalid modes without changing the input. Preserve vehicle order for deterministic cycling.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/operations-console.test.js && npm test`  
Expected: focused tests PASS and the full suite reports zero failures.

- [ ] **Step 5: Commit**

```bash
git add src/operations-console.js tests/operations-console.test.js
git commit -m "feat: add operations console state model"
```

### Task 2: PlayStation controller routing and safety edges

**Files:**
- Modify: `src/input.js`
- Modify: `src/main.js`
- Create: `tests/operations-input.test.js`
- Modify: `tests/input.test.js`

**Interfaces:**
- Consumes: Task 1 session transitions.
- Produces: `consoleInput(rawInput, vehicleKind, profile)` returning `{ command, manualIntent }`; new consumable input edges `vehiclePrev`, `vehicleNext`, `emergencyStop`, and `consoleHelp`; `manualIntent` is true only when relevant stick magnitude is at least `0.22`.
- Air command retains `{ lift, yaw, pitch, roll }`; sea command is `{ throttle: -1..1, steer: -1..1 }` before `surface.js` clamps/uses it.

- [ ] **Step 1: Write failing controller-routing tests**

Cover literal inputs for air Mode 2 mapping, sea left-stick vertical throttle/right-stick horizontal steer, `0.21` drift not creating manual intent, `0.22` creating it, L1/R1 edge events, and L2+R2 emergency stop requiring both triggers at least `0.9` for 700 ms.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/operations-input.test.js tests/input.test.js`  
Expected: FAIL on missing console routing and edge behavior.

- [ ] **Step 3: Implement routing without changing existing flight mappings**

Add pure helpers around the existing normalized gamepad values. Keep current `poll()` fields and buttons compatible for every existing mode. Expose normalized `l2` in addition to `r2`; do not use trigger punch policy when evaluating the emergency chord.

- [ ] **Step 4: Wire session switching and loss handling in `main.js`**

Only activate new edges while the operations-console mode is running. A controller disconnect transitions the selected vehicle to `HOLD`. A manual-intent command cancels that selected vehicle's `ROUTE` mode before applying physics.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test tests/operations-input.test.js tests/input.test.js && npm test`  
Expected: all tests PASS with zero failures.

- [ ] **Step 6: Commit**

```bash
git add src/input.js src/main.js tests/operations-input.test.js tests/input.test.js
git commit -m "feat: route gamepad controls across UAV and USVs"
```

### Task 3: Tactical route editor and validation

**Files:**
- Create: `src/route-editor.js`
- Create: `tests/route-editor.test.js`
- Modify: `src/autopilot.js`
- Modify: `tests/autopilot.test.js`

**Interfaces:**
- Consumes: air bounds `{ minx, maxx, minz, maxz, ceiling }`, water contract `{ contains(x, z) }`, vehicle kind, and waypoint arrays.
- Produces: `createRoute(vehicleId)`, `appendWaypoint(route, point, context)`, `removeWaypoint(route, index)`, `clearRoute(route)`, `validateRoute(route, context)`, `advanceRoute(route, position, radius)`, and `routeCommand(vehicle, route, specs)`.
- Air waypoints normalize to `{ x, y, z }` with default `y: 8` and allowed `2 <= y <= ceiling - 1`; sea waypoints normalize to `{ x, z }` and require `water.contains(x, z)`.

- [ ] **Step 1: Write failing route-model tests**

Test air default altitude and bounds, sea water-only acceptance, removing/clearing points, arrival advancement, finished routes entering `HOLD`, and atomic rejection when any point in a replacement route is invalid.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/route-editor.test.js tests/autopilot.test.js`  
Expected: FAIL on missing route editor exports.

- [ ] **Step 3: Implement immutable route editing and validation**

Return `{ ok: true, route }` or `{ ok: false, error }` for operations that can reject input. Error strings are short Turkish UI messages and do not expose stack traces.

- [ ] **Step 4: Adapt existing autopilot commands behind `routeCommand`**

Use existing `airCommand`, `surfaceCommand`, and `routeProgress`; do not duplicate steering logic. A route with no current point returns a zero/hold command.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test tests/route-editor.test.js tests/autopilot.test.js && npm test`  
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/route-editor.js src/autopilot.js tests/route-editor.test.js tests/autopilot.test.js
git commit -m "feat: add validated UAV-USV route editor"
```

### Task 4: Versioned local scenarios

**Files:**
- Create: `src/scenarios.js`
- Create: `tests/scenarios.test.js`

**Interfaces:**
- Consumes: serializable map settings, vehicle starting poses, per-vehicle routes, and camera preferences.
- Produces: `scenarioFromSession(name, session)`, `validateScenario(value)`, `listScenarios(storage)`, `saveScenario(storage, scenario)`, `loadScenario(storage, id)`, and `deleteScenario(storage, id)`.
- Storage key is `efa-hangar-operations-v1`; schema field `version` is exactly `1`; maximum serialized record size is `128_000` bytes; maximum saved scenarios is `20`.

- [ ] **Step 1: Write failing persistence tests**

Use an in-memory Storage-compatible object. Cover save/list/load round trip, replacement by stable id, 20-record limit, oversized rejection, malformed JSON, unknown version, invalid waypoint, and failure leaving the caller's active session unchanged.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/scenarios.test.js`  
Expected: FAIL because scenario exports do not exist.

- [ ] **Step 3: Implement schema validation and storage operations**

Persist only the fields named in the spec. Generate ids from normalized name plus creation timestamp. Return result objects instead of throwing on user data or quota failures.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/scenarios.test.js && npm test`  
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenarios.js tests/scenarios.test.js
git commit -m "feat: save local operations scenarios"
```

### Task 5: Desktop operations-console UI

**Files:**
- Create: `src/operations-view.js`
- Create: `tests/operations-view.test.js`
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/main.js`
- Modify: `tests/visual.test.js`

**Interfaces:**
- Consumes: Task 1 session, Task 3 routes, Task 4 scenario summaries, vehicle telemetry, controller connection/name, and callbacks supplied by `main.js`.
- Produces: `operationsViewModel(state)`, `renderOperationsConsole(root, model, actions)`, and `clearOperationsConsole(root)`.
- Required DOM ids: `operations-console`, `operations-fleet`, `operations-main-view`, `operations-map`, `operations-status`, `operations-scenarios`, and `operations-emergency`.

- [ ] **Step 1: Write failing view-model and DOM tests**

Test exactly three fleet cards, one selected card, mode/battery/speed labels, controller disconnected warning, route error presentation, latched emergency presentation, scenario list actions, and cleanup removing console classes/listeners. Add a structural browser-contract test ensuring the home page exposes one **Operasyon Masası** entry and the required console regions.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/operations-view.test.js tests/visual.test.js`  
Expected: FAIL on missing view module and console DOM contract.

- [ ] **Step 3: Add the console markup and desktop-first layout**

Implement the approved three-column workspace and persistent bottom control strip. At widths below `800px`, stack fleet, main view, and map while preserving view/basic actions; do not attempt a full phone route-editing experience.

- [ ] **Step 4: Implement stable incremental rendering**

Do not replace the WebGL canvas or rebuild all fleet buttons every animation frame. Update text/classes and redraw only the tactical map overlay when its model revision changes.

- [ ] **Step 5: Wire UI actions in `main.js`**

Home entry starts the console; fleet cards select vehicles; route controls edit/apply/clear; scenario actions save/load/delete; emergency requires the latched re-enable action. Keep current mission UI hidden while the console is active.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test tests/operations-view.test.js tests/visual.test.js && npm test`  
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/operations-view.js index.html src/style.css src/main.js tests/operations-view.test.js tests/visual.test.js
git commit -m "feat: add desktop operations console UI"
```

### Task 6: Fleet physics, cameras, and realistic sea workspace

**Files:**
- Modify: `src/main.js`
- Modify: `src/world.js`
- Modify: `src/models.js`
- Modify: `src/surface.js`
- Modify: `tests/autonomy-mission.test.js`
- Modify: `tests/surface.test.js`
- Modify: `tests/visual.test.js`
- Create: `tests/operations-acceptance.test.js`

**Interfaces:**
- Consumes: Tasks 1–5 contracts.
- Produces: a console runtime owning one UAV and two USVs, per-vehicle route trails, selected full-size camera, two low-cost preview renders/status views, and a tactical-map projection shared with the route editor.

- [ ] **Step 1: Write failing runtime acceptance tests**

Cover: console starts with the exact three-vehicle fleet; only selected vehicle receives manual commands; non-selected vehicles hold; route commands move both vehicle kinds; route manual override at `0.22`; gamepad disconnect holds; emergency stop/reenable; scenario load rebuilds a fresh session; console exits without writing result/progress/leaderboard state.

- [ ] **Step 2: Extend coastline tests before changing geometry**

Assert navigable water reaches at least 80 metres offshore from `shorelineZ`; both sea spawns are 25–30 metres offshore, inside `water.contains`, and parallel to the shoreline; visual water `surfaceY` and physical water bounds use the same shoreline contract.

- [ ] **Step 3: Run acceptance and coast tests and verify RED**

Run: `node --test tests/operations-acceptance.test.js tests/autonomy-mission.test.js tests/surface.test.js tests/visual.test.js`  
Expected: FAIL on missing runtime behavior and insufficient offshore water/spawns.

- [ ] **Step 4: Expand the sea workspace without moving the land shoreline**

Keep `shorelineZ: -40`; extend `water.contains` and the visible water plane to at least `z: -120`; place the two console USVs at `z` values between `-65` and `-70`. Preserve existing coast props, beach, rocks, and autonomous mission coordinates.

- [ ] **Step 5: Integrate per-vehicle simulation modes**

In each fixed simulation tick, choose manual, hold, route, or stopped commands from the Task 1 session. Continue using `step` for the UAV and `stepSurface` for USVs. Extend `stepSurface` with signed throttle and a bounded `maxReverseSpeed` so the approved forward/reverse controller mapping is real; existing autonomous commands remain forward-only and retain their current behavior. A stuck route transitions only that vehicle to `HOLD` with an error message.

- [ ] **Step 6: Integrate cameras and tactical projection**

Use the existing UAV FPV/chase logic. Add named USV deck/follow anchors in `makeSurfaceVehicle`; camera mode remains per vehicle. Project world `x/z` to the tactical map through one pure helper tested with shoreline and corner literals.

- [ ] **Step 7: Run focused and full verification**

Run: `node --test tests/operations-acceptance.test.js tests/autonomy-mission.test.js tests/surface.test.js tests/visual.test.js && npm test && npm run build && git diff --check`  
Expected: all tests PASS, Vite build exits 0, and diff check prints nothing.

- [ ] **Step 8: Perform browser acceptance**

On a desktop viewport, verify with the real UI: enter Operasyon Masası; select all three vehicles by fleet card and L1/R1; drive the UAV and each USV; switch cameras; draw/apply/cancel one air and one sea route; save/reload a scenario; disconnect or simulate loss; execute and re-enable emergency stop; confirm the USVs are visibly offshore. Inspect the browser console and accept no application-source errors.

- [ ] **Step 9: Update project documentation**

Document the console entry, controller map, scenario storage key, desktop-first limitation, and verification result in `README.md`, `CLAUDE.md`, and `.claude/sessions.md`.

- [ ] **Step 10: Commit**

```bash
git add src/main.js src/world.js src/models.js src/surface.js tests/autonomy-mission.test.js tests/surface.test.js tests/visual.test.js tests/operations-acceptance.test.js README.md CLAUDE.md .claude/sessions.md
git commit -m "feat: integrate UAV-USV operations workspace"
```

### Task 7: Whole-feature review and delivery verification

**Files:**
- Modify only files required by review findings.

**Interfaces:**
- Consumes: completed Tasks 1–6 and the approved spec.
- Produces: reviewed, regression-tested implementation ready for the user's chosen integration/deployment flow.

- [ ] **Step 1: Review the complete diff against the spec**

Check every spec section, the five Review Focus items, accidental dependencies on autonomous mission state, duplicate control logic, per-frame DOM allocation, localStorage corruption handling, and any unintended ranking/progress writes.

- [ ] **Step 2: Fix findings with test-first cycles**

For every behavior finding, add or adjust a test, verify it fails for the finding, implement the smallest fix, and rerun the focused test.

- [ ] **Step 3: Run final verification**

Run: `npm test && npm run build && git diff --check && git status --short`  
Expected: zero failed tests, successful production build, no whitespace errors, and only intentional files changed.

- [ ] **Step 4: Record verification evidence**

Update `.claude/sessions.md` with total test count, build result, desktop browser acceptance, controller coverage, and any explicitly deferred limitation.

- [ ] **Step 5: Commit review fixes/documentation if needed**

```bash
git add <reviewed-files> .claude/sessions.md
git commit -m "test: verify UAV-USV operations workspace"
```
