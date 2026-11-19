// Solmar City simulation: city, traffic, pedestrians, police, missions,
// combat, wanted level. Pure logic — no DOM, no Math.random — so Node can
// import and test it directly. Rendering lives in render.js.
import { WORLD, ROADS, ROAD_HALF, BEACH_X, WATER_X, PARK, TUNE, CAR_TYPES, LANDMARKS, MISSIONS, PED_NAMES, PED_COLORS, landmark } from './config.js';
import { makeRng, pick, range, rangeInt } from './random.js';

export function nearestRoad(v) {
  let best = ROADS[0];
  for (const r of ROADS) if (Math.abs(r - v) < Math.abs(best - v)) best = r;
  return best;
}

// Nearest point on any road centreline (used for spawns + autopilot).
export function nearestRoadPoint(x, y) {
  const rx = nearestRoad(x), ry = nearestRoad(y);
  return Math.abs(x - rx) <= Math.abs(y - ry) ? { x: rx, y } : { x, y: ry };
}

export function onRoad(x, y) {
  return ROADS.some((r) => Math.abs(x - r) <= ROAD_HALF) ||
    ROADS.some((r) => Math.abs(y - r) <= ROAD_HALF);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInBuilding(w, x, y, pad = 0) {
  for (const b of w.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}

// Circle-vs-rect push-out; returns corrected {x, y}.
function collideBuildings(w, x, y, r) {
  for (const b of w.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r; y = cy + (dy / d) * r;
      } else {
        // Centre inside the rect: push out along the smallest penetration.
        const pl = x - b.x, pr = b.x + b.w - x, pt = y - b.y, pb = b.y + b.h - y;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) x = b.x - r; else if (m === pr) x = b.x + b.w + r;
        else if (m === pt) y = b.y - r; else y = b.y + b.h + r;
      }
    }
  }
  return { x, y };
}

function clampWorld(v) { return Math.max(24, Math.min(WORLD - 24, v)); }

function buildCity(rng) {
  const buildings = [];
  for (const lm of LANDMARKS) {
    buildings.push({ x: lm.x, y: lm.y, w: lm.w, h: lm.h, name: lm.name, color: lm.color, landmark: true });
  }
  const palette = ['#9a8a6a', '#7d8a99', '#a08a7a', '#8a7d99', '#7a8a7d', '#998a5a', '#6a7a8a', '#a07a6a'];
  for (let i = 0; i < ROADS.length - 1; i++) {
    for (let j = 0; j < ROADS.length - 1; j++) {
      const bx0 = ROADS[i] + ROAD_HALF + 10, bx1 = ROADS[i + 1] - ROAD_HALF - 10;
      const by0 = ROADS[j] + ROAD_HALF + 10, by1 = ROADS[j + 1] - ROAD_HALF - 10;
      const block = { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 };
      if (rectsOverlap(block, PARK)) continue; // central park, no buildings
      if (LANDMARKS.some((lm) => rectsOverlap(block, lm))) continue;
      if (bx0 >= BEACH_X) continue;
      const n = 1 + (rng() < 0.45 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const bw = range(rng, 90, 190), bh = range(rng, 90, 170);
        const bx = range(rng, bx0 + 6, Math.max(bx0 + 7, bx1 - bw - 6));
        const by = range(rng, by0 + 6, Math.max(by0 + 7, by1 - bh - 6));
        const cand = { x: bx, y: by, w: bw, h: bh, color: pick(rng, palette), landmark: false };
        if (buildings.some((b) => rectsOverlap(cand, { x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 }))) continue;
        buildings.push(cand);
      }
    }
  }
  return buildings;
}

let nextCarId = 1;

function makeCar(rng, x, y, kind, typeIdx) {
  const t = CAR_TYPES[typeIdx ?? rangeInt(rng, 0, CAR_TYPES.length - 1)];
  return {
    id: nextCarId++, kind, x, y, angle: 0, speed: 0, hp: 60,
    type: t, color: t.color, stalled: false, ramCd: 0,
    axis: rng() < 0.5 ? 'x' : 'y', dir: rng() < 0.5 ? 1 : -1,
    cruise: range(rng, 140, 210),
  };
}

