// Solmar City entry point: game loop, screens, save/load, staged shots,
// debug handles for tests (window.__solmar, window.__errors, __shotReady).
import { createWorld, stepWorld, tryEnterCar, currentMission, setMission } from './world.js';
import { drawWorld, drawHUD, drawTitle, drawOverlay } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const SAVE_KEY = 'solmar-city-save-v1';
const params = new URLSearchParams(location.search);
const seed = params.get('seed') || '7';
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));

const world = createWorld(seed);
const input = createInput(canvas);
const audio = createAudio();

let screen = 'title'; // title | playing | paused
let vw = 1280, vh = 720;
let camX = 0, camY = 0;
let shotWarmup = -1;
let saveInfo = readSave();

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveGame() {
  const p = world.player;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: Math.round(p.money), missionIndex: world.mission.index,
      missionStep: world.mission.step, hp: Math.round(p.hp), x: p.x, y: p.y,
    }));
    saveInfo = readSave();
  } catch { /* storage unavailable — game still runs */ }
}

function loadSave() {
  const s = readSave();
  return !!s;
}

function startGame(fresh) {
  if (!fresh && readSave()) {
    const s = readSave();
    const p = world.player;
    p.money = s.money; p.hp = s.hp; p.x = s.x; p.y = s.y;
    p.onFoot = true; p.car = null; p.busted = false;
    world.mission.index = s.missionIndex;
    world.mission.step = s.missionStep;
    world.mission.storyComplete = false;
    // Rebuild step state (pickups, courier, wanted) for the loaded step.
    setMission(world, s.missionIndex, s.missionStep);
    p.money = s.money; p.hp = s.hp; p.x = s.x; p.y = s.y;
    p.onFoot = true; p.car = null;
  }
  audio.ensure();
  audio.click();
  screen = 'playing';
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = window.innerWidth; vh = window.innerHeight;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// Staged screenshot mode: real simulation, fixed warm-up, then ready.
if (shotName) {
  const staged = stageShot(world, shotName);
  screen = staged.screen;
  shotWarmup = staged.warmup;
  if (screen === 'playing') audio.ensure();
}

function handleEvents() {
  for (const ev of world.events) {
    if (ev.type === 'shoot') audio.shoot();
    else if (ev.type === 'crash' || ev.type === 'ram') audio.crash();
    else if (ev.type === 'pickup') audio.pickup();
    else if (ev.type === 'mission') { audio.jingle(); saveGame(); }
    else if (ev.type === 'story') { audio.jingle(); saveGame(); }
    else if (ev.type === 'busted') audio.busted();
    else if (ev.type === 'punch') audio.punch();
    else if (ev.type === 'steal') audio.click();
  }
  world.events.length = 0;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = 1 / 60;
  // Edge-triggered keys.
  if (input.wasPressed('Enter')) {
    if (screen === 'title') startGame(true);
    else if (screen === 'playing' && world.mission.storyComplete) { /* keep roaming */ }
  }
  if (input.wasPressed('KeyC') && screen === 'title' && readSave()) startGame(false);
  if ((input.wasPressed('KeyP') || input.wasPressed('Escape')) && screen !== 'title') {
    if (screen === 'playing') { screen = 'paused'; saveGame(); }
    else if (screen === 'paused') screen = 'playing';
  }
  if (input.wasPressed('KeyM')) audio.toggleMute();
  if (screen === 'playing') {
    if (input.wasPressed('KeyE')) tryEnterCar(world);
    const aimWX = camX + input.aimSX, aimWY = camY + input.aimSY;
    const punchPressed = input.wasPressed('KeyF');
    stepWorld(world, {
      up: input.up, down: input.down, left: input.left, right: input.right,
      run: input.run, shoot: input.shoot, punchPressed,
      aimX: aimWX, aimY: aimWY,
    }, dt);
    handleEvents();
    const p = world.player;
    audio.setEngine(p.car ? Math.abs(p.car.speed) / 560 : 0, !!p.car);
    audio.setSiren(p.wanted > 0 && !p.busted);
    statusEl.textContent = `Health ${Math.round(p.hp)}, $${Math.round(p.money)}, wanted ${p.wanted} star${p.wanted === 1 ? '' : 's'}, ${world.mission.storyComplete ? 'story complete' : `mission ${world.mission.index + 1} of 5: ${currentMission(world).name}`}.`;
  } else if (screen === 'title') {
    // Living city behind the title: step the world with no player input.
    stepWorld(world, { up: false, down: false, left: false, right: false, run: false, shoot: false, punchPressed: false }, dt);
    world.events.length = 0;
  }
  input.endFrame();

  // Camera follows the player, clamped to the world.
  const p = world.player;
  camX = Math.max(0, Math.min(3200 - vw, p.x - vw / 2));
  camY = Math.max(0, Math.min(3200 - vh, p.y - vh / 2));

  ctx.clearRect(0, 0, vw, vh);
  drawWorld(ctx, world, { camX, camY, vw, vh });
  if (screen === 'playing' || screen === 'paused') {
    drawHUD(ctx, world, vw, vh);
    if (world.mission.storyComplete) {
      drawOverlay(ctx, vw, vh, 'STORY COMPLETE', ['Leo Marín is free. The $40,000 debt is paid.', 'Press ENTER to keep roaming Solmar City.']);
    } else if (p.busted) {
      drawOverlay(ctx, vw, vh, 'BUSTED', [`Fined $200. You wake up at Solmar General Hospital…`, `Money: $${Math.round(p.money)}`], '#ff5a4d');
    } else if (screen === 'paused') {
      drawOverlay(ctx, vw, vh, 'PAUSED', ['Progress saved.', 'Press P to resume.']);
    }
  } else if (screen === 'title') {
    drawTitle(ctx, world, vw, vh, saveInfo);
  }

  if (shotWarmup > 0) {
    shotWarmup--;
    if (shotWarmup === 0) window.__shotReady = true;
  }
}

window.__solmar = { world, get screen() { return screen; }, saveGame, loadSave };
window.__shotReady = false;
requestAnimationFrame(frame);
