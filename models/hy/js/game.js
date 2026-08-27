// 雷电3 - 核心游戏引擎（状态机 / 碰撞 / 渲染 / HUD）
const Game = {
  W: 480, H: 720,
  MAX_LEVEL: 5,
  MAX_SIMULATION_STEP: 1 / 60,
  canvas: null, ctx: null,
  state: 'menu', // menu | playing | paused | levelclear | gameover | victory
  player: null, boss: null, spawner: null,
  bullets: [], enemyBullets: [], enemies: [], particles: [], powerups: [],
  stars: [],
  score: 0, highScore: 0, highScoreStorageAvailable: true, level: 1, time: 0, screenShake: 0,
  bossSpawned: false, transition: 0, banner: '', runId: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.highScoreStorageAvailable = true;
    try {
      this.highScore = parseInt(localStorage.getItem('leidian3_hi') || '0', 10) || 0;
    } catch {
      this.highScore = 0;
      this.highScoreStorageAvailable = false;
    }
    this._initStars();
    Input.init();
    Audio.init();
    requestAnimationFrame((t) => this.loop(t));
  },

  _initStars() {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        s: Utils.rand(0.5, 2.2),
        v: Utils.rand(20, 90)
      });
    }
  },

  // ---------- 生成接口（供实体调用） ----------
  spawnPlayerBullet(x, y, vx, vy, dmg, color) {
    this.bullets.push(new Bullet(x, y, vx, vy, { friendly: true, damage: dmg, color, r: 4 }));
  },
  spawnEnemyBullet(x, y, vx, vy, dmg, color) {
    this.enemyBullets.push(new Bullet(x, y, vx, vy, { friendly: false, damage: dmg, color, r: 5 }));
  },
  spawnEnemy(type, x, y, opts) {
    this.enemies.push(new Enemy(type, x, y, opts));
  },
  addParticle(x, y, vx, vy, life, color, size) {
    this.particles.push(new Particle(x, y, vx, vy, life, color, size));
  },
  addExplosion(x, y, radius, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Utils.rand(40, radius);
      this.particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, Utils.rand(0.3, 0.7), color, Utils.rand(2, 5)));
    }
  },

  // ---------- 事件回调 ----------
  onEnemyKilled(e) {
    this.score += e.score;
    Audio.explosion();
    this.addExplosion(e.x, e.y, e.r + 50, e.color, 18);
    this.screenShake = Math.max(this.screenShake, 0.12);
    // 道具掉落
    this._maybeDrop(e.x, e.y, e.type);
  },
  _maybeDrop(x, y, type) {
    let r = Math.random();
    if (type === 'tank') r *= 0.34; // 坦克必掉之一
    if (r < 0.10) this.powerups.push(new PowerUp(x, y, 'weapon'));
    else if (r < 0.16) this.powerups.push(new PowerUp(x, y, 'bomb'));
    else if (r < 0.20) this.powerups.push(new PowerUp(x, y, 'shield'));
    else if (r < 0.225) this.powerups.push(new PowerUp(x, y, 'life'));
    else if (r < 0.34) this.powerups.push(new PowerUp(x, y, 'score'));
  },
  onBossKilled(b) {
    Audio.bossExplosion();
    this.score += 5000 + this.level * 1000;
    this.screenShake = 0.8;
    const runId = this.runId;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (this.runId !== runId) return;
        this.addExplosion(b.x + Utils.rand(-40, 40), b.y + Utils.rand(-30, 30), 160, Utils.choice(['#ff5b6e', '#ffd23f', '#ff5bff']), 30);
      }, i * 90);
    }
    for (let i = 0; i < 3; i++) {
      this.powerups.push(new PowerUp(Utils.rand(80, this.W - 80), 120 + i * 40, Utils.choice(['weapon', 'bomb', 'shield', 'life'])));
    }
    this.enemyBullets.forEach(b => b.dead = true);
    this.boss = null;
    const isVictory = this.level >= this.MAX_LEVEL;
    if (isVictory) this._saveHighScore();
    this.banner = isVictory ? '胜利！' : '关卡清空';
    this.transition = 2.2;
    this.state = isVictory ? 'victory' : 'levelclear';
    if (this.state === 'levelclear') Audio.levelClear();
  },
  _saveHighScore() {
    if (this.score <= this.highScore) return;
    this.highScore = this.score;
    if (!this.highScoreStorageAvailable) return;
    try {
      localStorage.setItem('leidian3_hi', String(this.highScore));
    } catch {
      this.highScoreStorageAvailable = false;
    }
  },
  onPlayerDeath() {
    Audio.gameOver();
    this.banner = '游戏结束';
    this.transition = 0;
    this.state = 'gameover';
    this._saveHighScore();
  },

  // ---------- 控制 ----------
  startGame() {
    Audio.resume();
    this.runId++;
    this.bullets = []; this.enemyBullets = []; this.enemies = []; this.particles = []; this.powerups = [];
    this.score = 0; this.level = 1; this.time = 0; this.screenShake = 0;
    this.player = new Player();
    this.boss = null; this.bossSpawned = false;
    this.spawner = new Spawner(this.level);
    this.state = 'playing';
    this.banner = '';
  },
  nextLevel() {
    this.level++;
    this.enemies = []; this.enemyBullets = []; this.boss = null; this.bossSpawned = false;
    this.spawner = new Spawner(this.level);
    this.player.invuln = 2.0;
    this.state = 'playing';
  },

  // ---------- 主循环 ----------
  loop(now) {
    const dt = Math.min(0.05, (now - (this._last || now)) / 1000);
    this._last = now;
    this.time += dt;

    if (Input.justPressed('mute')) Audio.toggle();
    if (this.state === 'playing') {
      let remaining = dt;
      while (remaining > 0 && this.state === 'playing') {
        const step = Math.min(this.MAX_SIMULATION_STEP, remaining);
        this.update(step);
        remaining -= step;
      }
    }
    else if (this.state === 'levelclear' || this.state === 'victory' || this.state === 'gameover') {
      // 仍更新粒子/星空做背景动效
      this._updateAmbient(dt);
      if (this.state === 'levelclear') {
        this.transition -= dt;
        if (this.transition <= 0) this.nextLevel();
      }
    }
    this.draw();
    Input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  },

  _updateAmbient(dt) {
    this._updateStars(dt);
    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => !p.dead);
    this.screenShake = Math.max(0, this.screenShake - dt);
  },

  _updateStars(dt) {
    this.stars.forEach(s => {
      s.y += s.v * dt;
      if (s.y > this.H) { s.y = -2; s.x = Math.random() * this.W; }
    });
  },

  update(dt) {
    // 暂停
    if (Input.justPressed('pause')) { this.state = 'paused'; return; }
    if (Input.justPressed('bomb')) this.player.bomb();

    this._updateStars(dt);

    this.spawner.update(dt);
    // 波次结束且场上清空 -> 生成 Boss
    if (this.spawner.done && this.enemies.length === 0 && !this.boss && !this.bossSpawned) {
      this.boss = new Boss(this.level);
      this.bossSpawned = true;
      this.banner = '⚠ BOSS 来袭';
      this.transition = 1.6;
    }

    this.player.update(dt);
    this.bullets.forEach(b => b.update(dt));
    this.enemyBullets.forEach(b => b.update(dt));
    this.enemies.forEach(e => e.update(dt));
    this.powerups.forEach(p => p.update(dt));
    this.particles.forEach(p => p.update(dt));
    if (this.boss) this.boss.update(dt);

    this._collisions();

    // 清理
    this.bullets = this.bullets.filter(b => !b.dead);
    this.enemyBullets = this.enemyBullets.filter(b => !b.dead);
    this.enemies = this.enemies.filter(e => !e.dead);
    this.powerups = this.powerups.filter(p => !p.dead);
    this.particles = this.particles.filter(p => !p.dead);
    this.screenShake = Math.max(0, this.screenShake - dt);
    if (this.transition > 0) this.transition -= dt;
  },

  _collisions() {
    const player = this.player;

    // 玩家子弹 vs 敌人 / Boss
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Utils.circleHit(b, e)) { e.hit(b.damage); b.dead = true; Audio.hit(); break; }
      }
      if (!b.dead && this.boss && !this.boss.dead && Utils.circleHit(b, this.boss)) {
        this.boss.hit(b.damage); b.dead = true; Audio.hit();
      }
    }

    // 敌机子弹 vs 玩家
    for (const b of this.enemyBullets) {
      if (b.dead) continue;
      if (Utils.circleHit(b, player)) { b.dead = true; player.hit(b.damage); }
      if (player.dead) return;
    }
    // 敌机机体 vs 玩家
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Utils.circleHit(e, player)) { e.hit(999); player.hit(); }
      if (player.dead) return;
    }
    if (this.boss && !this.boss.dead && Utils.circleHit(this.boss, player)) {
      player.hit();
      if (player.dead) return;
    }

    // 道具 vs 玩家
    for (const p of this.powerups) {
      if (p.dead) continue;
      if (Utils.circleHit(p, player)) { this._collect(p); p.dead = true; }
    }
  },

  _collect(p) {
    Audio.powerup();
    switch (p.type) {
      case 'weapon': this.player.weapon = Math.min(5, this.player.weapon + 1); break;
      case 'bomb': this.player.bombs = Math.min(9, this.player.bombs + 1); break;
      case 'shield': this.player.shieldTime = 8; break;
      case 'life': this.player.lives = Math.min(9, this.player.lives + 1); break;
      case 'score': this.score += 1000; break;
    }
  },

  // ---------- 渲染 ----------
  draw() {
    const ctx = this.ctx;
    ctx.save();
    // 屏幕震动
    if (this.screenShake > 0) {
      ctx.translate(Utils.rand(-1, 1) * this.screenShake * 8, Utils.rand(-1, 1) * this.screenShake * 8);
    }
    // 背景
    this._drawBackground(ctx);

    // 世界对象
    if (this.state !== 'menu') {
      this.powerups.forEach(p => p.draw(ctx));
      this.bullets.forEach(b => b.draw(ctx));
      this.enemies.forEach(e => e.draw(ctx));
      if (this.boss) this.boss.draw(ctx);
      this.enemyBullets.forEach(b => b.draw(ctx));
      this.particles.forEach(p => p.draw(ctx));
      if (this.player && !this.player.dead) this.player.draw(ctx);
    }
    ctx.restore();

    // HUD 与覆盖层（不随震动）
    if (this.state === 'playing' || this.state === 'paused' || this.state === 'levelclear') this._drawHUD(ctx);
    if (this.banner && (this.state === 'playing' || this.state === 'levelclear')) this._drawBanner(ctx);
    this._drawOverlay(ctx);
  },

  _drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, '#05030f');
    g.addColorStop(1, '#160a2e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
    ctx.fillStyle = '#ffffff';
    this.stars.forEach(s => { ctx.globalAlpha = Utils.clamp(s.s / 2.2, 0.2, 1); ctx.fillRect(s.x, s.y, s.s, s.s); });
    ctx.globalAlpha = 1;
  },

  _drawHUD(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, this.W, 30);
    ctx.fillStyle = '#dff3ff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('得分 ' + this.score, 10, 15);
    ctx.textAlign = 'center';
    ctx.fillText('第 ' + this.level + ' / ' + this.MAX_LEVEL + ' 关', this.W / 2, 15);
    ctx.textAlign = 'right';
    ctx.fillText('最高 ' + this.highScore, this.W - 10, 15);

    // 底部状态条
    const py = this.H - 20;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff5b8a';
    let lifeStr = '';
    for (let i = 0; i < (this.player ? this.player.lives : 0); i++) lifeStr += '♥';
    ctx.font = '14px monospace';
    ctx.fillText(lifeStr || '-', 10, py);
    ctx.fillStyle = '#b06bff';
    let bombStr = '';
    for (let i = 0; i < (this.player ? this.player.bombs : 0); i++) bombStr += '✦';
    ctx.textAlign = 'center';
    ctx.fillText('武器Lv' + (this.player ? this.player.weapon : 1) + '  ' + (bombStr || '无弹'), this.W / 2, py);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9dff5b';
    ctx.fillText(this.player && this.player.shieldTime > 0 ? '护盾 ' + this.player.shieldTime.toFixed(0) + 's' : '', this.W - 10, py);

    // Boss 血条
    if (this.boss && this.boss.state !== 'enter') {
      const bw = this.W - 40, bx = 20, by = 36;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, by, bw, 8);
      ctx.fillStyle = '#ff5b6e';
      ctx.fillRect(bx, by, bw * Utils.clamp(this.boss.hp / this.boss.maxHp, 0, 1), 8);
      ctx.fillStyle = '#dff3ff'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('BOSS', this.W / 2, by + 16);
    }
  },

  _drawBanner(ctx) {
    if (this.transition <= 0) return;
    ctx.save();
    ctx.globalAlpha = Utils.clamp(this.transition, 0, 1);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowBlur = 12; ctx.shadowColor = '#ffd23f';
    ctx.fillText(this.banner, this.W / 2, this.H / 2 - 60);
    ctx.restore();
  },

  _drawOverlay(ctx) {
    if (this.state === 'menu') {
      this._panel(ctx, [
        ['雷电 · 雷霆战机', 0, '#7df9ff', 30],
        ['', 0],
        ['方向键 / WASD  移动', 0, '#dff3ff', 16],
        ['空格  射击（长按连射）', 0, '#dff3ff', 16],
        ['Shift  释放炸弹（清屏+无敌）', 0, '#dff3ff', 16],
        ['P  暂停    M  静音', 0, '#dff3ff', 16],
        ['', 0],
        ['道具： P武器 B炸弹 S护盾 L生命 $分数', 0, '#9dff5b', 13],
        this._highScoreStorageNotice(),
        ['', 0],
        ['按 Enter 开始游戏', 0, '#ffd23f', 20]
      ]);
    } else if (this.state === 'paused') {
      this._panel(ctx, [
        ['已暂停', 0, '#ffd23f', 28],
        ['', 0],
        ['按 P 继续', 0, '#dff3ff', 18]
      ]);
    } else if (this.state === 'gameover') {
      this._panel(ctx, [
        ['游戏结束', 0, '#ff5b6e', 30],
        ['', 0],
        ['本局得分  ' + this.score, 0, '#dff3ff', 18],
        ['历史最高  ' + this.highScore, 0, '#dff3ff', 18],
        this._highScoreStorageNotice(),
        ['', 0],
        ['按 Enter 重新开始', 0, '#ffd23f', 20]
      ]);
    } else if (this.state === 'victory') {
      this._panel(ctx, [
        ['🎉 全部通关！', 0, '#9dff5b', 28],
        ['', 0],
        ['最终得分  ' + this.score, 0, '#dff3ff', 18],
        ['历史最高  ' + this.highScore, 0, '#dff3ff', 18],
        this._highScoreStorageNotice(),
        ['', 0],
        ['按 Enter 再来一局', 0, '#ffd23f', 20]
      ]);
    }

    // 菜单/结束界面 Enter 处理
    if ((this.state === 'menu' || this.state === 'gameover' || this.state === 'victory') && Input.justPressed('enter')) {
      this.startGame();
    }
    if (this.state === 'paused' && Input.justPressed('pause')) this.state = 'playing';
  },

  _highScoreStorageNotice() {
    return this.highScoreStorageAvailable
      ? ['', 0]
      : ['最高分存储不可用 · 仅本次有效', 0, '#ffcc00', 13];
  },

  _panel(ctx, lines) {
    ctx.fillStyle = 'rgba(5,3,15,0.78)';
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const startY = this.H / 2 - (lines.length * 26) / 2;
    lines.forEach((ln, i) => {
      const [text, , color = '#dff3ff', size = 16] = ln;
      if (text === '') return;
      ctx.fillStyle = color;
      ctx.font = 'bold ' + size + 'px monospace';
      ctx.shadowBlur = 8; ctx.shadowColor = color;
      ctx.fillText(text, this.W / 2, startY + i * 26);
    });
    ctx.shadowBlur = 0;
  }
};