export function createWorld(seedStr = '7') {
  nextCarId = 1;
  const rng = makeRng(seedStr);
  const buildings = buildCity(rng);
  const w = {
    seed: seedStr, rng, time: 0,
    buildings,
    parkTrees: [],
    cars: [], peds: [], bullets: [], pickups: [],
    police: [], courier: null,
    player: {
      x: 1000, y: 1060, angle: -Math.PI / 2, hp: TUNE.playerHp,
      money: TUNE.startMoney, wanted: 0, quietTimer: 0,
      onFoot: true, car: null, aimAngle: -Math.PI / 2,
      fireCd: 0, punchCd: 0, busted: false, bustedTimer: 0,
      shotsFired: 0, punches: 0, carsStolen: 0,
    },
    mission: { index: 0, step: 0, storyComplete: false },
    events: [], banner: null, bannerUntil: 0,
    autopilot: null, message: null,
  };
  for (let i = 0; i < 26; i++) {
    const a = range(rng, 0, Math.PI * 2);
    const px = clampWorld(PARK.x + PARK.w / 2 + Math.cos(a) * range(rng, 40, 140));
    const py = clampWorld(PARK.y + PARK.h / 2 + Math.sin(a) * range(rng, 40, 140));
    w.parkTrees.push({ x: px, y: py, r: range(rng, 9, 15) });
  }
  // Parked cars: one right by the spawn for mission 1, the rest on roads.
  const parkedSpots = [{ x: 1000, y: 900 }];
  for (let i = 1; i < TUNE.parkedCount; i++) {
    const vertical = rng() < 0.5;
    const line = pick(rng, ROADS);
    const along = range(rng, 260, WORLD - 260);
    parkedSpots.push(vertical ? { x: line, y: along } : { x: along, y: line });
  }
  for (const s of parkedSpots) {
    const c = makeCar(rng, s.x, s.y, 'parked');
    c.angle = Math.abs(s.x - nearestRoad(s.x)) < Math.abs(s.y - nearestRoad(s.y)) ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    w.cars.push(c);
  }
  // Traffic.
  for (let i = 0; i < TUNE.trafficCount; i++) {
    const c = makeCar(rng, 0, 0, 'traffic');
    const p = nearestRoadPoint(range(rng, 300, WORLD - 300), range(rng, 300, WORLD - 300));
    c.x = p.x; c.y = p.y;
    c.angle = c.axis === 'x' ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    c.speed = c.cruise;
    w.cars.push(c);
  }
  // Pedestrians on sidewalks.
  for (let i = 0; i < TUNE.pedCount; i++) {
    const p = nearestRoadPoint(range(rng, 300, WORLD - 300), range(rng, 300, WORLD - 300));
    const off = (rng() < 0.5 ? -1 : 1) * (ROAD_HALF + 12);
    const vertical = Math.abs(p.x - nearestRoad(p.x)) < Math.abs(p.y - nearestRoad(p.y));
    w.peds.push({
      x: clampWorld(p.x + (vertical ? off : 0)), y: clampWorld(p.y + (vertical ? 0 : off)),
      angle: range(rng, 0, Math.PI * 2), speed: range(rng, 30, 62),
      name: PED_NAMES[i % PED_NAMES.length], color: pick(rng, PED_COLORS),
      down: false, downTimer: 0, flee: false,
    });
  }
  setBanner(w, MISSIONS[0].intro, 6);
  return w;
}

export function setBanner(w, text, seconds = 4) {
  w.banner = text; w.bannerUntil = w.time + seconds;
}

export function currentMission(w) { return MISSIONS[w.mission.index]; }
export function currentStep(w) { return currentMission(w).steps[w.mission.step]; }

export function missionTarget(w) {
  const s = currentStep(w);
  if (!s || s.kind !== 'goto' || !s.target) return null;
  return landmark(s.target).door;
}

export function missionText(w) {
  const m = currentMission(w);
  if (w.mission.storyComplete) return 'Story complete — Solmar City is yours. Free roam.';
  const s = currentStep(w);
  return `M${w.mission.index + 1}: ${m.name} — ${s.text}`;
}

export function addWanted(w, n) {
  const p = w.player;
  p.wanted = Math.max(0, Math.min(5, p.wanted + n));
  p.quietTimer = 0;
  if (n > 0) w.events.push({ type: 'crime', wanted: p.wanted });
  syncPolice(w);
}

export function setWanted(w, n) {
  w.player.wanted = Math.max(0, Math.min(5, n));
  w.player.quietTimer = 0;
  syncPolice(w);
}

