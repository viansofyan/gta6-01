// Deterministic staged scenes for screenshots. Each shot stages a real
// simulation (no faked pixels): the game runs live, the camera follows the
// player, and main.js sets __shotReady once the scene has settled.
import { createWorld, landmarkDoor, landmarkById, nearestRoadPoint, pushOutOfBuildings } from './world.js';
import { MISSIONS } from './config.js';

export const SHOT_NAMES = ['start', 'drive', 'chase', 'mission'];

function putPlayerInCar(world, x, y, angle) {
  const spot = nearestRoadPoint(x, y);
  let car = world.cars.find((c) => c.kind === 'parked' && !c.stalled);
  if (!car) return null;
  car.x = spot.x;
  car.y = spot.y;
  car.angle = angle;
  car.speed = 0;
  world.player.x = spot.x;
  world.player.y = spot.y;
  world.player.angle = angle;
  world.player.inCar = true;
  world.player.carId = car.id;
  return car;
}

function spawnPoliceBehind(world, x, y, angle, gaps) {
  const bx = Math.cos(angle);
  const by = Math.sin(angle);
  const made = [];
  for (const gap of gaps) {
    const px = x - bx * gap;
    const py = y - by * gap;
    const spot = nearestRoadPoint(px, py);
    const car = {
      id: `police-shot-${gap}`, kind: 'police', x: spot.x, y: spot.y,
      angle, speed: 380, color: '#1c1e24', name: 'Police Cruiser',
      hp: 60, stalled: false, axis: 'v', dir: 1, turnCooldown: 0,
      ramCooldown: 0, hitCooldown: 0, smoke: 0, targetSpeed: 380,
    };
    pushOutOfBuildings(world, car, 18);
    world.cars.push(car);
    world.police.push(car);
    made.push(car);
  }
  return made;
}

// Stage one named scene on a fresh world. Returns the world.
export function stageShot(name, seed = 7) {
  const world = createWorld(seed);
  if (name === 'start') {
    // Title screen over the living city; Leo on foot by the garage.
    return world;
  }
  if (name === 'drive') {
    // Mission 1: Leo driving a stolen car toward Mara's Garage, 1 star,
    // one police cruiser behind him. The autopilot drives the route.
    world.missionIndex = 0;
    world.missionStep = 1;
    world.wanted = 1;
    world.quietTime = 0;
    putPlayerInCar(world, 600, 1800, -Math.PI / 2);
    spawnPoliceBehind(world, world.player.x, world.player.y, world.player.angle, [300]);
    world.autopilot = true;
    return world;
  }
  if (name === 'chase') {
    // Mission 4: three stars, three cruisers in pursuit on the same road,
    // staged 250, 310 and 370 px behind Leo. Autopilot runs for the safehouse.
    world.missionIndex = 3;
    world.missionStep = 0;
    world.wanted = 3;
    world.quietTime = 0;
    putPlayerInCar(world, 1400, 2200, Math.PI);
    spawnPoliceBehind(world, world.player.x, world.player.y, world.player.angle, [250, 310, 370]);
    world.autopilot = true;
    return world;
  }
  if (name === 'mission') {
    // Mission 2: Leo on foot at Puerto Viejo Docks, crate marker ahead.
    world.missionIndex = 1;
    world.missionStep = 0;
    const door = landmarkDoor(landmarkById(world, 'docks'));
    world.pickups.push({ kind: 'crate', x: door.x, y: door.y, taken: false });
    world.player.x = door.x;
    world.player.y = door.y + 90;
    world.player.angle = -Math.PI / 2;
    pushOutOfBuildings(world, world.player, 14);
    return world;
  }
  return world;
}

export function shotTitle(name) {
  const titles = {
    start: MISSIONS[0].title,
    drive: MISSIONS[0].title,
    chase: MISSIONS[3].title,
    mission: MISSIONS[1].title,
  };
  return titles[name] || MISSIONS[0].title;
}
