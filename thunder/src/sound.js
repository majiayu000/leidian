// WebAudio 合成音效, 无外部资源
let ctx = null;
let master = null;
let noiseBuf = null;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function beep(freq, endFreq, dur, type = 'square', vol = 0.5) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function noise(dur, vol, cutoff) {
  if (!ctx) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, t);
  filter.frequency.exponentialRampToValueAtTime(80, t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t);
  src.stop(t + dur);
}

export const sfx = {
  shoot() { beep(900, 240, 0.07, 'square', 0.08); },
  explode(big) { noise(big ? 0.55 : 0.28, big ? 0.9 : 0.4, big ? 900 : 600); },
  bossDie() { noise(0.9, 1, 1400); beep(160, 36, 0.8, 'sawtooth', 0.5); },
  pickup() {
    beep(520, 1040, 0.1, 'sine', 0.35);
    setTimeout(() => beep(780, 1560, 0.12, 'sine', 0.35), 70);
  },
  bomb() { beep(180, 1600, 0.35, 'sawtooth', 0.4); noise(1.1, 1, 2400); },
};