function syncPolice(w) {
  const p = w.player;
  while (w.police.length < p.wanted) {
    const c = makeCar(w.rng, 0, 0, 'police', 1);
    // Spawn on a road 550–850 px from the player, never inside a building.
    const a = w.rng() * Math.PI * 2, d = range(w.rng, 550, 850);
    const pt = nearestRoadPoint(clampWorld(p.x + Math.cos(a) * d), clampWorld(p.y + Math.sin(a) * d));
    c.x = pt.x; c.y = pt.y; c.hp = 60; c.color = '#1d2a3a'; c.cruise = 520;
    c.angle = Math.atan2(p.y - c.y, p.x - c.x);
    w.police.push(c);
    w.cars.push(c);
  }
  while (w.police.length > p.wanted) {
    const c = w.police.pop();
    w.cars = w.cars.filter((x) => x !== c);
  }
}

export function setMission(w, index, step = 0) {
  w.mission.index = Math.max(0, Math.min(MISSIONS.length - 1, index));
  w.mission.step = step;
  w.mission.storyComplete = false;
  w.courier = null;
  w.pickups = [];
  w.autopilot = null;
  setupStep(w);
  setBanner(w, currentMission(w).intro, 6);
}

function setupStep(w) {
  const s = currentStep(w);
  if (!s) return;
  if (s.kind === 'collect' && s.target) {
    const door = landmark(s.target).door;
    spawnPickup(w, s.pickup, door.x, door.y);
  } else if (s.kind === 'chase') {
    spawnCourier(w);
  } else if (s.kind === 'escape') {
    setWanted(w, s.wanted);
  }
}

function spawnPickup(w, kind, x, y) {
  // Nudge along the road until clear of any building.
  let px = x, py = y;
  for (let i = 0; i < 12 && pointInBuilding(w, px, py, 24); i++) { px += 24; }
  for (let i = 0; i < 12 && pointInBuilding(w, px, py, 24); i++) { py += 24; px = x; }
  w.pickups.push({ kind, x: px, y: py });
}

function spawnCourier(w) {
  const p = w.player;
  const c = makeCar(w.rng, 0, 0, 'courier', 4);
  const a = w.rng() * Math.PI * 2, d = range(w.rng, 450, 650);
  const pt = nearestRoadPoint(clampWorld(p.x + Math.cos(a) * d), clampWorld(p.y + Math.sin(a) * d));
  c.x = pt.x; c.y = pt.y; c.hp = 80; c.color = '#8a6d1d'; c.cruise = 470;
  c.angle = Math.atan2(p.y - c.y, p.x - c.x);
  w.courier = c;
  w.cars.push(c);
  setBanner(w, 'Courier spotted — stop his van!', 4);
}

function advanceStep(w) {
  const m = currentMission(w);
  w.mission.step++;
  if (w.mission.step >= m.steps.length) {
    // Mission complete.
    w.player.money += m.reward;
    w.events.push({ type: 'mission', name: m.name, reward: m.reward });
    setBanner(w, `Mission complete: ${m.name}  +$${m.reward}`, 5);
    if (w.mission.index >= MISSIONS.length - 1) {
      w.mission.storyComplete = true;
      setBanner(w, 'STORY COMPLETE — Leo Marín is free. The debt is paid.', 8);
      w.events.push({ type: 'story' });
    } else {
      w.mission.index++;
      w.mission.step = 0;
      setBanner(w, currentMission(w).intro, 6);
    }
  }
  setupStep(w);
}

export function tryEnterCar(w) {
  const p = w.player;
  if (p.busted) return null;
  if (!p.onFoot) {
    // Exit the car.
    const c = p.car;
    p.car = null; p.onFoot = true;
    p.x = clampWorld(c.x + Math.cos(c.angle + Math.PI / 2) * 44);
    p.y = clampWorld(c.y + Math.sin(c.angle + Math.PI / 2) * 44);
    const fixed = collideBuildings(w, p.x, p.y, 14);
    p.x = fixed.x; p.y = fixed.y;
    p.angle = c.angle;
    if (c.kind === 'player') c.kind = 'parked';
    return { type: 'exit' };
  }
  let best = null, bestD = 78;
  for (const c of w.cars) {
    if (c.stalled) continue;
    if (c.kind !== 'parked' && c.kind !== 'traffic') continue;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestD) { best = c; bestD = d; }
  }
  if (!best) return null;
  best.kind = 'player';
  p.car = best; p.onFoot = false;
  p.x = best.x; p.y = best.y; p.angle = best.angle;
  p.carsStolen++;
  addWanted(w, 1); // stealing is a crime
  w.events.push({ type: 'steal', car: best.type.name });
  const s = currentStep(w);
  if (s && s.kind === 'steal') advanceStep(w);
  return { type: 'steal', car: best.type.name };
}

