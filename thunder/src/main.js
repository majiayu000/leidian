// 游戏主循环: 状态机(menu/playing/paused/gameover) + 波次推进 + 渲染
// 碰撞逻辑在 combat.js, 各界面文字在 ui.js
import { W, H } from './config.js';
import input from './input.js';
import { unlock, sfx } from './sound.js';
import * as bg from './background.js';
import * as fx from './particles.js';
import * as bullets from './bullets.js';
import * as enemies from './enemies.js';
import { createPlayer, update as updatePlayer, draw as drawPlayer } from './player.js';
import { drawHud, drawBossBar } from './hud.js';
import * as combat from './combat.js';
import * as ui from './ui.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');

bg.init(W, H);
input.init();

function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${W * s}px`;
  canvas.style.height = `${H * s}px`;
}
window.addEventListener('resize', fit);
fit();

let hiScore = 0;
try { hiScore = Number(localStorage.getItem('thunder-hiscore')) || 0; } catch (e) { hiScore = 0; }

const game = {
  score: 0,
  wave: 1,
  lastWave: 1,
  time: 0,
  shake: 0,
  flash: 0,
  gameOverAt: 0,
  player: createPlayer(),
};

let state = 'menu';

function reset() {
  game.score = 0;
  game.wave = 1;
  game.lastWave = 1;
  game.time = 0;
  game.shake = 0;
  game.flash = 0;
  game.gameOverAt = 0;
  game.player = createPlayer();
  bullets.clearAll();
  enemies.clear();
  enemies.resetDirector();
  fx.clearParts();
}

function start() {
  reset();
  state = 'playing';
}

function update(dt) {
  game.time += dt;
  game.wave = Math.floor(game.time / 35) + 1;
  if (game.wave !== game.lastWave) {
    game.lastWave = game.wave;
    if (game.wave % 5 === 0 && !enemies.getBoss()) enemies.spawnBoss(game.wave);
  }

  updatePlayer(game.player, dt, input);
  enemies.update(dt, game.player, game.wave);
  enemies.spawnUpdate(dt, game.wave);
  bullets.update(dt);
  fx.update(dt);
  game.shake = Math.max(0, game.shake - dt * 1.5);
  game.flash = Math.max(0, game.flash - dt * 2.5);

  if (input.pressedOnce(['KeyB']) && game.player.alive && game.player.bombs > 0) {
    combat.useBomb(game);
  }
  combat.process(game);

  if (game.gameOverAt > 0 && game.time >= game.gameOverAt) {
    game.gameOverAt = 0;
    state = 'gameover';
    if (game.score > hiScore) {
      hiScore = game.score;
      try { localStorage.setItem('thunder-hiscore', String(hiScore)); } catch (e) { /* 存储不可用时忽略 */ }
    }
  }
}

function render() {
  g.fillStyle = '#04040f';
  g.fillRect(0, 0, W, H);
  g.save();
  if (game.shake > 0) {
    g.translate((Math.random() - 0.5) * game.shake * 18, (Math.random() - 0.5) * game.shake * 18);
  }
  bg.draw(g, W, H);
  enemies.draw(g);
  bullets.draw(g);
  fx.draw(g);
  drawPlayer(g, game.player);
  g.restore();

  if (game.flash > 0) {
    g.fillStyle = `rgba(255,255,255,${game.flash * 0.8})`;
    g.fillRect(0, 0, W, H);
  }
  if (state === 'playing' || state === 'paused') {
    drawHud(g, {
      score: game.score,
      wave: game.wave,
      lives: game.player.lives,
      bombs: game.player.bombs,
      power: game.player.power,
    });
    drawBossBar(g, enemies.getBoss());
  }
  if (state === 'menu') ui.drawMenu(g, hiScore);
  if (state === 'paused') ui.drawPause(g);
  if (state === 'gameover') ui.drawGameOver(g, game.score, hiScore);
}

function handleStateInput() {
  if (state === 'menu' && input.pressedOnce(['Enter', 'Space'])) {
    unlock();
    start();
  } else if (state === 'playing' && input.pressedOnce(['Escape', 'KeyP'])) {
    state = 'paused';
  } else if (state === 'paused' && input.pressedOnce(['Escape', 'KeyP', 'Enter'])) {
    state = 'playing';
  } else if (state === 'gameover' && input.pressedOnce(['Enter', 'Space'])) {
    unlock();
    start();
  }
}

window.addEventListener('blur', () => {
  if (state === 'playing') state = 'paused';
});

let lastTs = 0;
function frame(ts) {
  const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  bg.update(dt, W, H);
  if (state === 'playing') update(dt);
  else fx.update(dt);
  handleStateInput();
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
