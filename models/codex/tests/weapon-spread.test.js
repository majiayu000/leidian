const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const patterns = {
  1: [0],
  2: [-0.09, 0.09],
  3: [-0.09, 0, 0.09],
  4: [-0.18, -0.09, 0, 0.09, 0.18],
};

function stubElement() {
  return {
    classList: { add() {}, remove() {} },
    textContent: '',
    hidden: false,
    style: {},
    replaceChildren() {},
    addEventListener() {},
    setPointerCapture() {},
    getContext() {
      return { setTransform() {} };
    },
    getBoundingClientRect() {
      return { width: 480, height: 720, left: 0, top: 0 };
    },
  };
}

function loadCodex() {
  const source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
  const sandbox = {
    devicePixelRatio: 1,
    document: { querySelector: () => stubElement() },
    localStorage: { getItem: () => null },
    requestAnimationFrame() {},
    window: { addEventListener() {} },
  };
  vm.runInNewContext(`${source}
Object.defineProperty(globalThis, 'player', {
  configurable: true,
  get() { return player; },
  set(value) { player = value; },
});
Object.defineProperty(globalThis, 'bullets', {
  configurable: true,
  get() { return bullets; },
  set(value) { bullets = value; },
});
globalThis.shoot = shoot;
`, sandbox, { filename: 'models/codex/game.js' });
  return sandbox;
}

function anglesOf(bullets) {
  return bullets.map((bullet) => Math.asin(bullet.vx / 230));
}

function assertAngles(actual, expected) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index += 1) {
    assert.ok(Math.abs(actual[index] - expected[index]) < 1e-9, `${actual[index]} !== ${expected[index]}`);
  }
}

function fire(power) {
  const game = loadCodex();
  game.player = { x: 240, y: 600, power, cooldown: 0 };
  game.bullets = [];
  game.shoot();
  return game;
}

for (const power of [1, 2, 3, 4]) {
  test(`power ${power} fires a centered pattern`, () => {
    const game = fire(power);
    const angles = anglesOf(game.bullets);
    assertAngles(angles, patterns[power]);
    const sum = angles.reduce((total, angle) => total + angle, 0);
    assert.ok(Math.abs(sum) < 1e-9, `sum ${sum}`);
    for (const bullet of game.bullets) {
      assert.equal(bullet.friendly, true);
      assert.equal(bullet.vy, -560);
      assert.equal(bullet.damage, 1);
      assert.equal(bullet.x, game.player.x);
      assert.equal(bullet.y, game.player.y - 22);
    }
  });
}

test('power 2 has no center shot', () => {
  const angles = anglesOf(fire(2).bullets);
  assert.equal(angles.some((angle) => Math.abs(angle) < 1e-9), false);
});

test('power 4 includes both outer angles and fires five bullets', () => {
  const game = fire(4);
  const angles = anglesOf(game.bullets);
  assert.equal(game.bullets.length, 5);
  assert.equal(angles.some((angle) => Math.abs(angle + 0.18) < 1e-9), true);
  assert.equal(angles.some((angle) => Math.abs(angle - 0.18) < 1e-9), true);
});

test('a second shoot while cooldown remains adds no bullets', () => {
  const game = fire(3);
  const fired = game.bullets.length;
  assert.ok(game.player.cooldown > 0);
  game.shoot();
  assert.equal(game.bullets.length, fired);
});
