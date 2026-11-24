// Solmar City simulation: player, cars, traffic, pedestrians, police,
// courier, pickups, missions, wanted level, combat, collisions, scoring.
// Pure logic: no browser globals, importable from plain Node for tests.
import { createRng } from './random.js';
import {
  WORLD_SIZE, ROAD_LINES, ROAD_HALF, START_MONEY, START_HEALTH, DEBT,
  MAX_WANTED, WANTED_DECAY_SECONDS, POLICE_RAM_DAMAGE, POLICE_RAM_COOLDOWN,
  BUSTED_FINE, BUSTED_WAIT_SECONDS, WALK_SPEED, RUN_SPEED, CAR_ACCEL,
  CAR_BRAKE, CAR_REVERSE_ACCEL, CAR_MAX_SPEED, CAR_MAX_REVERSE, CAR_TURN_RATE,
  TRAFFIC_COUNT, PED_COUNT, PISTOL_DAMAGE, PISTOL_RANGE, PISTOL_COOLDOWN,
  POLICE_HP, COURIER_HP, CAR_PUSH_MIN, LANDMARKS, PARK, POND, BEACH_X,
  CAR_NAMES, CAR_COLORS, PED_NAMES, MISSIONS, PLAYER_START,
} from './config.js';

export const TAU = Math.PI * 2;

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function nearestLine(v) {
  let best = ROAD_LINES[0];
  for (const line of ROAD_LINES) {
    if (Math.abs(v - line) < Math.abs(v - best)) best = line;
  }
  return best;
}

export function isOnRoad(x, y) {
  for (const line of ROAD_LINES) {
    if (Math.abs(x - line) <= ROAD_HALF && y >= 200 - ROAD_HALF && y <= 3000 + ROAD_HALF) return true;
    if (Math.abs(y - line) <= ROAD_HALF && x >= 200 - ROAD_HALF && x <= 3000 + ROAD_HALF) return true;
  }
  return false;
}

// Closest point on the road network to (x, y): the nearest centreline point.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const line of ROAD_LINES) {
    const cy = clamp(y, 200, 3000);
    const d1 = dist(x, y, line, cy);
    if (d1 < bestD) { bestD = d1; best = { x: line, y: cy }; }
    const cx = clamp(x, 200, 3000);
    const d2 = dist(x, y, cx, line);
    if (d2 < bestD) { bestD = d2; best = { x: cx, y: line }; }
  }
  return best;
}

// Road-following route: every waypoint lies on a road, the last is exactly
// the target. Goes start -> corner -> corner -> target along the grid.
export function routeTo(world, fx, fy, tx, ty) {
  const start = nearestRoadPoint(fx, fy);
  const gx = nearestLine(tx);
  const gy = nearestLine(ty);
  const pts = [{ x: start.x, y: start.y }];
  const vertical = Math.abs(start.x - nearestLine(start.x)) < 0.5;
  if (vertical) {
    pts.push({ x: start.x, y: gy });
    if (Math.abs(start.x - gx) > 0.5) pts.push({ x: gx, y: gy });
  } else {
    pts.push({ x: gx, y: start.y });
    if (Math.abs(start.y - gy) > 0.5) pts.push({ x: gx, y: gy });
  }
  pts.push({ x: tx, y: ty });
  const out = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || dist(last.x, last.y, p.x, p.y) > 2) out.push(p);
  }
  // The final waypoint must be exactly the target, even if it deduped away.
  const fin = out[out.length - 1];
  if (!fin || fin.x !== tx || fin.y !== ty) out.push({ x: tx, y: ty });
  return out;
}

export function landmarkDoor(b) {
  return { x: b.x + b.w / 2, y: b.y + b.h + 36 };
}
export function landmarkById(world, id) {
  return world.landmarks.find((b) => b.id === id);
}

function circleHitsBuilding(world, x, y, r) {
  for (const b of world.buildings) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    if (dist(x, y, cx, cy) < r) return b;
  }
  return null;
}
export function pointInBuilding(world, x, y, r = 0) {
  return circleHitsBuilding(world, x, y, r);
}

// Backstop: if an entity ends up inside a building (a shove, a spawn, a
// corner cut), push it out along the shallowest penetration axis.
export function pushOutOfBuildings(world, ent, r) {
  for (let pass = 0; pass < 4; pass++) {
    const b = circleHitsBuilding(world, ent.x, ent.y, r);
    if (!b) return;
    const left = ent.x - (b.x - r);
    const right = b.x + b.w + r - ent.x;
    const top = ent.y - (b.y - r);
    const bottom = b.y + b.h + r - ent.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) ent.x = b.x - r;
    else if (m === right) ent.x = b.x + b.w + r;
    else if (m === top) ent.y = b.y - r;
    else ent.y = b.y + b.h + r;
  }
}