export function fireBullet(w) {
  const p = w.player;
  if (p.busted || p.fireCd > 0) return false;
  p.fireCd = TUNE.fireCooldown;
  p.shotsFired++;
  const a = p.aimAngle;
  w.bullets.push({
    x: p.x + Math.cos(a) * 26, y: p.y + Math.sin(a) * 26,
    angle: a, speed: TUNE.bulletSpeed, life: TUNE.bulletLife,
  });
  w.events.push({ type: 'shoot' });
  return true;
}

export function punch(w) {
  const p = w.player;
  if (p.busted || p.punchCd > 0) return false;
  p.punchCd = TUNE.punchCooldown;
  p.punches++;
  let hit = false;
  const cx = p.x + Math.cos(p.aimAngle) * 34, cy = p.y + Math.sin(p.aimAngle) * 34;
  for (const ped of w.peds) {
    if (ped.down) continue;
    if (Math.hypot(ped.x - cx, ped.y - cy) < TUNE.punchRange) {
      ped.down = true; ped.downTimer = 4; hit = true;
      addWanted(w, 1); // assault is a crime
      w.events.push({ type: 'punch', target: 'ped' });
    }
  }
  if (!hit) {
    for (const c of w.cars) {
      if (c === p.car || c.stalled) continue;
      if (Math.hypot(c.x - cx, c.y - cy) < 56) {
        damageCar(w, c, TUNE.punchDamage);
        hit = true;
        w.events.push({ type: 'punch', target: 'car' });
        break;
      }
    }
  }
  return hit;
}

function damageCar(w, c, dmg) {
  c.hp -= dmg;
  if (c.hp <= 0 && !c.stalled) {
    c.stalled = true; c.speed = 0;
    w.events.push({ type: 'stall', kind: c.kind });
    if (c === w.courier) {
      spawnPickup(w, 'briefcase', c.x, c.y);
      setBanner(w, 'Van stalled — grab the briefcase!', 4);
    }
  }
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function stepPlayer(w, input, dt) {
  const p = w.player;
  p.fireCd = Math.max(0, p.fireCd - dt);
  p.punchCd = Math.max(0, p.punchCd - dt);
  if (p.busted) {
    p.bustedTimer -= dt;
    if (p.bustedTimer <= 0) {
      const door = landmark('hospital').door;
      p.x = door.x; p.y = door.y; p.angle = -Math.PI / 2;
      p.hp = TUNE.playerHp; p.busted = false; p.onFoot = true; p.car = null;
      setWanted(w, 0);
      setBanner(w, 'You woke up at Solmar General Hospital. The heat is off — for now.', 5);
    }
    return;
  }
  if (p.onFoot) {
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my); mx /= len; my /= len;
      const sp = input.run ? TUNE.runSpeed : TUNE.walkSpeed;
      const nx = clampWorld(p.x + mx * sp * dt);
      const ny = clampWorld(p.y + my * sp * dt);
      const fx = collideBuildings(w, nx, p.y, 14);
      const fy = collideBuildings(w, fx.x, ny, 14);
      p.x = fx.x; p.y = fy.y;
      p.angle = Math.atan2(my, mx);
    }
  } else {
    const c = p.car;
    if (!c) { p.onFoot = true; return; }
    // Autopilot (staged shots) drives; any manual key cancels it.
    let throttle = 0, steer = 0;
    if (w.autopilot && !input.up && !input.down && !input.left && !input.right) {
      const ap = updateAutopilot(w, c, dt);
      throttle = ap.throttle; steer = ap.steer;
    } else {
      if (w.autopilot && (input.up || input.down || input.left || input.right)) w.autopilot = null;
      throttle = (input.up ? 1 : 0) - (input.down ? 0.55 : 0);
      steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    }
    const accel = c.type.accel;
    if (throttle > 0) c.speed += accel * throttle * dt;
    else if (throttle < 0) c.speed += (c.speed > 0 ? -TUNE.carBrake : TUNE.carReverse) * dt * Math.abs(throttle) * 2;
    c.speed -= c.speed * TUNE.carDrag * dt;
    if (c.speed > c.type.top) c.speed = c.type.top;
    if (c.speed < -TUNE.carReverse * 0.6) c.speed = -TUNE.carReverse * 0.6;
    if (Math.abs(c.speed) > 4) c.angle += steer * TUNE.carTurn * dt * Math.sign(c.speed) * Math.min(1, Math.abs(c.speed) / 160);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    const before = { x: c.x, y: c.y };
    const fx = collideBuildings(w, nx, c.y, 20);
    const fy = collideBuildings(w, fx.x, ny, 20);
    c.x = clampWorld(fx.x); c.y = clampWorld(fy.y);
    if ((Math.abs(fx.x - nx) > 0.5 || Math.abs(fy.y - ny) > 0.5) && Math.abs(c.speed) > 260) {
      w.events.push({ type: 'crash', speed: Math.abs(c.speed) });
    }
    if (Math.abs(fx.x - nx) > 0.5 || Math.abs(fy.y - ny) > 0.5) c.speed *= 0.55;
    p.x = c.x; p.y = c.y; p.angle = c.angle;
    void before;
  }
  // Shooting / punching.
  if (input.aimX !== undefined && input.aimY !== undefined) {
    p.aimAngle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  }
  if (input.shoot) fireBullet(w);
  if (input.punchPressed) punch(w);
}

