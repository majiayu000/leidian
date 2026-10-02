'use strict';
(() => {

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;   // 480
const H = canvas.height;  // 720

/* ---------------- 音效（WebAudio 合成，无外部资源） ---------------- */
let audioCtx = null;
let muted = false;

function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* ignore */ }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function beep(freq, dur, type, vol, slideTo) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(vol || 0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol) {
  if (!audioCtx || muted) return;
  const n = Math.floor(audioCtx.sampleRate * dur);
  const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const f = audioCtx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1100;
  const g = audioCtx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(audioCtx.destination);
  src.start();
}

/* ---------------- 输入 ---------------- */
const keys = Object.create(null);

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  initAudio();
  const k = e.key.toLowerCase();
  if (e.key === 'Enter' && state !== 'playing') startGame();
  if (k === 'p' && state === 'playing') paused = !paused;
  if (k === 'm') muted = !muted;
  if ((k === 'x' || k === 'b') && state === 'playing' && !paused) useBomb();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

/* ---------------- 游戏状态 ---------------- */
let state = 'menu';        // menu | playing | gameover
let paused = false;
let score = 0;
let best = 0;
try {
  best = parseInt(localStorage.getItem('raiden_best') || '0', 10) || 0;
} catch (error) {
  console.warn('High score could not be loaded; using a session score.', error);
}
let lives = 3;
let weapon = 1;            // 武器等级 1~5
let bombs = 3;
let time = 0;
let shake = 0;
let flash = 0;
let warnT = 0;
let spawnT = 0;
let nextBossAt = 4000;
let bossCount = 0;
let bossAlive = false;

const player = { x: W / 2, y: H - 90, r: 11, speed: 320, inv: 0, fireT: 0 };

let pBullets = [];
let eBullets = [];
let enemies = [];
let parts = [];
let powerups = [];
const stars = [];
for (let i = 0; i < 90; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.5, v: 40 + Math.random() * 120 });
}

function startGame() {
  state = 'playing';
  paused = false;
  score = 0; lives = 3; weapon = 1; bombs = 3;
  shake = 0; flash = 0; warnT = 0; spawnT = 0.6;
  nextBossAt = 4000; bossCount = 0; bossAlive = false;
  player.x = W / 2; player.y = H - 90; player.inv = 1.5; player.fireT = 0;
  pBullets = []; eBullets = []; enemies = []; parts = []; powerups = [];
  beep(440, 0.12, 'square', 0.06, 880);
}

function gameOver() {
  state = 'gameover';
  if (score > best) {
    best = score;
    try {
      localStorage.setItem('raiden_best', String(best));
    } catch (error) {
      console.warn('High score could not be saved; keeping the session score.', error);
    }
  }
}

/* ---------------- 开火 ---------------- */
function firePlayer() {
  const bx = player.x, by = player.y - 14;
  const mk = (dx, dy, vx, vy, dmg) => pBullets.push({ x: bx + dx, y: by + dy, vx, vy, r: 4, dmg: dmg || 1 });
  switch (weapon) {
    case 1:
      mk(0, 0, 0, -620);
      break;
    case 2:
      mk(-8, 0, 0, -620); mk(8, 0, 0, -620);
      break;
    case 3:
      mk(0, 0, 0, -640); mk(-9, 4, -90, -600); mk(9, 4, 90, -600);
      break;
    case 4:
      mk(-6, 0, 0, -660); mk(6, 0, 0, -660); mk(-12, 6, -140, -580); mk(12, 6, 140, -580);
      break;
    default:
      mk(0, -4, 0, -700, 2); mk(-8, 0, -70, -640); mk(8, 0, 70, -640); mk(-15, 6, -170, -560); mk(15, 6, 170, -560);
  }
  beep(880, 0.05, 'square', 0.02, 220);
}

function fireAimed(e, sp, angOff) {
  const a = Math.atan2(player.y - e.y, player.x - e.x) + (angOff || 0);
  eBullets.push({ x: e.x, y: e.y + e.r * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5 });
}