function moveWithCollision(world, ent, dx, dy, r) {
  const nx = ent.x + dx;
  if (!circleHitsBuilding(world, nx, ent.y, r)) ent.x = nx;
  const ny = ent.y + dy;
  if (!circleHitsBuilding(world, ent.x, ny, r)) ent.y = ny;
  ent.x = clamp(ent.x, 24, WORLD_SIZE - 24);
  ent.y = clamp(ent.y, 24, WORLD_SIZE - 24);
  pushOutOfBuildings(world, ent, r);
}

function buildCity(rng) {
  const buildings = [];
  for (const lm of LANDMARKS) {
    buildings.push({ ...lm, landmark: true, name: lm.name });
  }
  const landmarkBlocks = new Set(['0,0', '0,6', '5,1', '4,3', '1,5', '5,5', '2,4', '4,6']);
  const secondBlocks = new Set(['1,0', '3,0', '0,2', '2,2', '5,3', '6,4', '3,6', '6,1']);
  const shades = ['#b5673f', '#8a7a5c', '#6b7f95', '#9c8a6b', '#7d6a8a', '#a05a4a', '#5f7d6a', '#8f7d4f'];
  let n = 0;
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      if (i === 3 && j === 3) continue; // the central park
      if (landmarkBlocks.has(`${i},${j}`)) continue;
      const x0 = ROAD_LINES[i] + 44;
      const y0 = ROAD_LINES[j] + 44;
      const x1 = ROAD_LINES[i + 1] - 44;
      const y1 = ROAD_LINES[j + 1] - 44;
      const w = rng.range(96, 150);
      const h = rng.range(84, 128);
      const x = x0 + rng.range(0, Math.max(1, x1 - x0 - w));
      const y = y0 + rng.range(0, Math.max(1, y1 - y0 - h));
      buildings.push({ id: `b${n++}`, name: '', x, y, w, h, color: rng.pick(shades), landmark: false });
      if (secondBlocks.has(`${i},${j}`)) {
        const w2 = rng.range(64, 84);
        const h2 = rng.range(56, 72);
        const x2 = x1 - w2 - rng.range(0, 24);
        const y2 = y1 - h2 - rng.range(0, 24);
        if (x2 > x + w + 12 || y2 > y + h + 12) {
          buildings.push({ id: `b${n++}`, name: '', x: x2, y: y2, w: w2, h: h2, color: rng.pick(shades), landmark: false });
        }
      }
    }
  }
  return buildings;
}

function randomRoadPoint(rng, nearX, nearY, minD, maxD) {
  if (nearX !== undefined) {
    // Pick a point at the wanted distance from the player, then snap it
    // onto the nearest road, so spawns land near the player and on a road.
    for (let tries = 0; tries < 16; tries++) {
      const ang = rng.range(0, TAU);
      const d = rng.range(minD, maxD);
      const p = nearestRoadPoint(nearX + Math.cos(ang) * d, nearY + Math.sin(ang) * d);
      const dd = dist(p.x, p.y, nearX, nearY);
      if (dd >= minD * 0.55 && dd <= maxD * 1.5) return p;
    }
    return nearestRoadPoint(nearX + minD, nearY);
  }
  const vertical = rng.chance(0.5);
  const line = rng.pick(ROAD_LINES);
  const along = rng.range(240, 2960);
  return vertical ? { x: line, y: along } : { x: along, y: line };
}

function makeCar(world, kind, x, y, angle, color, name) {
  const id = `car${world.nextCarId++}`;
  return {
    id, kind, x, y, angle, speed: 0, color, name,
    hp: kind === 'police' ? POLICE_HP : kind === 'courier' ? COURIER_HP : 100,
    stalled: false, axis: 'v', dir: 1, turnCooldown: 0, ramCooldown: 0,
    hitCooldown: 0, smoke: 0, targetSpeed: 0,
  };
}