function updateAutopilot(w, c, dt) {
  const ap = w.autopilot;
  if (!ap || ap.i >= ap.wps.length) { w.autopilot = null; return { throttle: 0, steer: 0 }; }
  const wp = ap.wps[ap.i];
  const d = Math.hypot(wp.x - c.x, wp.y - c.y);
  if (d < 70) { ap.i++; return updateAutopilot(w, c, dt); }
  const want = Math.atan2(wp.y - c.y, wp.x - c.x);
  let diff = want - c.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 1.6));
  const throttle = Math.abs(diff) > 1.9 ? 0.25 : 1;
  return { throttle, steer };
}

// Manhattan route along roads from `from` to `to` (both near roads).
export function routeRoads(from, to) {
  const start = nearestRoadPoint(from.x, from.y);
  const tx = nearestRoad(to.x), ty = nearestRoad(to.y);
  const wps = [start];
  const onVertical = Math.abs(start.x - nearestRoad(start.x)) < 1;
  if (onVertical) wps.push({ x: start.x, y: ty });
  else wps.push({ x: tx, y: start.y });
  wps.push({ x: tx, y: ty });
  wps.push({ x: to.x, y: to.y });
  const out = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const p = wps[i];
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 40) out.push(p);
  }
  // Always keep the exact final target, even when it is a short hop from
  // the last road point (the dedup above would otherwise drop it).
  const last = wps[wps.length - 1];
  if (!out.length || Math.hypot(last.x - out[out.length - 1].x, last.y - out[out.length - 1].y) > 1) out.push(last);
  return out;
}

export function startAutopilot(w, target) {
  const p = w.player;
  w.autopilot = { wps: routeRoads({ x: p.x, y: p.y }, target), i: 0 };
}

