// 玩家机: 移动 / 射击(5 档火力) / 被击重生
import { W, H } from './config.js';
import { firePlayer } from './bullets.js';
import { sfx } from './sound.js';

export function createPlayer() {
  return {
    x: W / 2, y: H - 80,
    r: 12,
    speed: 340,
    fireCd: 0,
    power: 1,
    bombs: 3,
    lives: 3,
    inv: 0,
    alive: true,
    deadTimer: 0,
  };
}

export function update(p, dt, input) {
  if (!p.alive) {
    p.deadTimer -= dt;
    if (p.deadTimer <= 0 && p.lives > 0) respawn(p);
    return;
  }
  if (p.inv > 0) p.inv -= dt;
  p.fireCd -= dt;

  let dx = 0;
  let dy = 0;
  if (input.down(['ArrowLeft', 'KeyA'])) dx -= 1;
  if (input.down(['ArrowRight', 'KeyD'])) dx += 1;
  if (input.down(['ArrowUp', 'KeyW'])) dy -= 1;
  if (input.down(['ArrowDown', 'KeyS'])) dy += 1;
  if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
  p.x = Math.min(W - 16, Math.max(16, p.x + dx * p.speed * dt));
  p.y = Math.min(H - 24, Math.max(60, p.y + dy * p.speed * dt));

  if (p.fireCd <= 0 && input.down(['Space', 'KeyJ'])) {
    shoot(p);
    p.fireCd = p.power >= 4 ? 0.11 : 0.14;
  }
}

function shoot(p) {
  sfx.shoot();
  const x = p.x;
  const y = p.y - 14;
  switch (p.power) {
    case 1:
      firePlayer(x, y, 0, -1);
      break;
    case 2:
      firePlayer(x - 7, y, 0, -1);
      firePlayer(x + 7, y, 0, -1);
      break;
    case 3:
      firePlayer(x, y - 4, 0, -1);
      firePlayer(x - 9, y, -0.12, -1);
      firePlayer(x + 9, y, 0.12, -1);
      break;
    case 4:
      firePlayer(x, y - 4, 0, -1);
      firePlayer(x - 8, y, 0, -1);
      firePlayer(x + 8, y, 0, -1);
      firePlayer(x - 14, y, -0.25, -1);
      firePlayer(x + 14, y, 0.25, -1);
      break;
    default:
      firePlayer(x, y - 6, 0, -1);
      firePlayer(x - 8, y - 2, 0, -1);
      firePlayer(x + 8, y - 2, 0, -1);
      firePlayer(x - 15, y, -0.28, -1);
      firePlayer(x + 15, y, 0.28, -1);
      firePlayer(x - 22, y, -0.5, -1);
      firePlayer(x + 22, y, 0.5, -1);
      break;
  }
}

function respawn(p) {
  p.alive = true;
  p.x = W / 2;
  p.y = H - 80;
  p.inv = 2.5;
  p.power = 1;
}

export function draw(g, p) {
  if (!p.alive) return;
  if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) return; // 无敌闪烁
  g.save();
  g.translate(p.x, p.y);
  // 引擎尾焰
  const fl = 6 + Math.random() * 6;
  g.fillStyle = 'rgba(80,190,255,0.8)';
  g.beginPath();
  g.moveTo(-5, 12);
  g.lineTo(0, 18 + fl);
  g.lineTo(5, 12);
  g.closePath();
  g.fill();
  // 机身
  g.fillStyle = '#39c4ff';
  g.beginPath();
  g.moveTo(0, -16);
  g.lineTo(6, 2);
  g.lineTo(14, 10);
  g.lineTo(14, 13);
  g.lineTo(5, 10);
  g.lineTo(-5, 10);
  g.lineTo(-14, 13);
  g.lineTo(-14, 10);
  g.lineTo(-6, 2);
  g.closePath();
  g.fill();
  g.fillStyle = '#bfeaff';
  g.beginPath();
  g.moveTo(0, -16);
  g.lineTo(3, -4);
  g.lineTo(0, 4);
  g.lineTo(-3, -4);
  g.closePath();
  g.fill();
  // 座舱
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(0, -6, 2.4, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
