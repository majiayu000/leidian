// 雷电3 - 关卡与敌人生成器
// 每个关卡由若干时间触发的波次组成，波次结束后出现 Boss。

function _row(type, count, y, opts = {}) {
  for (let i = 0; i < count; i++) {
    const x = (i + 1) / (count + 1) * Game.W;
    Game.spawnEnemy(type, x, y, Object.assign({}, opts));
  }
}
function _pair(type, y, spread, opts = {}) {
  Game.spawnEnemy(type, Game.W / 2 - spread, y, opts);
  Game.spawnEnemy(type, Game.W / 2 + spread, y, opts);
}
function _diverCross(y) {
  Game.spawnEnemy('diver', Game.W * 0.2, y, { vx: 120, vy: 220 });
  Game.spawnEnemy('diver', Game.W * 0.8, y, { vx: -120, vy: 220 });
}

// 按关卡号生成波次列表
function buildWaves(level) {
  const waves = [];
  const diff = 1 + (level - 1) * 0.18; // 难度系数
  let t = 1.0;

  const blocks = 3 + Math.min(level, 6);
  for (let b = 0; b < blocks; b++) {
    const kind = b % 5;
    const n = Math.round(4 + level * 0.8 + b);
    if (kind === 0) {
      waves.push({ t, run: () => _row('grunt', n, -30, { vy: 130 * diff }) });
      t += 2.2;
    } else if (kind === 1) {
      waves.push({ t, run: () => _pair('zigzag', -30, 90, { amp: 80 }) });
      waves.push({ t: t + 0.6, run: () => _pair('zigzag', -30, 90, { amp: 80, baseX: Game.W * 0.5 }) });
      t += 2.6;
    } else if (kind === 2) {
      waves.push({ t, run: () => _pair('shooter', -30, 110, { stopY: 120 + b * 8 }) });
      t += 2.8;
    } else if (kind === 3) {
      waves.push({ t, run: () => _diverCross(-30) });
      t += 1.6;
    } else {
      waves.push({ t, run: () => Game.spawnEnemy('tank', Game.W / 2, -40, { stopY: 110 }) });
      waves.push({ t: t + 0.8, run: () => _row('grunt', Math.min(6, 2 + level), -30, { vy: 130 * diff }) });
      t += 3.4;
    }
    // 中途穿插杂兵
    if (b % 2 === 1) {
      waves.push({ t, run: () => _row('zigzag', 3 + Math.floor(level / 2), -30, { amp: 60 }) });
      t += 2.0;
    }
  }
  return waves;
}

class Spawner {
  constructor(level) {
    this.level = level;
    this.waves = buildWaves(level);
    this.idx = 0;
    this.timer = 0;
    this.done = false;
  }
  update(dt) {
    if (this.done) return;
    this.timer += dt;
    while (this.idx < this.waves.length && this.waves[this.idx].t <= this.timer) {
      this.waves[this.idx].run();
      this.idx++;
    }
    if (this.idx >= this.waves.length) this.done = true;
  }
}
