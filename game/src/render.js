// All canvas drawing for Solmar City: the city, its people and cars,
// the HUD with its minimap, and the menu screens.
import {
  WORLD_SIZE, ROAD_LINES, ROAD_HALF, PARK_RECT, POND, BEACH_X, WATER_X,
  MISSIONS, PLAYER_MAX_HP,
} from './config.js';
import { dist } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCarShape(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, -22, -10, 46, 24, 8);
  ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, -24, -12, 48, 24, 8);
  ctx.fill();
  ctx.fillStyle = '#1c2733';
  roundRect(ctx, -6, -10, 14, 20, 4);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(22, -11, 3, 5);
  ctx.fillRect(22, 6, 3, 5);
  ctx.fillStyle = '#ff5a4a';
  ctx.fillRect(-25, -11, 3, 5);
  ctx.fillRect(-25, 6, 3, 5);
  if (car.kind === 'police') {
    const on = Math.floor(t * 4) % 2 === 0;
    ctx.fillStyle = on ? '#ff2e2e' : '#2e6bff';
    ctx.fillRect(-4, -12, 8, 5);
    ctx.fillStyle = on ? '#2e6bff' : '#ff2e2e';
    ctx.fillRect(-4, 7, 8, 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
  }
  if (car.kind === 'courier') {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COURIER', 0, 3);
  }
  if (car.stalled) {
    ctx.fillStyle = 'rgba(200,200,200,0.7)';
    ctx.beginPath();
    ctx.arc(-14, -14, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPedShape(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  if (ped.down) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(0, -3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawScene(ctx, world, cam, vw, vh) {
  const t = world.time;
  ctx.fillStyle = '#7fae62';
  ctx.fillRect(0, 0, vw, vh);
  const ox = vw / 2 - cam.x;
  const oy = vh / 2 - cam.y;
  ctx.save();
  ctx.translate(ox, oy);
  // Ground: grass, then the beach and the sea on the east edge.
  ctx.fillStyle = '#8fbf6f';
  ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
  ctx.fillStyle = '#e8d49a';
  ctx.fillRect(BEACH_X, 0, WATER_X - BEACH_X, WORLD_SIZE);
  ctx.fillStyle = '#2f7fc4';
  ctx.fillRect(WATER_X, 0, WORLD_SIZE - WATER_X, WORLD_SIZE);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let y = 0; y < WORLD_SIZE; y += 160) {
    ctx.fillRect(WATER_X + 18, y + ((t * 20) % 160), 26, 4);
  }
  ctx.fillStyle = '#e8d49a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PLAYA SOLMAR', WATER_X - 180, 120);
  // City blocks.
  ctx.fillStyle = '#b9a98c';
  for (let bx = 0; bx < 7; bx++) {
    for (let by = 0; by < 7; by++) {
      const x0 = ROAD_LINES[bx] + ROAD_HALF;
      const y0 = ROAD_LINES[by] + ROAD_HALF;
      const x1 = ROAD_LINES[bx + 1] - ROAD_HALF;
      const y1 = ROAD_LINES[by + 1] - ROAD_HALF;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  // The park and its pond.
  ctx.fillStyle = '#5da24a';
  ctx.fillRect(PARK_RECT.x, PARK_RECT.y, PARK_RECT.w, PARK_RECT.h);
  ctx.fillStyle = '#3f8fd0';
  ctx.beginPath();
  ctx.arc(POND.x, POND.y, POND.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f7d3a';
  for (const tree of world.trees) {
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Roads.
  ctx.fillStyle = '#3c4148';
  for (const l of ROAD_LINES) {
    ctx.fillRect(0, l - ROAD_HALF, WORLD_SIZE, ROAD_HALF * 2);
    ctx.fillRect(l - ROAD_HALF, 0, ROAD_HALF * 2, WORLD_SIZE);
  }
  ctx.strokeStyle = '#e8d24a';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  for (const l of ROAD_LINES) {
    ctx.beginPath();
    ctx.moveTo(0, l);
    ctx.lineTo(WORLD_SIZE, l);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(l, 0);
    ctx.lineTo(l, WORLD_SIZE);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Buildings.
  for (const b of world.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 10);
    if (b.landmark) {
      ctx.fillStyle = '#20242e';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 4);
    }
  }
  // Mission marker: a pulsing diamond with a beam of light.
  const target = world.missionTarget();
  if (world.missionIndex < MISSIONS.length && !world.storyComplete) {
    const pulse = 1 + Math.sin(t * 5) * 0.18;
    ctx.fillStyle = 'rgba(255,215,80,0.22)';
    ctx.fillRect(target.x - 14, target.y - 260, 28, 260);
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.rotate(Math.PI / 4);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd750';
    ctx.strokeStyle = '#a86f00';
    ctx.lineWidth = 2;
    ctx.fillRect(-13, -13, 26, 26);
    ctx.strokeRect(-13, -13, 26, 26);
    ctx.restore();
  }
  // Pickups.
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    const bob = Math.sin(t * 4) * 4;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    ctx.fillStyle = pk.kind === 'cash' ? '#3fae5f' : pk.kind === 'briefcase' ? '#8a5fd0' : '#e07b2e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillRect(-11, -9, 22, 18);
    ctx.strokeRect(-11, -9, 22, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'briefcase' ? 'B' : 'C', 0, 4);
    ctx.restore();
  }
  // Bullets and smoke.
  ctx.fillStyle = '#ffe08a';
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const pt of world.particles) {
    ctx.fillStyle = 'rgba(220,220,220,' + Math.max(0, pt.life) + ')';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 16 + (1.2 - pt.life) * 22, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pedestrians, then cars, then the player.
  for (const ped of world.peds) drawPedShape(ctx, ped);
  for (const car of world.cars) drawCarShape(ctx, car, t);
  const p = world.player;
  if (!p.inCar) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 6, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e6bff';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(4, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(10, -3, 12, 3);
    ctx.restore();
  }
  // Aim line while shooting is held is drawn by the caller through the crosshair.
  ctx.restore();
}

export function drawMinimap(ctx, world, mx, my) {
  const size = 200;
  const scale = size / WORLD_SIZE;
  ctx.save();
  ctx.translate(mx, my);
  ctx.fillStyle = 'rgba(10,14,20,0.85)';
  roundRect(ctx, -6, -6, size + 12, size + 12, 10);
  ctx.fill();
  ctx.strokeStyle = '#ffd750';
  ctx.lineWidth = 2;
  ctx.strokeRect(-6, -6, size + 12, size + 12);
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.clip();
  ctx.fillStyle = '#6f9e58';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#2f7fc4';
  ctx.fillRect(WATER_X * scale, 0, size, size);
  ctx.fillStyle = '#5da24a';
  ctx.fillRect(PARK_RECT.x * scale, PARK_RECT.y * scale, PARK_RECT.w * scale, PARK_RECT.h * scale);
  ctx.fillStyle = '#3c4148';
  for (const l of ROAD_LINES) {
    ctx.fillRect(0, (l - ROAD_HALF) * scale, size, ROAD_HALF * 2 * scale);
    ctx.fillRect((l - ROAD_HALF) * scale, 0, ROAD_HALF * 2 * scale, size);
  }
  ctx.fillStyle = '#c9b18a';
  for (const b of world.buildings) {
    ctx.fillRect(b.x * scale, b.y * scale, Math.max(2, b.w * scale), Math.max(2, b.h * scale));
  }
  const target = world.missionTarget();
  if (world.missionIndex < MISSIONS.length && !world.storyComplete) {
    ctx.fillStyle = '#ffd750';
    ctx.save();
    ctx.translate(target.x * scale, target.y * scale);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
  if (world.courier && !world.courier.stalled) {
    ctx.fillStyle = '#b678ff';
    ctx.beginPath();
    ctx.arc(world.courier.x * scale, world.courier.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff2e2e';
  for (const car of world.cars) {
    if (car.kind !== 'police') continue;
    ctx.beginPath();
    ctx.arc(car.x * scale, car.y * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = world.player;
  ctx.save();
  ctx.translate(p.x * scale, p.y * scale);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawHud(ctx, world, vw, vh, aim) {
  const p = world.player;
  // Mission panel, top left.
  ctx.fillStyle = 'rgba(10,14,20,0.78)';
  roundRect(ctx, 12, 12, 330, 92, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd750';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  const mission = world.missionIndex < MISSIONS.length ? MISSIONS[world.missionIndex] : null;
  ctx.fillText(mission ? 'MISSION ' + (world.missionIndex + 1) + ' — ' + mission.name : 'FREE ROAM', 24, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  const stepText = mission ? mission.steps[Math.min(world.missionStep, mission.steps.length - 1)] : 'The debt is paid. Enjoy Solmar.';
  ctx.fillText(stepText, 24, 58);
  ctx.fillStyle = '#9fd0ff';
  ctx.font = '13px sans-serif';
  const target = world.missionTarget();
  const d = Math.round(dist(p.x, p.y, target.x, target.y));
  ctx.fillText('Target: ' + target.label + ' — ' + d + 'm', 24, 80);
  // Message banner, below the mission panel, never overlapping it.
  if (world.messageTimer > 0 && world.message) {
    ctx.fillStyle = 'rgba(10,14,20,0.7)';
    const w = ctx.measureText(world.message).width + 28;
    roundRect(ctx, 12, 112, Math.min(w, vw - 24), 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '14px sans-serif';
    ctx.fillText(world.message, 26, 132);
  }
  // Health bar and money, top right.
  ctx.fillStyle = 'rgba(10,14,20,0.78)';
  roundRect(ctx, vw - 252, 12, 240, 66, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('$' + p.money.toLocaleString('en-US'), vw - 24, 38);
  ctx.fillStyle = '#333';
  ctx.fillRect(vw - 228, 50, 192, 12);
  ctx.fillStyle = p.hp > 40 ? '#4fae5f' : '#d94f3d';
  ctx.fillRect(vw - 228, 50, 192 * (p.hp / PLAYER_MAX_HP), 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px sans-serif';
  ctx.fillText('HP ' + Math.ceil(p.hp), vw - 24, 60);
  // Wanted stars under the money box.
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < world.wanted ? '#ffd750' : 'rgba(255,255,255,0.25)';
    ctx.font = '26px sans-serif';
    ctx.fillText('★', vw - 228 + i * 30, 108);
  }
  // Car name when driving.
  if (p.inCar && p.car) {
    ctx.fillStyle = 'rgba(10,14,20,0.7)';
    roundRect(ctx, 12, vh - 96, 250, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Driving: ' + p.car.name, 24, vh - 74);
  }
  // Controls hint, bottom left.
  ctx.fillStyle = 'rgba(10,14,20,0.6)';
  roundRect(ctx, 12, vh - 44, 560, 32, 8);
  ctx.fill();
  ctx.fillStyle = '#d8e2ee';
  ctx.font = '12px sans-serif';
  ctx.fillText('WASD move / drive   Shift run   E steal car   Click shoot   F punch   P pause   M mute', 24, vh - 24);
  // Minimap, bottom right.
  drawMinimap(ctx, world, vw - 218, vh - 218);
  // Edge arrow to the mission target.
  if (mission && !world.storyComplete) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dd = Math.hypot(dx, dy);
    if (dd > 320) {
      const a = Math.atan2(dy, dx);
      const cx = vw / 2 + Math.cos(a) * 150;
      const cy = vh / 2 + Math.sin(a) * 150;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd750';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd750';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(dd) + 'm', cx, cy + 28);
    }
  }
  // Crosshair at the mouse.
  if (aim) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(aim.x - 14, aim.y);
    ctx.lineTo(aim.x - 5, aim.y);
    ctx.moveTo(aim.x + 5, aim.y);
    ctx.lineTo(aim.x + 14, aim.y);
    ctx.moveTo(aim.x, aim.y - 14);
    ctx.lineTo(aim.x, aim.y - 5);
    ctx.moveTo(aim.x, aim.y + 5);
    ctx.lineTo(aim.x, aim.y + 14);
    ctx.stroke();
  }
}

function overlay(ctx, vw, vh, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,16,0.62)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, vw / 2, vh / 2 - 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = '19px sans-serif';
  let y = vh / 2 - 8;
  for (const line of lines) {
    ctx.fillText(line, vw / 2, y);
    y += 30;
  }
}

export function drawTitle(ctx, world, vw, vh) {
  overlay(ctx, vw, vh, 'SOLMAR CITY', [
    'Leo Marín owes The Broker $40,000. Take the city back, job by job.',
    'WASD move and drive — E steal a car — Click to shoot — F to punch',
    'Press ENTER to start.  Press C to continue a saved game.',
  ], '#ffd750');
  ctx.fillStyle = '#ffd750';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('An original open-world crime game. No Rockstar content.', vw / 2, vh - 28);
}

export function drawPause(ctx, vw, vh) {
  overlay(ctx, vw, vh, 'PAUSED', [
    'Progress saved.',
    'Press P or ESC to keep playing.',
  ], '#9fd0ff');
}

export function drawBusted(ctx, vw, vh) {
  overlay(ctx, vw, vh, 'BUSTED', [
    'The police caught Leo. Fine: $200.',
    'You wake up at Solmar General Hospital.',
  ], '#ff5a4a');
}

export function drawComplete(ctx, world, vw, vh) {
  overlay(ctx, vw, vh, 'STORY COMPLETE', [
    'The $40,000 debt is paid. Solmar City is yours, Leo.',
    'Free roam continues — press ENTER to keep playing.',
  ], '#7be495');
}
