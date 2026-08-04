// 雷电3 - 通用工具函数
const Utils = {
  rand(min, max) { return Math.random() * (max - min) + min; },
  randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  clamp(v, min, max) { return v < min ? min : (v > max ? max : v); },
  choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  chance(p) { return Math.random() < p; },
  dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
  lerp(a, b, t) { return a + (b - a) * t; },
  // 圆-圆碰撞（实体以中心 + 半径 r 表示）
  circleHit(a, b) {
    const ra = a.r || Math.max(a.w || 0, a.h || 0) / 2;
    const rb = b.r || Math.max(b.w || 0, b.h || 0) / 2;
    const rr = ra + rb;
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy <= rr * rr;
  },
  // 角度转方向向量
  fromAngle(deg) {
    const r = (deg - 90) * Math.PI / 180;
    return { x: Math.cos(r), y: Math.sin(r) };
  }
};

// 简易对象池（用于子弹/粒子，减少 GC 抖动）
class Pool {
  constructor(factory) { this.factory = factory; this.free = []; }
  get() { return this.free.pop() || this.factory(); }
  release(obj) { this.free.push(obj); }
}
