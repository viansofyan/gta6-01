// Solmar City simulation. Plain Node, no browser globals: logic tests
// import this file directly and drive it with update(dt, input).
import {
  WORLD_SIZE, ROAD_LINES, ROAD_HALF, BLOCK_GAP, PARK_RECT, POND, BEACH_X, WATER_X,
  PLAYER_START, PLAYER_START_MONEY, PLAYER_MAX_HP, WALK_SPEED, RUN_SPEED, PLAYER_RADIUS,
  CAR_ACCEL, CAR_BRAKE, CAR_REVERSE_MAX, CAR_MAX_SPEED, CAR_DRAG, CAR_TURN, CAR_RADIUS,
  TRAFFIC_COUNT, PED_COUNT, STEAL_RANGE, PICKUP_RANGE, MISSION_ARRIVE,
  WANTED_MAX, WANTED_DECAY_SECONDS, POLICE_RAM_DAMAGE, POLICE_RAM_COOLDOWN,
  POLICE_DESPAWN, TRAFFIC_RESPAWN, BULLET_SPEED, BULLET_LIFE, FIRE_COOLDOWN,
  SHOT_DAMAGE, CAR_HP, RAM_DAMAGE_SPEED, BUSTED_FINE, BUSTED_WAIT,
  LANDMARKS, MISSIONS, CAR_NAMES, CAR_COLORS, PED_NAMES, BUILDING_COLORS,
} from './config.js';
import { makeRng } from './random.js';

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
export function isOnRoad(x, y) {
  for (const l of ROAD_LINES) {
    if (Math.abs(x - l) <= ROAD_HALF || Math.abs(y - l) <= ROAD_HALF) return true;
  }
  return false;
}
export function nearestLine(v) {
  let best = ROAD_LINES[0];
  for (const l of ROAD_LINES) if (Math.abs(v - l) < Math.abs(v - best)) best = l;
  return best;
}
export function nearestRoadPoint(x, y) {
  const vx = nearestLine(x);
  const hy = nearestLine(y);
  if (Math.abs(x - vx) <= Math.abs(y - hy)) return { x: vx, y };
  return { x, y: hy };
}
// Waypoints from A to B that stay on roads and end exactly at B.
export function routeWaypoints(ax, ay, bx, by) {
  const start = nearestRoadPoint(ax, ay);
  const end = nearestRoadPoint(bx, by);
  const pts = [start];
  const same = (p, q) => Math.abs(p.x - q.x) < 1 && Math.abs(p.y - q.y) < 1;
  if (!same(start, end)) {
    const startOnH = ROAD_LINES.some((l) => Math.abs(start.y - l) < 1);
    const corner = startOnH ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
    if (!same(corner, start) && !same(corner, end)) pts.push(corner);
    pts.push(end);
  }
  const target = { x: bx, y: by };
  if (!same(pts[pts.length - 1], target)) pts.push(target);
  return pts;
}

function circleHitsRect(x, y, r, b) {
  const cx = clamp(x, b.x, b.x + b.w);
  const cy = clamp(y, b.y, b.y + b.h);
  return dist(x, y, cx, cy) < r;
}

