// 雷电3 - 游戏实体（子弹 / 粒子 / 道具 / 玩家 / 敌机 / Boss）

// ---------- 子弹 ----------
class Bullet {
  constructor(x, y, vx, vy, opts = {}) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.r = opts.r || 4;
    this.damage = opts.damage || 1;
    this.friendly = opts.friendly || false;
    this.color = opts.color || (this.friendly ? '#7df9ff' : '#ff5b6e');
    this.dead = false;
    this.kind = opts.kind || 'bullet';
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -20 || this.y > Game.H + 20 || this.x < -20 || this.x > Game.W + 20) this.dead = true;
  }
  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ---------- 粒子 ----------
class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life; this.color = color; this.size = size || 3;
    this.dead = false;
  }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.96; this.vy *= 0.96;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    const a = Utils.clamp(this.life / this.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size * a, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------- 道具 ----------
const POWERUP_TYPES = {
  weapon: { color: '#ffd23f', label: 'P' },
  bomb:   { color: '#b06bff', label: 'B' },
  shield: { color: '#3fd6ff', label: 'S' },
  life:   { color: '#ff5b8a', label: 'L' },
  score:  { color: '#9dff5b', label: '$' }
};
class PowerUp {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.vy = 60; this.type = type;
    this.r = 12; this.dead = false; this.t = 0;
  }
  update(dt) {
    this.t += dt;
    this.y += this.vy * dt;
    this.x += Math.sin(this.t * 3) * 18 * dt;
    if (this.y > Game.H + 20) this.dead = true;
  }
  draw(ctx) {
    const def = POWERUP_TYPES[this.type];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.t * 1.5);
    ctx.shadowBlur = 12; ctx.shadowColor = def.color;
    ctx.fillStyle = def.color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const px = Math.cos(a) * this.r, py = Math.sin(a) * this.r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1a1030';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.label, this.x, this.y);
  }
}

