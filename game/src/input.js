// Keyboard and mouse state for Solmar City. The game loop reads this
// once a frame and turns it into the plain input object the world takes.
export function createInput(canvas) {
  const state = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicked: false,
    pressed: new Set(),
  };
  function codeOf(e) {
    return e.code || e.key;
  }
  window.addEventListener('keydown', (e) => {
    const c = codeOf(e);
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) {
      e.preventDefault();
    }
    if (!e.repeat) state.pressed.add(c);
    state.keys.add(c);
  });
  window.addEventListener('keyup', (e) => {
    state.keys.delete(codeOf(e));
  });
  window.addEventListener('blur', () => {
    state.keys.clear();
    state.mouseDown = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - r.left;
    state.mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - r.left;
    state.mouseY = e.clientY - r.top;
    state.mouseDown = true;
    state.clicked = true;
  });
  window.addEventListener('mouseup', () => {
    state.mouseDown = false;
  });
  // Turn the raw state into the world's input shape. cam converts the
  // mouse position from screen pixels to world coordinates.
  state.toWorldInput = (cam, vw, vh) => {
    const held = (a, b) => state.keys.has(a) || (b && state.keys.has(b));
    return {
      up: held('KeyW', 'ArrowUp'),
      down: held('KeyS', 'ArrowDown'),
      left: held('KeyA', 'ArrowLeft'),
      right: held('KeyD', 'ArrowRight'),
      run: state.keys.has('ShiftLeft') || state.keys.has('ShiftRight'),
      interact: state.keys.has('KeyE'),
      punch: state.keys.has('KeyF'),
      shoot: state.mouseDown,
      aimX: cam.x - vw / 2 + state.mouseX,
      aimY: cam.y - vh / 2 + state.mouseY,
    };
  };
  // True once for a key pressed since the last call.
  state.wasPressed = (code) => {
    if (state.pressed.has(code)) {
      state.pressed.delete(code);
      return true;
    }
    return false;
  };
  state.endFrame = () => {
    state.pressed.clear();
    state.clicked = false;
  };
  return state;
}