export function createWorld(seed = 7) {
  const rng = createRng(seed);
  const buildings = buildCity(rng);
  const world = {
    seed, rng, time: 0, wanted: 0, quietTime: 0, money: START_MONEY,
    health: START_HEALTH, storyComplete: false, missionIndex: 0, missionStep: 0,
    busted: false, bustedTimer: 0, shotsFired: 0, shotsHit: 0,
    shootCooldown: 0, message: '', messageTimer: 0, events: [], tracers: [],
    buildings, landmarks: LANDMARKS.map((lm) => ({ ...lm, landmark: true, name: lm.name })),
    park: { ...PARK }, pond: { ...POND }, nextCarId: 1, cars: [], traffic: [],
    peds: [], police: [], pickups: [], courier: null, courierStalled: false,
    autopilot: false, autopilotRoute: null, autopilotIndex: 0, dirtySave: false,
    debt: DEBT, missionsCompleted: 0,
    player: {
      x: PLAYER_START.x, y: PLAYER_START.y, angle: -Math.PI / 2, speed: 0,
      inCar: false, carId: null, walkPhase: 0, muzzle: 0,
    },
  };
  // Parked cars along the roads, ready to steal.
  const parkedSpots = [
    { x: 600, y: 1000, a: Math.PI / 2 }, { x: 1000, y: 600, a: 0 },
    { x: 1800, y: 1400, a: -Math.PI / 2 }, { x: 2200, y: 600, a: 0 },
    { x: 2600, y: 1800, a: Math.PI / 2 }, { x: 1400, y: 2600, a: 0 },
    { x: 1000, y: 2200, a: -Math.PI / 2 }, { x: 3000, y: 1400, a: Math.PI / 2 },
  ];
  for (let i = 0; i < parkedSpots.length; i++) {
    const s = parkedSpots[i];
    const car = makeCar(world, 'parked', s.x, s.y, s.a, CAR_COLORS[i % CAR_COLORS.length], CAR_NAMES[i % CAR_NAMES.length]);
    world.cars.push(car);
  }
  // Traffic cruising the roads.
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const p = randomRoadPoint(rng);
    const vertical = rng.chance(0.5);
    const car = makeCar(world, 'traffic', p.x, p.y, vertical ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI), rng.pick(CAR_COLORS), rng.pick(CAR_NAMES));
    car.axis = vertical ? 'v' : 'h';
    car.dir = rng.chance(0.5) ? 1 : -1;
    car.speed = rng.range(120, 185);
    car.targetSpeed = car.speed;
    world.cars.push(car);
    world.traffic.push(car);
  }
  // Pedestrians on the sidewalks.
  for (let i = 0; i < PED_COUNT; i++) {
    const line = rng.pick(ROAD_LINES);
    const along = rng.range(240, 2960);
    const side = rng.chance(0.5) ? 1 : -1;
    const vertical = rng.chance(0.5);
    const x = vertical ? line + side * rng.range(46, 58) : along;
    const y = vertical ? along : line + side * rng.range(46, 58);
    world.peds.push({
      x, y, angle: rng.range(0, TAU), speed: rng.range(45, 75),
      state: 'walk', downTimer: 0, fleeTimer: 0, turnTimer: rng.range(1, 4),
      name: PED_NAMES[i % PED_NAMES.length], color: rng.pick(CAR_COLORS),
    });
  }
  setMessage(world, MISSIONS[0].intro);
  return world;
}

function setMessage(world, text) {
  world.message = text;
  world.messageTimer = 5;
}

function addCrime(world, stars) {
  world.wanted = Math.min(MAX_WANTED, world.wanted + stars);
  world.quietTime = 0;
  world.events.push('crime');
}
function setWanted(world, n) {
  world.wanted = clamp(n, 0, MAX_WANTED);
  world.quietTime = 0;
}

export function missionTarget(world) {
  const m = world.missionIndex;
  if (world.storyComplete || m >= MISSIONS.length) return null;
  const door = (id) => landmarkDoor(landmarkById(world, id));
  if (m === 0) return { ...door('garage'), label: "Mara's Garage" };
  if (m === 1) {
    if (world.missionStep === 0) return { ...door('docks'), label: 'Puerto Viejo Docks' };
    return { ...door('hotel'), label: 'Neon Palms Hotel' };
  }
  if (m === 2) {
    if (world.missionStep === 0 && world.courier) return { x: world.courier.x, y: world.courier.y, label: 'Courier Van' };
    if (world.missionStep === 1) {
      const p = world.pickups.find((k) => k.kind === 'briefcase' && !k.taken);
      if (p) return { x: p.x, y: p.y, label: 'Briefcase' };
    }
    return { ...door('tower'), label: "The Broker's Tower" };
  }
  if (m === 3) return { ...door('safehouse'), label: 'Safehouse on Calle Luna' };
  if (m === 4) {
    if (world.missionStep === 0) return { ...door('bank'), label: 'Solmar National Bank' };
    return { ...door('safehouse'), label: 'Safehouse on Calle Luna' };
  }
  return null;
}

function spawnPickup(world, kind, x, y) {
  const p = { kind, x, y, taken: false };
  pushOutOfBuildings(world, p, 20);
  world.pickups.push(p);
  return p;
}

function spawnCourier(world) {
  const p = randomRoadPoint(world.rng, world.player.x, world.player.y, 300, 700);
  const van = makeCar(world, 'courier', p.x, p.y, 0, '#7a4fd0', 'Courier Van');
  van.axis = 'h';
  van.dir = 1;
  van.speed = 200;
  van.targetSpeed = 200;
  world.cars.push(van);
  world.courier = van;
  world.courierStalled = false;
}

