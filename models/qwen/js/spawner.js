'use strict';

/**
 * 波次系统 — 敌机生成和关卡推进
 */

// 波次定义：每波包含若干生成组
const WAVES = [
  // 波次 1：侦察机编队
  { groups: [
    { type: 'scout', count: 5, interval: 30, pattern: 'straight', delay: 0 },
    { type: 'scout', count: 5, interval: 30, pattern: 'sine', delay: 100 },
  ]},
  // 波次 2：战斗机出现
  { groups: [
    { type: 'scout', count: 4, interval: 25, pattern: 'zigzag', delay: 0 },
    { type: 'fighter', count: 3, interval: 60, pattern: 'straight', delay: 60 },
    { type: 'scout', count: 4, interval: 20, pattern: 'sine', delay: 180 },
  ]},
  // 波次 3：混编
  { groups: [
    { type: 'fighter', count: 4, interval: 50, pattern: 'sine', delay: 0 },
    { type: 'tank', count: 1, interval: 0, pattern: 'straight', delay: 120 },
    { type: 'scout', count: 6, interval: 15, pattern: 'zigzag', delay: 200 },
  ]},
  // 波次 4：坦克推进
  { groups: [
    { type: 'tank', count: 2, interval: 90, pattern: 'straight', delay: 0 },
    { type: 'fighter', count: 5, interval: 40, pattern: 'sine', delay: 60 },
    { type: 'fighter', count: 3, interval: 40, pattern: 'zigzag', delay: 200 },
  ]},
  // 波次 5：Boss
  { groups: [
    { type: 'scout', count: 6, interval: 20, pattern: 'sine', delay: 0 },
    { type: 'boss', count: 1, interval: 0, pattern: 'boss', delay: 120 },
  ]},
];

class Spawner {
  constructor() {
    this.wave = 0;
    this.frame = 0;
    this.queue = []; // { type, pattern, spawnAt }
    this.waveActive = false;
    this.waveCleared = false;
    this.betweenWaves = 0; // 波间休息帧数
  }

  get currentWave() {
    return this.wave + 1;
  }

  startWave(waveIndex) {
    this.wave = waveIndex % WAVES.length;
    this.frame = 0;
    this.queue = [];
    this.waveActive = true;
    this.waveCleared = false;

    const waveDef = WAVES[this.wave];
    // 难度缩放：非首轮时增加 HP
    const lap = Math.floor(waveIndex / WAVES.length);

    for (const group of waveDef.groups) {
      for (let i = 0; i < group.count; i++) {
        this.queue.push({
          type: group.type,
          pattern: group.pattern,
          spawnAt: group.delay + i * group.interval,
          lap,
        });
      }
    }
  }

  update(enemies) {
    if (this.betweenWaves > 0) {
      this.betweenWaves--;
      if (this.betweenWaves <= 0) {
        this.startWave(this.wave + (this.waveCleared ? 1 : 0));
      }
      return;
    }

    if (!this.waveActive) {
      this.startWave(0);
      return;
    }

    this.frame++;

    // 生成到时间的敌机
    const remaining = [];
    for (const item of this.queue) {
      if (this.frame >= item.spawnAt) {
        const x = 40 + Math.random() * (CANVAS_W - 80);
        const enemy = new Enemy(item.type, x, item.pattern);
        // 难度缩放
        if (item.lap > 0) {
          enemy.hp += item.lap * 2;
          enemy.maxHp = enemy.hp;
          enemy.speed += item.lap * 0.2;
        }
        enemies.push(enemy);
      } else {
        remaining.push(item);
      }
    }
    this.queue = remaining;

    // 波次完成判定：队列空 + 场上无敌机
    if (this.queue.length === 0 && enemies.length === 0) {
      this.waveActive = false;
      this.waveCleared = true;
      this.betweenWaves = 120; // 2 秒休息
    }
  }
}
