// Solmar City — game loop, screens, saving, and the debug handle.
// The page loads this module; it wires input, audio, world and rendering.
import { createWorld, updateWorld, serializeWorld, deserializeWorld, missionTarget } from './world.js';
import { drawWorld, drawHUD, drawTitle, drawPaused, drawBusted, drawComplete } from './render.js';
import { createInput, createEdgeTracker } from './input.js';
import { createAudio } from './audio.js';
import { stageShot, SHOT_NAMES } from './shots.js';
import { CAR_MAX_SPEED } from './config.js';

const SAVE_KEY = 'solmar-save-v1';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) ? seedParam : 20261124;
const isShot = shotName && SHOT_NAMES.includes(shotName);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const edge = createEdgeTracker();
const audio = createAudio();

let world = isShot ? stageShot(shotName, seed) : createWorld(seed);
let screen = isShot && shotName === 'start' ? 'title' : isShot ? 'playing' : 'title';
let cam = { x: world.player.x, y: world.player.y };
let lastTime = performance.now();
let warmTime = 0;
let shotReady = false;
let completeShown = false;
let saveExists = false;
try {
  saveExists = !!window.localStorage.getItem(SAVE_KEY);
} catch (e) { /* storage may be unavailable */ }

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(serializeWorld(world)));
    saveExists = true;
  } catch (e) { /* saving is best-effort */ }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    world = deserializeWorld(JSON.parse(raw));
    cam.x = world.player.x;
    cam.y = world.player.y;
    return true;
  } catch (e) {
    return false;
  }
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function buildInput() {
  const d = input.down;
  const vw = canvas.width;
  const vh = canvas.height;
  const worldX = input.mouseX + cam.x - vw / 2;
  const worldY = input.mouseY + cam.y - vh / 2;
  return {
    up: !!(d.KeyW || d.ArrowUp),
    down: !!(d.KeyS || d.ArrowDown),
    left: !!(d.KeyA || d.ArrowLeft),
    right: !!(d.KeyD || d.ArrowRight),
    run: !!(d.ShiftLeft || d.ShiftRight),
    interact: edge.edge(input, 'KeyE'),
    punch: edge.edge(input, 'KeyF'),
    shoot: input.clicked,
    shootX: worldX,
    shootY: worldY,
  };
}

function playEvents() {
  for (const ev of world.events) {
    if (ev === 'shot') audio.shot();
    else if (ev === 'crash') audio.crash();
    else if (ev === 'pickup') audio.pickup();
    else if (ev === 'mission') audio.jingle();
    else if (ev === 'busted') audio.busted();
    else if (ev === 'punch') audio.punch();
  }
  if (world.dirtySave) {
    world.dirtySave = false;
    saveGame();
  }
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;
  const vw = canvas.width;
  const vh = canvas.height;

  if (edge.edge(input, 'KeyM')) audio.toggleMute();

  if (screen === 'title') {
    updateWorld(world, {}, dt);
    if (edge.edge(input, 'Enter')) {
      audio.ensure();
      screen = 'playing';
    } else if (edge.edge(input, 'KeyC') && saveExists && loadGame()) {
      audio.ensure();
      screen = 'playing';
    }
  } else if (screen === 'playing') {
    if (edge.edge(input, 'KeyP') || edge.edge(input, 'Escape')) {
      screen = 'paused';
      saveGame();
    } else {
      const gi = buildInput();
      updateWorld(world, gi, dt);
      playEvents();
      if (world.busted) screen = 'busted';
      else if (world.storyComplete && !completeShown) {
        completeShown = true;
        screen = 'complete';
      }
    }
  } else if (screen === 'paused') {
    if (edge.edge(input, 'KeyP') || edge.edge(input, 'Escape') || edge.edge(input, 'Enter')) {
      screen = 'playing';
    }
  } else if (screen === 'busted') {
    updateWorld(world, {}, dt);
    if (!world.busted) screen = 'playing';
  } else if (screen === 'complete') {
    updateWorld(world, {}, dt);
    if (edge.edge(input, 'Enter')) screen = 'playing';
  }

  // Camera follows the player.
  cam.x += (world.player.x - cam.x) * Math.min(1, 6 * dt);
  cam.y += (world.player.y - cam.y) * Math.min(1, 6 * dt);

  // Sound follows the world.
  audio.setEngine(world.player.inCar ? Math.abs(world.player.speed) / CAR_MAX_SPEED : 0, world.player.inCar);
  audio.setSiren(world.wanted > 0 && screen === 'playing');

  // Draw.
  ctx.clearRect(0, 0, vw, vh);
  drawWorld(ctx, world, cam, vw, vh, world.time);
  if (screen === 'playing' || screen === 'paused' || screen === 'busted' || screen === 'complete') {
    drawHUD(ctx, world, vw, vh, world.time);
  }
  if (screen === 'title') drawTitle(ctx, vw, vh, saveExists);
  else if (screen === 'paused') drawPaused(ctx, vw, vh);
  else if (screen === 'busted') drawBusted(ctx, vw, vh);
  else if (screen === 'complete') drawComplete(ctx, vw, vh);

  // Staged shots: settle, then raise the ready flag for the screenshot tool.
  if (isShot && !shotReady) {
    warmTime += dt;
    let ready = warmTime > 2.5;
    if (shotName === 'chase') {
      const inFrame = world.police.filter((c) => Math.abs(c.x - cam.x) < 640 && Math.abs(c.y - cam.y) < 360).length;
      ready = warmTime > 2.5 && (inFrame >= 2 || warmTime > 9);
    }
    if (shotName === 'start') ready = warmTime > 1.2;
    if (ready) {
      shotReady = true;
      window.__shotReady = true;
    }
  }

  input.clicked = false;
  edge.sync(input);
  requestAnimationFrame(frame);
}

// Read-only debug handle for browser checks.
Object.defineProperty(window, '__solmar', {
  value: {
    get world() { return world; },
    get screen() { return screen; },
    get cam() { return cam; },
    get missionTarget() { return missionTarget(world); },
    version: 'solmar-2',
  },
  writable: false,
  configurable: false,
});

window.__shotReady = false;
requestAnimationFrame(frame);
