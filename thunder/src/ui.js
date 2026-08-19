// 菜单 / 暂停 / 结束画面
import { W, H } from './config.js';

export function drawMenu(g, hiScore) {
  g.textAlign = 'center';
  g.fillStyle = '#7fd8ff';
  g.font = 'bold 64px "PingFang SC", "Microsoft YaHei", sans-serif';
  g.fillText('雷 电', W / 2, 200);
  g.fillStyle = '#3f6f8f';
  g.font = 'bold 20px monospace';
  g.fillText('T H U N D E R', W / 2, 240);
  g.fillStyle = '#ffffff';
  g.font = '16px monospace';
  if (Math.floor(performance.now() / 500) % 2 === 0) {
    g.fillText('PRESS ENTER TO START', W / 2, 330);
  }
  g.fillStyle = '#5a7d9a';
  g.font = '13px monospace';
  g.fillText('WASD / 方向键  移动', W / 2, 400);
  g.fillText('空格 / J  射击       B  炸弹', W / 2, 424);
  g.fillText('P / ESC  暂停', W / 2, 448);
  g.fillStyle = '#8fe8ff';
  g.fillText(`HI-SCORE  ${hiScore}`, W / 2, 520);
  g.textAlign = 'left';
}

export function drawPause(g) {
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.font = 'bold 40px monospace';
  g.fillText('PAUSED', W / 2, H / 2 - 10);
  g.fillStyle = '#8fe8ff';
  g.font = '15px monospace';
  g.fillText('按 P 或 ESC 继续', W / 2, H / 2 + 30);
  g.textAlign = 'left';
}

export function drawGameOver(g, score, hiScore) {
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.fillStyle = '#ff2d55';
  g.font = 'bold 44px monospace';
  g.fillText('GAME OVER', W / 2, 240);
  g.fillStyle = '#ffffff';
  g.font = '18px monospace';
  g.fillText(`SCORE  ${score}`, W / 2, 300);
  g.fillStyle = '#8fe8ff';
  g.fillText(`HI-SCORE  ${hiScore}`, W / 2, 328);
  g.fillStyle = '#5a7d9a';
  g.font = '14px monospace';
  g.fillText('按 ENTER 重新开始', W / 2, 400);
  g.textAlign = 'left';
}
