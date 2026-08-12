const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const hyRoot = path.resolve(__dirname, '..');

function evaluate(relativePath, context, exports) {
  const source = fs.readFileSync(path.join(hyRoot, relativePath), 'utf8');
  vm.runInNewContext(`${source}\n${exports}`, context, { filename: relativePath });
}

test('WASD normalization is stable with Shift and Caps Lock', () => {
  const listeners = {};
  const context = {
    window: { addEventListener: (name, handler) => { listeners[name] = handler; } },
  };
  evaluate('js/input.js', context, 'this.Input = Input;');
  context.Input.init();
  const event = key => ({ key, preventDefault() {} });

  listeners.keydown(event('W'));
  assert.equal(context.Input.down('up'), true);
  listeners.keydown(event('Shift'));
  listeners.keyup(event('W'));
  assert.equal(context.Input.down('up'), false);
  assert.equal(context.Input.down('bomb'), true);
});

test('bomb damage uses enemy and boss hit handlers', () => {
  let enemyKills = 0;
  let bossKills = 0;
  const context = {
    Audio: { bomb() {} },
    Game: {
      W: 480,
      H: 720,
      enemyBullets: [{ dead: false }],
      enemies: [],
      boss: null,
      player: null,
      onEnemyKilled(enemy) {
        enemyKills++;
        this.score += enemy.score;
      },
      onBossKilled() { bossKills++; },
      addParticle() {},
      addExplosion() {},
      score: 0,
      screenShake: 0,
    },
    Input: { down: () => false },
    Utils: { clamp: value => value, rand: min => min },
  };
  evaluate('js/entities.js', context, 'this.Player = Player; this.Enemy = Enemy; this.Boss = Boss;');

  const player = new context.Player();
  const enemy = new context.Enemy('grunt', 100, 100);
  const boss = new context.Boss(1);
  boss.state = 'fight';
  boss.hp = 40;
  context.Game.enemies = [enemy];
  context.Game.boss = boss;
  context.Game.player = player;
  player.bomb();

  assert.equal(enemy.dead, true);
  assert.equal(context.Game.score, enemy.score);
  assert.equal(enemyKills, 1);
  assert.equal(boss.dead, true);
  assert.equal(bossKills, 1);
  assert.equal(context.Game.enemyBullets[0].dead, true);
});

test('enemy collision applies the bullet damage through Player.hit', () => {
  const context = {
    Audio: {
      bossExplosion() {},
      hit() {},
      levelClear() {},
      playerHit() {},
    },
    localStorage: { setItem() {} },
    Input: { down: () => false },
    Utils: { choice: values => values[0], circleHit: () => true, clamp: value => value, rand: min => min },
    requestAnimationFrame() {},
    setTimeout() {},
  };
  evaluate(
    'js/entities.js',
    context,
    'this.Player = Player; this.Bullet = Bullet; this.Enemy = Enemy; this.Boss = Boss; this.Particle = Particle; this.PowerUp = PowerUp;',
  );
  context.Spawner = class {};
  evaluate('js/game.js', context, 'this.Game = Game;');

  const player = new context.Player();
  player.invuln = 0;
  const bullet = new context.Bullet(100, 100, 0, 0, { damage: 2 });
  context.Game.player = player;
  context.Game.bullets = [];
  context.Game.enemyBullets = [bullet];
  context.Game.enemies = [];
  context.Game.boss = null;
  context.Game.powerups = [];

  context.Game._collisions();

  assert.equal(player.lives, 1);
  assert.equal(bullet.dead, true);
});

test('winning the final level persists a new high score', () => {
  const stored = new Map();
  const context = {
    Audio: { bossExplosion() {}, levelClear() {} },
    Bullet: class {},
    Boss: class {},
    Enemy: class {},
    Input: {},
    Particle: class {},
    Player: class {},
    PowerUp: class {},
    Spawner: class {},
    Utils: { choice: values => values[0], clamp: value => value, rand: min => min },
    localStorage: { setItem: (key, value) => stored.set(key, value) },
    requestAnimationFrame() {},
    setTimeout() {},
  };
  evaluate('js/game.js', context, 'this.Game = Game;');
  context.Game.level = context.Game.MAX_LEVEL;
  context.Game.score = 7200;
  context.Game.highScore = 5000;
  context.Game.enemyBullets = [];
  context.Game.powerups = [];

  context.Game.onBossKilled({ x: 100, y: 100 });

  assert.equal(context.Game.state, 'victory');
  assert.equal(context.Game.highScore, 17200);
  assert.equal(stored.get('leidian3_hi'), '17200');
});

