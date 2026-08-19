// 键盘输入: down() 查询按住状态, pressedOnce() 查询本帧新按下
const state = { down: {}, pressed: new Set() };

const KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'Space', 'KeyJ', 'KeyB', 'KeyP', 'Escape', 'Enter',
]);

function init() {
  window.addEventListener('keydown', (e) => {
    if (KEYS.has(e.code)) e.preventDefault();
    if (!state.down[e.code]) state.pressed.add(e.code);
    state.down[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { state.down[e.code] = false; });
  window.addEventListener('blur', () => { state.down = {}; });
}

export function down(codes) {
  return codes.some((c) => state.down[c]);
}

export function pressedOnce(codes) {
  return codes.some((c) => state.pressed.has(c));
}

export function endFrame() {
  state.pressed.clear();
}

export default { init, down, pressedOnce, endFrame };
