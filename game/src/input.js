// Keyboard and mouse state for Solmar City. The game reads this each frame;
// the world module never touches the DOM itself.
export function createInput(canvas) {
  const input = {
    down: {},
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicked: false,
    clickedX: 0,
    clickedY: 0,
  };
  const gameKeys = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF', 'KeyP', 'KeyM', 'KeyC', 'Enter', 'Escape', 'Space',
  ]);
  window.addEventListener('keydown', (e) => {
    if (gameKeys.has(e.code)) e.preventDefault();
    if (!e.repeat) input.down[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    input.down[e.code] = false;
  });
  window.addEventListener('blur', () => {
    input.down = {};
    input.mouseDown = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - rect.left;
    input.mouseY = e.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - rect.left;
    input.mouseY = e.clientY - rect.top;
    input.mouseDown = true;
    input.clicked = true;
    input.clickedX = input.mouseX;
    input.clickedY = input.mouseY;
    e.preventDefault();
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  return input;
}

// Edge-triggered keys: edge() is true only on the frame the key went down.
// Call sync() once at the end of each frame so every check in the frame
// sees the same previous state.
export function createEdgeTracker() {
  let prev = {};
  return {
    edge(input, code) {
      const now = !!input.down[code];
      return now && !prev[code];
    },
    sync(input) {
      prev = { ...input.down };
    },
  };
}
