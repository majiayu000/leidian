/**
 * 主入口 — 游戏循环、状态机、碰撞处理
 */
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Renderer } from './renderer.js';
import { Spawner } from './spawner.js';
import {
  Player, Bullet, PowerUp, CANVAS_W, CANVAS_H,
  spawnExplosion, circleRect, circleCircle,
} from './entities.js';

const canvas = document.getElementById('game-canvas');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

const input = new Input(canvas);
const audio = new Audio();
const renderer = new Renderer(ctx);
const spawner = new Spawner();

// ─── 游戏状态 ─────────────────────────────────────────────
let state = 'menu'; // menu | playing | gameover
let player = null;
let bullets = [];
let enemies = [];
let powerups = [];
let particles = [];
let score = 0;
let bombFlash = 0;
let waveAnnounce = 0;
let lastWave = 0;

// DOM 引用
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const overlayInstructions = document.getElementById('overlay-instructions');
const startBtn = document.getElementById('start-btn');
const scoreDisplay = document.getElementById('score-display');
const livesDisplay = document.getElementById('lives-display');
const waveDisplay = document.getElementById('wave-display');

// ─── 状态切换 ─────────────────────────────────────────────
function startGame() {
  state = 'playing';
  player = new Player();
  bullets = [];
  enemies = [];
  powerups = [];
  particles = [];
  score = 0;
  bombFlash = 0;
  lastWave = 0;
  spawner.wave = 0;
  spawner.waveActive = false;
  spawner.betweenWaves = 0;
  overlay.classList.remove('visible');
}

function gameOver() {
  state = 'gameover';
  overlayTitle.textContent = '游戏结束';
  overlaySubtitle.textContent = '';
  overlayInstructions.innerHTML = `<p id="final-score">最终分数: ${score}</p>`;
  startBtn.textContent = '再来一局';
  overlay.classList.add('visible');
}

startBtn.addEventListener('click', startGame);

// ─── 游戏逻辑更新 ─────────────────────────────────────────
function update() {
  if (state !== 'playing') return;

  player.update(input);

  // 自动射击
  if (player.canFire()) {
    const newBullets = player.fire();
    bullets.push(...newBullets);
    audio.shoot();
  }

  // 炸弹
  if (input.consumeBomb() && player.useBomb()) {
    audio.bomb();
    bombFlash = 15;
    // 清除所有敌弹，伤害所有敌机
    bullets = bullets.filter(b => b.owner === 'player');
    for (const e of enemies) {
      const destroyed = e.hit(10);
      if (destroyed) {
        score += e.score;
        particles.push(...spawnExplosion(e.x, e.y, e.color, 16));
        maybeDropPowerUp(e);
      }
    }
  }

  // 波次生成
  spawner.update(enemies);

  // 波次提示
  const cw = spawner.currentWave;
  if (cw !== lastWave) {
    lastWave = cw;
    waveAnnounce = 90;
  }
  if (waveAnnounce > 0) waveAnnounce--;

  // 更新子弹
  for (const b of bullets) b.update();
  bullets = bullets.filter(b => b.active);

  // 更新敌机 + 收集敌弹
  for (const e of enemies) {
    const enemyBullets = e.update();
    if (enemyBullets.length > 0) {
      bullets.push(...enemyBullets);
      audio.enemyShoot();
    }
  }
  enemies = enemies.filter(e => e.active);

  // 更新道具
  for (const p of powerups) p.update();
  powerups = powerups.filter(p => p.active);

  // 更新粒子
  for (const p of particles) p.update();
  particles = particles.filter(p => p.active);

  // 炸弹闪屏
  if (bombFlash > 0) bombFlash--;

  // ─── 碰撞检测 ───
  handleCollisions();

  // 更新 HUD
  updateHUD();

  // 死亡判定
  if (!player.alive) {
    particles.push(...spawnExplosion(player.x, player.y, '#00ccff', 24));
    audio.bigExplosion();
    gameOver();
  }
}

function handleCollisions() {
  // 玩家子弹 vs 敌机
  for (const b of bullets) {
    if (b.owner !== 'player') continue;
    for (const e of enemies) {
      if (circleRect(b.x, b.y, b.radius, e.x, e.y, e.w, e.h)) {
        b.active = false;
        const destroyed = e.hit(1);
        if (destroyed) {
          score += e.score;
          const count = e.type === 'boss' ? 30 : 12;
          particles.push(...spawnExplosion(e.x, e.y, e.color, count));
          if (e.type === 'boss') {
            audio.bigExplosion();
          } else {
            audio.explosion();
          }
          maybeDropPowerUp(e);
        }
        break;
      }
    }
  }

  // 敌弹 vs 玩家
  if (player.alive) {
    for (const b of bullets) {
      if (b.owner !== 'enemy') continue;
      if (circleCircle(b.x, b.y, b.radius, player.x, player.y, 10)) {
        b.active = false;
        if (player.hit()) {
          audio.playerHit();
          particles.push(...spawnExplosion(player.x, player.y, '#00ccff', 8));
        }
      }
    }

    // 敌机撞玩家
    for (const e of enemies) {
      if (circleRect(player.x, player.y, 10, e.x, e.y, e.w, e.h)) {
        if (player.hit()) {
          audio.playerHit();
          particles.push(...spawnExplosion(player.x, player.y, '#00ccff', 8));
        }
        e.hit(3); // 撞击也伤害敌机
        if (!e.active) {
          score += e.score;
          particles.push(...spawnExplosion(e.x, e.y, e.color, 12));
        }
      }
    }

    // 道具拾取
    for (const p of powerups) {
      if (circleCircle(p.x, p.y, p.radius, player.x, player.y, 16)) {
        p.active = false;
        audio.powerup();
        switch (p.type) {
          case 'power':
            player.power = Math.min(5, player.power + 1);
            break;
          case 'bomb':
            player.bombs = Math.min(5, player.bombs + 1);
            break;
          case 'life':
            player.lives = Math.min(5, player.lives + 1);
            break;
        }
      }
    }
  }
}

function maybeDropPowerUp(enemy) {
  // 掉落概率：boss 100%，tank 40%，fighter 15%，scout 5%
  const rates = { boss: 1, tank: 0.4, fighter: 0.15, scout: 0.05 };
  if (Math.random() > (rates[enemy.type] || 0)) return;

  const types = ['power', 'power', 'power', 'bomb', 'life'];
  const type = types[Math.floor(Math.random() * types.length)];
  powerups.push(new PowerUp(enemy.x, enemy.y, type));
}

function updateHUD() {
  scoreDisplay.textContent = `分数: ${score}`;
  livesDisplay.textContent = '♥'.repeat(Math.max(0, player.lives));
  waveDisplay.textContent = `波次: ${spawner.currentWave} | 弹: ${player.bombs}`;
}

// ─── 渲染 ─────────────────────────────────────────────────
function draw() {
  renderer.clear();
  renderer.drawStars();

  if (state === 'playing' || state === 'gameover') {
    renderer.drawPowerUps(powerups);
    renderer.drawEnemies(enemies);
    renderer.drawBullets(bullets);
    renderer.drawParticles(particles);
    renderer.drawPlayer(player);
    renderer.drawBombFlash(bombFlash);

    // 波次提示文字
    if (waveAnnounce > 0 && state === 'playing') {
      const alpha = Math.min(waveAnnounce / 30, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`第 ${spawner.currentWave} 波`, CANVAS_W / 2, CANVAS_H / 2 - 40);
      ctx.globalAlpha = 1;
    }
  }
}

// ─── 主循环 ─────────────────────────────────────────────────
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