/* ---------------- 敌机生成 ---------------- */
function spawnEnemy() {
  const diff = 1 + score / 2500;
  const roll = Math.random();
  const x = 40 + Math.random() * (W - 80);
  if (roll < 0.55) {
    // 侦察机：快速直下，血少
    enemies.push({
      type: 'scout', x, y: -30, vx: (Math.random() * 2 - 1) * 40,
      vy: 150 + Math.random() * 80 + diff * 6, r: 12, hp: 1, t: 0,
      score: 100, fireT: 1.5 + Math.random() * 2.5,
    });
  } else if (roll < 0.85) {
    // 蛇形机：正弦走位，会瞄准
    enemies.push({
      type: 'weaver', x, y: -30, vx: 0, vy: 95 + diff * 4, r: 14, hp: 2,
      t: 0, phase: Math.random() * 6.28, amp: 60 + Math.random() * 60,
      score: 200, fireT: 1.5 + Math.random() * 1.5,
    });
  } else {
    // 炮艇：悬停三点射
    enemies.push({
      type: 'gunship', x, y: -40, vx: 0, vy: 60, r: 22,
      hp: 6 + Math.floor(diff), t: 0, score: 500,
      fireT: 1.2, stopY: 80 + Math.random() * 120,
    });
  }
}

function spawnBoss() {
  bossAlive = true;
  warnT = 2.2;
  bossCount++;
  const hp = 60 + bossCount * 45;
  enemies.push({
    type: 'boss', x: W / 2, y: -120, vx: 0, vy: 35, r: 46,
    hp, maxhp: hp, t: 0, score: 3000 + bossCount * 1000,
    fireT: 1.5, patT: 0, pat: 0,
  });
  beep(110, 1.2, 'sawtooth', 0.08, 55);
}

/* ---------------- 炸弹 ---------------- */
function useBomb() {
  if (bombs <= 0) return;
  bombs--;
  flash = 0.35;
  shake = 0.5;
  eBullets.length = 0;
  for (const e of enemies) {
    e.hp -= 15;
    addExplosion(e.x, e.y, e.type === 'boss' ? 30 : 12);
  }
  noiseBurst(0.5, 0.3);
}

/* ---------------- 粒子 ---------------- */
function addExplosion(x, y, n) {
  const colors = ['#ffdd66', '#ff8833', '#ff4433', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283;
    const sp = 40 + Math.random() * 220;
    parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.4 + Math.random() * 0.5, t: 0,
      c: colors[(Math.random() * colors.length) | 0], r: 2 + Math.random() * 3,
    });
  }
}

function addSpark(x, y) {
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * 6.283;
    const sp = 30 + Math.random() * 90;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.2, t: 0, c: '#aef', r: 1.5 });
  }
}

function updateParticles(dt) {
  for (const p of parts) {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
  }
  parts = parts.filter((p) => p.t < p.life);
  if (parts.length > 500) parts.splice(0, parts.length - 500);
}

/* ---------------- 掉落 ---------------- */
function dropPowerup(x, y) {
  const r = Math.random();
  const kind = r < 0.7 ? 'P' : (r < 0.9 ? 'B' : 'L');
  powerups.push({ x, y, vy: 80, r: 12, kind, t: 0 });
}

function maybeDrop(x, y) {
  if (Math.random() < 0.12) dropPowerup(x, y);
}