function stepTraffic(w, dt) {
  const p = w.player;
  for (const c of w.cars) {
    if (c.kind !== 'traffic' || c.stalled) continue;
    // Turn at intersections sometimes.
    const nearX = ROADS.some((r) => Math.abs(c.x - r) < 26);
    const nearY = ROADS.some((r) => Math.abs(c.y - r) < 26);
    if (nearX && nearY && w.rng() < dt * 0.5) {
      if (c.axis === 'x') { c.axis = 'y'; c.dir = w.rng() < 0.5 ? 1 : -1; }
      else { c.axis = 'x'; c.dir = w.rng() < 0.5 ? 1 : -1; }
    }
    // Snap back onto the road line so cars never drift into blocks.
    if (c.axis === 'x') { c.y = nearestRoad(c.y); c.angle = c.dir > 0 ? 0 : Math.PI; }
    else { c.x = nearestRoad(c.x); c.angle = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    c.speed = c.cruise;
    c.x = clampWorld(c.x + Math.cos(c.angle) * c.speed * dt);
    c.y = clampWorld(c.y + Math.sin(c.angle) * c.speed * dt);
    if (c.x <= 60 || c.x >= WORLD - 60 || c.y <= 60 || c.y >= WORLD - 60) {
      // Respawns near the player instead of piling up at the edges.
      const pt = nearestRoadPoint(clampWorld(p.x + (w.rng() - 0.5) * 1400), clampWorld(p.y + (w.rng() - 0.5) * 1400));
      c.x = pt.x; c.y = pt.y;
    }
  }
}

function stepPolice(w, dt) {
  const p = w.player;
  for (const c of w.police) {
    if (c.stalled) { c.ramCd = Math.max(0, c.ramCd - dt); continue; }
    // Blocked cops snap back to a road instead of grinding on a wall.
    if (!onRoad(c.x, c.y)) {
      const pt = nearestRoadPoint(c.x, c.y);
      c.x = pt.x; c.y = pt.y;
    }
    const want = Math.atan2(p.y - c.y, p.x - c.x);
    c.angle = angleLerp(c.angle, want, Math.min(1, dt * 2.4));
    c.speed += (540 - c.speed) * Math.min(1, dt * 1.4);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    const fx = collideBuildings(w, nx, c.y, 20);
    const fy = collideBuildings(w, fx.x, ny, 20);
    c.x = clampWorld(fx.x); c.y = clampWorld(fy.y);
    if (Math.abs(fx.x - nx) > 0.5 || Math.abs(fy.y - ny) > 0.5) {
      // Cut a corner into a wall: snap back to the road instead of
      // grinding along the building forever.
      const pt = nearestRoadPoint(c.x, c.y);
      c.x = pt.x; c.y = pt.y;
      c.speed *= 0.6;
    }
    c.ramCd = Math.max(0, c.ramCd - dt);
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < 52 && c.ramCd <= 0 && !p.busted) {
      c.ramCd = TUNE.policeRamCooldown;
      p.hp -= TUNE.policeRamDamage;
      w.events.push({ type: 'ram', hp: p.hp });
      if (p.car) p.car.speed *= 0.6;
      if (p.hp <= 0) {
        p.hp = 0; p.busted = true; p.bustedTimer = 2.2;
        p.money = Math.max(0, p.money - TUNE.bustedFine);
        if (p.car) { p.car.kind = 'parked'; p.car = null; p.onFoot = true; }
        w.events.push({ type: 'busted', fine: TUNE.bustedFine });
        setBanner(w, `BUSTED — fined $${TUNE.bustedFine}. The Broker is not happy.`, 5);
      }
    }
  }
}

function stepCourier(w, dt) {
  const c = w.courier;
  if (!c || c.stalled) return;
  const p = w.player;
  if (!onRoad(c.x, c.y)) {
    const pt = nearestRoadPoint(c.x, c.y);
    c.x = pt.x; c.y = pt.y;
  }
  // Flees from the player along roads.
  const away = Math.atan2(c.y - p.y, c.x - p.x);
  const axis = Math.abs(Math.cos(away)) > Math.abs(Math.sin(away)) ? 'x' : 'y';
  const dir = axis === 'x' ? Math.sign(Math.cos(away)) || 1 : Math.sign(Math.sin(away)) || 1;
  const want = axis === 'x' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  c.angle = angleLerp(c.angle, want, Math.min(1, dt * 2.0));
  c.speed += (c.cruise - c.speed) * Math.min(1, dt * 1.2);
  const nx = c.x + Math.cos(c.angle) * c.speed * dt;
  const ny = c.y + Math.sin(c.angle) * c.speed * dt;
  const fx = collideBuildings(w, nx, c.y, 20);
  const fy = collideBuildings(w, fx.x, ny, 20);
  c.x = clampWorld(fx.x); c.y = clampWorld(fy.y);
  if (Math.abs(fx.x - nx) > 0.5 || Math.abs(fy.y - ny) > 0.5) c.speed *= 0.5;
}