function completeMission(world, pay) {
  const m = MISSIONS[world.missionIndex];
  world.money += pay;
  world.missionsCompleted++;
  world.events.push('mission');
  setMessage(world, `${m.title} complete — $${pay}.`);
  world.missionIndex++;
  world.missionStep = 0;
  world.dirtySave = true;
  if (world.missionIndex === 1) {
    const d = landmarkDoor(landmarkById(world, 'docks'));
    spawnPickup(world, 'crate', d.x, d.y);
  } else if (world.missionIndex === 2) {
    spawnCourier(world);
  } else if (world.missionIndex === 3) {
    setWanted(world, 3);
  } else if (world.missionIndex === 4) {
    const d = landmarkDoor(landmarkById(world, 'bank'));
    spawnPickup(world, 'cash', d.x, d.y);
  } else if (world.missionIndex >= MISSIONS.length) {
    world.storyComplete = true;
    setMessage(world, `Story complete — the $${DEBT.toLocaleString()} debt is paid. Solmar City is yours. Free roam.`);
  }
}

function syncPolice(world) {
  // Police that drift far away despawn; fresh ones spawn near the player.
  for (let i = world.police.length - 1; i >= 0; i--) {
    const car = world.police[i];
    if (dist(car.x, car.y, world.player.x, world.player.y) > 1500) {
      world.police.splice(i, 1);
      const ci = world.cars.indexOf(car);
      if (ci >= 0) world.cars.splice(ci, 1);
    }
  }
  while (world.police.length < world.wanted) {
    const p = randomRoadPoint(world.rng, world.player.x, world.player.y, 340, 520);
    const car = makeCar(world, 'police', p.x, p.y, 0, '#1c1e24', 'Police Cruiser');
    world.cars.push(car);
    world.police.push(car);
  }
  while (world.police.length > world.wanted) {
    let far = 0;
    let farD = -1;
    for (let i = 0; i < world.police.length; i++) {
      const d = dist(world.police[i].x, world.police[i].y, world.player.x, world.player.y);
      if (d > farD) { farD = d; far = i; }
    }
    const gone = world.police.splice(far, 1)[0];
    const ci = world.cars.indexOf(gone);
    if (ci >= 0) world.cars.splice(ci, 1);
  }
}

function playerCar(world) {
  return world.cars.find((c) => c.id === world.player.carId) || null;
}

function enterCar(world, car) {
  world.player.inCar = true;
  world.player.carId = car.id;
  world.events.push('pickup');
  if (car.kind === 'parked' || car.kind === 'traffic') {
    addCrime(world, 1);
    if (world.missionIndex === 0 && world.missionStep === 0) {
      world.missionStep = 1;
      setMessage(world, 'Car stolen — 1 star. Drive it to Mara\u2019s Garage.');
    }
    // A stolen traffic car leaves the traffic flow.
    if (car.kind === 'traffic') {
      const ti = world.traffic.indexOf(car);
      if (ti >= 0) world.traffic.splice(ti, 1);
      car.kind = 'parked';
    }
  }
}

function exitCar(world) {
  const car = playerCar(world);
  world.player.inCar = false;
  world.player.carId = null;
  if (car) {
    const side = { x: Math.cos(car.angle + Math.PI / 2), y: Math.sin(car.angle + Math.PI / 2) };
    world.player.x = car.x + side.x * 34;
    world.player.y = car.y + side.y * 34;
    world.player.angle = car.angle;
    pushOutOfBuildings(world, world.player, 14);
  }
}

function fireShot(world, tx, ty) {
  if (world.shootCooldown > 0) return;
  world.shootCooldown = PISTOL_COOLDOWN;
  world.shotsFired++;
  world.events.push('shot');
  const px = world.player.x;
  const py = world.player.y;
  const dx = tx - px;
  const dy = ty - py;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  world.tracers.push({ x1: px, y1: py, x2: px + ux * Math.min(len, PISTOL_RANGE), y2: py + uy * Math.min(len, PISTOL_RANGE), ttl: 0.12 });
  world.player.muzzle = 0.08;
  let best = null;
  let bestProj = Infinity;
  const consider = (x, y, tol, hit) => {
    const vx = x - px;
    const vy = y - py;
    const proj = vx * ux + vy * uy;
    if (proj < 0 || proj > PISTOL_RANGE) return;
    const perp = Math.abs(vx * uy - vy * ux);
    if (perp > tol) return;
    if (proj < bestProj) { bestProj = proj; best = hit; }
  };
  for (const car of world.police) {
    if (car.stalled) continue;
    consider(car.x, car.y, 26, () => damageCar(world, car, PISTOL_DAMAGE));
  }
  if (world.courier && !world.courier.stalled) {
    consider(world.courier.x, world.courier.y, 30, () => damageCar(world, world.courier, PISTOL_DAMAGE));
  }
  for (const ped of world.peds) {
    if (ped.state === 'down') continue;
    consider(ped.x, ped.y, 18, () => knockPed(world, ped, true));
  }
  if (best) {
    best();
    world.shotsHit++;
  }
  for (const ped of world.peds) {
    if (dist(ped.x, ped.y, px, py) < 420 && ped.state !== 'down') {
      ped.state = 'flee';
      ped.fleeTimer = 2.5;
    }
  }
}

