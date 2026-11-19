// Keyboard and mouse input for Kota Senja.
// Held keys steer; one-shot presses (confirm, pause, enter car, punch, mute)
// are queued as bit flags and taken once by the loop.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouse = { x: 0, y: 0, down: false, shot: false };
  let shift = false;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (event.code === 'KeyE') { if (!event.repeat) actions |= ACTION_ENTER; }
    else if (event.code === 'KeyF') { if (!event.repeat) actions |= ACTION_PUNCH; }
    else if (event.code === 'KeyM') { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') shift = true;
    else if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) held.add(event.code);
    else return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') shift = false;
  });
  window.addEventListener('blur', () => { held.clear(); shift = false; });
  canvas.addEventListener('pointermove', (event) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = event.clientX - r.left; mouse.y = event.clientY - r.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = event.clientX - r.left; mouse.y = event.clientY - r.top;
    mouse.down = true; mouse.shot = true; actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });

  function axis() {
    let x = 0, y = 0;
    for (const c of held) {
      if (LEFT.has(c)) x -= 1; if (RIGHT.has(c)) x += 1;
      if (UP.has(c)) y -= 1; if (DOWN.has(c)) y += 1;
    }
    if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  }

  return {
    axis, mouse,
    get run() { return shift; },
    takeActions() { const t = actions; actions = 0; return t; },
    takeShot() { const s = mouse.shot; mouse.shot = false; return s; },
  };
}
