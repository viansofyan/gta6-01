// Keyboard + mouse input for Solmar City. Tracks held keys and the mouse
// position; edge-triggered actions are consumed once per frame by main.js.
export function createInput(canvas) {
  const state = {
    up: false, down: false, left: false, right: false, run: false,
    shoot: false, aimSX: 0, aimSY: 0,
    pressed: new Set(),
  };
  const keyMap = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
  };
  function onKeyDown(e) {
    if (keyMap[e.code] !== undefined) {
      state[keyMap[e.code]] = true;
      e.preventDefault();
    }
    if (!e.repeat) state.pressed.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  }
  function onKeyUp(e) {
    if (keyMap[e.code] !== undefined) state[keyMap[e.code]] = false;
  }
  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    state.aimSX = e.clientX - r.left;
    state.aimSY = e.clientY - r.top;
  }
  function onMouseDown(e) {
    if (e.button === 0) { state.shoot = true; onMouseMove(e); }
  }
  function onMouseUp(e) {
    if (e.button === 0) state.shoot = false;
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  state.wasPressed = (code) => {
    if (state.pressed.has(code)) { state.pressed.delete(code); return true; }
    return false;
  };
  state.endFrame = () => {
    // Keep Enter / action keys for one frame only; held-key state persists.
    state.pressed.clear();
  };
  return state;
}
