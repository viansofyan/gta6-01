// Deterministic staged scenes for screenshots. Each one sets a real
// simulation state from the seed, then the game warms it up live before
// the ready flag goes up. No scene is a mock: the city, the traffic and
// the police are all running.
import { MISSIONS } from './config.js';

export function warmUpSeconds(kind) {
  if (kind === 'start') return 2;
  if (kind === 'drive') return 1.0;
  if (kind === 'chase') return 3;
  return 1.2;
}

function putPlayerInCar(world, x, y, angle) {
  const p = world.player;
  let car = null;
  let best = Infinity;
  for (const c of world.cars) {
    if (c.kind !== 'parked') continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < best) {
      best = d;
      car = c;
    }
  }
  if (!car) return null;
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = 0;
  car.maxSpeed = 470;
  p.inCar = true;
  p.car = car;
  car.isPlayer = true;
  p.x = x;
  p.y = y;
  p.angle = angle;
  return car;
}

function lineUpPoliceBehind(world, count, gap0) {
  const p = world.player;
  world.syncPolice();
  const cops = world.cars.filter((c) => c.kind === 'police');
  const behind = -Math.cos(p.angle);
  const side = -Math.sin(p.angle);
  cops.slice(0, count).forEach((cop, i) => {
    const back = gap0 + i * 60;
    cop.x = p.x + behind * back;
    cop.y = p.y + side * back;
    cop.angle = p.angle;
    cop.speed = 260;
    cop.stalled = false;
  });
  return cops.slice(0, count);
}

export function stageShot(world, kind) {
  if (kind === 'start') {
    // Title over the living city; the camera sits mid-city so the frame
    // is all streets and blocks, no out-of-world edge.
    world.player.x = 760;
    world.player.y = 760;
    return { screen: 'title' };
  }
  if (kind === 'drive') {
    putPlayerInCar(world, 1400, 600, Math.PI);
    world.missionIndex = 0;
    world.missionStep = 1;
    world.wanted = 1;
    world.quietTime = 0;
    world.syncPolice();
    const cops = world.cars.filter((c) => c.kind === 'police');
    if (cops[0]) {
      cops[0].x = world.player.x + 260;
      cops[0].y = 600;
      cops[0].angle = Math.PI;
      cops[0].speed = 240;
    }
    world.driveTo(405, 520);
    world.say('Drive it to Mara\u2019s Garage.', 6);
    return { screen: 'playing' };
  }
  if (kind === 'chase') {
    putPlayerInCar(world, 1400, 600, 0);
    world.missionIndex = 3;
    world.missionStep = 0;
    world.wanted = 3;
    world.quietTime = 0;
    world.syncPolice();
    lineUpPoliceBehind(world, 3, 250);
    world.driveTo(2795, 2100);
    world.say('Three stars. Lose the heat, then reach the safehouse.', 6);
    return { screen: 'playing' };
  }
  if (kind === 'mission') {
    world.missionIndex = 1;
    world.missionStep = 0;
    world.enterMission(1);
    const p = world.player;
    p.inCar = false;
    p.car = null;
    p.x = 430;
    p.y = 2500;
    p.angle = Math.PI / 2;
    p.hp = 100;
    world.wanted = 0;
    world.say('Collect the crate at the docks.', 6);
    return { screen: 'playing' };
  }
  return { screen: 'title' };
}

export function shotTitle(kind) {
  if (kind === 'drive') return MISSIONS[0].name;
  if (kind === 'chase') return MISSIONS[3].name;
  if (kind === 'mission') return MISSIONS[1].name;
  return 'Solmar City';
}
