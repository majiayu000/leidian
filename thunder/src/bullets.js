// 玩家子弹 / 敌弹 / 掉落道具
import { W, H } from './config.js';

const playerB = [];
const enemyB = [];
const pickups = [];

export function clearAll() {
  playerB.length = 0;
  enemyB.length = 0;
  pickups.length = 0;
}

export function playerBullets() { return playerB; }
export function enemyBullets() { return enemyB; }
export function pickupList() { return pickups; }

export function clearEnemyBullets() {
  enemyB.length = 0;
}

export function firePlayer(x, y, dx, dy) {
  playerB.push({ x, y, vx: dx * 620, vy: dy * 620, r: 4, dmg: 1 });
}

export function fireEnemy(x, y, dx, dy, speed) {
  enemyB.push({ x, y, vx: dx * speed, vy: dy * speed, r: 5 });
}

export function dropPickup(x, y, kind) {
  pickups.push({ x, y, vy: 90, kind, t: 0 });
}

export function update(dt) {
  for (let i = playerB.length - 1; i >= 0; i--) {
    const b = playerB[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -20 || b.x < -20 || b.x > W + 20 || b.y > H + 20) playerB.splice(i, 1);
  }
  for (let i = enemyB.length - 1; i >= 0; i--) {
    const b = enemyB[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -30 || b.y > H + 30 || b.x < -30 || b.x > W + 30) enemyB.splice(i, 1);
  }
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.t += dt;
    p.y += p.vy * dt;
    if (p.y > H + 20) pickups.splice(i, 1);
  }
}

export function draw(g) {
  for (const b of playerB) {
    g.fillStyle = '#ffe95c';
    g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff8c8';
    g.beginPath(); g.arc(b.x, b.y, b.r * 0.5, 0, Math.PI * 2); g.fill();
  }
  for (const b of enemyB) {
    g.fillStyle = '#ff5c8a';
    g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd0df';
    g.beginPath(); g.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2); g.fill();
  }
  for (const p of pickups) {
    const pulse = 1 + 0.15 * Math.sin(p.t * 6);
    g.save();
    g.translate(p.x, p.y);
    g.scale(pulse, pulse);
    g.fillStyle = p.kind === 'P' ? '#39ff88' : '#ff9c39';
    g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = p.kind === 'P' ? '#04220f' : '#2a1503';
    g.font = 'bold 12px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(p.kind, 0, 1);
    g.restore();
  }
}