/* ---------------- 更新逻辑 ---------------- */
function updatePlayer(dt) {
  let dx = 0, dy = 0;
  if (keys['arrowleft'] || keys['a']) dx -= 1;
  if (keys['arrowright'] || keys['d']) dx += 1;
  if (keys['arrowup'] || keys['w']) dy -= 1;
  if (keys['arrowdown'] || keys['s']) dy += 1;
  const len = Math.hypot(dx, dy) || 1;
  player.x = Math.max(16, Math.min(W - 16, player.x + (dx / len) * player.speed * dt));
  player.y = Math.max(40, Math.min(H - 30, player.y + (dy / len) * player.speed * dt));
  if (player.inv > 0) player.inv -= dt;

  player.fireT -= dt;
  if (player.fireT <= 0) {
    firePlayer();
    player.fireT = 0.16;
  }

  // 引擎尾焰粒子
  if (Math.random() < 0.6) {
    parts.push({
      x: player.x + (Math.random() * 2 - 1) * 3, y: player.y + 14,
      vx: (Math.random() * 2 - 1) * 20, vy: 120 + Math.random() * 60,
      life: 0.25, t: 0, c: '#4dc3ff', r: 1.8,
    });
  }
}

function updateEnemies(dt) {
  for (const e of enemies) {
    e.t += dt;
    if (e.type === 'scout') {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < 20 || e.x > W - 20) e.vx *= -1;
    } else if (e.type === 'weaver') {
      e.y += e.vy * dt;
      e.x += Math.cos(e.t * 2 + e.phase) * e.amp * dt;
      e.x = Math.max(20, Math.min(W - 20, e.x));
    } else if (e.type === 'gunship') {
      if (e.y < e.stopY) {
        e.y += e.vy * dt;
      } else {
        e.y += Math.sin(e.t * 1.5) * 10 * dt;
        e.x += Math.sin(e.t * 0.7) * 30 * dt;
        e.x = Math.max(30, Math.min(W - 30, e.x));
      }
    } else if (e.type === 'boss') {
      if (e.y < 110) {
        e.y += e.vy * dt;
      } else {
        e.x = W / 2 + Math.sin(e.t * 0.6) * (W / 2 - 90);
      }
      e.patT += dt;
      if (e.patT > 3.5) { e.patT = 0; e.pat = (e.pat + 1) % 3; }
    }

    // 开火
    if (e.y > 0 && e.y < H - 100) {
      e.fireT -= dt;
      if (e.fireT <= 0) {
        if (e.type === 'weaver') {
          fireAimed(e, 240);
          e.fireT = 1.6 + Math.random();
        } else if (e.type === 'gunship') {
          fireAimed(e, 260); fireAimed(e, 260, 0.25); fireAimed(e, 260, -0.25);
          e.fireT = 1.8;
        } else if (e.type === 'scout') {
          eBullets.push({ x: e.x, y: e.y + e.r, vx: 0, vy: 220, r: 5 });
          e.fireT = 2 + Math.random() * 2;
        } else if (e.type === 'boss') {
          if (e.pat === 0) {
            for (let i = -2; i <= 2; i++) fireAimed(e, 280, i * 0.18);
            e.fireT = 0.9;
          } else if (e.pat === 1) {
            for (let i = 0; i < 12; i++) {
              const a = e.t * 2 + (i / 12) * Math.PI * 2;
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 5 });
            }
            e.fireT = 1.1;
          } else {
            fireAimed(e, 340); fireAimed(e, 340, 0.12); fireAimed(e, 340, -0.12);
            e.fireT = 0.5;
          }
          beep(180, 0.12, 'sawtooth', 0.03);
        }
      }
    }
  }
  enemies = enemies.filter((e) => e.y < H + 90);
}

function hitPlayer() {
  lives--;
  addExplosion(player.x, player.y, 40);
  noiseBurst(0.5, 0.3);
  shake = 0.5;
  weapon = Math.max(1, weapon - 1);
  if (lives <= 0) {
    gameOver();
  } else {
    player.inv = 2.5;
    player.x = W / 2;
    player.y = H - 90;
  }
}

