'use strict';

/**
 * 游戏实体 — 玩家、敌机、子弹、道具、粒子
 */

const CANVAS_W = 480;
const CANVAS_H = 720;

// ─── 玩家 ───────────────────────────────────────────────
class Player {
  constructor() {
    this.x = CANVAS_W / 2;
    this.y = CANVAS_H - 80;
    this.w = 32;
    this.h = 36;
    this.speed = 5;
    this.fireRate = 8; // 帧间隔
    this.fireCooldown = 0;
    this.power = 1; // 火力等级 1-5
    this.lives = 3;
    this.bombs = 2;
    this.invincible = 0; // 无敌帧数
    this.alive = true;
  }

  update(input) {
    if (!this.alive) return;

    if (input.mouseActive) {
      const dx = input.mouseX - this.x;
      const dy = input.mouseY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 3) {
        const move = Math.min(this.speed, dist);
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
      }
    } else {
      if (input.left) this.x -= this.speed;
      if (input.right) this.x += this.speed;
      if (input.up) this.y -= this.speed;
      if (input.down) this.y += this.speed;
    }

    // 边界限制
    this.x = Math.max(this.w / 2, Math.min(CANVAS_W - this.w / 2, this.x));
    this.y = Math.max(this.h / 2, Math.min(CANVAS_H - this.h / 2, this.y));

    if (this.fireCooldown > 0) this.fireCooldown--;
    if (this.invincible > 0) this.invincible--;
  }

  canFire() {
    return this.alive && this.fireCooldown <= 0;
  }

  fire() {
    this.fireCooldown = this.fireRate;
    const bullets = [];
    const bx = this.x;
    const by = this.y - this.h / 2;

    switch (this.power) {
      case 1:
        bullets.push(new Bullet(bx, by, 0, -10, 'player'));
        break;
      case 2:
        bullets.push(new Bullet(bx - 6, by, 0, -10, 'player'));
        bullets.push(new Bullet(bx + 6, by, 0, -10, 'player'));
        break;
      case 3:
        bullets.push(new Bullet(bx, by, 0, -10, 'player'));
        bullets.push(new Bullet(bx - 10, by, -1.5, -9.5, 'player'));
        bullets.push(new Bullet(bx + 10, by, 1.5, -9.5, 'player'));
        break;
      case 4:
        bullets.push(new Bullet(bx - 5, by, 0, -10, 'player'));
        bullets.push(new Bullet(bx + 5, by, 0, -10, 'player'));
        bullets.push(new Bullet(bx - 14, by, -2, -9, 'player'));
        bullets.push(new Bullet(bx + 14, by, 2, -9, 'player'));
        break;
      default: // 5
        bullets.push(new Bullet(bx, by, 0, -11, 'player'));
        bullets.push(new Bullet(bx - 8, by, -1, -10, 'player'));
        bullets.push(new Bullet(bx + 8, by, 1, -10, 'player'));
        bullets.push(new Bullet(bx - 16, by, -2.5, -9, 'player'));
        bullets.push(new Bullet(bx + 16, by, 2.5, -9, 'player'));
        break;
    }
    return bullets;
  }

  hit() {
    if (this.invincible > 0) return false;
    this.lives--;
    this.invincible = 120; // 2 秒无敌
    this.power = Math.max(1, this.power - 1);
    if (this.lives <= 0) {
      this.alive = false;
    }
    return true;
  }

  useBomb() {
    if (this.bombs <= 0) return false;
    this.bombs--;
    return true;
  }
}

// ─── 子弹 ───────────────────────────────────────────────
class Bullet {
  constructor(x, y, vx, vy, owner, radius = 3) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.owner = owner; // 'player' | 'enemy'
    this.radius = radius;
    this.active = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < -20 || this.y > CANVAS_H + 20 ||
        this.x < -20 || this.x > CANVAS_W + 20) {
      this.active = false;
    }
  }
}

