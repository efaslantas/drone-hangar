import test from "node:test";
import assert from "node:assert/strict";

const listeners = new Map();
globalThis.window = {
  addEventListener(name, handler) { listeners.set(name, handler); },
};

const buttons = Array.from({ length: 10 }, () => ({ pressed: false, value: 0 }));
const pad = { id: "DualSense", index: 0, axes: [0, 0, 0, 0], buttons };
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { getGamepads: () => [pad] },
});

const { poll, consume } = await import("../src/input.js");

function resetButtons() {
  for (const button of buttons) Object.assign(button, { pressed: false, value: 0 });
  poll(10_000);
  for (const action of ["vehiclePrev", "vehicleNext", "emergencyStop", "consoleHelp"]) consume(action);
}

test("typing in an editable field never becomes a flight command", () => {
  resetButtons();
  listeners.get("keydown")({ code: "KeyW", target: { matches: () => true }, preventDefault() {} });
  assert.equal(Math.abs(poll(30_000).lift), 0);
});

test('flight buttons and trigger remain usable without weapon actions', () => {
  resetButtons();
  buttons[0].pressed = true;
  buttons[9].pressed = true;
  buttons[5].pressed = true;
  const input = poll();
  assert.equal(consume('arm'), true);
  assert.equal(consume('help'), true);
  assert.equal(Object.hasOwn(input, 'fire'), false);
  poll();
  assert.equal(consume('arm'), false);
});

test('two touch sticks keep independent axes and release on cancellation', async () => {
  const { bindFlightTouches } = await import('../src/input.js');
  const handlers = new Map();
  window.innerWidth = 1000;
  globalThis.document = { elementFromPoint: () => null, getElementById: () => null };
  bindFlightTouches({ addEventListener(name, handler) { handlers.set(name, handler); } });
  const event = touches => ({ changedTouches: touches, preventDefault() {}, target: {} });
  handlers.get('touchstart')(event([
    { identifier: 1, clientX: 200, clientY: 300 },
    { identifier: 2, clientX: 800, clientY: 300 },
  ]));
  handlers.get('touchmove')(event([
    { identifier: 1, clientX: 244, clientY: 256 },
    { identifier: 2, clientX: 756, clientY: 256 },
  ]));
  const input = poll();
  assert.ok(input.yaw > 0 && input.lift > 0);
  assert.ok(input.roll < 0 && input.pitch > 0);
  handlers.get('touchcancel')(event([{ identifier: 1 }, { identifier: 2 }]));
  const released = poll();
  assert.ok([released.lift, released.yaw, released.pitch, released.roll].every(v => Math.abs(v) === 0));
});

test('keyboard activation invokes a menu button once without a pointer event', async () => {
  const { bindTap } = await import('../src/input.js');
  const handlers = new Map(); let calls=0;
  bindTap({ addEventListener(name,fn) { handlers.set(name,fn); } }, () => calls++);
  const event={ detail:0, preventDefault(){}, stopPropagation(){} };
  handlers.get('click')(event);
  assert.equal(calls,1);
  handlers.get('pointerdown')(event);
  handlers.get('click')({ ...event, detail:1 });
  assert.equal(calls,2,'a physical click is not invoked twice');
});

test('Space activates a focused UI button natively without also requesting flight ARM',()=>{
 resetButtons();buttons[0].pressed=false;buttons[9].pressed=false;poll();consume('arm');
 let prevented=false;listeners.get('keydown')({code:'Space',target:{matches:()=>false,closest:()=>({tagName:'BUTTON'})},preventDefault(){prevented=true}});
 poll();assert.equal(consume('arm'),false);assert.equal(prevented,false);
 listeners.get('keyup')({code:'Space'});poll();
 listeners.get('keydown')({code:'Space',target:{matches:()=>false,closest:()=>null},preventDefault(){prevented=true}});
 poll();assert.equal(consume('arm'),true);assert.equal(prevented,true);listeners.get('keyup')({code:'Space'});poll();
});
