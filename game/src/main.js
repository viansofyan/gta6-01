// Solmar City entry point: the loop, the screens, saving, and the
// staged screenshot scenes. The world does the simulating; this file
// only wires input, sound, the camera and the canvas to it.
import { createWorld } from './world.js';
import { drawScene, drawHud, drawTitle, drawPause, drawBusted, drawComplete } from './render.js';
import { createInput } from './input.js';
import { sound } from './audio.js';
import { stageShot, warmUpSeconds } from './shots.js';

const SAVE_KEY = 'solmar-save-v1';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotKind = params.get('shot');
const seed = Number(params.get('seed') || '7') || 7;

const world = createWorld(seed);
const input = createInput(canvas);
const cam = { x: world.player.x, y: world.player.y };

let screen = 'title';
let shotReady = false;
let sirenTimer = 0;
let lastTime = performance.now();

const debug = {
  world,
  get screen() {
    return screen;
  },
  set screen(s) {
    screen = s;
  },
};
window.__solmar = debug;

function saveGame() {
  try {
    const p = world.player;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: p.money, hp: p.hp, missionIndex: world.missionIndex,
      missionStep: world.missionStep, x: p.x, y: p.y,
    }));
  } catch {
    // Saving is best effort; the game plays on without it.
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    const p = world.player;
    p.money = s.money;
    p.hp = s.hp;
    p.x = s.x;
    p.y = s.y;
    world.missionIndex = s.missionIndex;
    world.missionStep = s.missionStep;
    world.wanted = 0;
    if (world.missionIndex === 1 && !world.pickups.some((pk) => pk.kind === 'crate' && !pk.taken)) {
      world.spawnPickup('crate', 420, 2600);
    }
    if (world.missionIndex === 2 && !world.courier) world.spawnCourier();
    if (world.missionIndex === 4 && !world.pickups.some((pk) => pk.kind === 'cash' && !pk.taken)) {
      world.spawnPickup('cash', 2015, 1330);
    }
    world.say('Welcome back, Leo.', 4);
    return true;
  } catch {
    return false;
  }
}

function drainEvents() {
  for (const e of world.events) {
    if (e === 'shot') sound.shot();
    else if (e === 'crash') sound.crash();
    else if (e === 'pickup') sound.pickup();
    else if (e === 'jingle') sound.jingle();
    else if (e === 'busted') sound.busted();
    else if (e === 'punch') sound.punch();
    else if (e === 'stall') sound.crash();
  }
  world.events.length = 0;
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

if (shotKind) {
  const staged = stageShot(world, shotKind);
  screen = staged.screen;
  const steps = Math.round(warmUpSeconds(shotKind) * 30);
  for (let i = 0; i < steps; i++) {
    world.update(1 / 30, {});
    world.events.length = 0;
  }
  cam.x = world.player.x;
  cam.y = world.player.y;
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const vw = canvas.width;
  const vh = canvas.height;

  if (input.wasPressed('Enter')) {
    sound.unlock();
    if (screen === 'title' || screen === 'complete') {
      screen = 'playing';
      sound.startBass();
    }
  }
  if (input.wasPressed('KeyC') && screen === 'title') {
    if (loadGame()) {
      screen = 'playing';
      sound.unlock();
      sound.startBass();
    }
  }
  if ((input.wasPressed('KeyP') || input.wasPressed('Escape')) && (screen === 'playing' || screen === 'paused')) {
    if (screen === 'playing') {
      screen = 'paused';
      saveGame();
    } else {
      screen = 'playing';
    }
  }
  if (input.wasPressed('KeyM')) sound.toggleMute();

  if (screen === 'playing' || screen === 'title' || screen === 'complete') {
    const wi = screen === 'playing' ? input.toWorldInput(cam, vw, vh) : {};
    world.update(dt, wi);
    drainEvents();
    if (world.justSaved) {
      world.justSaved = false;
      saveGame();
    }
    if (world.busted && screen === 'playing') screen = 'busted';
    if (!world.busted && screen === 'busted') screen = 'playing';
    if (world.storyComplete && screen === 'playing') screen = 'complete';
  } else if (screen === 'busted') {
    world.update(dt, {});
    drainEvents();
    if (!world.busted) screen = 'playing';
  }

  const p = world.player;
  const tx = p.x;
  const ty = p.y;
  cam.x += (tx - cam.x) * Math.min(1, dt * 5);
  cam.y += (ty - cam.y) * Math.min(1, dt * 5);

  // Sound: engine hum while driving, siren while wanted.
  sound.setEngine(screen === 'playing' && p.inCar && p.car, p.car ? p.car.speed : 0);
  if (world.wanted > 0 && screen === 'playing') {
    sirenTimer -= dt;
    if (sirenTimer <= 0) {
      sirenTimer = 1.4;
      sound.sirenBlip();
    }
  }

  ctx.clearRect(0, 0, vw, vh);
  drawScene(ctx, world, cam, vw, vh);
  if (screen === 'playing' || screen === 'paused' || screen === 'busted' || screen === 'complete') {
    drawHud(ctx, world, vw, vh, screen === 'playing' ? { x: input.mouseX, y: input.mouseY } : null);
  }
  if (screen === 'title') drawTitle(ctx, world, vw, vh);
  if (screen === 'paused') drawPause(ctx, vw, vh);
  if (screen === 'busted') drawBusted(ctx, vw, vh);
  if (screen === 'complete') drawComplete(ctx, world, vw, vh);

  input.endFrame();
  if (shotKind && !shotReady) {
    shotReady = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
