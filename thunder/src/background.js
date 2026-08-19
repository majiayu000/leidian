// 三层滚动星野
const layers = [];

export function init(W, H) {
  layers.length = 0;
  for (let l = 0; l < 3; l++) {
    const stars = [];
    const n = 26 + l * 24;
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + l * 0.7 + Math.random() * 0.6,
      });
    }
    layers.push({ stars, speed: 40 + l * 75, alpha: 0.3 + l * 0.28 });
  }
}

export function update(dt, W, H) {
  for (const layer of layers) {
    for (const s of layer.stars) {
      s.y += layer.speed * dt;
      if (s.y > H + 2) {
        s.y = -2;
        s.x = Math.random() * W;
      }
    }
  }
}

export function draw(g, W, H) {
  for (const layer of layers) {
    g.globalAlpha = layer.alpha;
    g.fillStyle = '#cfe4ff';
    for (const s of layer.stars) g.fillRect(s.x, s.y, s.r, s.r * 1.6);
  }
  g.globalAlpha = 1;
}