function stepPeds(w, dt) {
  const p = w.player;
  for (const ped of w.peds) {
    if (ped.down) {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) ped.down = false;
      continue;
    }
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    const scared = d < 320 && (p.wanted > 0 || w.time - (w.lastShotAt || -99) < 2);
    let vx, vy, sp;
    if (scared) {
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      vx = Math.cos(a); vy = Math.sin(a); sp = 130;
    } else {
      if (w.rng() < dt * 0.25) ped.angle += (w.rng() - 0.5) * 1.6;
      vx = Math.cos(ped.angle); vy = Math.sin(ped.angle); sp = ped.speed;
    }
    const nx = clampWorld(ped.x + vx * sp * dt);
    const ny = clampWorld(ped.y + vy * sp * dt);
    const fx = collideBuildings(w, nx, ped.y, 10);
    const fy = collideBuildings(w, fx.x, ny, 10);
    if (Math.abs(fx.x - nx) > 0.5 || Math.abs(fy.y - ny) > 0.5) ped.angle += Math.PI / 2;
    ped.x = fx.x; ped.y = fy.y;
    // Run over by the player's car: knocked down, and it is a crime.
    if (!p.onFoot && p.car && Math.hypot(ped.x - p.x, ped.y - p.y) < 34 && Math.abs(p.car.speed) > 60) {
      ped.down = true; ped.downTimer = 4;
      addWanted(w, 1);
      setBanner(w, 'You ran someone over!', 3);
    }
  }
}

function stepBullets(w, dt) {
  const p = w.player;
  for (const b of w.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    if (pointInBuilding(w, b.x, b.y, 0)) { b.dead = true; continue; }
    if (b.x < 0 || b.x > WORLD || b.y < 0 || b.y > WORLD) { b.dead = true; continue; }
    for (const c of w.cars) {
      if (c === p.car || c.stalled) continue;
      if (Math.hypot(c.x - b.x, c.y - b.y) < 30) {
        damageCar(w, c, TUNE.bulletDamage);
        b.dead = true;
        break;
      }
    }
    if (b.dead) continue;
    for (const ped of w.peds) {
      if (ped.down) continue;
      if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
        ped.down = true; ped.downTimer = 4;
        addWanted(w, 1);
        b.dead = true;
        break;
      }
    }
  }
  w.bullets = w.bullets.filter((b) => !b.dead);
}

function stepCarCollisions(w) {
  const p = w.player;
  if (!p.car) return;
  for (const c of w.cars) {
    if (c === p.car || c.stalled) continue;
    const dx = c.x - p.car.x, dy = c.y - p.car.y;
    const d = Math.hypot(dx, dy);
    if (d < 44 && d > 0.01) {
      const push = (44 - d) / 2;
      const ux = dx / d, uy = dy / d;
      c.x = clampWorld(c.x + ux * push); c.y = clampWorld(c.y + uy * push);
      p.car.x = clampWorld(p.car.x - ux * push); p.car.y = clampWorld(p.car.y - uy * push);
      if (Math.abs(p.car.speed) > 200) {
        damageCar(w, c, 25);
        p.car.speed *= 0.7;
        w.events.push({ type: 'crash', speed: Math.abs(p.car.speed) });
      }
      p.x = p.car.x; p.y = p.car.y;
    }
  }
}

function stepMission(w) {
  if (w.mission.storyComplete) return;
  const s = currentStep(w);
  if (!s) return;
  const p = w.player;
  if (s.kind === 'goto') {
    const t = missionTarget(w);
    if (t && Math.hypot(p.x - t.x, p.y - t.y) < 85) advanceStep(w);
  } else if (s.kind === 'collect') {
    for (const pk of w.pickups) {
      if (Math.hypot(p.x - pk.x, p.y - pk.y) < 48) {
        w.pickups = w.pickups.filter((x) => x !== pk);
        w.events.push({ type: 'pickup', kind: pk.kind });
        if (pk.kind === 'cash') setWanted(w, 4);
        advanceStep(w);
        break;
      }
    }
  } else if (s.kind === 'chase') {
    if (w.courier && w.courier.stalled) advanceStep(w);
  } else if (s.kind === 'escape') {
    if (p.wanted === 0) advanceStep(w);
  }
}

export function stepWorld(w, input, dt) {
  w.time += dt;
  if (input.shoot) w.lastShotAt = w.time;
  stepPlayer(w, input, dt);
  stepTraffic(w, dt);
  stepPolice(w, dt);
  stepCourier(w, dt);
  stepPeds(w, dt);
  stepBullets(w, dt);
  stepCarCollisions(w);
  stepMission(w);
  // Wanted decay: one star per quiet interval.
  const p = w.player;
  if (p.wanted > 0 && !p.busted) {
    p.quietTimer += dt;
    if (p.quietTimer >= TUNE.wantedDecaySeconds) {
      p.wanted--;
      p.quietTimer = 0;
      syncPolice(w);
    }
  }
  if (w.banner && w.time > w.bannerUntil) w.banner = null;
}