// ─── 敌机类型定义 ─────────────────────────────────────────
const ENEMY_TYPES = {
  scout: {
    w: 24, h: 24, hp: 1, speed: 2.5, score: 100,
    fireRate: 0, color: '#ff6644',
  },
  fighter: {
    w: 30, h: 30, hp: 3, speed: 1.8, score: 200,
    fireRate: 90, color: '#ffaa00',
  },
  tank: {
    w: 40, h: 40, hp: 8, speed: 1.0, score: 500,
    fireRate: 60, color: '#cc44ff',
  },
  boss: {
    w: 64, h: 56, hp: 60, speed: 0.6, score: 5000,
    fireRate: 30, color: '#ff2255',
  },
};

class Enemy {
  constructor(type, x, pattern = 'straight') {
    const def = ENEMY_TYPES[type];
    this.type = type;
    this.x = x;
    this.y = -def.h;
    this.w = def.w;
    this.h = def.h;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.speed = def.speed;
    this.score = def.score;
    this.fireRate = def.fireRate;
    this.fireCooldown = def.fireRate > 0 ? Math.floor(Math.random() * def.fireRate) : 0;
    this.color = def.color;
    this.pattern = pattern;
    this.active = true;
    this.time = 0;
    this.startX = x;
  }

  update() {
    this.time++;

    switch (this.pattern) {
      case 'straight':
        this.y += this.speed;
        break;
      case 'sine':
        this.y += this.speed;
        this.x = this.startX + Math.sin(this.time * 0.04) * 60;
        break;
      case 'zigzag':
        this.y += this.speed;
        this.x += Math.sign(Math.sin(this.time * 0.05)) * 1.5;
        break;
      case 'boss':
        if (this.y < 80) {
          this.y += this.speed;
        } else {
          this.x = this.startX + Math.sin(this.time * 0.02) * 120;
        }
        break;
    }

    // 出屏销毁
    if (this.y > CANVAS_H + this.h) {
      this.active = false;
    }

    // 射击
    if (this.fireRate > 0 && this.y > 0) {
      this.fireCooldown--;
      if (this.fireCooldown <= 0) {
        this.fireCooldown = this.fireRate;
        return this._fire();
      }
    }
    return [];
  }

  _fire() {
    const cx = this.x;
    const cy = this.y + this.h / 2;

    if (this.type === 'boss') {
      // Boss 扇形弹幕
      const bullets = [];
      for (let i = -2; i <= 2; i++) {
        bullets.push(new Bullet(cx, cy, i * 1.5, 4, 'enemy', 4));
      }
      return bullets;
    }
    if (this.type === 'tank') {
      return [
        new Bullet(cx - 10, cy, -0.5, 3.5, 'enemy', 4),
        new Bullet(cx + 10, cy, 0.5, 3.5, 'enemy', 4),
      ];
    }
    // fighter 单发
    return [new Bullet(cx, cy, 0, 4, 'enemy', 3)];
  }

  hit(damage = 1) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.active = false;
      return true; // 被击毁
    }
    return false;
  }
}

// ─── 道具 ───────────────────────────────────────────────
const POWERUP_TYPES = ['power', 'bomb', 'life'];

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'power' | 'bomb' | 'life'
    this.radius = 12;
    this.speed = 1.5;
    this.active = true;
    this.time = 0;
  }

  update() {
    this.time++;
    this.y += this.speed;
    this.x += Math.sin(this.time * 0.05) * 0.5;
    if (this.y > CANVAS_H + 20) this.active = false;
  }
}

// ─── 粒子（爆炸效果）───────────────────────────────────────
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 20 + Math.random() * 20;
    this.maxLife = this.life;
    this.radius = 1 + Math.random() * 3;
    this.color = color;
    this.active = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life--;
    if (this.life <= 0) this.active = false;
  }
}

function spawnExplosion(x, y, color, count = 12) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
  return particles;
}

// ─── 碰撞检测 ─────────────────────────────────────────────
function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = Math.max(rx - rw / 2, Math.min(cx, rx + rw / 2));
  const closestY = Math.max(ry - rh / 2, Math.min(cy, ry + rh / 2));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

function circleCircle(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dist = r1 + r2;
  return dx * dx + dy * dy < dist * dist;
}
