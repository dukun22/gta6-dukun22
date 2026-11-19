// Drawing only for Kota Senja: the sunset city, cars, people, police,
// HUD with wanted stars, cash, health and a live minimap, plus title,
// pause, mission-complete and game-over panels. Camera follows the player.
import { WORLD_W, WORLD_H, ROAD, PALETTE, FONT } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const ROAD_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
const ROAD_Y = [200, 600, 1000, 1400, 1800, 2200];

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewW = 1280, viewH = 800;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    viewW = canvas.width / ratio; viewH = canvas.height / ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function text(value, x, y, size, colour, align, bold) {
    ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
    ctx.fillStyle = colour; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawCarShape(x, y, angle, colour, isPolice) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-34, -16, 66, 34);
    ctx.fillStyle = colour; ctx.beginPath(); ctx.roundRect(-31, -15, 62, 30, 8); ctx.fill();
    ctx.fillStyle = '#20242e'; ctx.beginPath(); ctx.roundRect(-8, -12, 18, 24, 4); ctx.fill();
    ctx.fillStyle = isPolice ? '#f2f2f2' : '#e8d27a'; ctx.fillRect(28, -11, 4, 8); ctx.fillRect(28, 3, 4, 8);
    if (isPolice) { ctx.fillStyle = '#e84a4a'; ctx.fillRect(-2, -15, 6, 5); ctx.fillStyle = '#4a8ae8'; ctx.fillRect(4, -15, 6, 5); }
    ctx.restore();
  }

  function drawWorld(state, cam) {
    // Grass, beach and sea.
    ctx.fillStyle = PALETTE.grass; ctx.fillRect(cam.x, cam.y, viewW, viewH);
    ctx.fillStyle = PALETTE.sand; ctx.fillRect(0 - cam.x, 2050 - cam.y, WORLD_W, 190);
    ctx.fillStyle = PALETTE.water; ctx.fillRect(0 - cam.x, 2240 - cam.y, WORLD_W, 160);
    ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0 - cam.x, 2232 - cam.y, WORLD_W, 8);
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const x of ROAD_X) ctx.fillRect(x - ROAD / 2 - cam.x, -cam.y, ROAD, WORLD_H);
    for (const y of ROAD_Y) ctx.fillRect(-cam.x, y - ROAD / 2 - cam.y, WORLD_W, ROAD);
    ctx.strokeStyle = PALETTE.roadLine; ctx.setLineDash([22, 26]); ctx.lineWidth = 3;
    for (const x of ROAD_X) { ctx.beginPath(); ctx.moveTo(x - cam.x, -cam.y); ctx.lineTo(x - cam.x, WORLD_H - cam.y); ctx.stroke(); }
    for (const y of ROAD_Y) { ctx.beginPath(); ctx.moveTo(-cam.x, y - cam.y); ctx.lineTo(WORLD_W - cam.x, y - cam.y); ctx.stroke(); }
    ctx.setLineDash([]);
    // Parks with trees.
    for (const park of state.parks) {
      ctx.fillStyle = '#2d5a2d'; ctx.fillRect(park.x - cam.x, park.y - cam.y, park.w, park.h);
      ctx.fillStyle = '#4a8a3a';
      for (let i = 0; i < 6; i += 1) {
        const tx = park.x + 30 + ((i * 53) % Math.max(40, park.w - 60));
        const ty = park.y + 30 + ((i * 37) % Math.max(40, park.h - 60));
        ctx.beginPath(); ctx.arc(tx - cam.x, ty - cam.y, 14, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Buildings.
    for (const b of state.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(b.x + 6 - cam.x, b.y + 8 - cam.y, b.w, b.h);
      ctx.fillStyle = b.colour; ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
      ctx.fillStyle = b.roof; ctx.fillRect(b.x + 8 - cam.x, b.y + 8 - cam.y, b.w - 16, b.h - 16);
      ctx.fillStyle = '#f2e8a0';
      for (let wx = b.x + 18; wx < b.x + b.w - 14; wx += 26) for (let wy = b.y + 18; wy < b.y + b.h - 14; wy += 26) ctx.fillRect(wx - cam.x, wy - cam.y, 10, 8);
    }
    // Landmark labels.
    text('BENGKEL SENJA', state.landmarks.garage.x - cam.x, state.landmarks.garage.y - cam.y - 20, 13, '#fff', 'center', true);
    text('TOKO MIRA', state.landmarks.shop.x - cam.x, state.landmarks.shop.y - cam.y - 20, 13, '#fff', 'center', true);
    text('PELABUHAN', state.landmarks.port.x - cam.x, state.landmarks.port.y - cam.y - 20, 13, '#fff', 'center', true);
    // Pickups.
    for (const pk of state.pickups) {
      if (pk.taken > 0) continue;
      ctx.fillStyle = pk.kind === 'cash' ? '#f2c94c' : pk.kind === 'health' ? '#e84a6a' : '#4fc3f7';
      ctx.beginPath(); ctx.arc(pk.x - cam.x, pk.y - cam.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; text(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', pk.x - cam.x, pk.y - cam.y + 5, 13, '#1a1a1a', 'center', true);
    }
    // Pedestrians.
    for (const ped of state.peds) {
      ctx.fillStyle = ped.colour; ctx.beginPath(); ctx.arc(ped.x - cam.x, ped.y - cam.y, 8, 0, Math.PI * 2); ctx.fill();
    }
    // Cars, police and bullets.
    for (const car of state.cars) drawCarShape(car.x - cam.x, car.y - cam.y, car.angle, car.colour, false);
    for (const cop of state.police) drawCarShape(cop.x - cam.x, cop.y - cam.y, cop.angle, '#2a4a8a', true);
    ctx.fillStyle = '#ffe94a';
    for (const b of state.bullets) { ctx.beginPath(); ctx.arc(b.x - cam.x, b.y - cam.y, 4, 0, Math.PI * 2); ctx.fill(); }
    // Player on foot (a sunset-orange figure with a direction tick).
    const p = state.player;
    if (!p.inCar) {
      ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x - cam.x, p.y - cam.y); ctx.lineTo(p.x - cam.x + Math.cos(p.angle) * 20, p.y - cam.y + Math.sin(p.angle) * 20); ctx.stroke();
    }
    // Mission target marker: a pulsing yellow ring.
    if (state.missionTarget) {
      const t = state.missionTarget;
      const r = 26 + Math.sin(state.elapsed * 4) * 6;
      ctx.strokeStyle = '#ffe94a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(t.x - cam.x, t.y - cam.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(t.x - cam.x, t.y - cam.y - r - 14); ctx.lineTo(t.x - cam.x - 8, t.y - cam.y - r - 30); ctx.lineTo(t.x - cam.x + 8, t.y - cam.y - r - 30); ctx.closePath(); ctx.fillStyle = '#ffe94a'; ctx.fill();
    }
  }

  function drawMinimap(state) {
    const mw = 190, mh = 142, mx = viewW - mw - 16, my = 16;
    ctx.fillStyle = 'rgba(10,10,20,0.75)'; ctx.fillRect(mx - 6, my - 6, mw + 12, mh + 12);
    ctx.fillStyle = '#3d6b3a'; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#2e2a33';
    for (const x of ROAD_X) ctx.fillRect(mx + (x / WORLD_W) * mw - 2, my, 4, mh);
    for (const y of ROAD_Y) ctx.fillRect(mx, my + (y / WORLD_H) * mh, mw, 4);
    ctx.fillStyle = '#2a6a9a'; ctx.fillRect(mx, my + (2240 / WORLD_H) * mh, mw, mh - (2240 / WORLD_H) * mh);
    if (state.missionTarget) {
      ctx.fillStyle = '#ffe94a'; ctx.beginPath();
      ctx.arc(mx + (state.missionTarget.x / WORLD_W) * mw, my + (state.missionTarget.y / WORLD_H) * mh, 6, 0, Math.PI * 2); ctx.fill();
    }
    for (const cop of state.police) { ctx.fillStyle = '#4a8ae8'; ctx.fillRect(mx + (cop.x / WORLD_W) * mw - 3, my + (cop.y / WORLD_H) * mh - 3, 6, 6); }
    const p = state.player;
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(mx + (p.x / WORLD_W) * mw, my + (p.y / WORLD_H) * mh, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(mx - 6, my - 6, mw + 12, mh + 12);
    text('KOTA SENJA', mx + mw / 2, my + mh + 22, 11, '#fff', 'center', true);
  }

  function drawHud(state, missions) {
    ctx.fillStyle = 'rgba(10,10,20,0.72)'; ctx.fillRect(12, 12, 250, 92);
    text(`$${state.cash}`, 24, 42, 26, '#f2c94c', 'left', true);
    text(`Nyawa ${Math.ceil(state.player.health)}  •  Peluru ${state.player.ammo}`, 24, 68, 15, '#fff', 'left');
    text(state.player.inCar ? 'Di mobil — E keluar' : 'Jalan kaki — E naik mobil', 24, 90, 13, '#c8c8d8', 'left');
    // Wanted stars, top centre.
    const stars = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    text(stars, viewW / 2, 44, 30, state.wanted > 0 ? '#ff5a4a' : '#8a8a9a', 'center', true);
    if (state.wanted > 0) text('POLISI MENGEJAR', viewW / 2, 68, 13, '#ff8a7a', 'center', true);
    // Mission objective, bottom centre.
    const m = missions.current();
    if (m && !missions.done) {
      const step = missions.stepDef();
      ctx.fillStyle = 'rgba(10,10,20,0.72)'; ctx.fillRect(viewW / 2 - 260, viewH - 76, 520, 60);
      text(`Misi ${missions.index + 1}/${missions.total}: ${m.name}`, viewW / 2, viewH - 52, 16, '#ffe94a', 'center', true);
      text(step ? step.text : '', viewW / 2, viewH - 30, 14, '#fff', 'center');
      if (missions.timer > 0) text(`${Math.ceil(missions.timer)} detik`, viewW / 2 + 236, viewH - 30, 14, '#ff8a7a', 'right', true);
    }
    if (state.messageTimer > 0 && state.message) {
      text(state.message, viewW / 2, 100, 18, '#ffe94a', 'center', true);
    }
    text('WASD jalan / nyetir • E mobil • F pukul • Klik tembak • Shift lari • P jeda • M suara', 16, viewH - 14, 12, '#d8d8e8', 'left');
    drawMinimap(state);
  }

  function drawPanel(title, lines, prompt) {
    ctx.fillStyle = 'rgba(10,8,24,0.72)'; ctx.fillRect(0, 0, viewW, viewH);
    const w = 640, h = 150 + lines.length * 30;
    const x = (viewW - w) / 2, y = (viewH - h) / 2;
    ctx.fillStyle = '#241a3a'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#e88a2a'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
    text(title, viewW / 2, y + 64, 42, '#ff9a3a', 'center', true);
    lines.forEach((line, i) => text(line, viewW / 2, y + 108 + i * 30, 18, '#fff', 'center'));
    text(prompt, viewW / 2, y + h - 26, 17, '#ffe94a', 'center', true);
  }

  function draw(state, screen, missions, best) {
    resize();
    const p = state.player;
    const cam = {
      x: Math.max(0, Math.min(WORLD_W - viewW, p.x - viewW / 2)),
      y: Math.max(0, Math.min(WORLD_H - viewH, p.y - viewH / 2)),
    };
    ctx.fillStyle = '#1a0f2e'; ctx.fillRect(0, 0, viewW, viewH);
    drawWorld(state, cam);
    if (screen === SCREEN_TITLE) {
      drawPanel('KOTA SENJA', [
        'Kota fiksi di tepi laut, saat matahari terbenam.',
        'Raka pulang kampung — dan kota ini butuh sopir yang berani.',
        '5 misi cerita • lalu lintas • polisi • mobil untuk dicuri',
        best ? `Tabungan terbaik: $${best}` : 'Belum ada tabungan.',
      ], 'Tekan Spasi / klik untuk main  •  Lanjutkan bila ada save');
      return;
    }
    drawHud(state, missions);
    if (screen === SCREEN_PAUSED) drawPanel('Jeda', ['Permainan berhenti. Progress tersimpan.', ''], 'Tekan P untuk lanjut');
    else if (screen === SCREEN_OVER) drawPanel('Raka Tertangkap', [`Uang: $${state.cash}`, 'Polisi akhirnya menangkapmu.'], 'Tekan Spasi untuk coba lagi');
    else if (screen === SCREEN_WIN) drawPanel('Kota Senja Milikmu!', [`Semua 5 misi selesai. Uang: $${state.cash}`, 'Raka kini legenda jalanan Pantai Senja.'], 'Tekan Spasi untuk main bebas');
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
