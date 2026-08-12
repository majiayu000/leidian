// 雷电3 - 键盘输入管理
const Input = {
  keys: {},
  pressed: {},
  init() {
    window.addEventListener('keydown', (e) => {
      const k = this._norm(e);
      if (k) {
        if (!this.keys[k]) this.pressed[k] = true;
        this.keys[k] = true;
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = this._norm(e);
      if (k) { this.keys[k] = false; e.preventDefault(); }
    });
    window.addEventListener('blur', () => { this.keys = {}; });
  },
  _norm(e) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const map = {
      'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
      'w': 'up', 's': 'down', 'a': 'left', 'd': 'right',
      ' ': 'fire', 'Shift': 'bomb',
      'p': 'pause',
      'Enter': 'enter',
      'm': 'mute'
    };
    return map[key] || null;
  },
  down(k) { return !!this.keys[k]; },
  // 单次按下（消费式）
  justPressed(k) { if (this.pressed[k]) { this.pressed[k] = false; return true; } return false; },
  // 每帧末调用，清空 pressed 标记（防止 missed frame）
  endFrame() { this.pressed = {}; }
};