function damageCar(world, car, dmg) {
  if (car.stalled) return;
  car.hp -= dmg;
  if (car.hp <= 0) {
    car.hp = 0;
    car.stalled = true;
    car.speed = 0;
    car.smoke = 4;
    world.events.push('crash');
    if (car.kind === 'courier' && !world.courierStalled) {
      world.courierStalled = true;
      spawnPickup(world, 'briefcase', car.x, car.y);
      if (world.missionIndex === 2 && world.missionStep === 0) {
        world.missionStep = 1;
        setMessage(world, 'Courier stalled — grab the briefcase.');
      }
    }
  }
}

function knockPed(world, ped, isCrime) {
  if (ped.state === 'down') return;
  ped.state = 'down';
  ped.downTimer = 3;
  if (isCrime) addCrime(world, 1);
}

function updateTraffic(world, dt) {
  for (const car of world.traffic) {
    if (car.stalled) continue;
    car.turnCooldown -= dt;
    const nearX = car.axis === 'v';
    const pos = nearX ? car.y : car.x;
    const line = nearestLine(pos);
    if (Math.abs(pos - line) < 26 && car.turnCooldown <= 0) {
      if (world.rng.chance(0.32)) {
        car.axis = nearX ? 'h' : 'v';
        car.dir = world.rng.chance(0.5) ? 1 : -1;
        car.turnCooldown = 2;
      } else {
        car.turnCooldown = 1;
      }
    }
    car.speed += (car.targetSpeed - car.speed) * dt;
    if (car.axis === 'v') {
      car.y += car.dir * car.speed * dt;
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.x = nearestLine(car.x);
    } else {
      car.x += car.dir * car.speed * dt;
      car.angle = car.dir > 0 ? 0 : Math.PI;
      car.y = nearestLine(car.y);
    }
    if (car.x < 180 || car.x > 3020 || car.y < 180 || car.y > 3020) car.dir *= -1;
    car.x = clamp(car.x, 200, 3000);
    car.y = clamp(car.y, 200, 3000);
    if (dist(car.x, car.y, world.player.x, world.player.y) > 1300) {
      const p = randomRoadPoint(world.rng, world.player.x, world.player.y, 300, 700);
      car.x = p.x;
      car.y = p.y;
      car.axis = world.rng.chance(0.5) ? 'v' : 'h';
      car.dir = world.rng.chance(0.5) ? 1 : -1;
    }
  }
}

