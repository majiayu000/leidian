// 敌人: 编队生成 + 三种小怪 + Boss
import { W, H } from './config.js';
import { fireEnemy } from './bullets.js';

export const list = [];

function make(type, x, y, extra = {}) {
  const base = {
    drone: { hp: 1, r: 13, score: 100, color: '#ff4d6d' },
    sine: { hp: 3, r: 16, score: 250, color: '#c65cff' },
    tank: { hp: 7, r: 22, score: 600, color: '#ff9c39' },
    boss: { hp: 100, r: 46, score: 5000, color: '#ff2d55' },
  }[type];
  const e = {
    type, x, y,
    t: 0,
    hp: base.hp,
    r: base.r,
    score: base.score,
    color: base.color,
    vx: 0,
    bx: x,
    fireCd: 1 + Math.random() * 1.5,
  };
  Object.assign(e, extra);
  e.maxHp = e.hp;
  list.push(e);
  return e;
}

export function clear() {
  list.length = 0;
}

export function getBoss() {
  for (const e of list) if (e.type === 'boss') return e;
  return null;
}

export function spawnBoss(wave) {
  make('boss', W / 2, -80, { hp: 80 + wave * 15 });
}

// 随时间刷怪; Boss 在场时不再刷小怪
const dir = { timer: 1.4 };

export function resetDirector() {
  dir.timer = 1.4;
}

export function spawnUpdate(dt, wave) {
  if (getBoss()) return;
  dir.timer -= dt;
  if (dir.timer > 0) return;
  dir.timer = Math.max(0.65, 1.8 - wave * 0.12);
  const roll = Math.random();
  if (roll < 0.5) {
    // V 字机群俯冲
    const cx = 70 + Math.random() * (W - 140);
    for (let i = -2; i <= 2; i++) make('drone', cx + i * 36, -26 - Math.abs(i) * 16);
  } else if (roll < 0.8) {
    // 正弦横移, 直线向下射击
    const bx = 110 + Math.random() * (W - 220);
    make('sine', bx, -30, { bx });
  } else {
    // 横向穿行装甲舰, 扇形弹幕
    const side = Math.random() < 0.5 ? 1 : -1;
    make('tank', side > 0 ? -24 : W + 24, 40 + Math.random() * 120, {
      vx: side * (26 + wave * 2),
    });
  }
}

function fireFan(e, n, spread, speed, player) {
  const base = Math.atan2(player.y - e.y, player.x - e.x);
  for (let k = 0; k < n; k++) {
    const a = base + (k - (n - 1) / 2) * spread;
    fireEnemy(e.x, e.y + e.r * 0.6, Math.cos(a), Math.sin(a), speed);
  }
}

export function update(dt, player, wave) {
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    e.t += dt;
    e.fireCd -= dt;
    switch (e.type) {
      case 'drone':
        e.y += (150 + wave * 6) * dt;
        e.x = Math.min(W - 8, Math.max(8, e.x + Math.sin(e.t * 4 + e.bx * 0.05) * 50 * dt));
        break;
      case 'sine':
        e.y += (64 + wave * 4) * dt;
        e.x = e.bx + Math.sin(e.t * 2.4) * 84;
        if (e.fireCd <= 0 && e.y > 20 && e.y < H - 200) {
          fireEnemy(e.x, e.y + e.r, 0, 1, 150 + wave * 7);
          e.fireCd = 1.6 + Math.random() * 0.8;
        }
        break;
      case 'tank':
        e.x += e.vx * dt;
        e.y += Math.sin(e.t * 2) * 12 * dt;
        if (e.fireCd <= 0 && e.x > 30 && e.x < W - 30) {
          fireFan(e, 3, 0.35, 170 + wave * 6, player);
          e.fireCd = 2.4 - Math.min(1.2, wave * 0.08);
        }
        break;
      case 'boss': {
        if (e.y < 120) { e.y += 70 * dt; break; }
        e.x = W / 2 + Math.sin(e.t * 0.6) * (W / 2 - 80);
        if (e.fireCd <= 0) {
          const frac = e.hp / e.maxHp;
          const sp = 160 + wave * 6;
          if (frac > 0.66) {
            fireFan(e, 3, 0.4, sp, player);
            e.fireCd = 1.3;
          } else if (frac > 0.33) {
            for (let k = 0; k < 10; k++) {
              const a = (k / 10) * Math.PI * 2 + e.t;
              fireEnemy(e.x, e.y, Math.cos(a), Math.sin(a), sp * 0.8);
            }
            e.fireCd = 1.9;
          } else {
            fireFan(e, 5, 0.6, sp * 1.15, player);
            e.fireCd = 1.05;
          }
        }
        break;
      }
    }
    if (e.type !== 'boss' && (e.y > H + 60 || e.x < -60 || e.x > W + 60)) {
      list.splice(i, 1);
    }
  }
}

export function draw(g) {
  for (const e of list) {
    g.save();
    g.translate(e.x, e.y);
    switch (e.type) {
      case 'drone':
        g.fillStyle = e.color;
        g.beginPath();
        g.moveTo(0, 12);
        g.lineTo(-12, -6);
        g.lineTo(0, -2);
        g.lineTo(12, -6);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath(); g.arc(0, 2, 3, 0, Math.PI * 2); g.fill();
        break;
      case 'sine':
        g.fillStyle = e.color;
        g.beginPath(); g.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#f0d9ff';
        g.beginPath(); g.arc(0, -3, 6, 0, Math.PI * 2); g.fill();
        break;
      case 'tank':
        g.fillStyle = e.color;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
          const px = Math.cos(a) * 20;
          const py = Math.sin(a) * 20;
          if (k) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.closePath();
        g.fill();
        g.fillStyle = '#2a1608';
        g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffd9ad';
        g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill();
        break;
      case 'boss': {
        const s = 1 + 0.04 * Math.sin(e.t * 4);
        g.scale(s, s);
        g.fillStyle = e.color;
        g.beginPath();
        g.moveTo(0, 34);
        g.lineTo(-34, 10);
        g.lineTo(-52, -8);
        g.lineTo(-28, -26);
        g.lineTo(0, -16);
        g.lineTo(28, -26);
        g.lineTo(52, -8);
        g.lineTo(34, 10);
        g.closePath();
        g.fill();
        g.fillStyle = '#2b0410';
        g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffb3c1';
        g.beginPath(); g.arc(0, 0, 7 + 2 * Math.sin(e.t * 6), 0, Math.PI * 2); g.fill();
        break;
      }
    }
    g.restore();
  }
}
