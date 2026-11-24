// All canvas drawing for Solmar City: the city, cars and people, the HUD
// and the minimap. Reads the world, never mutates it.
import { WORLD_SIZE, ROAD_LINES, ROAD_HALF, BEACH_X, WATER_X, MISSIONS } from './config.js';
import { landmarkDoor, missionTarget, isOnRoad } from './world.js';

const SKY_SAND = '#e8d9a8';
const GRASS = '#8fae62';

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
const PARK_GREEN = '#6f9e4e';
const ASPHALT = '#3c3f47';
const SIDEWALK = '#b9b3a4';
const WATER = '#2f7fb8';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function inView(cam, vw, vh, x, y, m = 120) {
  return x > cam.x - vw / 2 - m && x < cam.x + vw / 2 + m && y > cam.y - vh / 2 - m && y < cam.y + vh / 2 + m;
}

function drawCity(ctx, world, cam, vw, vh, time) {
  // Ground: sun-baked grass, sand on the east beach, water past it.
  ctx.fillStyle = GRASS;
  ctx.fillRect(cam.x - vw / 2, cam.y - vh / 2, vw, vh);
  ctx.fillStyle = SKY_SAND;
  ctx.fillRect(BEACH_X, 0, WORLD_SIZE - BEACH_X, WORLD_SIZE);
  ctx.fillStyle = WATER;
  ctx.fillRect(WATER_X, 0, WORLD_SIZE - WATER_X, WORLD_SIZE);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(WATER_X, 0);
  ctx.lineTo(WATER_X, WORLD_SIZE);
  ctx.stroke();

  // Park with pond and trees.
  const park = world.park;
  ctx.fillStyle = PARK_GREEN;
  ctx.fillRect(park.x, park.y, park.w, park.h);
  ctx.fillStyle = '#3f8fbf';
  ctx.beginPath();
  ctx.ellipse(world.pond.x, world.pond.y, world.pond.r, world.pond.r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2f7fb8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#4d7a33';
  for (let i = 0; i < 14; i++) {
    const tx = park.x + 24 + ((i * 67) % (park.w - 48));
    const ty = park.y + 30 + ((i * 113) % (park.h - 60));
    if (Math.hypot(tx - world.pond.x, ty - world.pond.y) < world.pond.r + 22) continue;
    ctx.beginPath();
    ctx.arc(tx, ty, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  // Roads: asphalt bands, pale sidewalks, dashed centre lines.
  for (const line of ROAD_LINES) {
    ctx.fillStyle = SIDEWALK;
    ctx.fillRect(200 - ROAD_HALF - 10, line - ROAD_HALF - 10, 2800 + 20, ROAD_HALF * 2 + 20);
    ctx.fillRect(line - ROAD_HALF - 10, 200 - ROAD_HALF - 10, ROAD_HALF * 2 + 20, 2800 + 20);
    ctx.fillStyle = ASPHALT;
    ctx.fillRect(200 - ROAD_HALF, line - ROAD_HALF, 2800, ROAD_HALF * 2);
    ctx.fillRect(line - ROAD_HALF, 200 - ROAD_HALF, ROAD_HALF * 2, 2800);
  }
  ctx.strokeStyle = '#e8c93a';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  for (const line of ROAD_LINES) {
    ctx.beginPath();
    ctx.moveTo(200, line);
    ctx.lineTo(3000, line);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(line, 200);
    ctx.lineTo(line, 3000);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Buildings, landmarks labelled.
  for (const b of world.buildings) {
    if (!inView(cam, vw, vh, b.x + b.w / 2, b.y + b.h / 2, 200)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, Math.min(18, b.h - 16));
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    if (b.landmark) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2, b.y - 8);
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h + 12, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCarShape(ctx, car, isPlayer, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const len = car.kind === 'courier' ? 56 : 46;
  const wid = car.kind === 'courier' ? 26 : 22;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, -len / 2 + 3, -wid / 2 + 3, len, wid, 7);
  ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 7);
  ctx.fill();
  if (car.kind === 'police') {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(-6, -wid / 2, 14, wid);
    ctx.fillStyle = Math.floor(time * 6) % 2 === 0 ? '#ff2e2e' : '#2e6bff';
    ctx.fillRect(-4, -wid / 2 - 3, 6, 6);
    ctx.fillStyle = Math.floor(time * 6) % 2 === 0 ? '#2e6bff' : '#ff2e2e';
    ctx.fillRect(2, -wid / 2 - 3, 6, 6);
  } else {
    ctx.fillStyle = 'rgba(20,30,44,0.85)';
    roundRect(ctx, -6, -wid / 2 + 3, 14, wid - 6, 3);
    ctx.fill();
  }
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(len / 2 - 2, -wid / 2 + 3, 2, 4);
  ctx.fillRect(len / 2 - 2, wid / 2 - 7, 2, 4);
  if (isPlayer) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 3;
    roundRect(ctx, -len / 2 - 3, -wid / 2 - 3, len + 6, wid + 6, 9);
    ctx.stroke();
  }
  ctx.restore();
  if (car.stalled && car.smoke > 0) {
    const puff = Math.sin(time * 5 + car.x) * 3;
    ctx.fillStyle = 'rgba(120,120,120,0.75)';
    ctx.beginPath();
    ctx.arc(car.x - 8 + puff, car.y - 10, 9 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
    ctx.arc(car.x + 6, car.y - 14, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPed(ctx, ped, time) {
  const bob = ped.state === 'walk' ? Math.sin(time * 8 + ped.x) * 2 : 0;
  ctx.save();
  ctx.translate(ped.x, ped.y + bob * 0.3);
  if (ped.state === 'down') {
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(14, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(0, -2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(Math.cos(ped.angle) * 5, Math.sin(ped.angle) * 5 - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(ctx, world, time) {
  const p = world.player;
  if (p.inCar) return;
  const bob = p.speed > 0 ? Math.sin(p.walkPhase * 0.06) * 2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.3);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#17a398';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(0, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22262e';
  ctx.beginPath();
  ctx.arc(0, -6, 6, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(p.angle) * 16, Math.sin(p.angle) * 16);
  ctx.stroke();
  if (p.muzzle > 0) {
    ctx.fillStyle = '#ffe95e';
    ctx.beginPath();
    ctx.arc(Math.cos(p.angle) * 22, Math.sin(p.angle) * 22, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMarker(ctx, world, cam, vw, vh, time) {
  const target = missionTarget(world);
  if (!target || world.storyComplete) return;
  const pulse = 1 + Math.sin(time * 4) * 0.15;
  const sx = target.x - cam.x + vw / 2;
  const sy = target.y - cam.y + vh / 2;
  const onScreen = sx > 40 && sx < vw - 40 && sy > 40 && sy < vh - 40;
  if (onScreen) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = 'rgba(255,217,74,0.18)';
    ctx.fillRect(-3, -120, 6, 120);
    ctx.fillStyle = '#ffd94a';
    ctx.rotate(Math.PI / 4);
    const s = 11 * pulse;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(target.label, sx, sy - 34);
  }
  // Screen-edge arrow with distance, always visible.
  const p = world.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d > 60) {
    const ang = Math.atan2(dy, dx);
    const ex = vw / 2 + Math.cos(ang) * (Math.min(vw, vh) / 2 - 70);
    const ey = vh / 2 + Math.sin(ang) * (Math.min(vw, vh) / 2 - 70);
    ctx.save();
    ctx.translate(clamp(ex, 40, vw - 40), clamp(ey, 90, vh - 40));
    ctx.rotate(ang);
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${target.label} — ${Math.round(d)}m`, clamp(ex, 90, vw - 90), clamp(ey, 90, vh - 40) + 26);
  }
}

function drawPickups(ctx, world, cam, vw, vh, time) {
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    const sx = pk.x - cam.x + vw / 2;
    const sy = pk.y - cam.y + vh / 2;
    if (sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40) continue;
    const pulse = 1 + Math.sin(time * 5) * 0.2;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = pk.kind === 'cash' ? 'rgba(80,200,90,0.25)' : 'rgba(255,217,74,0.22)';
    ctx.fillRect(-2, -110, 4, 110);
    ctx.fillStyle = pk.kind === 'cash' ? '#50c85a' : pk.kind === 'briefcase' ? '#c07bff' : '#ffd94a';
    ctx.rotate(Math.PI / 4);
    const s = 10 * pulse;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'cash' ? 'CASH' : pk.kind === 'briefcase' ? 'BRIEFCASE' : 'CRATE', sx, sy - 26);
  }
}

export function drawWorld(ctx, world, cam, vw, vh, time) {
  ctx.save();
  ctx.translate(-cam.x + vw / 2, -cam.y + vh / 2);
  drawCity(ctx, world, cam, vw, vh, time);
  drawPickups(ctx, world, cam, vw, vh, time);
  for (const ped of world.peds) {
    if (inView(cam, vw, vh, ped.x, ped.y)) drawPed(ctx, ped, time);
  }
  for (const car of world.cars) {
    if (!inView(cam, vw, vh, car.x, car.y)) continue;
    const isPlayer = world.player.inCar && car.id === world.player.carId;
    drawCarShape(ctx, car, isPlayer, time);
  }
  drawPlayer(ctx, world, time);
  for (const t of world.tracers) {
    ctx.strokeStyle = 'rgba(255,233,94,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();
  }
  ctx.restore();
  drawMarker(ctx, world, cam, vw, vh, time);
}

export function drawMinimap(ctx, world, x, y, size) {
  const s = size / WORLD_SIZE;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,22,0.82)';
  ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, y - 4, size + 8, size + 8);
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.fillStyle = '#5d7a45';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(x + WATER_X * s, y, (WORLD_SIZE - WATER_X) * s, size);
  ctx.fillStyle = '#e8d9a8';
  ctx.fillRect(x + BEACH_X * s, y, (WATER_X - BEACH_X) * s, size);
  ctx.fillStyle = '#6f9e4e';
  ctx.fillRect(x + world.park.x * s, y + world.park.y * s, world.park.w * s, world.park.h * s);
  ctx.strokeStyle = '#3c3f47';
  ctx.lineWidth = 2;
  for (const line of ROAD_LINES) {
    ctx.beginPath();
    ctx.moveTo(x + 200 * s, y + line * s);
    ctx.lineTo(x + 3000 * s, y + line * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + line * s, y + 200 * s);
    ctx.lineTo(x + line * s, y + 3000 * s);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(30,30,36,0.8)';
  for (const b of world.buildings) {
    ctx.fillRect(x + b.x * s, y + b.y * s, Math.max(1.5, b.w * s), Math.max(1.5, b.h * s));
  }
  const target = missionTarget(world);
  if (target && !world.storyComplete) {
    ctx.fillStyle = '#ffd94a';
    ctx.save();
    ctx.translate(x + target.x * s, y + target.y * s);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
  if (world.courier && !world.courier.stalled) {
    ctx.fillStyle = '#c07bff';
    ctx.beginPath();
    ctx.arc(x + world.courier.x * s, y + world.courier.y * s, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const car of world.police) {
    ctx.fillStyle = '#ff2e2e';
    ctx.beginPath();
    ctx.arc(x + car.x * s, y + car.y * s, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = world.player;
  ctx.save();
  ctx.translate(x + p.x * s, y + p.y * s);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawHUD(ctx, world, vw, vh, time) {
  // Mission panel, top-left.
  const mission = world.storyComplete ? null : MISSIONS[Math.min(world.missionIndex, MISSIONS.length - 1)];
  ctx.fillStyle = 'rgba(10,14,22,0.78)';
  const panelW = 330;
  const panelH = mission ? 92 : 54;
  roundRect(ctx, 12, 12, panelW, panelH, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  if (mission) {
    ctx.fillText(mission.title, 24, 34);
    ctx.fillStyle = '#fff';
    ctx.font = '13px system-ui, sans-serif';
    const words = mission.objective.split(' ');
    let line = '';
    let ly = 54;
    for (const w of words) {
      if ((line + ' ' + w).length > 42) {
        ctx.fillText(line, 24, ly);
        ly += 17;
        line = w;
      } else line = line ? line + ' ' + w : w;
    }
    ctx.fillText(line, 24, ly);
    ctx.fillStyle = '#7ddc8a';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(`Pays $${mission.pay.toLocaleString()}`, 24, ly + 18);
  } else {
    ctx.fillText('Story complete — free roam', 24, 34);
    ctx.fillStyle = '#fff';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('The debt is paid. Solmar City is yours.', 24, 56);
  }
  // Message banner directly below the mission panel, never overlapping it.
  if (world.message && world.messageTimer > 0) {
    const bannerY = 12 + panelH + 10;
    ctx.fillStyle = 'rgba(20,20,26,0.72)';
    const bw = Math.min(panelW + 40, vw - 24);
    roundRect(ctx, 12, bannerY, bw, 30, 6);
    ctx.fill();
    ctx.fillStyle = '#ffe95e';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(world.message.slice(0, 72), 22, bannerY + 20);
  }
  // Health, money, wanted stars, bottom-left.
  const hy = vh - 64;
  ctx.fillStyle = 'rgba(10,14,22,0.78)';
  roundRect(ctx, 12, hy - 8, 250, 56, 8);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.fillRect(24, hy + 6, 150, 12);
  ctx.fillStyle = world.health > 30 ? '#4fc85a' : '#e83a2e';
  ctx.fillRect(24, hy + 6, Math.max(0, 150 * world.health / 100), 12);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`HP ${Math.ceil(world.health)}`, 182, hy + 17);
  ctx.fillStyle = '#7ddc8a';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`$${world.money.toLocaleString()}`, 24, hy + 40);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`Debt $${Math.max(0, 40000 - world.money).toLocaleString()}`, 130, hy + 40);
  // Wanted stars, top-centre.
  ctx.textAlign = 'center';
  ctx.font = '26px system-ui, sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < world.wanted ? '#ffd94a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', vw / 2 - 60 + i * 30, 40);
  }
  ctx.textAlign = 'left';
  // Controls hint, bottom-centre.
  ctx.font = '12px system-ui, sans-serif';
  const hint = 'WASD move/drive · Shift run · E steal car · Click shoot · F punch · P pause · M mute';
  const hw = ctx.measureText(hint).width + 20;
  ctx.fillStyle = 'rgba(10,14,22,0.6)';
  roundRect(ctx, vw / 2 - hw / 2, vh - 30, hw, 22, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  ctx.fillText(hint, vw / 2, vh - 15);
  ctx.textAlign = 'left';
  // Car name when driving.
  if (world.player.inCar) {
    const car = world.cars.find((c) => c.id === world.player.carId);
    if (car) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(car.name, vw - 230, vh - 46);
      ctx.textAlign = 'left';
    }
  }
  // Minimap, top-right, 200 by 200.
  drawMinimap(ctx, world, vw - 212, 12, 200);
  // Speed readout while driving.
  if (world.player.inCar) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(Math.abs(world.player.speed) * 0.24)} km/h`, vw - 230, vh - 26);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, vw, vh, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,18,0.72)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(title, vw / 2, vh / 2 - 90);
  ctx.fillStyle = '#fff';
  ctx.font = '17px system-ui, sans-serif';
  let y = vh / 2 - 40;
  for (const line of lines) {
    ctx.fillText(line, vw / 2, y);
    y += 28;
  }
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, vw, vh, hasSave) {
  overlay(ctx, vw, vh, 'SOLMAR CITY', [
    'A sun-soaked open-world crime story. You are Leo Marín.',
    'You owe The Broker $40,000. Five jobs stand between you and freedom.',
    '',
    'ENTER — Start the story' + (hasSave ? '      C — Continue your save' : ''),
    'WASD move and drive · Shift run · E steal a car · Click shoot · F punch',
    'Steal cars, dodge the police, finish all five missions.',
    '',
    'An original game. Not affiliated with Rockstar Games.',
  ], '#ffd94a');
}

export function drawPaused(ctx, vw, vh) {
  overlay(ctx, vw, vh, 'PAUSED', [
    'Your progress is saved.',
    'P or ESC — Resume      ENTER — Resume',
  ], '#fff');
}

export function drawBusted(ctx, vw, vh) {
  overlay(ctx, vw, vh, 'BUSTED', [
    'The Solmar police caught up with you.',
    '$200 fine. You wake up at Solmar General Hospital.',
  ], '#ff5a4a');
}

export function drawComplete(ctx, vw, vh) {
  overlay(ctx, vw, vh, 'STORY COMPLETE', [
    'The Last Score paid off. The $40,000 debt is settled.',
    'The Broker is paid. Solmar City is yours now.',
    '',
    'ENTER — Keep playing in free roam',
  ], '#7ddc8a');
}
