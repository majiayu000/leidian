const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function create_context(storage) {
  const elements = new Map();
  const drawing = new Proxy({}, { get: (target, name) => target[name] || (() => {}) });
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      width: 480, height: 720, style: {}, textContent: '',
      classList: { add() {}, remove() {} },
      addEventListener() {}, replaceChildren() {},
      getContext: () => drawing,
      getBoundingClientRect: () => ({ width: 480, height: 720 }),
    });
    return elements.get(id);
  }
  const frames = [], warnings = [];
  const context = vm.createContext({
    document: { getElementById: element, querySelector: element, createElement: element },
    window: { addEventListener() {} }, devicePixelRatio: 1,
    performance: { now: () => 0 },
    requestAnimationFrame: callback => frames.push(callback),
    console: { warn: (...args) => warnings.push(args) },
  });
  Object.defineProperty(context, 'localStorage', storage);
  return { context, frames, warnings, elements };
}

function load_game(model, storage) {
  const game = create_context(storage);
  let source = fs.readFileSync(path.join(__dirname, model, 'game.js'), 'utf8');
  const high_score = model === 'codex' ? 'highScore' : 'best';
  const end_game = model === 'codex' ? 'endGame' : 'gameOver';
  const probe = `globalThis.probe = {
    finish(value) { score = value; ${end_game}(); },
    get high_score() { return ${high_score}; },
    get state() { return state; },
  };`;
  if (model === 'codex') source += '\n' + probe;
  else source = source.replace(/\}\)\(\);\s*$/, probe + '\n})();');
  vm.runInContext(source, game.context);
  return game;
}

for (const model of ['codex', 'kimi-k3']) {
  const key = model === 'codex' ? 'thunder-high-score' : 'raiden_best';
  for (const failure of ['access', 'read']) {
    test(`${model} boots and retains a session record when storage ${failure} fails`, () => {
      const denied = () => { throw new Error('Storage denied'); };
      const storage = failure === 'access' ? { get: denied } : { value: { getItem: denied, setItem: denied } };
      const game = load_game(model, storage);
      assert.equal(game.frames.length, 1);
      assert.equal(game.context.probe.high_score, 0);
      game.context.probe.finish(800);
      assert.equal(game.context.probe.high_score, 800);
      assert.equal(game.context.probe.state, 'gameover');
      game.context.probe.finish(400);
      assert.equal(game.context.probe.high_score, 800);
      assert.equal(game.warnings.length, 2);
      if (model === 'codex') assert.equal(game.elements.get('#finalScore').textContent, '000400');
    });
  }
  test(`${model} completes game over when saving the record fails`, () => {
    const game = load_game(model, { value: {
      getItem: () => '500', setItem: () => { throw new Error('Quota exceeded'); },
    } });
    assert.equal(game.context.probe.high_score, 500);
    game.context.probe.finish(900);
    assert.equal(game.context.probe.high_score, 900);
    assert.equal(game.context.probe.state, 'gameover');
    assert.equal(game.warnings.length, 1);
    if (model === 'codex') assert.equal(game.elements.get('#finalScore').textContent, '000900');
  });
  test(`${model} keeps the existing storage key and saves only higher scores`, () => {
    const writes = [];
    const game = load_game(model, { value: {
      getItem: requested => { assert.equal(requested, key); return '500'; },
      setItem: (requested, value) => writes.push([requested, value]),
    } });
    game.context.probe.finish(400);
    assert.equal(game.context.probe.high_score, 500);
    assert.deepEqual(writes, []);
    game.context.probe.finish(900);
    assert.deepEqual(writes, [[key, '900']]);
    assert.equal(game.warnings.length, 0);
  });
}

test('both comparison frames allow scripts without sharing the parent origin', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const frames = [...html.matchAll(/<iframe\b[^>]*>/g)].map(match => match[0]);
  assert.equal(frames.length, 2);
  for (const frame of frames) assert.match(frame, /sandbox="allow-scripts"/);
});

test('Qwen loads its declared scripts without CORS-dependent module requests', () => {
  const html = fs.readFileSync(path.join(__dirname, 'qwen/index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)src="([^"]+)"[^>]*><\/script>/g)];
  assert.ok(scripts.length > 0);
  const game = create_context({ value: {} });
  for (const [, attributes, src] of scripts) {
    assert.doesNotMatch(attributes, /type="module"/);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'qwen', src), 'utf8'), game.context, { filename: src });
  }
  assert.equal(game.frames.length, 1);
  vm.runInContext('startGame(); audio.enabled = false;', game.context);
  game.frames.shift()();
  game.frames.shift()();
  assert.equal(vm.runInContext('state', game.context), 'playing');
  assert.ok(vm.runInContext('bullets.length > 0 && enemies.length > 0', game.context));
  assert.equal(game.frames.length, 1);
});