// ---------- 玩家 ----------
class Player {
  constructor() {
    this.x = Game.W / 2; this.y = Game.H - 90;
    this.r = 12; this.speed = 320;
    this.lives = 3; this.weapon = 1; this.bombs = 3;
    this.shieldTime = 0; this.invuln = 2.0;
    this.fireCd = 0; this.fireRate = 0.12;
    this.thrust = 0; this.dead = false;
    this.spawnInvuln = 2.0;
  }
  update(dt) {
    let dx = 0, dy = 0;
    if (Input.down('left')) dx -= 1;
    if (Input.down('right')) dx += 1;
    if (Input.down('up')) dy -= 1;
    if (Input.down('down')) dy += 1;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    this.x = Utils.clamp(this.x + dx * this.speed * dt, this.r, Game.W - this.r);
    this.y = Utils.clamp(this.y + dy * this.speed * dt, this.r, Game.H - this.r);
    this.thrust = (dy < 0) ? 1 : 0.4;

    this.invuln = Math.max(0, this.invuln - dt);
    this.shieldTime = Math.max(0, this.shieldTime - dt);

    this.fireCd -= dt;
    if (Input.down('fire') && this.fireCd <= 0) { this.shoot(); this.fireCd = this.fireRate; }
  }
  shoot() {
    const lvl = this.weapon;
    const speed = 620;
    const mk = (ang, offX) => {
      const v = Utils.fromAngle(ang);
      Game.spawnPlayerBullet(this.x + offX, this.y - 16, v.x * speed, v.y * speed, 1, '#7df9ff');
    };
    if (lvl === 1) { mk(0, 0); }
    else if (lvl === 2) { mk(0, -8); mk(0, 8); }
    else if (lvl === 3) { mk(0, 0); mk(-12, -6); mk(12, 6); }
    else if (lvl === 4) { mk(0, -10); mk(0, 10); mk(-15, -4); mk(15, 4); }
    else { mk(0, 0); mk(-10, -7); mk(10, 7); mk(-18, -3); mk(18, 3); }
    Audio.shoot();
  }
  bomb() {
    if (this.bombs <= 0) return;
    this.bombs--;
    this.invuln = Math.max(this.invuln, 1.5);
    Audio.bomb();
    Game.enemyBullets.forEach(b => b.dead = true);
    Game.enemies.forEach(e => e.hit(6));
    if (Game.boss) Game.boss.hit(40);
    Game.addExplosion(this.x, this.y, 220, '#b06bff', 60);
    Game.screenShake = 0.6;
  }
  hit() {
    if (this.invuln > 0 || this.dead) return;
    if (this.shieldTime > 0) {
      this.shieldTime = 0; this.invuln = 1.0;
      Game.addExplosion(this.x, this.y, 60, '#3fd6ff', 14);
      Audio.hit();
      return;
    }
    this.lives--;
    this.weapon = Math.max(1, this.weapon - 1);
    this.invuln = 2.0;
    Audio.playerHit();
    Game.addExplosion(this.x, this.y, 80, '#7df9ff', 22);
    Game.screenShake = 0.4;
    if (this.lives <= 0) { this.dead = true; Game.onPlayerDeath(); }
  }
  draw(ctx) {
    const blink = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    // 尾焰
    ctx.fillStyle = 'rgba(120,220,255,0.7)';
    const fl = 14 + Math.random() * 10 * this.thrust;
    ctx.beginPath();
    ctx.moveTo(-5, 10); ctx.lineTo(0, 10 + fl); ctx.lineTo(5, 10); ctx.closePath(); ctx.fill();
    // 机身
    ctx.fillStyle = '#dff3ff';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(10, 10); ctx.lineTo(4, 6);
    ctx.lineTo(0, 12); ctx.lineTo(-4, 6);
    ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3aa0ff';
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff5b6e';
    ctx.beginPath(); ctx.arc(0, -6, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (this.shieldTime > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(Game.time * 8) * 0.15;
      ctx.strokeStyle = '#3fd6ff'; ctx.lineWidth = 2;
      ctx.shadowBlur = 14; ctx.shadowColor = '#3fd6ff';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 10, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

// ---------- 敌机 ----------
const ENEMY_DEFS = {
  grunt:  { hp: 2,  r: 13, score: 100, color: '#ff8a5b', speed: 130 },
  zigzag: { hp: 3,  r: 14, score: 150, color: '#ffd23f', speed: 110 },
  shooter:{ hp: 4,  r: 15, score: 250, color: '#ff5b8a', speed: 80  },
  tank:   { hp: 12, r: 22, score: 500, color: '#c879ff', speed: 55  },
  diver:  { hp: 2,  r: 12, score: 180, color: '#5bffd0', speed: 240 }
};
class Enemy {
  constructor(type, x, y, opts = {}) {
    const d = ENEMY_DEFS[type];
    this.type = type; this.x = x; this.y = y;
    this.hp = d.hp; this.maxHp = d.hp;
    this.r = d.r; this.score = d.score; this.color = d.color; this.speed = d.speed;
    this.dead = false; this.flash = 0; this.t = 0;
    this.amp = opts.amp || 70; this.baseX = x;
    this.fireCd = Utils.rand(0.8, 1.8);
    this.vx = opts.vx || 0; this.vy = opts.vy || this.speed;
    this.stopY = opts.stopY || 0;
  }
  update(dt) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    switch (this.type) {
      case 'grunt': this.y += this.vy * dt; break;
      case 'zigzag':
        this.y += this.speed * dt;
        this.x = this.baseX + Math.sin(this.t * 2.5) * this.amp;
        break;
      case 'diver':
        this.x += this.vx * dt; this.y += this.vy * dt; break;
      case 'shooter':
        if (this.y < this.stopY) this.y += this.speed * dt;
        else { this.y = this.stopY; this._tryShoot(dt, true); }
        break;
      case 'tank':
        if (this.y < this.stopY) this.y += this.speed * dt;
        else { this.y = this.stopY; this._tryShoot(dt, false); }
        break;
    }
    if (this.y > Game.H + 30 || this.x < -40 || this.x > Game.W + 40) this.dead = true;
  }
  _tryShoot(dt, aimed) {
    this.fireCd -= dt;
    if (this.fireCd <= 0) {
      this.fireCd = this.type === 'tank' ? 1.6 : 1.2;
      Audio.enemyShoot();
      if (aimed && Game.player && !Game.player.dead) {
        const a = Math.atan2(Game.player.y - this.y, Game.player.x - this.x);
        const sp = 220;
        Game.spawnEnemyBullet(this.x, this.y + this.r, Math.cos(a) * sp, Math.sin(a) * sp, 1, '#ff5b6e');
      } else {
        const sp = 200;
        [-20, 0, 20].forEach(off => {
          const a = (90 + off) * Math.PI / 180;
          Game.spawnEnemyBullet(this.x, this.y + this.r, Math.cos(a) * sp, Math.sin(a) * sp, 1, '#ff9b5b');
        });
      }
    }
  }
  hit(dmg) {
    this.hp -= dmg; this.flash = 0.08;
    if (this.hp <= 0) {
      this.dead = true;
      Game.onEnemyKilled(this);
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowBlur = 10; ctx.shadowColor = this.color;
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.color;
    const r = this.r;
    ctx.beginPath();
    if (this.type === 'tank') {
      ctx.moveTo(0, r); ctx.lineTo(r, -r * 0.4); ctx.lineTo(r * 0.4, -r);
      ctx.lineTo(-r * 0.4, -r); ctx.lineTo(-r, -r * 0.4); ctx.closePath();
    } else if (this.type === 'shooter') {
      ctx.moveTo(0, r); ctx.lineTo(r, 0); ctx.lineTo(r * 0.5, -r); ctx.lineTo(-r * 0.5, -r); ctx.lineTo(-r, 0); ctx.closePath();
    } else {
      ctx.moveTo(0, r); ctx.lineTo(r, -r * 0.6); ctx.lineTo(0, -r * 0.3); ctx.lineTo(-r, -r * 0.6); ctx.closePath();
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ---------- Boss ----------
class Boss {
  constructor(level) {
    this.x = Game.W / 2; this.y = -80;
    this.r = 50; this.maxHp = 600 + level * 200; this.hp = this.maxHp;
    this.dead = false; this.flash = 0; this.t = 0;
    this.phase = 0; this.state = 'enter';
    this.fireCd = 0; this.targetY = 130;
    this.dir = 1; this.level = level;
    this.entered = false;
  }
  update(dt) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.state === 'enter') {
      this.y += 60 * dt;
      if (this.y >= this.targetY) { this.y = this.targetY; this.state = 'fight'; }
      return;
    }
    // 横向巡逻
    this.x += this.dir * 70 * dt;
    if (this.x < this.r) { this.x = this.r; this.dir = 1; }
    if (this.x > Game.W - this.r) { this.x = Game.W - this.r; this.dir = -1; }

    const hpRatio = this.hp / this.maxHp;
    this.phase = hpRatio > 0.6 ? 0 : hpRatio > 0.3 ? 1 : 2;

    this.fireCd -= dt;
    if (this.fireCd <= 0) {
      this._attack();
      this.fireCd = this.phase === 0 ? 1.4 : this.phase === 1 ? 1.0 : 0.7;
    }
  }
  _attack() {
    Audio.enemyShoot();
    if (this.phase === 0) {
      // 扇形弹幕
      for (let i = -3; i <= 3; i++) {
        const a = (90 + i * 12) * Math.PI / 180;
        Game.spawnEnemyBullet(this.x, this.y + this.r * 0.5, Math.cos(a) * 200, Math.sin(a) * 200, 2, '#ff5b6e');
      }
    } else if (this.phase === 1) {
      // 瞄准 + 两侧
      if (Game.player) {
        const a = Math.atan2(Game.player.y - this.y, Game.player.x - this.x);
        for (let i = -1; i <= 1; i++) {
          const ang = a + i * 0.18;
          Game.spawnEnemyBullet(this.x, this.y + this.r * 0.5, Math.cos(ang) * 240, Math.sin(ang) * 240, 2, '#ff9b5b');
        }
      }
    } else {
      // 旋转螺旋弹幕
      const n = 10;
      const base = this.t * 3;
      for (let i = 0; i < n; i++) {
        const a = base + i / n * Math.PI * 2;
        Game.spawnEnemyBullet(this.x, this.y, Math.cos(a) * 170, Math.sin(a) * 170, 2, '#ff5bff');
      }
    }
  }
  hit(dmg) {
    if (this.state === 'enter') return;
    this.hp -= dmg; this.flash = 0.06;
    Game.addParticle(this.x + Utils.rand(-this.r, this.r), this.y + Utils.rand(-this.r, this.r), 0, 0, 0.3, '#ffd23f', 3);
    if (this.hp <= 0) { this.dead = true; Game.onBossKilled(this); }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowBlur = 20; ctx.shadowColor = '#ff5b6e';
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#7a2b3a';
    ctx.beginPath();
    ctx.moveTo(0, this.r);
    ctx.lineTo(this.r, this.r * 0.3);
    ctx.lineTo(this.r * 0.6, -this.r * 0.6);
    ctx.lineTo(0, -this.r);
    ctx.lineTo(-this.r * 0.6, -this.r * 0.6);
    ctx.lineTo(-this.r, this.r * 0.3);
    ctx.closePath(); ctx.fill();
    // 核心
    const pulse = 0.6 + Math.sin(this.t * 6) * 0.3;
    ctx.fillStyle = `rgba(255,${120 + this.phase * 40},90,${pulse})`;
    ctx.beginPath(); ctx.arc(0, -this.r * 0.2, this.r * 0.35, 0, Math.PI * 2); ctx.fill();
    // 翼炮
    ctx.fillStyle = '#3a1420';
    ctx.fillRect(-this.r, this.r * 0.2, this.r * 0.35, this.r * 0.5);
    ctx.fillRect(this.r * 0.65, this.r * 0.2, this.r * 0.35, this.r * 0.5);
    ctx.restore();
  }
}
