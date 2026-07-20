/**
 * 渲染器 — Canvas 2D 绘制所有游戏元素
 */
import { CANVAS_W, CANVAS_H } from './entities.js';

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.starfield = this._initStars();
  }

  _initStars() {
    const stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        speed: 0.5 + Math.random() * 2,
        size: 0.5 + Math.random() * 1.5,
      });
    }
    return stars;
  }

  clear() {
    this.ctx.fillStyle = '#0d0d1a';
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  drawStars() {
    const ctx = this.ctx;
    for (const star of this.starfield) {
      star.y += star.speed;
      if (star.y > CANVAS_H) {
        star.y = 0;
        star.x = Math.random() * CANVAS_W;
      }
      ctx.fillStyle = `rgba(200, 220, 255, ${0.3 + star.size * 0.3})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  drawPlayer(player) {
    if (!player.alive) return;
    const ctx = this.ctx;
    const { x, y } = player;

    // 无敌闪烁
    if (player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // 机身
    ctx.fillStyle = '#00ccff';
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x - 14, y + 14);
    ctx.lineTo(x - 4, y + 8);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x + 4, y + 8);
    ctx.lineTo(x + 14, y + 14);
    ctx.closePath();
    ctx.fill();

    // 机翼高光
    ctx.fillStyle = '#66eeff';
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x - 4, y + 6);
    ctx.lineTo(x + 4, y + 6);
    ctx.closePath();
    ctx.fill();

    // 引擎火焰
    ctx.fillStyle = `rgba(255, ${150 + Math.random() * 100}, 0, 0.8)`;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 12);
    ctx.lineTo(x, y + 18 + Math.random() * 6);
    ctx.lineTo(x + 3, y + 12);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  drawEnemies(enemies) {
    const ctx = this.ctx;
    for (const e of enemies) {
      ctx.fillStyle = e.color;
      const { x, y, w, h } = e;

      if (e.type === 'boss') {
        this._drawBoss(e);
        continue;
      }

      // 倒三角敌机
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x - w / 2, y - h / 2);
      ctx.lineTo(x - w / 4, y - h / 4);
      ctx.lineTo(x, y - h / 2 + 4);
      ctx.lineTo(x + w / 4, y - h / 4);
      ctx.lineTo(x + w / 2, y - h / 2);
      ctx.closePath();
      ctx.fill();

      // 血条（多血量敌机）
      if (e.maxHp > 1) {
        const barW = w;
        const ratio = e.hp / e.maxHp;
        ctx.fillStyle = '#333';
        ctx.fillRect(x - barW / 2, y - h / 2 - 8, barW, 3);
        ctx.fillStyle = ratio > 0.5 ? '#44ff44' : ratio > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillRect(x - barW / 2, y - h / 2 - 8, barW * ratio, 3);
      }
    }
  }

  _drawBoss(e) {
    const ctx = this.ctx;
    const { x, y, w, h } = e;

    // Boss 主体
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x - w / 2, y);
    ctx.lineTo(x - w / 3, y - h / 2);
    ctx.lineTo(x + w / 3, y - h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    ctx.fill();

    // Boss 核心
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0044';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    // 血条
    const barW = w + 20;
    const ratio = e.hp / e.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(x - barW / 2, y - h / 2 - 14, barW, 5);
    ctx.fillStyle = ratio > 0.5 ? '#44ff44' : ratio > 0.25 ? '#ffaa00' : '#ff4444';
    ctx.fillRect(x - barW / 2, y - h / 2 - 14, barW * ratio, 5);
  }

  drawBullets(bullets) {
    const ctx = this.ctx;
    for (const b of bullets) {
      if (b.owner === 'player') {
        ctx.fillStyle = '#00ffcc';
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 4;
        ctx.fillRect(b.x - 1.5, b.y - 6, 3, 12);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#ff4488';
        ctx.shadowColor = '#ff4488';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  drawPowerUps(powerups) {
    const ctx = this.ctx;
    for (const p of powerups) {
      const pulse = 1 + Math.sin(p.time * 0.1) * 0.15;
      const r = p.radius * pulse;

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);

      switch (p.type) {
        case 'power':
          ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
          ctx.fill();
          ctx.strokeStyle = '#00ccff';
          ctx.stroke();
          ctx.fillStyle = '#00ccff';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('P', p.x, p.y + 4);
          break;
        case 'bomb':
          ctx.fillStyle = 'rgba(255, 170, 0, 0.3)';
          ctx.fill();
          ctx.strokeStyle = '#ffaa00';
          ctx.stroke();
          ctx.fillStyle = '#ffaa00';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('B', p.x, p.y + 4);
          break;
        case 'life':
          ctx.fillStyle = 'rgba(255, 68, 102, 0.3)';
          ctx.fill();
          ctx.strokeStyle = '#ff4466';
          ctx.stroke();
          ctx.fillStyle = '#ff4466';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('♥', p.x, p.y + 4);
          break;
      }
    }
  }

  drawParticles(particles) {
    const ctx = this.ctx;
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawBombFlash(frames) {
    if (frames <= 0) return;
    const alpha = Math.min(frames / 10, 0.6);
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}
