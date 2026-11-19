// Kota Senja story missions. Raka, a driver back in his home city, takes jobs
// from Mira, a shopkeeper who knows everyone in town. Five missions, then free roam.
// Each mission is a small state machine: text, target point, timer, and reward.
import { MISSION_REWARDS } from './config.js';

export const MISSIONS = [
  {
    name: 'Paket Pertama', giver: 'Mira',
    brief: 'Ambil paket di Bengkel Senja, antar ke Toko Mira sebelum waktu habis.',
    steps: [
      { text: 'Ambil paket di Bengkel Senja', target: 'garage', radius: 70, timer: 0 },
      { text: 'Antar paket ke Toko Mira (90 detik)', target: 'shop', radius: 70, timer: 90 },
    ],
  },
  {
    name: 'Taksi Liar', giver: 'Mira',
    brief: 'Naik mobil apa saja, jemput penumpang di Hotel Pelangi, antar ke Pantai Senja.',
    steps: [
      { text: 'Jemput penumpang di Hotel Pelangi', target: 'hotel', radius: 70, timer: 0 },
      { text: 'Antar penumpang ke Pantai Senja', target: 'beach', radius: 80, timer: 100 },
    ],
  },
  {
    name: 'Mobil Pesanan', giver: 'Doni',
    brief: 'Curi mobil oranye di Pelabuhan, bawa ke Bengkel Senja. Polisi akan mengejar.',
    steps: [
      { text: 'Curi mobil oranye di Pelabuhan', target: 'port', radius: 90, timer: 0, needCar: true },
      { text: 'Bawa mobil itu ke Bengkel Senja', target: 'garage', radius: 80, timer: 120, needCar: true },
    ],
  },
  {
    name: 'Kabur dari Razia', giver: 'Mira',
    brief: 'Razia di seluruh kota. Bertahan 60 detik, lalu sembunyi di Rumah Raka.',
    steps: [
      { text: 'Bertahan dari kejaran polisi (60 detik)', target: null, radius: 0, timer: 60, survive: true },
      { text: 'Sembunyi di Rumah Raka', target: 'hideout', radius: 80, timer: 0 },
    ],
  },
  {
    name: 'Balapan Senja', giver: 'Rival: Bara',
    brief: 'Balapan keliling kota: lewati 4 titik, kalahkan Bara, sampai di Pantai Senja.',
    steps: [
      { text: 'Titik 1: Kota Lama', target: 'garage', radius: 70, timer: 0 },
      { text: 'Titik 2: Pusat Kota', target: 'shop', radius: 70, timer: 0 },
      { text: 'Titik 3: Pelabuhan', target: 'port', radius: 70, timer: 0 },
      { text: 'Finish: Pantai Senja', target: 'beach', radius: 90, timer: 150 },
    ],
  },
];

export function createMissions() {
  let index = 0, stepIndex = 0, timer = 0, done = false, failed = false;
  let message = '';

  function current() { return MISSIONS[index] || null; }
  function stepDef() { const m = current(); return m ? m.steps[stepIndex] : null; }

  function startStep(world) {
    const s = stepDef();
    if (!s) return;
    timer = s.timer || 0;
    if (s.survive) world.raiseWanted(3, 'Razia! Polisi mengejar Raka!');
    message = s.text;
  }

  function start() { index = 0; stepIndex = 0; done = false; failed = false; }

  // Returns 'complete' | 'failed' | 'step' | null. `pos` is the player position.
  function update(dt, world, pos) {
    if (done || failed) return null;
    const m = current(); if (!m) { done = true; return 'complete'; }
    const s = stepDef(); if (!s) {
      index += 1; stepIndex = 0;
      if (index >= MISSIONS.length) { done = true; return 'complete'; }
      startStep(world); return 'step';
    }
    if (s.timer > 0) {
      timer -= dt;
      if (timer <= 0 && !s.survive) { failed = true; return 'failed'; }
      if (s.survive && timer <= 0) { stepIndex += 1; startStep(world); return 'step'; }
    }
    if (s.target) {
      const t = world.landmarks[s.target];
      if (t && Math.hypot(pos.x - t.x, pos.y - t.y) < s.radius) {
        if (s.needCar && !world.state.player.inCar) return null;
        stepIndex += 1;
        if (stepIndex >= m.steps.length) {
          const reward = MISSION_REWARDS[index] || 100;
          world.state.cash += reward;
          index += 1; stepIndex = 0;
          if (index >= MISSIONS.length) { done = true; return 'complete'; }
          startStep(world);
          return 'complete';
        }
        startStep(world); return 'step';
      }
    }
    return null;
  }

  return {
    start, update, current, stepDef,
    get index() { return index; },
    get done() { return done; },
    get failed() { return failed; },
    get timer() { return timer; },
    get message() { return message; },
    set message(v) { message = v; },
    get total() { return MISSIONS.length; },
  };
}