function killSweep() {
  for (const e of enemies) {
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      score += e.score;
      if (e.type === 'boss') {
        bossAlive = false;
        flash = 0.3;
        shake = 0.6;
        addExplosion(e.x, e.y, 60);
        noiseBurst(0.8, 0.35);
        dropPowerup(e.x - 30, e.y);
        dropPowerup(e.x + 30, e.y);
      } else {
        addExplosion(e.x, e.y, e.type === 'gunship' ? 30 : 16);
        noiseBurst(0.25, 0.15);
        maybeDrop(e.x, e.y);
      }
    }
  }
  enemies = enemies.filter((e) => !e.dead);
}

function collide() {
  // 我方子弹 vs 敌机
  for (const b of pBullets) {
    if (b.dead) continue;
    for (const e of enemies) {
      if (e.dead || e.y < -30) continue;
      const dx = b.x - e.x, dy = b.y - e.y;
      if (dx * dx + dy * dy < (b.r + e.r) * (b.r + e.r)) {
        b.dead = true;
        e.hp -= b.dmg;
        addSpark(b.x, b.y);
        break;
      }
    }
  }
  pBullets = pBullets.filter((b) => !b.dead && b.y > -20 && b.x > -20 && b.x < W + 20);

  // 敌方子弹 vs 玩家
  if (player.inv <= 0) {
    for (const b of eBullets) {
      const dx = b.x - player.x, dy = b.y - player.y;
      const rr = b.r + player.r * 0.8;
      if (dx * dx + dy * dy < rr * rr) {
        b.dead = true;
        hitPlayer();
        break;
      }
    }
  }
  eBullets = eBullets.filter((b) => !b.dead && b.y < H + 20 && b.y > -30 && b.x > -20 && b.x < W + 20);

  // 敌机撞击
  if (player.inv <= 0) {
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      const rr = e.r + player.r;
      if (dx * dx + dy * dy < rr * rr) {
        e.hp -= 5;
        hitPlayer();
        break;
      }
    }
  }

  // 拾取道具
  for (const p of powerups) {
    if (p.dead) continue;
    const dx = p.x - player.x, dy = p.y - player.y;
    if (dx * dx + dy * dy < (p.r + player.r + 6) * (p.r + player.r + 6)) {
      p.dead = true;
      score += 50;
      if (p.kind === 'P') { weapon = Math.min(5, weapon + 1); beep(660, 0.1, 'square', 0.06, 1320); }
      else if (p.kind === 'B') { bombs = Math.min(6, bombs + 1); beep(520, 0.12, 'square', 0.06, 1040); }
      else { lives = Math.min(6, lives + 1); beep(440, 0.15, 'square', 0.06, 880); }
    }
  }
  powerups = powerups.filter((p) => !p.dead && p.y < H + 20);
}

