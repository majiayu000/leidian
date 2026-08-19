// HUD: 分数 / 波数 / 火力 / 生命 / 炸弹 + Boss 血条
import { W, H } from './config.js';

export function drawHud(g, s) {
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.font = 'bold 15px monospace';
  g.fillStyle = '#8fe8ff';
  g.fillText(String(s.score).padStart(8, '0'), 10, 10);
  g.font = '12px monospace';
  g.fillStyle = '#4f7590';
  g.fillText(`WAVE ${s.wave}`, 10, 30);

  g.textAlign = 'right';
  g.fillStyle = '#ffd27f';
  g.fillText(`PWR ${s.power}`, W - 10, 30);

  for (let i = 0; i < s.lives; i++) {
    const x = W - 14 - i * 20;
    const y = 16;
    g.fillStyle = '#39c4ff';
    g.beginPath();
    g.moveTo(x, y - 6);
    g.lineTo(x - 6, y + 5);
    g.lineTo(x + 6, y + 5);
    g.closePath();
    g.fill();
  }

  g.textAlign = 'left';
  g.fillStyle = '#ff9c39';
  g.font = 'bold 13px monospace';
  g.fillText(`BOMB x${s.bombs}`, 10, H - 22);
  g.fillStyle = '#3f6f8f';
  g.fillText('P 火力  B 炸弹', 10, H - 40);
}

export function drawBossBar(g, boss) {
  if (!boss) return;
  const w = 300;
  const x = (W - w) / 2;
  const y = 52;
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(x, y, w, 8);
  g.fillStyle = '#ff2d55';
  g.fillRect(x, y, w * Math.max(0, boss.hp / boss.maxHp), 8);
  g.strokeStyle = '#ff8ba0';
  g.lineWidth = 1;
  g.strokeRect(x, y, w, 8);
}
