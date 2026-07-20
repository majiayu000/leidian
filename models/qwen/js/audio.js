/**
 * 音效管理 — Web Audio API 合成音效，无外部资源
 */
export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  _playTone(freq, duration, type = 'square', volume = 0.15) {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  shoot() {
    this._playTone(880, 0.05, 'square', 0.06);
  }

  enemyShoot() {
    this._playTone(220, 0.08, 'sawtooth', 0.04);
  }

  explosion() {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  bigExplosion() {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  powerup() {
    this._playTone(523, 0.08, 'sine', 0.12);
    setTimeout(() => this._playTone(784, 0.12, 'sine', 0.12), 80);
  }

  bomb() {
    this._playTone(100, 0.6, 'sawtooth', 0.25);
  }

  playerHit() {
    this._playTone(150, 0.3, 'sawtooth', 0.2);
  }
}