function updatePolice(world, dt) {
  for (const car of world.police) {
    car.ramCooldown -= dt;
    car.hitCooldown -= dt;
    if (car.stalled) {
      car.smoke = Math.max(0, car.smoke - dt);
      continue;
    }
    const dx = world.player.x - car.x;
    const dy = world.player.y - car.y;
    const d = Math.hypot(dx, dy) || 1;
    const want = Math.atan2(dy, dx);
    const turn = clamp(angleDiff(car.angle, want), -3.4 * dt, 3.4 * dt);
    car.angle += turn;
    const targetSpeed = d > 480 ? 400 : 330;
    car.speed += (targetSpeed - car.speed) * Math.min(1, 1.6 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    car.x = nx;
    car.y = ny;
    if (circleHitsBuilding(world, car.x, car.y, 18)) {
      const rp = nearestRoadPoint(car.x, car.y);
      car.x = rp.x;
      car.y = rp.y;
      car.speed *= 0.4;
    }
    car.x = clamp(car.x, 24, WORLD_SIZE - 24);
    car.y = clamp(car.y, 24, WORLD_SIZE - 24);
    if (d < 46 && car.ramCooldown <= 0) {
      car.ramCooldown = POLICE_RAM_COOLDOWN;
      world.health -= POLICE_RAM_DAMAGE;
      world.events.push('crash');
      setMessage(world, 'Police ram — 12 health lost.');
      if (world.player.inCar) {
        const pc = playerCar(world);
        if (pc) {
          pc.x += (pc.x - car.x) * 0.12;
          pc.y += (pc.y - car.y) * 0.12;
        }
      }
    }
  }
}

function updateCourier(world, dt) {
  const van = world.courier;
  if (!van || van.stalled) return;
  van.hitCooldown -= dt;
  van.turnCooldown -= dt;
  const pos = van.axis === 'v' ? van.y : van.x;
  const line = nearestLine(pos);
  if (Math.abs(pos - line) < 26 && van.turnCooldown <= 0) {
    if (world.rng.chance(0.4)) {
      van.axis = van.axis === 'v' ? 'h' : 'v';
      van.dir = world.rng.chance(0.5) ? 1 : -1;
      van.turnCooldown = 2;
    } else {
      van.turnCooldown = 1;
    }
  }
  van.speed += (van.targetSpeed - van.speed) * dt;
  if (van.axis === 'v') {
    van.y += van.dir * van.speed * dt;
    van.angle = van.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    van.x = nearestLine(van.x);
  } else {
    van.x += van.dir * van.speed * dt;
    van.angle = van.dir > 0 ? 0 : Math.PI;
    van.y = nearestLine(van.y);
  }
  van.x = clamp(van.x, 200, 3000);
  van.y = clamp(van.y, 200, 3000);
  if (van.x <= 200 || van.x >= 3000 || van.y <= 200 || van.y >= 3000) van.dir *= -1;
  // Rammed by the player's car.
  if (world.player.inCar) {
    const pc = playerCar(world);
    if (pc && dist(pc.x, pc.y, van.x, van.y) < 56 && Math.abs(pc.speed) > 120 && van.hitCooldown <= 0) {
      van.hitCooldown = 0.5;
      world.events.push('crash');
      damageCar(world, van, 25);
    }
  }
}

function updatePeds(world, dt) {
  for (const ped of world.peds) {
    if (ped.state === 'down') {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) ped.state = 'walk';
      continue;
    }
    if (ped.state === 'flee') {
      ped.fleeTimer -= dt;
      if (ped.fleeTimer <= 0 && world.wanted === 0) ped.state = 'walk';
      const dx = ped.x - world.player.x;
      const dy = ped.y - world.player.y;
      const d = Math.hypot(dx, dy) || 1;
      ped.angle = Math.atan2(dy, dx);
      moveWithCollision(world, ped, (dx / d) * 230 * dt, (dy / d) * 230 * dt, 10);
      continue;
    }
    ped.turnTimer -= dt;
    if (ped.turnTimer <= 0) {
      ped.angle += world.rng.range(-1.2, 1.2);
      ped.turnTimer = world.rng.range(1.5, 4);
    }
    moveWithCollision(world, ped, Math.cos(ped.angle) * ped.speed * dt, Math.sin(ped.angle) * ped.speed * dt, 10);
    if (ped.x < 200 || ped.x > 3060 || ped.y < 200 || ped.y > 3060) ped.angle += Math.PI;
    // Run over by the player's car.
    if (world.player.inCar) {
      const pc = playerCar(world);
      if (pc && Math.abs(pc.speed) > 60 && dist(pc.x, pc.y, ped.x, ped.y) < 28) {
        knockPed(world, ped, true);
        setMessage(world, 'You hit a pedestrian — 1 star.');
      }
    }
  }
}

function pushCarsApart(world) {
  const pc = playerCar(world);
  if (!pc || !world.player.inCar) return;
  for (const car of world.cars) {
    if (car === pc || car.kind === 'parked' && car.id === pc.id) continue;
    if (car.kind === 'parked' && car !== pc && world.player.carId !== car.id) {
      // Parked cars are solid too, but only when the player drives into one.
    }
    const d = dist(pc.x, pc.y, car.x, car.y);
    if (d < CAR_PUSH_MIN && d > 0.01) {
      const ux = (car.x - pc.x) / d;
      const uy = (car.y - pc.y) / d;
      const push = CAR_PUSH_MIN - d;
      car.x += ux * push;
      car.y += uy * push;
      pc.x -= ux * push * 0.3;
      pc.y -= uy * push * 0.3;
      if (Math.abs(pc.speed) > 200 && car.hitCooldown <= 0) {
        car.hitCooldown = 0.6;
        if (car.kind === 'courier' || car.kind === 'police') damageCar(world, car, 8);
        world.events.push('crash');
      }
    }
  }
}

function updateAutopilot(world, dt) {
  const pc = playerCar(world);
  if (!pc) { world.autopilot = false; return; }
  const target = missionTarget(world);
  if (!target) { world.autopilot = false; return; }
  if (!world.autopilotRoute) {
    world.autopilotRoute = routeTo(world, pc.x, pc.y, target.x, target.y);
    world.autopilotIndex = 0;
  }
  let wp = world.autopilotRoute[world.autopilotIndex];
  if (!wp) { world.autopilot = false; return; }
  if (dist(pc.x, pc.y, wp.x, wp.y) < 42) {
    world.autopilotIndex++;
    wp = world.autopilotRoute[world.autopilotIndex];
    if (!wp) {
      world.autopilot = false;
      world.autopilotRoute = null;
      return;
    }
  }
  const want = Math.atan2(wp.y - pc.y, wp.x - pc.x);
  const diff = angleDiff(pc.angle, want);
  const steer = clamp(diff * 2.2, -1, 1);
  const throttle = Math.abs(diff) < 1.1 ? 1 : 0.35;
  const speedTarget = 330;
  pc.speed += ((throttle > 0.5 ? speedTarget : 150) - pc.speed) * Math.min(1, 1.4 * dt);
  if (pc.speed < 0) pc.speed = 0;
  pc.angle += steer * CAR_TURN_RATE * clamp(Math.abs(pc.speed) / 220, 0, 1) * dt * (pc.speed >= 0 ? 1 : -1);
  moveWithCollision(world, pc, Math.cos(pc.angle) * pc.speed * dt, Math.sin(pc.angle) * pc.speed * dt, 18);
  world.player.x = pc.x;
  world.player.y = pc.y;
  world.player.angle = pc.angle;
  world.player.speed = pc.speed;
}

