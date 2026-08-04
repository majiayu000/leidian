// 雷电3 - 启动入口
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  canvas.width = Game.W;
  canvas.height = Game.H;
  Game.init(canvas);

  // 适配高 DPI：用 CSS 缩放，保持内部分辨率恒定
  function fit() {
    const pad = 0;
    const availH = window.innerHeight - pad;
    const availW = window.innerWidth - pad;
    const scale = Math.min(availW / Game.W, availH / Game.H);
    canvas.style.width = (Game.W * scale) + 'px';
    canvas.style.height = (Game.H * scale) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();
});