export function createWorld(seed = 7) {
  const rng = makeRng(seed);
  const world = {
    seed,
    rng,
    time: 0,
    buildings: [],
    trees: [],
    cars: [],
    peds: [],
    pickups: [],
    bullets: [],
    particles: [],
    player: {
      x: PLAYER_START.x, y: PLAYER_START.y, angle: -Math.PI / 2,
      hp: PLAYER_MAX_HP, money: PLAYER_START_MONEY, inCar: false, car: null,
    },
    wanted: 0,
    quietTime: 0,
    shotTimer: 0,
    missionIndex: 0,
    missionStep: 0,
    storyComplete: false,
    busted: false,
    bustedTimer: 0,
    message: 'Welcome to Solmar City. Steal a car for Mara.',
    messageTimer: 6,
    justSaved: false,
    events: [],
    stats: { shotsFired: 0, crimes: 0, carsStolen: 0 },
    _m1driven: 0,
    _apStuck: 0,
    _apReverse: 0,
    autopilot: { active: false, points: [], idx: 0 },
    fireCooldown: 0,
    courier: null,
    nextCarId: 1,
    _prevInteract: false,
    _prevPunch: false,
  };

  // ---- buildings -------------------------------------------------------
  function landmarkInBlock(x0, y0, x1, y1) {
    return LANDMARKS.find((l) => {
      const cx = l.x + l.w / 2;
      const cy = l.y + l.h / 2;
      return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
    });
  }
  function overlapsPark(x0, y0, x1, y1) {
    return x0 < PARK_RECT.x + PARK_RECT.w && x1 > PARK_RECT.x && y0 < PARK_RECT.y + PARK_RECT.h && y1 > PARK_RECT.y;
  }
  for (let bx = 0; bx < 7; bx++) {
    for (let by = 0; by < 7; by++) {
      const x0 = ROAD_LINES[bx] + BLOCK_GAP;
      const y0 = ROAD_LINES[by] + BLOCK_GAP;
      const x1 = ROAD_LINES[bx + 1] - BLOCK_GAP;
      const y1 = ROAD_LINES[by + 1] - BLOCK_GAP;
      if (overlapsPark(x0, y0, x1, y1)) continue;
      const lm = landmarkInBlock(x0, y0, x1, y1);
      if (lm) {
        world.buildings.push({ x: lm.x, y: lm.y, w: lm.w, h: lm.h, name: lm.name, landmark: lm.key, color: '#d8b070' });
        if (rng.chance(0.5)) {
          world.buildings.push({
            x: x0 + 8, y: y1 - 78, w: 84, h: 70,
            name: '', landmark: '', color: rng.pick(BUILDING_COLORS),
          });
        }
        continue;
      }
      const w = 120 + rng.range(0, 90);
      const h = 100 + rng.range(0, 70);
      const cx = (x0 + x1) / 2 + rng.range(-18, 18);
      const cy = (y0 + y1) / 2 + rng.range(-18, 18);
      world.buildings.push({
        x: cx - w / 2, y: cy - h / 2, w, h, name: '', landmark: '',
        color: rng.pick(BUILDING_COLORS),
      });
      if (rng.chance(0.45)) {
        world.buildings.push({
          x: x1 - 96, y: y0 + 6, w: 88, h: 64, name: '', landmark: '',
          color: rng.pick(BUILDING_COLORS),
        });
      }
    }
  }
  // Park trees, kept out of the pond.
  for (let i = 0; i < 22; i++) {
    const tx = PARK_RECT.x + 24 + rng.range(0, PARK_RECT.w - 48);
    const ty = PARK_RECT.y + 24 + rng.range(0, PARK_RECT.h - 48);
    if (dist(tx, ty, POND.x, POND.y) < POND.r + 22) continue;
    world.trees.push({ x: tx, y: ty, r: 12 + rng.range(0, 8) });
  }

  // ---- helpers bound to this world ------------------------------------
  world.hitsBuilding = (x, y, r) => {
    for (const b of world.buildings) if (circleHitsRect(x, y, r, b)) return true;
    return false;
  };
  world.nudgeClear = (x, y, r) => {
    let px = x;
    let py = y;
    for (let tries = 0; tries < 8; tries++) {
      let moved = false;
      for (const b of world.buildings) {
        if (!circleHitsRect(px, py, r, b)) continue;
        const left = px - (b.x - r);
        const right = (b.x + b.w + r) - px;
        const top = py - (b.y - r);
        const bottom = (b.y + b.h + r) - py;
        const m = Math.min(left, right, top, bottom);
        if (m === left) px = b.x - r - 1;
        else if (m === right) px = b.x + b.w + r + 1;
        else if (m === top) py = b.y - r - 1;
        else py = b.y + b.h + r + 1;
        moved = true;
      }
      if (!moved) break;
    }
    return { x: px, y: py };
  };
  world.addWanted = (n) => {
    if (n <= 0) return;
    world.wanted = Math.min(WANTED_MAX, world.wanted + n);
    world.quietTime = 0;
    world.stats.crimes++;
  };
  world.say = (text, seconds = 5) => {
    world.message = text;
    world.messageTimer = seconds;
  };
  world.spawnPickup = (kind, x, y) => {
    const spot = world.nudgeClear(x, y, 34);
    const p = { kind, x: spot.x, y: spot.y, taken: false };
    world.pickups.push(p);
    return p;
  };
  world.missionTarget = () => {
    const i = world.missionIndex;
    const s = world.missionStep;
    if (i === 0) return { x: 405, y: 520, label: "Mara's Garage" };
    if (i === 1) {
      if (s === 0) {
        const c = world.pickups.find((p) => p.kind === 'crate' && !p.taken);
        return c ? { x: c.x, y: c.y, label: 'Crate at the docks' } : { x: 420, y: 2600, label: 'Crate at the docks' };
      }
      return { x: 1210, y: 520, label: 'Neon Palms Hotel' };
    }
    if (i === 2) {
      if (s === 0 && world.courier) return { x: world.courier.x, y: world.courier.y, label: 'Courier van' };
      if (s === 1) {
        const b = world.pickups.find((p) => p.kind === 'briefcase' && !p.taken);
        return b ? { x: b.x, y: b.y, label: 'Briefcase' } : { x: 2800, y: 560, label: 'Briefcase' };
      }
      return { x: 2800, y: 560, label: "The Broker's Tower" };
    }
    if (i === 3) return { x: 2795, y: 2100, label: 'Safehouse' };
    if (i === 4) {
      if (s === 0) {
        const c = world.pickups.find((p) => p.kind === 'cash' && !p.taken);
        return c ? { x: c.x, y: c.y, label: 'Bank cash' } : { x: 2015, y: 1330, label: 'Bank cash' };
      }
      return { x: 2795, y: 2100, label: 'Safehouse' };
    }
    return { x: 2795, y: 2100, label: 'Safehouse' };
  };
  world.driveTo = (x, y) => {
    const from = world.player.inCar && world.player.car
      ? { x: world.player.car.x, y: world.player.car.y }
      : { x: world.player.x, y: world.player.y };
    world.autopilot.points = routeWaypoints(from.x, from.y, x, y);
    world.autopilot.idx = 0;
    world.autopilot.active = true;
  };

  // ---- cars ------------------------------------------------------------
  function addCar(kind, x, y, angle, color, name, maxSpeed) {
    const car = {
      id: world.nextCarId++, kind, x, y, angle, speed: 0,
      color, name, hp: CAR_HP, stalled: false, isPlayer: false,
      maxSpeed: maxSpeed || 300, ramCooldown: 0, turnCooldown: 0,
      axis: Math.abs(Math.sin(angle)) < 0.5 ? 'h' : 'v',
      road: Math.abs(Math.sin(angle)) < 0.5 ? nearestLine(y) : nearestLine(x),
      dir: Math.cos(angle) >= 0 ? 1 : -1,
    };
    if (car.axis === 'v') car.dir = Math.sin(angle) >= 0 ? 1 : -1;
    world.cars.push(car);
    return car;
  }
  // One parked car right by the player's start, then the rest scattered.
  addCar('parked', 470, 560, 0, '#d94f3d', 'Solmar Comet', 320);
  const parkedSpots = [
    [1000, 660, 0], [1400, 1340, Math.PI], [2200, 600, 0], [600, 1060, Math.PI / 2],
    [2600, 1400, Math.PI], [1800, 2600, 0], [1000, 2260, Math.PI / 2], [2600, 2200, 0],
    [600, 2660, Math.PI], [2200, 1060, Math.PI / 2],
  ];
  for (let i = 0; i < parkedSpots.length; i++) {
    const [x, y, a] = parkedSpots[i];
    addCar('parked', x, y, a, CAR_COLORS[i % CAR_COLORS.length], CAR_NAMES[i % CAR_NAMES.length], 300 + i * 12);
  }
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const horizontal = rng.chance(0.5);
    const line = rng.pick(ROAD_LINES);
    const along = rng.range(300, 2900);
    const dir = rng.chance(0.5) ? 1 : -1;
    const angle = horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = addCar('traffic', horizontal ? along : line, horizontal ? line : along, angle,
      rng.pick(CAR_COLORS), rng.pick(CAR_NAMES), 150 + rng.range(0, 90));
    car.speed = car.maxSpeed * rng.range(0.6, 0.9);
    car.axis = horizontal ? 'h' : 'v';
    car.road = line;
    car.dir = dir;
  }
  for (let i = 0; i < PED_COUNT; i++) {
    const horizontal = rng.chance(0.5);
    const line = rng.pick(ROAD_LINES);
    const along = rng.range(260, 2940);
    const off = (rng.chance(0.5) ? 1 : -1) * (ROAD_HALF + 16);
    const dir = rng.chance(0.5) ? 1 : -1;
    world.peds.push({
      x: horizontal ? along : line + off,
      y: horizontal ? line + off : along,
      angle: horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      speed: 45 + rng.range(0, 30),
      name: PED_NAMES[i % PED_NAMES.length],
      color: rng.pick(CAR_COLORS),
      down: false, downTimer: 0, crimeDone: false, turnCooldown: rng.range(0, 2),
    });
  }

  world.spawnPolice = () => {
    const p = world.player;
    for (let tries = 0; tries < 12; tries++) {
      const a = rng.range(0, Math.PI * 2);
      const cand = nearestRoadPoint(p.x + Math.cos(a) * 560, p.y + Math.sin(a) * 560);
      if (cand.x < 60 || cand.x > 3140 || cand.y < 60 || cand.y > 3140) continue;
      if (world.hitsBuilding(cand.x, cand.y, CAR_RADIUS + 4)) continue;
      const car = addCar('police', cand.x, cand.y, Math.atan2(p.y - cand.y, p.x - cand.x),
        '#20242e', 'Police Interceptor', 430);
      car.speed = 200;
      return car;
    }
    return null;
  };
  world.spawnCourier = () => {
    const p = world.player;
    const spot = nearestRoadPoint(p.x + 420, p.y - 260);
    const van = addCar('courier', spot.x, spot.y, 0, '#7a4fd0', 'Courier Van', 380);
    van.speed = 180;
    world.courier = van;
    return van;
  };
  world.syncPolice = () => {
    const cops = world.cars.filter((c) => c.kind === 'police');
    while (cops.length < world.wanted) {
      const made = world.spawnPolice();
      if (!made) break;
      cops.push(made);
    }
    while (cops.length > world.wanted) {
      let far = cops[0];
      for (const c of cops) {
        if (dist(c.x, c.y, world.player.x, world.player.y) > dist(far.x, far.y, world.player.x, world.player.y)) far = c;
      }
      world.cars.splice(world.cars.indexOf(far), 1);
      cops.splice(cops.indexOf(far), 1);
    }
  };
  world.enterMission = (i) => {
    if (i === 1) world.spawnPickup('crate', 420, 2600);
    if (i === 2) world.spawnCourier();
    if (i === 3) world.addWanted(3);
    if (i === 4) world.spawnPickup('cash', 2015, 1330);
    if (i < MISSIONS.length) world.say(MISSIONS[i].name + ': ' + MISSIONS[i].intro, 7);
  };
  world.completeMission = () => {
    const m = MISSIONS[world.missionIndex];
    world.player.money += m.payout;
    world.say(m.name + ' complete. +$' + m.payout, 6);
    world.events.push('jingle');
    world.justSaved = true;
    world.missionIndex++;
    world.missionStep = 0;
    if (world.missionIndex >= MISSIONS.length) {
      world.storyComplete = true;
      world.say('Story complete. The debt is paid. Solmar is yours.', 8);
      world.events.push('jingle');
      return;
    }
    world.enterMission(world.missionIndex);
  };

  // ---- per-frame updates ----------------------------------------------
  function updatePlayer(dt, input) {
    const p = world.player;
    if (p.inCar && p.car) {
      const car = p.car;
      let throttle = 0;
      let steer = 0;
      if (world.autopilot.active) {
        const pts = world.autopilot.points;
        let target = pts[world.autopilot.idx];
        while (target && dist(car.x, car.y, target.x, target.y) < 42) {
          world.autopilot.idx++;
          target = pts[world.autopilot.idx];
        }
        if (!target) {
          world.autopilot.active = false;
        } else {
          // Aim at a near point on the current leg, not the far waypoint:
          // on an axis-aligned leg that pulls the car back to the road
          // centreline instead of letting it run parallel to it.
          let aim = target;
          const prev = pts[world.autopilot.idx - 1];
          if (prev && target) {
            if (Math.abs(prev.x - target.x) < 1 && Math.abs(target.y - car.y) > 60) {
              const step = Math.sign(target.y - car.y) * 220;
              aim = { x: target.x, y: Math.abs(step) > Math.abs(target.y - car.y) ? target.y : car.y + step };
            } else if (Math.abs(prev.y - target.y) < 1 && Math.abs(target.x - car.x) > 60) {
              const step = Math.sign(target.x - car.x) * 220;
              aim = { x: Math.abs(step) > Math.abs(target.x - car.x) ? target.x : car.x + step, y: target.y };
            }
          }
          const want = Math.atan2(aim.y - car.y, aim.x - car.x);
          const diff = wrapAngle(want - car.angle);
          steer = clamp(diff * 2.2, -1, 1);
          // Facing away from the aim point: turn on the spot instead of
          // crawling forward in the wrong direction.
          throttle = Math.abs(diff) > 1.5 ? 0 : 1;
        }
      } else {
        throttle = (input.up ? 1 : 0) - (input.down ? 1 : 0);
        steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
      }
      // Wedged against a wall: back out for a moment, then carry on.
      if (world.autopilot.active) {
        if (Math.abs(car.speed) < 15 && throttle > 0) world._apStuck += dt;
        else world._apStuck = 0;
        if (world._apStuck > 1.2) {
          world._apReverse = 0.8;
          world._apStuck = 0;
        }
        if (world._apReverse > 0) {
          world._apReverse -= dt;
          throttle = -1;
          steer = -steer;
        }
      }
      if (throttle > 0) car.speed += CAR_ACCEL * throttle * dt;
      else if (throttle < 0) {
        if (car.speed > 20) car.speed -= CAR_BRAKE * dt;
        else car.speed = Math.max(car.speed + CAR_ACCEL * 0.5 * throttle * dt, -CAR_REVERSE_MAX);
      } else {
        car.speed -= car.speed * CAR_DRAG * dt;
        if (Math.abs(car.speed) < 4) car.speed = 0;
      }
      car.speed = clamp(car.speed, -CAR_REVERSE_MAX, car.maxSpeed);
      const turn = steer * CAR_TURN * clamp(0.4 + Math.abs(car.speed) / 260, 0, 1) * (car.speed < 0 ? -1 : 1);
      car.angle = wrapAngle(car.angle + turn * dt);
      moveCarWithWalls(car, dt);
      if (world.missionIndex === 0 && world.missionStep === 1) {
        world._m1driven += Math.abs(car.speed) * dt;
      }
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      // Push other cars apart; a hard hit damages the other car.
      for (const other of world.cars) {
        if (other === car || other.kind === 'police' && other.stalled) continue;
        const d = dist(car.x, car.y, other.x, other.y);
        if (d < 76 && d > 0.01) {
          const push = (76 - d) / 2;
          const ux = (other.x - car.x) / d;
          const uy = (other.y - car.y) / d;
          other.x += ux * push;
          other.y += uy * push;
          car.x -= ux * push;
          car.y -= uy * push;
          if (Math.abs(car.speed) > RAM_DAMAGE_SPEED) {
            other.hp -= 25;
            world.events.push('crash');
            if (other.hp <= 0) {
              other.stalled = true;
              other.speed = 0;
              world.events.push('stall');
              if (other.kind === 'courier' && world.missionIndex === 2 && world.missionStep === 0) {
                world.missionStep = 1;
                world.spawnPickup('briefcase', other.x, other.y);
                world.say('The van stalled. Grab the briefcase.', 5);
              }
            }
          }
        } else if (d <= 0.01) {
          other.x += 40;
        }
      }
      // Knock pedestrians down when the car hits them.
      for (const ped of world.peds) {
        if (ped.down) continue;
        if (dist(car.x, car.y, ped.x, ped.y) < 30 && Math.abs(car.speed) > 60) {
          ped.down = true;
          ped.downTimer = 4;
          if (!ped.crimeDone) {
            ped.crimeDone = true;
            world.addWanted(1);
            world.say('You hit a pedestrian. The police were called.', 4);
          }
        }
      }
      return;
    }
    // On foot.
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      const speed = input.run ? RUN_SPEED : WALK_SPEED;
      p.angle = Math.atan2(my, mx);
      const nx = p.x + mx * speed * dt;
      const ny = p.y + my * speed * dt;
      if (!world.hitsBuilding(nx, p.y, PLAYER_RADIUS)) p.x = clamp(nx, 16, 3055);
      if (!world.hitsBuilding(p.x, ny, PLAYER_RADIUS)) p.y = clamp(ny, 16, 3184);
    }
  }
  function moveCarWithWalls(car, dt) {
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    if (!world.hitsBuilding(nx, car.y, CAR_RADIUS)) car.x = clamp(nx, 30, 3050);
    else car.speed *= 0.4;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!world.hitsBuilding(car.x, ny, CAR_RADIUS)) car.y = clamp(ny, 30, 3184);
    else car.speed *= 0.4;
  }
  function updateTraffic(dt) {
    const p = world.player;
    for (const car of world.cars) {
      if (car.kind !== 'traffic') continue;
      if (car.stalled) continue;
      car.turnCooldown -= dt;
      // At an intersection, sometimes turn onto the crossing road.
      const cross = nearestLine(car.axis === 'h' ? car.x : car.y);
      const along = car.axis === 'h' ? car.x : car.y;
      if (Math.abs(along - cross) < 14 && car.turnCooldown <= 0) {
        car.turnCooldown = 2.5;
        if (world.rng.chance(0.4)) {
          const dir = world.rng.chance(0.5) ? 1 : -1;
          if (car.axis === 'h') {
            car.axis = 'v';
            car.road = cross;
            car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            car.dir = dir;
          } else {
            car.axis = 'h';
            car.road = cross;
            car.angle = dir > 0 ? 0 : Math.PI;
            car.dir = dir;
          }
        }
      }
      car.speed += (car.maxSpeed * 0.8 - car.speed) * dt * 0.5;
      if (car.axis === 'h') {
        car.x += car.dir * car.speed * dt;
        car.y = car.road;
        if (car.x < 120 || car.x > 3080) car.dir *= -1;
      } else {
        car.y += car.dir * car.speed * dt;
        car.x = car.road;
        if (car.y < 120 || car.y > 3080) car.dir *= -1;
      }
      if (dist(car.x, car.y, p.x, p.y) > TRAFFIC_RESPAWN) {
        const spot = nearestRoadPoint(p.x + world.rng.range(-500, 500), p.y + world.rng.range(-500, 500));
        car.x = spot.x;
        car.y = spot.y;
        const yOnLine = ROAD_LINES.some((l) => Math.abs(spot.y - l) < 1);
        car.axis = yOnLine ? 'h' : 'v';
        car.road = car.axis === 'h' ? spot.y : spot.x;
        car.angle = car.axis === 'h' ? 0 : Math.PI / 2;
        car.dir = 1;
      }
    }
  }
  function updateCourier(dt) {
    const van = world.courier;
    if (!van || van.stalled) return;
    const p = world.player;
    van.turnCooldown -= dt;
    const cross = nearestLine(van.axis === 'h' ? van.x : van.y);
    const along = van.axis === 'h' ? van.x : van.y;
    if (Math.abs(along - cross) < 16 && van.turnCooldown <= 0) {
      van.turnCooldown = 2;
      // Pick the turn that puts the most distance between van and player.
      const options = [];
      const ahead = van.axis === 'h'
        ? { x: van.x + van.dir * 200, y: van.y }
        : { x: van.x, y: van.y + van.dir * 200 };
      options.push({ d: dist(ahead.x, ahead.y, p.x, p.y), turn: 0 });
      options.push({ d: dist(van.x, van.y + 200, p.x, p.y), turn: 'down' });
      options.push({ d: dist(van.x, van.y - 200, p.x, p.y), turn: 'up' });
      options.push({ d: dist(van.x + 200, van.y, p.x, p.y), turn: 'right' });
      options.push({ d: dist(van.x - 200, van.y, p.x, p.y), turn: 'left' });
      options.sort((a, b) => b.d - a.d);
      const best = options[0];
      if (best.turn === 'up') { van.axis = 'v'; van.road = cross; van.angle = -Math.PI / 2; van.dir = -1; }
      else if (best.turn === 'down') { van.axis = 'v'; van.road = cross; van.angle = Math.PI / 2; van.dir = 1; }
      else if (best.turn === 'left') { van.axis = 'h'; van.road = cross; van.angle = Math.PI; van.dir = -1; }
      else if (best.turn === 'right') { van.axis = 'h'; van.road = cross; van.angle = 0; van.dir = 1; }
    }
    van.speed += (van.maxSpeed * 0.85 - van.speed) * dt * 0.6;
    if (van.axis === 'h') {
      van.x += van.dir * van.speed * dt;
      van.y = van.road;
      if (van.x < 120 || van.x > 3080) van.dir *= -1;
    } else {
      van.y += van.dir * van.speed * dt;
      van.x = van.road;
      if (van.y < 120 || van.y > 3080) van.dir *= -1;
    }
  }
  function updatePeds(dt) {
    const p = world.player;
    for (const ped of world.peds) {
      if (ped.down) {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) ped.down = false;
        continue;
      }
      ped.turnCooldown -= dt;
      const fleeing = world.shotTimer > 0 || world.wanted > 0;
      if (fleeing) {
        const away = Math.atan2(ped.y - p.y, ped.x - p.x);
        ped.angle = away;
        const nx = ped.x + Math.cos(away) * 250 * dt;
        const ny = ped.y + Math.sin(away) * 250 * dt;
        if (!world.hitsBuilding(nx, ped.y, 10)) ped.x = clamp(nx, 16, 3055);
        if (!world.hitsBuilding(ped.x, ny, 10)) ped.y = clamp(ny, 16, 3184);
        continue;
      }
      const cross = nearestLine(ped.angle % Math.PI === 0 ? ped.x : ped.y);
      const along = Math.abs(Math.sin(ped.angle)) < 0.5 ? ped.x : ped.y;
      if (Math.abs(along - cross) < 12 && ped.turnCooldown <= 0 && world.rng.chance(0.3)) {
        ped.turnCooldown = 2;
        ped.angle = wrapAngle(ped.angle + (world.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2));
      }
      const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
      const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
      if (!world.hitsBuilding(nx, ped.y, 10) && nx > 16 && nx < 3055) ped.x = nx;
      else ped.angle = wrapAngle(ped.angle + Math.PI / 2);
      if (!world.hitsBuilding(ped.x, ny, 10) && ny > 16 && ny < 3184) ped.y = ny;
      else ped.angle = wrapAngle(ped.angle - Math.PI / 2);
    }
  }
  function updatePolice(dt) {
    const p = world.player;
    for (let i = world.cars.length - 1; i >= 0; i--) {
      const car = world.cars[i];
      if (car.kind !== 'police') continue;
      if (dist(car.x, car.y, p.x, p.y) > POLICE_DESPAWN) {
        world.cars.splice(i, 1);
        continue;
      }
      if (car.stalled) continue;
      car.ramCooldown -= dt;
      const want = Math.atan2(p.y - car.y, p.x - car.x);
      const diff = wrapAngle(want - car.angle);
      car.angle = wrapAngle(car.angle + clamp(diff * 2.4, -2.4, 2.4) * dt);
      car.speed += (car.maxSpeed * 0.92 - car.speed) * dt * 0.7;
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      car.x = clamp(nx, 30, 3050);
      car.y = clamp(ny, 30, 3184);
      if (world.hitsBuilding(car.x, car.y, CAR_RADIUS)) {
        const snap = nearestRoadPoint(car.x, car.y);
        car.x = snap.x;
        car.y = snap.y;
        car.speed *= 0.5;
      }
      if (dist(car.x, car.y, p.x, p.y) < 50 && car.ramCooldown <= 0) {
        car.ramCooldown = POLICE_RAM_COOLDOWN;
        p.hp -= POLICE_RAM_DAMAGE;
        world.events.push('crash');
        world.say('Police rammed you. -$' + POLICE_RAM_DAMAGE + ' health.', 2);
        if (p.hp <= 0) {
          p.hp = 0;
          world.busted = true;
          world.bustedTimer = 0;
          world.events.push('busted');
          world.say('BUSTED', 3);
        }
      }
    }
  }
  function updateBullets(dt) {
    for (let i = world.bullets.length - 1; i >= 0; i--) {
      const b = world.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0;
      if (!dead && world.hitsBuilding(b.x, b.y, 2)) dead = true;
      if (!dead) {
        for (const car of world.cars) {
          if (car.isPlayer || car.stalled) continue;
          if (car.kind !== 'police' && car.kind !== 'courier' && car.kind !== 'traffic') continue;
          if (dist(b.x, b.y, car.x, car.y) < 28) {
            car.hp -= SHOT_DAMAGE;
            dead = true;
            world.events.push('hit');
            if (car.hp <= 0) {
              car.stalled = true;
              car.speed = 0;
              world.events.push('stall');
              world.particles.push({ x: car.x, y: car.y, life: 1.2, kind: 'smoke' });
              if (car.kind === 'courier' && world.missionIndex === 2 && world.missionStep === 0) {
                world.missionStep = 1;
                world.spawnPickup('briefcase', car.x, car.y);
                world.say('The van stalled. Grab the briefcase.', 5);
              }
            }
            break;
          }
        }
      }
      if (!dead) {
        for (const ped of world.peds) {
          if (ped.down) continue;
          if (dist(b.x, b.y, ped.x, ped.y) < 20) {
            ped.down = true;
            ped.downTimer = 4;
            dead = true;
            if (!ped.crimeDone) {
              ped.crimeDone = true;
              world.addWanted(1);
              world.say('You shot a pedestrian. The police were called.', 4);
            }
            break;
          }
        }
      }
      if (dead) world.bullets.splice(i, 1);
    }
  }
  function updateMissions() {
    const p = world.player;
    const i = world.missionIndex;
    if (i >= MISSIONS.length) return;
    if (i === 0) {
      if (world.missionStep === 1 && p.inCar && world._m1driven > 120) {
        if (dist(p.x, p.y, 405, 520) < MISSION_ARRIVE) world.completeMission();
      }
      return;
    }
    if (i === 1) {
      if (world.missionStep === 0) {
        const crate = world.pickups.find((pk) => pk.kind === 'crate' && !pk.taken);
        if (crate && !p.inCar && dist(p.x, p.y, crate.x, crate.y) < PICKUP_RANGE) {
          crate.taken = true;
          world.missionStep = 1;
          world.events.push('pickup');
          world.say('Crate collected. Deliver it to Neon Palms Hotel.', 5);
        }
      } else if (dist(p.x, p.y, 1210, 520) < MISSION_ARRIVE) {
        world.completeMission();
      }
      return;
    }
    if (i === 2) {
      if (world.missionStep === 1) {
        const bc = world.pickups.find((pk) => pk.kind === 'briefcase' && !pk.taken);
        if (bc && !p.inCar && dist(p.x, p.y, bc.x, bc.y) < PICKUP_RANGE) {
          bc.taken = true;
          world.missionStep = 2;
          world.events.push('pickup');
          world.say('Briefcase taken. Deliver it to the Broker\u2019s Tower.', 5);
        }
      } else if (world.missionStep === 2 && dist(p.x, p.y, 2800, 560) < MISSION_ARRIVE) {
        world.completeMission();
      }
      return;
    }
    if (i === 3) {
      if (world.missionStep === 0 && world.wanted === 0) {
        world.missionStep = 1;
        world.say('Heat is off. Get to the safehouse.', 5);
      } else if (world.missionStep === 1 && dist(p.x, p.y, 2795, 2100) < MISSION_ARRIVE) {
        world.completeMission();
      }
      return;
    }
    if (i === 4) {
      if (world.missionStep === 0) {
        const cash = world.pickups.find((pk) => pk.kind === 'cash' && !pk.taken);
        if (cash && dist(p.x, p.y, cash.x, cash.y) < PICKUP_RANGE) {
          cash.taken = true;
          world.missionStep = 1;
          world.wanted = 4;
          world.quietTime = 0;
          world.events.push('pickup');
          world.say('Cash grabbed. Four stars. Run to the safehouse.', 6);
        }
      } else if (dist(p.x, p.y, 2795, 2100) < MISSION_ARRIVE) {
        world.completeMission();
      }
    }
  }

  world.update = (dt, input = {}) => {
    dt = Math.min(dt, 0.05);
    world.time += dt;
    if (world.busted) {
      world.bustedTimer += dt;
      if (world.bustedTimer >= BUSTED_WAIT) {
        const p = world.player;
        p.money = Math.max(0, p.money - BUSTED_FINE);
        p.hp = PLAYER_MAX_HP;
        p.inCar = false;
        p.car = null;
        p.x = 410;
        p.y = 2080;
        p.angle = -Math.PI / 2;
        world.wanted = 0;
        world.quietTime = 0;
        world.cars = world.cars.filter((c) => c.kind !== 'police');
        world.autopilot.active = false;
        world.busted = false;
        world.say('Released from the hospital. Fine paid: $' + BUSTED_FINE + '.', 5);
      }
      return;
    }
    world.fireCooldown -= dt;
    world.shotTimer = Math.max(0, world.shotTimer - dt);
    if (world.messageTimer > 0) world.messageTimer -= dt;
    for (const pt of world.particles) pt.life -= dt;
    world.particles = world.particles.filter((pt) => pt.life > 0);

    // Edge-triggered actions.
    const interact = !!input.interact;
    if (interact && !world._prevInteract) {
      const p = world.player;
      if (p.inCar && p.car) {
        const car = p.car;
        car.isPlayer = false;
        p.inCar = false;
        p.car = null;
        const side = world.nudgeClear(p.x + 44, p.y, PLAYER_RADIUS + 2);
        p.x = side.x;
        p.y = side.y;
        world.autopilot.active = false;
      } else {
        let best = null;
        let bestD = STEAL_RANGE;
        for (const car of world.cars) {
          if (car.kind === 'police' || car.kind === 'courier') continue;
          const d = dist(p.x, p.y, car.x, car.y);
          if (d < bestD) {
            bestD = d;
            best = car;
          }
        }
        if (best) {
          p.inCar = true;
          p.car = best;
          best.isPlayer = true;
          p.x = best.x;
          p.y = best.y;
          world.stats.carsStolen++;
          world.addWanted(1);
          world.events.push('pickup');
          world.say('You took the ' + best.name + '.', 4);
          if (world.missionIndex === 0 && world.missionStep === 0) {
            world.missionStep = 1;
            world._m1driven = 0;
            world.say('Now drive it to Mara\u2019s Garage.', 5);
          }
        }
      }
    }
    world._prevInteract = interact;

    if (input.punch && !world._prevPunch) {
      const p = world.player;
      if (!p.inCar) {
        for (const ped of world.peds) {
          if (ped.down) continue;
          if (dist(p.x, p.y, ped.x, ped.y) < 70) {
            ped.down = true;
            ped.downTimer = 3;
            world.events.push('punch');
            if (!ped.crimeDone) {
              ped.crimeDone = true;
              world.addWanted(1);
            }
            break;
          }
        }
      }
    }
    world._prevPunch = !!input.punch;

    if (input.shoot && world.fireCooldown <= 0) {
      const p = world.player;
      const ox = p.x;
      const oy = p.y;
      const tx = input.aimX !== undefined ? input.aimX : ox + Math.cos(p.angle) * 100;
      const ty = input.aimY !== undefined ? input.aimY : oy + Math.sin(p.angle) * 100;
      const a = Math.atan2(ty - oy, tx - ox);
      world.bullets.push({ x: ox + Math.cos(a) * 26, y: oy + Math.sin(a) * 26, vx: Math.cos(a) * BULLET_SPEED, vy: Math.sin(a) * BULLET_SPEED, life: BULLET_LIFE });
      world.fireCooldown = FIRE_COOLDOWN;
      world.shotTimer = 1.5;
      world.stats.shotsFired++;
      world.events.push('shot');
    }

    updatePlayer(dt, input);
    updateTraffic(dt);
    updateCourier(dt);
    updatePeds(dt);
    updatePolice(dt);
    updateBullets(dt);

    // Wanted decay: one star per quiet stretch.
    if (world.wanted > 0) {
      world.quietTime += dt;
      if (world.quietTime >= WANTED_DECAY_SECONDS) {
        world.wanted--;
        world.quietTime = 0;
        world.say(world.wanted === 0 ? 'You lost them. Heat is off.' : 'Heat dropping: ' + world.wanted + ' stars left.', 4);
      }
    }
    world.syncPolice();
    updateMissions();
  };

  return world;
}
