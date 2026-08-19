// 爆炸粒子 + 冲击波圆环
const parts = [];

export function clearParts() {
  parts.length = 0;
}

export function explosion(x, y, color, count = 18, speed = 240) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = speed * (0.3 + Math.random() * 0.9);
    parts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      t: 0,
      life: 0.45 + Math.random() * 0.4,
      r: 2 + Math.random() * 3,
      color,
    });
  }
}

export function ring(x, y, color, maxR = 80) {
  parts.push({ ring: true, x, y, t: 0, life: 0.45, maxR, color });
}

export function update(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    if (p.t >= p.life) {
      parts.splice(i, 1);
      continue;
    }
    if (!p.ring) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  }
}

export function draw(g) {
  for (const p of parts) {
    const k = 1 - p.t / p.life;
    g.globalAlpha = Math.max(k, 0);
    if (p.ring) {
      g.strokeStyle = p.color;
      g.lineWidth = 3 * k + 1;
      g.beginPath();
      g.arc(p.x, p.y, p.maxR * (p.t / p.life), 0, Math.PI * 2);
      g.stroke();
    } else {
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, p.r * k + 0.5, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;
}