function updatePlayer(world, input, dt) {
  const p = world.player;
  if (p.inCar) {
    const car = playerCar(world);
    if (!car) { p.inCar = false; return; }
    if (world.autopilot) {
      updateAutopilot(world, dt);
      return;
    }
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    if (input.up) car.speed += CAR_ACCEL * dt;
    else if (input.down) {
      if (car.speed > 10) car.speed -= CAR_BRAKE * dt;
      else car.speed -= CAR_REVERSE_ACCEL * dt;
    } else {
      car.speed -= car.speed * 0.55 * dt;
    }
    if (car.speed > CAR_MAX_SPEED) car.speed = CAR_MAX_SPEED;
    if (car.speed < -CAR_MAX_REVERSE) car.speed = -CAR_MAX_REVERSE;
    const before = car.speed;
    car.angle += steer * CAR_TURN_RATE * clamp(Math.abs(car.speed) / 220, 0, 1) * dt * (car.speed >= 0 ? 1 : -1);
    const ox = car.x;
    const oy = car.y;
    moveWithCollision(world, car, Math.cos(car.angle) * car.speed * dt, Math.sin(car.angle) * car.speed * dt, 18);
    if ((car.x === ox && Math.abs(Math.cos(car.angle)) > 0.01) || (car.y === oy && Math.abs(Math.sin(car.angle)) > 0.01)) {
      if (Math.abs(before) > 260) world.events.push('crash');
      car.speed *= 0.55;
    }
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.speed = car.speed;
    return;
  }
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const mag = Math.hypot(mx, my);
  if (mag > 0) {
    mx /= mag;
    my /= mag;
    const speed = input.run ? RUN_SPEED : WALK_SPEED;
    moveWithCollision(world, p, mx * speed * dt, my * speed * dt, 14);
    p.angle = Math.atan2(my, mx);
    p.speed = speed;
    p.walkPhase += speed * dt;
  } else {
    p.speed = 0;
  }
  if (input.shootX !== undefined && input.shootY !== undefined) {
    p.angle = Math.atan2(input.shootY - p.y, input.shootX - p.x);
  }
}

