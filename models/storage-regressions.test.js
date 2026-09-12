const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function el(overrides = {}) {
  return {
    style: {},
    classList: { add() {}, remove() {} },
    hidden: true,
    textContent: '',
    replaceChildren() {},
    addEventListener() {},
    getBoundingClientRect: () => ({ width: 480, height: 720, left: 0, top: 0 }),
    setPointerCapture() {},
    getContext: () => ({
      setTransform() {},
      clearRect() {},
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      stroke() {},
      fill() {},
      fillRect() {},
      ellipse() {},
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }),
    width: 480,
    height: 720,
    ...overrides,
  };
}

function blockedStorage() {
  return {
    getItem() { throw new Error('storage blocked'); },
    setItem() { throw new Error('storage blocked'); },
  };
}

test('Codex boots and keeps in-memory high score when localStorage throws', () => {
  let animationScheduled = false;
  const source = fs.readFileSync(path.join(__dirname, 'codex/game.js'), 'utf8');
  const nodes = new Map([
    ['#game', el()],
    ['#score', el()],
    ['#highScore', el()],
    ['#stage', el()],
    ['#lives', el()],
    ['#powerPips', el()],
    ['#startScreen', el()],
    ['#gameOverScreen', el()],
    ['#finalScore', el()],
    ['#newRecord', el()],
    ['#pauseLabel', el()],
    ['#bossBar', el()],
    ['#bossHealth', el()],
    ['#startButton', el()],
    ['#restartButton', el()],
  ]);
  const context = {
    console,
    Math,
    Number,
    String,
    Array,
    Object,
    Set,
    devicePixelRatio: 1,
    performance: { now: () => 0 },
    localStorage: blockedStorage(),
    requestAnimationFrame() { animationScheduled = true; },
    document: {
      querySelector: (sel) => nodes.get(sel) || el(),
      createElement: () => el(),
    },
    window: { addEventListener() {} },
  };
  context.globalThis = context;

  assert.doesNotThrow(() => {
    vm.runInNewContext(
      `${source}\nglobalThis.__codex = {\n  endGame,\n  get highScore() { return highScore; },\n  get highScoreStorageAvailable() { return highScoreStorageAvailable; },\n  set score(v) { score = v; },\n};`,
      context,
      { filename: 'codex/game.js' },
    );
  });
  assert.equal(animationScheduled, true);
  assert.equal(context.__codex.highScore, 0);
  assert.equal(context.__codex.highScoreStorageAvailable, false);

  context.__codex.score = 900;
  assert.doesNotThrow(() => context.__codex.endGame());
  assert.equal(context.__codex.highScore, 900);
  assert.equal(context.__codex.highScoreStorageAvailable, false);
});

test('Kimi boots and keeps in-memory high score when localStorage throws', () => {
  let animationScheduled = false;
  const source = fs.readFileSync(path.join(__dirname, 'kimi-k3/game.js'), 'utf8');
  const canvas = el();
  const instrumented = source
    .replace(
      "'use strict';\n(() => {\n",
      "'use strict';\nglobalThis.__kimi = {};\n(() => {\n",
    )
    .replace(
      /\}\)\(\);\s*$/,
      `Object.defineProperty(globalThis.__kimi, 'best', { get() { return best; } });
Object.defineProperty(globalThis.__kimi, 'bestStorageAvailable', { get() { return bestStorageAvailable; } });
Object.defineProperty(globalThis.__kimi, 'score', {
  get() { return score; },
  set(v) { score = v; },
});
globalThis.__kimi.gameOver = gameOver;
})();
`,
    );

  const context = {
    console,
    Math,
    parseInt,
    String,
    Object,
    Array,
    Float32Array,
    performance: { now: () => 0 },
    localStorage: blockedStorage(),
    requestAnimationFrame() { animationScheduled = true; },
    document: {
      getElementById: (id) => (id === 'game' ? canvas : el()),
    },
    window: {
      addEventListener() {},
      AudioContext: function AudioContext() {
        this.state = 'running';
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.destination = {};
        this.resume = () => {};
        this.createOscillator = () => ({
          type: 'square',
          connect() { return this; },
          frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          start() {},
          stop() {},
        });
        this.createGain = () => ({
          connect() { return this; },
          gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        });
        this.createBuffer = () => ({ getChannelData: () => new Float32Array(8) });
        this.createBufferSource = () => ({
          connect() { return this; },
          start() {},
          buffer: null,
        });
        this.createBiquadFilter = () => ({
          connect() { return this; },
          type: '',
          frequency: { value: 0 },
        });
      },
    },
  };
  context.globalThis = context;

  assert.doesNotThrow(() => {
    vm.runInNewContext(instrumented, context, { filename: 'kimi-k3/game.js' });
  });
  assert.equal(animationScheduled, true);
  assert.equal(context.__kimi.best, 0);
  assert.equal(context.__kimi.bestStorageAvailable, false);

  context.__kimi.score = 1200;
  assert.doesNotThrow(() => context.__kimi.gameOver());
  assert.equal(context.__kimi.best, 1200);
  assert.equal(context.__kimi.bestStorageAvailable, false);
});
