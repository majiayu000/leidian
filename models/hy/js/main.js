// 雷电3 - 启动入口
function calculateCanvasScale(stage, hint) {
  const stageStyle = getComputedStyle(stage);
  const horizontalPadding = parseFloat(stageStyle.paddingLeft) + parseFloat(stageStyle.paddingRight);
  const verticalPadding = parseFloat(stageStyle.paddingTop) + parseFloat(stageStyle.paddingBottom);
  const availableWidth = stage.clientWidth - horizontalPadding;
  let availableHeight = stage.clientHeight - verticalPadding;

  if (getComputedStyle(hint).display !== 'none') {
    const gap = parseFloat(stageStyle.rowGap || stageStyle.gap) || 0;
    availableHeight -= hint.getBoundingClientRect().height + gap;
  }

  return Math.max(0, Math.min(availableWidth / Game.W, availableHeight / Game.H));
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  const stage = document.getElementById('stage');
  const hint = stage.querySelector('.hint');
  canvas.width = Game.W;
  canvas.height = Game.H;
  Game.init(canvas);

  // 适配高 DPI：用 CSS 缩放，保持内部分辨率恒定
  function fit() {
    const scale = calculateCanvasScale(stage, hint);
    canvas.style.width = (Game.W * scale) + 'px';
    canvas.style.height = (Game.H * scale) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();
});