export function updateWorld(world, input = {}, dt = 1 / 60) {
  world.events = [];
  world.time += dt;
  if (world.messageTimer > 0) world.messageTimer -= dt;
  if (world.shootCooldown > 0) world.shootCooldown -= dt;
  if (world.player.muzzle > 0) world.player.muzzle -= dt;
  for (const t of world.tracers) t.ttl -= dt;
  world.tracers = world.tracers.filter((t) => t.ttl > 0);

  // Busted: wait out the timer, then respawn at the hospital.
  if (world.busted) {
    world.bustedTimer -= dt;
    updateTraffic(world, dt);
    if (world.bustedTimer <= 0) {
      world.busted = false;
      const door = landmarkDoor(landmarkById(world, 'hospital'));
      world.player.x = door.x;
      world.player.y = door.y + 60;
      world.player.inCar = false;
      world.player.carId = null;
      world.player.angle = -Math.PI / 2;
      world.health = START_HEALTH;
      setWanted(world, 0);
      world.police = [];
      world.cars = world.cars.filter((c) => c.kind !== 'police');
      setMessage(world, 'Busted — $200 fine. Back on the street, clean record.');
    }
    return;
  }

  // Wanted decay: one star per 26 quiet seconds.
  if (world.wanted > 0) {
    world.quietTime += dt;
    if (world.quietTime >= WANTED_DECAY_SECONDS) {
      world.wanted--;
      world.quietTime = 0;
      if (world.wanted === 0) setMessage(world, 'Heat is off — you are clean.');
    }
  }
  syncPolice(world);

  updatePlayer(world, input, dt);

  if (input.interact) {
    if (world.player.inCar) {
      exitCar(world);
    } else {
      let best = null;
      let bestD = 78;
      for (const car of world.cars) {
        if (car.kind === 'police' || car.kind === 'courier') continue;
        if (car.stalled) continue;
        const d = dist(world.player.x, world.player.y, car.x, car.y);
        if (d < bestD) { bestD = d; best = car; }
      }
      if (best) enterCar(world, best);
    }
  }
  if (input.punch && !world.player.inCar) {
    let best = null;
    let bestD = 58;
    for (const ped of world.peds) {
      if (ped.state === 'down') continue;
      const d = dist(world.player.x, world.player.y, ped.x, ped.y);
      if (d < bestD) { bestD = d; best = ped; }
    }
    if (best) {
      knockPed(world, best, true);
      world.events.push('punch');
      setMessage(world, `You punched ${best.name} — 1 star.`);
    }
  }
  if (input.shoot && input.shootX !== undefined) {
    fireShot(world, input.shootX, input.shootY);
  }

  updateTraffic(world, dt);
  updatePolice(world, dt);
  updateCourier(world, dt);
  updatePeds(world, dt);
  pushCarsApart(world);

  // Pickups: crate, briefcase, cash.
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    if (dist(world.player.x, world.player.y, pk.x, pk.y) < 58) {
      pk.taken = true;
      world.events.push('pickup');
      if (pk.kind === 'crate' && world.missionIndex === 1 && world.missionStep === 0) {
        world.missionStep = 1;
        setMessage(world, 'Crate secured — deliver it to the Neon Palms Hotel.');
      } else if (pk.kind === 'briefcase' && world.missionIndex === 2 && world.missionStep === 1) {
        world.missionStep = 2;
        setMessage(world, 'Briefcase grabbed — deliver it to the Broker\u2019s Tower.');
      } else if (pk.kind === 'cash' && world.missionIndex === 4 && world.missionStep === 0) {
        world.missionStep = 1;
        setWanted(world, 4);
        setMessage(world, 'Bank robbed — 4 stars! Escape to the safehouse!');
      }
    }
  }

  // Mission target checks.
  const target = missionTarget(world);
  if (target && !world.busted) {
    const d = dist(world.player.x, world.player.y, target.x, target.y);
    if (world.missionIndex === 0 && world.missionStep === 1 && world.player.inCar && d < 100) {
      completeMission(world, MISSIONS[0].pay);
    } else if (world.missionIndex === 1 && world.missionStep === 1 && d < 100) {
      completeMission(world, MISSIONS[1].pay);
    } else if (world.missionIndex === 2 && world.missionStep === 2 && d < 100) {
      completeMission(world, MISSIONS[2].pay);
    } else if (world.missionIndex === 3 && world.missionStep === 0 && world.wanted === 0) {
      world.missionStep = 1;
      setMessage(world, 'Heat is gone — get to the safehouse on Calle Luna.');
    } else if (world.missionIndex === 3 && world.missionStep === 1 && d < 100) {
      completeMission(world, MISSIONS[3].pay);
    } else if (world.missionIndex === 4 && world.missionStep === 1 && d < 100) {
      completeMission(world, MISSIONS[4].pay);
    }
  }

  // Busted check.
  if (world.health <= 0 && !world.busted) {
    world.busted = true;
    world.bustedTimer = BUSTED_WAIT_SECONDS;
    world.health = 0;
    world.money = Math.max(0, world.money - BUSTED_FINE);
    world.events.push('busted');
    setMessage(world, `Busted — $${BUSTED_FINE} fine.`);
  }
}

export function serializeWorld(world) {
  return {
    seed: world.seed, money: world.money, health: world.health,
    missionIndex: world.missionIndex, missionStep: world.missionStep,
    storyComplete: world.storyComplete, wanted: world.wanted,
    missionsCompleted: world.missionsCompleted, time: world.time,
    player: { x: world.player.x, y: world.player.y, angle: world.player.angle },
  };
}

export function deserializeWorld(data) {
  const world = createWorld(data.seed ?? 7);
  world.money = data.money ?? START_MONEY;
  world.health = data.health ?? START_HEALTH;
  world.missionIndex = data.missionIndex ?? 0;
  world.missionStep = data.missionStep ?? 0;
  world.storyComplete = !!data.storyComplete;
  world.wanted = data.wanted ?? 0;
  world.missionsCompleted = data.missionsCompleted ?? 0;
  world.time = data.time ?? 0;
  if (data.player) {
    world.player.x = data.player.x;
    world.player.y = data.player.y;
    world.player.angle = data.player.angle ?? -Math.PI / 2;
  }
  pushOutOfBuildings(world, world.player, 14);
  // Restore mission side effects the save implies.
  if (world.missionIndex === 1 && world.missionStep === 0) {
    const d = landmarkDoor(landmarkById(world, 'docks'));
    spawnPickup(world, 'crate', d.x, d.y);
  } else if (world.missionIndex === 2) {
    spawnCourier(world);
  } else if (world.missionIndex === 4 && world.missionStep === 0) {
    const d = landmarkDoor(landmarkById(world, 'bank'));
    spawnPickup(world, 'cash', d.x, d.y);
  }
  return world;
}