function update(dt) {
  time += dt;
  for (const s of stars) {
    s.y += s.v * dt * (state === 'playing' ? 1 : 0.35);
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
  }
  updateParticles(dt);
  if (state !== 'playing' || paused) return;

  if (warnT > 0) warnT -= dt;
  if (shake > 0) shake -= dt;
  if (flash > 0) flash -= dt;

  if (!bossAlive && score >= nextBossAt) {
    nextBossAt += 6000;
    spawnBoss();
  }

  spawnT -= dt;
  if (spawnT <= 0 && !bossAlive) {
    spawnEnemy();
    const diff = 1 + score / 2500;
    spawnT = Math.max(0.3, 1.1 - diff * 0.07);
  }

  updatePlayer(dt);
  updateEnemies(dt);
  for (const b of pBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  for (const b of eBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  for (const p of powerups) { p.t += dt; p.y += p.vy * dt; p.x += Math.sin(p.t * 3) * 20 * dt; }

  collide();
  killSweep();
}

/* ---------------- 绘制 ---------------- */
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#060a1a');
  g.addColorStop(0.6, '#0a1030');
  g.addColorStop(1, '#0d1238');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  for (const s of stars) {
    ctx.globalAlpha = 0.3 + s.s * 0.25;
    ctx.fillRect(s.x, s.y, s.s, s.s * 2.2);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  if (state === 'playing' && player.inv > 0 && Math.floor(time * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(player.x, player.y);

  // 尾焰
  const fl = 10 + Math.random() * 8;
  const fg = ctx.createLinearGradient(0, 12, 0, 12 + fl + 8);
  fg.addColorStop(0, 'rgba(120,220,255,0.9)');
  fg.addColorStop(1, 'rgba(120,220,255,0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-4, 12);
  ctx.lineTo(4, 12);
  ctx.lineTo(0, 12 + fl + 8);
  ctx.closePath();
  ctx.fill();

  // 机翼
  ctx.fillStyle = '#2f7fd8';
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(-18, 12);
  ctx.lineTo(-10, 2);
  ctx.lineTo(-4, 6);
  ctx.lineTo(0, 2);
  ctx.lineTo(4, 6);
  ctx.lineTo(10, 2);
  ctx.lineTo(18, 12);
  ctx.closePath();
  ctx.fill();

  // 机身
  ctx.fillStyle = '#4dc3ff';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-5, -2);
  ctx.lineTo(-4, 12);
  ctx.lineTo(4, 12);
  ctx.lineTo(5, -2);
  ctx.closePath();
  ctx.fill();

  // 座舱
  ctx.fillStyle = '#e8fbff';
  ctx.beginPath();
  ctx.ellipse(0, -6, 2.4, 5, 0, 0, 6.29);
  ctx.fill();

  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.type === 'scout') {
    ctx.fillStyle = '#ff5555';
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(-11, -8);
    ctx.lineTo(0, -3);
    ctx.lineTo(11, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb0b0';
    ctx.fillRect(-2, 2, 4, 5);
  } else if (e.type === 'weaver') {
    ctx.fillStyle = '#c47dff';
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(-16, -2);
    ctx.lineTo(-8, -10);
    ctx.lineTo(0, -6);
    ctx.lineTo(8, -10);
    ctx.lineTo(16, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#efd9ff';
    ctx.fillRect(-2.5, -2, 5, 7);
  } else if (e.type === 'gunship') {
    ctx.fillStyle = '#57d977';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(-14, 10);
    ctx.lineTo(-18, -8);
    ctx.lineTo(-8, -16);
    ctx.lineTo(8, -16);
    ctx.lineTo(18, -8);
    ctx.lineTo(14, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d5c30';
    ctx.beginPath();
    ctx.arc(0, 2, 6, 0, 6.29);
    ctx.fill();
  } else if (e.type === 'boss') {
    // 主舰体
    ctx.fillStyle = '#e0455a';
    ctx.beginPath();
    ctx.moveTo(0, 50);
    ctx.lineTo(-50, 20);
    ctx.lineTo(-60, -20);
    ctx.lineTo(-25, -35);
    ctx.lineTo(25, -35);
    ctx.lineTo(60, -20);
    ctx.lineTo(50, 20);
    ctx.closePath();
    ctx.fill();
    // 侧舱
    ctx.fillStyle = '#a02840';
    ctx.fillRect(-52, -10, 16, 26);
    ctx.fillRect(36, -10, 16, 26);
    // 核心
    const pulse = 8 + Math.sin(time * 6) * 2;
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(0, 0, pulse, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = '#fff2c0';
    ctx.beginPath();
    ctx.arc(0, 0, pulse * 0.5, 0, 6.29);
    ctx.fill();
  }
  ctx.restore();
}

function drawBullets() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of pBullets) {
    ctx.fillStyle = '#7ff7ff';
    ctx.fillRect(b.x - 2, b.y - 8, 4, 14);
  }
  for (const b of eBullets) {
    ctx.fillStyle = '#ff5a6e';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = '#ffd0d6';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.45, 0, 6.29);
    ctx.fill();
  }
  ctx.restore();
}

function drawPowerups() {
  for (const p of powerups) {
    const bob = Math.sin(p.t * 5) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.fillStyle = p.kind === 'P' ? '#ffae30' : (p.kind === 'B' ? '#41d97c' : '#ff6fae');
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, 6.29);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.kind, 0, 1);
    ctx.restore();
  }
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 6.29);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,10,0.45)';
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('得分 ' + String(score).padStart(6, '0'), 10, 17);
  ctx.textAlign = 'right';
  ctx.fillText('最高 ' + String(Math.max(best, score)).padStart(6, '0'), W - 10, 17);

  // Boss 血条
  const boss = enemies.find((e) => e.type === 'boss');
  if (boss && boss.y > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W / 2 - 110, 42, 220, 10);
    ctx.fillStyle = '#ff4d5e';
    ctx.fillRect(W / 2 - 110, 42, 220 * Math.max(0, boss.hp / boss.maxhp), 10);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 110, 42, 220, 10);
  }

  // 底部：命、炸弹、武器等级
  ctx.textBaseline = 'middle';
  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = '#4dc3ff';
    const x = 18 + i * 20, y = H - 18;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x - 6, y + 6);
    ctx.lineTo(x + 6, y + 6);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < bombs; i++) {
    ctx.fillStyle = '#41d97c';
    ctx.beginPath();
    ctx.arc(16 + i * 18, H - 42, 6, 0, 6.29);
    ctx.fill();
  }
  ctx.fillStyle = '#cfe3ff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('武器 Lv.' + weapon, W - 12, H - 18);
  if (muted) ctx.fillText('已静音(M)', W - 12, H - 42);
}

