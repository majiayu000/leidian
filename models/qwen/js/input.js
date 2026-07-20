/**
 * 输入管理 — 键盘 + 鼠标
 */
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = null;
    this.mouseY = null;
    this.mouseActive = false;
    this.bombPressed = false;

    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        this.bombPressed = true;
      }
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
    };
    this._onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
      this.mouseActive = true;
    };
    this._onMouseLeave = () => {
      this.mouseActive = false;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mouseleave', this._onMouseLeave);
  }

  get left() {
    return this.keys.has('ArrowLeft') || this.keys.has('KeyA');
  }

  get right() {
    return this.keys.has('ArrowRight') || this.keys.has('KeyD');
  }

  get up() {
    return this.keys.has('ArrowUp') || this.keys.has('KeyW');
  }

  get down() {
    return this.keys.has('ArrowDown') || this.keys.has('KeyS');
  }

  consumeBomb() {
    const pressed = this.bombPressed;
    this.bombPressed = false;
    return pressed;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
