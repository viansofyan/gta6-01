// Deterministic staged scenes for screenshots: ?shot=<name>&seed=N.
// Each stages a real simulation state, then main.js warms it up live for a
// fixed number of frames before setting window.__shotReady.
import { landmark } from './config.js';
import { setMission, tryEnterCar, startAutopilot, nearestRoadPoint } from './world.js';

// Returns { screen, warmup } — screen the game should show, warmup frames.
export function stageShot(w, name) {
  const p = w.player;
  if (name === 'drive') {
    // Mission 1, step 1: steal the parked car by the spawn, then drive the
    // road north toward Mara's Garage from ~1300 px out.
    setMission(w, 0, 0);
    p.x = 1000; p.y = 940; p.angle = -Math.PI / 2;
    tryEnterCar(w);
    const car = p.car;
    if (car) { car.x = 1000; car.y = 1900; car.angle = -Math.PI / 2; car.speed = 0; p.x = 1000; p.y = 1900; }
    startAutopilot(w, landmark('garage').door);
    return { screen: 'playing', warmup: 100 };
  }
  if (name === 'chase') {
    // Mission 4 "Heat Wave": 3 stars, police chasing, autopilot driving the
    // road toward the safehouse from ~1300 px out.
    setMission(w, 0, 0);
    p.x = 1000; p.y = 940; p.angle = -Math.PI / 2;
    tryEnterCar(w);
    setMission(w, 3, 0); // escape step sets wanted 3 + spawns police
    const car = p.car;
    if (car) { car.x = 2200; car.y = 1000; car.angle = Math.PI / 2; car.speed = 0; p.x = 2200; p.y = 1000; }
    // Police spawn near the player; stage them in a spread on the same road
    // behind the player so the chase is visible in frame.
    const behind = [250, 310, 370];
    w.police.forEach((cop, i) => {
      const pt = nearestRoadPoint(2200, 1000 - behind[i % behind.length]);
      cop.x = pt.x; cop.y = pt.y; cop.speed = 420;
    });
    startAutopilot(w, landmark('safehouse').door);
    return { screen: 'playing', warmup: 140 };
  }
  if (name === 'mission') {
    // Mission 2, step 0: on foot at the docks, crate marker ahead.
    setMission(w, 1, 0);
    p.x = 3000; p.y = 580; p.angle = -Math.PI / 2; p.aimAngle = -Math.PI / 2;
    return { screen: 'playing', warmup: 60 };
  }
  // 'start' (and anything else): title screen over the living city.
  setMission(w, 0, 0);
  return { screen: 'title', warmup: 60 };
}