function drawCenterText(lines) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,8,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  let y = H / 2 - (lines.length - 1) * 28;
  for (const line of lines) {
    ctx.fillStyle = line.color || '#dfe9ff';
    ctx.font = line.font || '20px sans-serif';
    ctx.fillText(line.text, W / 2, y);
    y += line.gap || 56;
  }
  ctx.restore();
}

function draw() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake * 22, (Math.random() - 0.5) * shake * 22);
  }

  drawBackground();
  drawPowerups();
  for (const e of enemies) drawEnemy(e);
  if (state !== 'gameover') drawPlayer();
  drawBullets();
  drawParticles();
  ctx.restore();

  if (flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (flash * 1.6) + ')';
    ctx.fillRect(0, 0, W, H);
  }

  drawHUD();

  if (warnT > 0 && Math.floor(time * 4) % 2 === 0) {
    ctx.fillStyle = '#ff3344';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WARNING', W / 2, H / 2 - 40);
    ctx.font = '18px sans-serif';
    ctx.fillText('大型敌机接近中', W / 2, H / 2);
  }

  if (state === 'menu') {
    drawCenterText([
      { text: '雷 电', font: 'bold 64px sans-serif', color: '#7fd0ff', gap: 40 },
      { text: 'R A I D E N', font: 'bold 22px monospace', color: '#4d7fbf', gap: 70 },
      { text: '方向键 / WASD 移动 · 自动开火', font: '16px sans-serif', gap: 30 },
      { text: 'X 炸弹 · P 暂停 · M 静音', font: '16px sans-serif', gap: 50 },
      { text: '— 按 Enter 开始 —', font: 'bold 20px sans-serif', color: '#ffd34d' },
    ]);
  } else if (state === 'gameover') {
    drawCenterText([
      { text: '游戏结束', font: 'bold 48px sans-serif', color: '#ff5a6e', gap: 60 },
      { text: '得分 ' + score, font: 'bold 24px monospace', gap: 34 },
      { text: '最高 ' + best, font: '18px monospace', color: '#8fa3c8', gap: 60 },
      { text: '— 按 Enter 再来一局 —', font: 'bold 20px sans-serif', color: '#ffd34d' },
    ]);
  } else if (paused) {
    drawCenterText([
      { text: '已暂停', font: 'bold 40px sans-serif', gap: 50 },
      { text: '按 P 继续', font: '18px sans-serif' },
    ]);
  }
}

/* ---------------- 主循环 ---------------- */
let last = performance.now();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

})();
