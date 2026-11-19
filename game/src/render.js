// Canvas rendering for Solmar City: the city, cars, people, HUD, minimap
// and screens. All art is procedural shapes — no images, no external assets.
import { WORLD, ROADS, ROAD_HALF, BEACH_X, WATER_X, PARK, landmark } from './config.js';
import { missionTarget, missionText, currentMission } from './world.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawWorld(ctx, w, view) {
  const { camX, camY, vw, vh } = view;
  const sx = (x) => x - camX, sy = (y) => y - camY;
  // Ground.
  ctx.fillStyle = '#79a05a';
  ctx.fillRect(0, 0, vw, vh);
  // Beach + water (east edge).
  ctx.fillStyle = '#d9c48a';
  ctx.fillRect(sx(BEACH_X), 0, WATER_X - BEACH_X, vh);
  ctx.fillStyle = '#3f8fbf';
  ctx.fillRect(sx(WATER_X), 0, vw - sx(WATER_X), vh);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const wy = ((w.time * 22 + i * 170) % 900) - 100;
    ctx.beginPath();
    ctx.moveTo(sx(WATER_X) + 6, wy);
    ctx.quadraticCurveTo(sx(WATER_X) + 26, wy + 12, sx(WATER_X) + 6, wy + 24);
    ctx.stroke();
  }
  // Park.
  ctx.fillStyle = '#5d8f4a';
  ctx.fillRect(sx(PARK.x), sy(PARK.y), PARK.w, PARK.h);
  ctx.fillStyle = '#4f9ec9';
  ctx.beginPath();
  ctx.ellipse(sx(PARK.x + 180), sy(PARK.y + 190), 62, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const t of w.parkTrees) {
    ctx.fillStyle = '#3d6e2f';
    ctx.beginPath(); ctx.arc(sx(t.x), sy(t.y), t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4f8f3d';
    ctx.beginPath(); ctx.arc(sx(t.x) - 3, sy(t.y) - 3, t.r * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  // Roads.
  ctx.fillStyle = '#3c3f45';
  for (const r of ROADS) {
    ctx.fillRect(sx(r - ROAD_HALF), sy(-40), ROAD_HALF * 2, vh + 80);
    ctx.fillRect(sx(-40), sy(r - ROAD_HALF), vw + 80, ROAD_HALF * 2);
  }
  // Centre dashes.
  ctx.strokeStyle = '#d8c25a';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (const r of ROADS) {
    ctx.beginPath(); ctx.moveTo(sx(r), sy(-40)); ctx.lineTo(sx(r), vh + 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(-40), sy(r)); ctx.lineTo(vw + 40, sy(r)); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Buildings.
  for (const b of w.buildings) {
    ctx.fillStyle = b.color;
    ctx.fillRect(sx(b.x), sy(b.y), b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx(b.x), sy(b.y), b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(sx(b.x) + 8, sy(b.y) + 8, b.w - 16, 10);
    if (b.landmark) {
      const cx = sx(b.x + b.w / 2), cy = sy(b.y + b.h / 2);
      if (cy > 118) { // keep name plates out from under the top HUD band
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const tw = ctx.measureText(b.name).width;
        rr(ctx, cx - tw / 2 - 6, cy - 11, tw + 12, 20, 5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(b.name, cx, cy + 3);
      }
    }
  }
  // Pickups.
  for (const pk of w.pickups) {
    const pulse = 1 + Math.sin(w.time * 5) * 0.15;
    ctx.fillStyle = pk.kind === 'cash' ? 'rgba(80,200,90,0.35)' : pk.kind === 'briefcase' ? 'rgba(200,160,60,0.35)' : 'rgba(90,180,220,0.35)';
    ctx.beginPath(); ctx.arc(sx(pk.x), sy(pk.y), 30 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pk.kind === 'cash' ? '#3fae4e' : pk.kind === 'briefcase' ? '#a8842a' : '#3f8fbf';
    if (pk.kind === 'briefcase') ctx.fillRect(sx(pk.x) - 14, sy(pk.y) - 10, 28, 20);
    else ctx.fillRect(sx(pk.x) - 12, sy(pk.y) - 12, 24, 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'briefcase' ? '▤' : '▣', sx(pk.x), sy(pk.y) + 5);
  }
  // Mission marker: pulsing diamond + beam + ground ring.
  const target = missionTarget(w);
  if (target && !w.mission.storyComplete) {
    const pulse = 1 + Math.sin(w.time * 4) * 0.2;
    ctx.strokeStyle = 'rgba(255,210,40,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx(target.x), sy(target.y), 34 * pulse, 0, Math.PI * 2); ctx.stroke();
    const grad = ctx.createLinearGradient(sx(target.x), sy(target.y) - 130, sx(target.x), sy(target.y));
    grad.addColorStop(0, 'rgba(255,210,40,0)');
    grad.addColorStop(1, 'rgba(255,210,40,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx(target.x) - 8, sy(target.y) - 130, 16, 130);
    ctx.fillStyle = '#ffd828';
    ctx.save();
    ctx.translate(sx(target.x), sy(target.y) - 52 - Math.sin(w.time * 4) * 6);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-11, -11, 22, 22);
    ctx.restore();
  }
  // Pedestrians.
  for (const ped of w.peds) {
    if (ped.down) {
      ctx.fillStyle = ped.color;
      ctx.beginPath(); ctx.ellipse(sx(ped.x), sy(ped.y), 13, 7, ped.angle, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    ctx.fillStyle = ped.color;
    ctx.beginPath(); ctx.arc(sx(ped.x), sy(ped.y), 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath(); ctx.arc(sx(ped.x), sy(ped.y) - 3, 5, 0, Math.PI * 2); ctx.fill();
  }
  // Cars.
  for (const c of w.cars) drawCar(ctx, w, c, sx, sy);
  // Player on foot.
  const p = w.player;
  if (p.onFoot && !p.busted) {
    ctx.save();
    ctx.translate(sx(p.x), sy(p.y));
    ctx.rotate(p.angle);
    ctx.fillStyle = '#e86a1d';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(6, -3, 12, 6); // facing tick
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Aim line.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx(p.x), sy(p.y));
    ctx.lineTo(sx(p.x) + Math.cos(p.aimAngle) * 46, sy(p.y) + Math.sin(p.aimAngle) * 46);
    ctx.stroke();
  }
  // Bullets.
  ctx.fillStyle = '#ffe14d';
  for (const b of w.bullets) {
    ctx.beginPath(); ctx.arc(sx(b.x), sy(b.y), 4, 0, Math.PI * 2); ctx.fill();
  }
  // Off-screen mission arrow.
  if (target && !w.mission.storyComplete) {
    const tx = sx(target.x), ty = sy(target.y);
    if (tx < 0 || tx > vw || ty < 0 || ty > vh) {
      const cx = vw / 2, cy = vh / 2;
      const a = Math.atan2(ty - cy, tx - cx);
      const ex = cx + Math.cos(a) * (Math.min(vw, vh) / 2 - 70);
      const ey = cy + Math.sin(a) * (Math.min(vw, vh) / 2 - 70);
      const dist = Math.round(Math.hypot(target.x - p.x, target.y - p.y) / 10);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd828';
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd828';
      ctx.fillText(`${dist} m`, ex, ey + 30);
    }
  }
}

function drawCar(ctx, w, c, sx, sy) {
  ctx.save();
  ctx.translate(sx(c.x), sy(c.y));
  ctx.rotate(c.angle);
  if (c.kind === 'player') {
    ctx.strokeStyle = '#ffd828';
    ctx.lineWidth = 3;
    rr(ctx, -26, -14, 52, 28, 7);
    ctx.stroke();
  }
  ctx.fillStyle = c.stalled ? '#555' : c.color;
  rr(ctx, -24, -12, 48, 24, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,40,0.75)';
  ctx.fillRect(-6, -10, 14, 20); // cabin
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(22, -9, 3, 6);
  ctx.fillRect(22, 3, 3, 6); // headlights
  if (c.kind === 'police') {
    const flash = Math.floor(w.time * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2f6bff';
    ctx.fillRect(-4, -12, 10, 5);
    ctx.fillStyle = flash ? '#2f6bff' : '#ff3b30';
    ctx.fillRect(-4, 7, 10, 5);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
  }
  if (c.kind === 'courier') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COURIER', 0, 3);
  }
  ctx.restore();
  if (c.stalled) {
    ctx.fillStyle = 'rgba(120,120,120,0.55)';
    const puff = (w.time * 0.7 + c.id) % 1;
    ctx.beginPath();
    ctx.arc(sx(c.x) - 10, sy(c.y) - 14 - puff * 22, 6 + puff * 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMinimap(ctx, w, vw, vh) {
  const S = 200, scale = S / WORLD;
  const x0 = vw - S - 16, y0 = vh - S - 16;
  ctx.fillStyle = 'rgba(10,14,20,0.82)';
  rr(ctx, x0 - 4, y0 - 4, S + 8, S + 8, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, S, S);
  ctx.clip();
  ctx.fillStyle = '#4a7a3a';
  ctx.fillRect(x0, y0, S, S);
  ctx.fillStyle = '#d9c48a';
  ctx.fillRect(x0 + BEACH_X * scale, y0, (WATER_X - BEACH_X) * scale, S);
  ctx.fillStyle = '#3f8fbf';
  ctx.fillRect(x0 + WATER_X * scale, y0, S - WATER_X * scale, S);
  ctx.fillStyle = '#3d6e2f';
  ctx.fillRect(x0 + PARK.x * scale, y0 + PARK.y * scale, PARK.w * scale, PARK.h * scale);
  ctx.strokeStyle = '#9a9a9a';
  ctx.lineWidth = 1.5;
  for (const r of ROADS) {
    ctx.beginPath(); ctx.moveTo(x0 + r * scale, y0); ctx.lineTo(x0 + r * scale, y0 + S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0 + r * scale); ctx.lineTo(x0 + S, y0 + r * scale); ctx.stroke();
  }
  ctx.fillStyle = '#c9c9c9';
  for (const b of w.buildings) ctx.fillRect(x0 + b.x * scale, y0 + b.y * scale, Math.max(1.5, b.w * scale), Math.max(1.5, b.h * scale));
  const target = missionTarget(w);
  if (target && !w.mission.storyComplete) {
    ctx.fillStyle = '#ffd828';
    ctx.save();
    ctx.translate(x0 + target.x * scale, y0 + target.y * scale);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
  if (w.courier && !w.courier.stalled) {
    ctx.fillStyle = '#c96ad9';
    ctx.beginPath(); ctx.arc(x0 + w.courier.x * scale, y0 + w.courier.y * scale, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ff3b30';
  for (const c of w.police) {
    ctx.beginPath(); ctx.arc(x0 + c.x * scale, y0 + c.y * scale, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  const p = w.player;
  ctx.save();
  ctx.translate(x0 + p.x * scale, y0 + p.y * scale);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  rr(ctx, x0 - 4, y0 - 4, S + 8, S + 8, 8);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N ↑', x0 + 2, y0 - 8);
}

export function drawHUD(ctx, w, vw, vh) {
  const p = w.player;
  // Top bar.
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.fillRect(0, 0, vw, 46);
  ctx.fillStyle = '#ff4d4d';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('♥', 14, 30);
  ctx.fillStyle = '#222';
  rr(ctx, 36, 18, 170, 14, 7); ctx.fill();
  ctx.fillStyle = p.hp > 30 ? '#4fd964' : '#ff3b30';
  rr(ctx, 36, 18, 170 * Math.max(0, p.hp / 100), 14, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`$${p.money.toLocaleString('en-US')}`, 224, 30);
  ctx.fillText(p.onFoot ? 'ON FOOT' : `DRIVING — ${p.car ? p.car.type.name : 'car'}`, 330, 30);
  // Wanted stars, top right.
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px system-ui, sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < p.wanted ? '#ffd828' : 'rgba(255,255,255,0.28)';
    ctx.fillText('★', vw - 18 - i * 28, 31);
  }
  if (p.wanted > 0) {
    ctx.fillStyle = '#ff6b5e';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('POLICE ALERTED', vw - 18, 44);
  }
  // Mission panel.
  ctx.textAlign = 'left';
  ctx.font = '15px system-ui, sans-serif';
  const lines = wrapText(ctx, missionText(w), 400);
  const ph = 34 + lines.length * 19;
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  rr(ctx, 12, 56, 440, ph, 8); ctx.fill();
  ctx.fillStyle = '#ffd828';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(w.mission.storyComplete ? 'STORY COMPLETE' : `MISSION ${w.mission.index + 1}/5 — ${currentMission(w).name}  ·  $${currentMission(w).reward}`, 24, 78);
  ctx.fillStyle = '#fff';
  ctx.font = '15px system-ui, sans-serif';
  lines.forEach((ln, i) => ctx.fillText(ln, 24, 100 + i * 19));
  // Banner — below the mission panel so the two never overlap.
  if (w.banner) {
    ctx.font = 'bold 17px system-ui, sans-serif';
    const blines = wrapText(ctx, w.banner, 860);
    const bw = Math.max(...blines.map((ln) => ctx.measureText(ln).width));
    const bh = 24 + blines.length * 22;
    const by = 158;
    ctx.fillStyle = 'rgba(10,14,20,0.8)';
    rr(ctx, vw / 2 - bw / 2 - 16, by, bw + 32, bh, 8); ctx.fill();
    ctx.fillStyle = '#ffd828';
    ctx.textAlign = 'center';
    blines.forEach((ln, i) => ctx.fillText(ln, vw / 2, by + 24 + i * 22));
    ctx.textAlign = 'left';
  }
  // Controls hint.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD move/drive · E steal/exit car · Click shoot · F punch · Shift run · P pause · M mute', 14, vh - 14);
  drawMinimap(ctx, w, vw, vh);
}

export function drawTitle(ctx, w, vw, vh, saveInfo) {
  ctx.fillStyle = 'rgba(8,10,16,0.62)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd828';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('SOLMAR CITY', vw / 2, vh / 2 - 96);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('An open-world crime game in the spirit of GTA 6', vw / 2, vh / 2 - 58);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const story = 'Leo Marín owes The Broker $40,000. Five missions. One city. No way out but through.';
  wrapText(ctx, story, 640).forEach((ln, i) => ctx.fillText(ln, vw / 2, vh / 2 - 18 + i * 22));
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillStyle = '#ffd828';
  ctx.fillText(saveInfo ? 'ENTER — New game      C — Continue' : 'Press ENTER to play', vw / 2, vh / 2 + 52);
  if (saveInfo) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`Save: $${saveInfo.money} · Mission ${saveInfo.missionIndex + 1}/5`, vw / 2, vh / 2 + 80);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('WASD move / drive · E steal a car · Mouse aim + click to shoot · F punch · P pause', vw / 2, vh / 2 + 118);
  ctx.fillText('An original game. Not affiliated with Rockstar Games.', vw / 2, vh - 24);
  ctx.textAlign = 'left';
}

export function drawOverlay(ctx, vw, vh, title, lines, accent = '#ffd828') {
  ctx.fillStyle = 'rgba(8,10,16,0.66)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText(title, vw / 2, vh / 2 - 30);
  ctx.fillStyle = '#fff';
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((ln, i) => ctx.fillText(ln, vw / 2, vh / 2 + 12 + i * 26));
  ctx.textAlign = 'left';
}