test('tank drops exactly one reward for every random value', () => {
  const context = {
    Audio: {},
    Bullet: class {}, Boss: class {}, Enemy: class {}, Input: {}, Particle: class {}, Player: class {},
    PowerUp: class { constructor(x, y, type) { this.x = x; this.y = y; this.type = type; } },
    Spawner: class {},
    Utils: {}, localStorage: {}, requestAnimationFrame() {}, setTimeout() {},
  };
  evaluate('js/game.js', context, 'this.Game = Game;');
  for (const value of [0, 0.29, 0.99]) {
    context.Math = Object.create(Math);
    context.Math.random = () => value;
    context.Game.powerups = [];
    context.Game._maybeDrop(10, 20, 'tank');
    assert.equal(context.Game.powerups.length, 1);
  }
});

test('delayed boss effects do not leak into a restarted run', () => {
  const callbacks = [];
  const context = {
    Audio: { bossExplosion() {}, levelClear() {}, resume() {} },
    Bullet: class {}, Boss: class {}, Enemy: class {}, Input: {}, Particle: class {}, Player: class {},
    PowerUp: class {}, Spawner: class {},
    Utils: { choice: values => values[0], rand: min => min },
    localStorage: { setItem() {} }, requestAnimationFrame() {},
    setTimeout: callback => { callbacks.push(callback); },
  };
  evaluate('js/game.js', context, 'this.Game = Game;');
  context.Game.addExplosion = () => { throw new Error('stale explosion ran'); };
  context.Game.level = context.Game.MAX_LEVEL;
  context.Game.enemyBullets = [];
  context.Game.powerups = [];
  context.Game.runId = 3;
  context.Game.onBossKilled({ x: 100, y: 100 });
  context.Game.startGame();

  assert.equal(callbacks.length, 5);
  callbacks.forEach(callback => callback());
});

test('lethal projectile stops later collision score mutations', () => {
  const stored = new Map();
  const context = {
    Audio: { gameOver() {}, hit() {}, playerHit() {}, powerup() {} },
    Input: {},
    Utils: { circleHit: () => true },
    localStorage: { setItem: (key, value) => stored.set(key, value) },
    requestAnimationFrame() {}, setTimeout() {},
    Bullet: class {}, Boss: class {}, Enemy: class {}, Particle: class {}, PowerUp: class {}, Player: class {}, Spawner: class {},
  };
  evaluate('js/game.js', context, 'this.Game = Game;');
  const player = {
    dead: false,
    lives: 1,
    hit() { this.dead = true; context.Game.onPlayerDeath(); },
  };
  context.Game.player = player;
  context.Game.score = 500;
  context.Game.highScore = 0;
  context.Game.bullets = [];
  context.Game.enemyBullets = [{ dead: false, damage: 1 }];
  context.Game.enemies = [];
  context.Game.boss = null;
  context.Game.powerups = [{ dead: false, type: 'score' }];

  context.Game._collisions();

  assert.equal(context.Game.score, 500);
  assert.equal(context.Game.powerups[0].dead, false);
  assert.equal(stored.get('leidian3_hi'), '500');
});

test('canvas scaling reserves stage padding, hint height, and flex gap', () => {
  const stage = {
    clientWidth: 600,
    clientHeight: 800,
  };
  const hint = {
    getBoundingClientRect: () => ({ height: 20 }),
  };
  const context = {
    Game: { W: 480, H: 720 },
    getComputedStyle(element) {
      if (element === stage) {
        return {
          paddingLeft: '8px',
          paddingRight: '8px',
          paddingTop: '8px',
          paddingBottom: '8px',
          rowGap: '10px',
        };
      }
      return { display: 'block' };
    },
    window: { addEventListener() {} },
  };
  evaluate('js/main.js', context, 'this.calculateCanvasScale = calculateCanvasScale;');

  assert.equal(context.calculateCanvasScale(stage, hint), 754 / 720);

  stage.clientWidth = 256;
  stage.clientHeight = 900;
  assert.equal(context.calculateCanvasScale(stage, hint), 0.5);
});

test('canvas scaling does not reserve a hidden hint or its gap', () => {
  const stage = {
    clientWidth: 600,
    clientHeight: 736,
  };
  const hint = {
    getBoundingClientRect: () => ({ height: 20 }),
  };
  const context = {
    Game: { W: 480, H: 720 },
    getComputedStyle(element) {
      if (element === stage) {
        return {
          paddingLeft: '8px',
          paddingRight: '8px',
          paddingTop: '8px',
          paddingBottom: '8px',
          rowGap: '10px',
        };
      }
      return { display: 'none' };
    },
    window: { addEventListener() {} },
  };
  evaluate('js/main.js', context, 'this.calculateCanvasScale = calculateCanvasScale;');

  assert.equal(context.calculateCanvasScale(stage, hint), 1);
});
