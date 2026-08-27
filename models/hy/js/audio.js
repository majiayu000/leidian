// 雷电3 - 程序化音效（Web Audio，无需外部资源）
const Audio = {
  ctx: null,
  enabled: true,
  master: null,
  init() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.enabled = false;
    }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  toggle() { this.enabled = !this.enabled; return this.enabled; },
  _tone(freq, dur, type, vol, slideTo) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur);
  },
  _noise(dur, vol) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.buffer = buf; src.connect(g); g.connect(this.master);
    src.start(t);
  },
  shoot() { this._tone(880, 0.07, 'square', 0.12, 1400); },
  enemyShoot() { this._tone(300, 0.12, 'sawtooth', 0.10, 200); },
  hit() { this._noise(0.08, 0.25); },
  explosion() { this._noise(0.4, 0.5); this._tone(120, 0.4, 'sawtooth', 0.2, 40); },
  bossExplosion() { this._noise(0.9, 0.6); this._tone(80, 0.9, 'sawtooth', 0.3, 30); },
  powerup() { this._tone(660, 0.1, 'sine', 0.25, 990); this._tone(990, 0.12, 'sine', 0.2, 1320); },
  bomb() { this._noise(0.7, 0.6); this._tone(200, 0.7, 'sawtooth', 0.3, 50); },
  playerHit() { this._tone(200, 0.3, 'square', 0.3, 80); },
  levelClear() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.2, 'triangle', 0.3), i * 120)); },
  gameOver() { [400, 320, 240, 160].forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 'sawtooth', 0.3), i * 180)); }
};
