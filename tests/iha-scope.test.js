import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { opById, OPS } from '../src/missions.js';
import { ROOMS } from '../src/rooms.js';
import { LOBBIES } from '../server/rooms.mjs';
import { modeGuide } from '../src/briefing.js';

test('retired activities resolve to safe free flight, including old direct links', () => {
  for (const id of ['team', 'autonomy-coast-response', 'patrol', 'waves', 'final', 'boss', 'arena']) {
    assert.equal(opById(id).id, 'free', id);
  }
  assert.ok(OPS.every(op => !['patrol', 'waves', 'final', 'team', 'autonomy'].includes(op.kind)));
});

test('flight choices and public lobbies contain only aircraft activities', () => {
  assert.ok(!ROOMS.some(room => room.id === 'team'));
  assert.ok(!LOBBIES.includes('team'));
  assert.ok(!modeGuide('free', 'daily-2026-10-31').quick.some(op => op.id === 'autonomy-coast-response'));
});

test('home and flight UI have no retired controls or mixed fleet panels', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['home-autonomy', 'home-operations', 'operations-console', 'autonomy-panel', 'btn-fire', 'btn-fire-touch', 'hitmark', 'hp-fill', 'hud-bots', 'hud-score', 'gun']) {
    assert.ok(!new RegExp(`id=["']${id}["']`).test(html), id);
  }
});

test('flight styles remain valid and hide touch controls under overlays', () => {
  for (const name of ['style', 'theme']) {
    const css = readFileSync(new URL(`../src/${name}.css`, import.meta.url), 'utf8');
    assert.doesNotMatch(css, /^\s*\{/m, `${name}: selectorless rule`);
    if (name === 'style') {
      assert.match(css, /#flight\.menu-open\s+:is\(#sticks/);
      assert.match(css, /#flight\.has-result\s+:is\(#sticks/);
    }
  }
});

test('retired battle room activities fall back to free flight', async () => {
  const { roomOperation } = await import('../src/missions.js');
  for (const id of ['team', 'team-friends']) assert.equal(roomOperation(id, 'hover', { done: {} }).id, 'free');
});
