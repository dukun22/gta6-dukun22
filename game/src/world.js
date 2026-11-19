// Kota Senja world: a 3200x2400 sunset city on a road grid, with traffic,
// pedestrians, police, pickups and combat. No drawing here — render.js draws it.
// Player drives and walks; cars are stolen with E, punched with F, shot with mouse.
import { WORLD_W, WORLD_H, ROAD, BLOCK, PLAYER, CAR, WANTED_MAX, WANTED_DECAY_SECONDS } from './config.js';
import { pick, range } from './random.js';

export const EVENT_CASH = 1;
export const EVENT_HURT = 2;
export const EVENT_DEAD = 4;
export const EVENT_WANTED = 8;

const ROAD_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
const ROAD_Y = [200, 600, 1000, 1400, 1800, 2200];
const CAR_COLOURS = ['#e84a4a', '#4a8ae8', '#e8c94a', '#8ae84a', '#e84a9a', '#f2f2f2', '#333a4a', '#e88a2a'];
const PED_COLOURS = ['#f2c94c', '#4fc3f7', '#e87a4a', '#9a6ae8', '#6ae87a', '#e84a7a'];

function rectsOverlap(ax, ay, ar, b) {
  return ax + ar > b.x && ax - ar < b.x + b.w && ay + ar > b.y && ay - ar < b.y + b.h;
}

export function createWorld(random) {
  // Buildings fill the blocks between roads; the south strip is beach and sea.
  const buildings = [];
  const parks = [];
  for (let gx = 0; gx < ROAD_X.length - 1; gx += 1) {
    for (let gy = 0; gy < ROAD_Y.length - 1; gy += 1) {
      const x0 = ROAD_X[gx] + ROAD / 2 + 16, y0 = ROAD_Y[gy] + ROAD / 2 + 16;
      const x1 = ROAD_X[gx + 1] - ROAD / 2 - 16, y1 = ROAD_Y[gy + 1] - ROAD / 2 - 16;
      if (y0 > 1950) continue;
      if (random() < 0.18) { parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }); continue; }
      const n = 1 + Math.floor(random() * 2);
      for (let i = 0; i < n; i += 1) {
        const w = range(random, 90, 170), h = range(random, 80, 150);
        buildings.push({
          x: x0 + random() * Math.max(1, (x1 - x0) - w), y: y0 + random() * Math.max(1, (y1 - y0) - h),
          w, h, colour: pick(random, ['#b06a5a', '#7a5a8a', '#5a7a6a', '#a08a4a', '#6a6a8a', '#8a4a5a']),
          roof: pick(random, ['#5a3a3a', '#3a4a5a', '#4a5a3a']),
        });
      }
    }
  }
  // Landmarks the missions use, all original names.
  const landmarks = {
    garage: { x: 600, y: 1400, name: 'Bengkel Senja' },
    shop: { x: 1400, y: 600, name: 'Toko Mira' },
    hotel: { x: 1800, y: 1000, name: 'Hotel Pelangi' },
    port: { x: 2600, y: 200, name: 'Pelabuhan' },
    hideout: { x: 200, y: 1800, name: 'Rumah Raka' },
    beach: { x: 1600, y: 2200, name: 'Pantai Senja' },
  };

  const state = {
    player: { x: 600, y: 1700, angle: -Math.PI / 2, health: PLAYER.health, ammo: 24, inCar: null },
    cars: [], peds: [], police: [], bullets: [], pickups: [],
    cash: 50, wanted: 0, wantedTimer: 0, elapsed: 0, kills: 0, carsStolen: 0,
    buildings, parks, landmarks, message: '', messageTimer: 0,
  };

  function makeCar(x, y, angle, kind) {
    return {
      x, y, angle, speed: 0, colour: kind === 'police' ? '#2a4a8a' : pick(random, CAR_COLOURS),
      kind: kind || 'traffic', axis: Math.abs(Math.cos(angle)) > 0.5 ? 'x' : 'y',
      dir: (kind === 'police' ? 1 : (random() < 0.5 ? 1 : -1)), cruise: range(random, 90, 150),
      health: 100, passenger: false,
    };
  }

  function spawnTraffic() {
    for (let i = 0; i < 14; i += 1) {
      const vertical = random() < 0.5;
      const road = pick(random, vertical ? ROAD_X : ROAD_Y);
      const along = range(random, 150, 2250);
      const car = makeCar(vertical ? road : along, vertical ? along : road, vertical ? (Math.PI / 2) : 0, 'traffic');
      car.axis = vertical ? 'y' : 'x'; car.dir = random() < 0.5 ? 1 : -1;
      car.angle = car.axis === 'y' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
      state.cars.push(car);
    }
    // Parked cars the player can steal, including the orange target car at the port.
    // Parked cars sit ON the roads (not inside blocks) so the player can
    // steal one and drive away immediately.
    const parked = [
      { x: 600, y: 1300, colour: '#e88a2a' }, { x: 1450, y: 600, colour: '#4a8ae8' },
      { x: 2200, y: 1050, colour: '#e84a4a' }, { x: 1000, y: 1850, colour: '#8ae84a' },
      { x: 2600, y: 250, colour: '#ff7a1a', target: true },
    ];
    for (const p of parked) {
      const car = makeCar(p.x, p.y, 0, 'parked'); car.colour = p.colour; car.target = !!p.target; state.cars.push(car);
    }
  }

  function spawnPeds() {
    for (let i = 0; i < 26; i += 1) {
      state.peds.push({
        x: range(random, 120, 3080), y: range(random, 120, 1980),
        angle: random() * Math.PI * 2, speed: range(random, 35, 70),
        colour: pick(random, PED_COLOURS), flee: 0, health: 30,
      });
    }
  }

  function spawnPickups() {
    const spots = [[700, 700], [1500, 1100], [2300, 700], [1100, 1900], [2700, 1500], [400, 400], [1900, 1900], [3000, 1100]];
    for (const [x, y] of spots) state.pickups.push({ x, y, kind: pick(random, ['cash', 'cash', 'health', 'ammo']), taken: 0 });
  }

  function collide(x, y, r) {
    let nx = Math.max(r, Math.min(WORLD_W - r, x));
    let ny = Math.max(r, Math.min(WORLD_H - r, y));
    for (const b of buildings) {
      if (rectsOverlap(nx, ny, r, b)) {
        const dxl = nx + r - b.x, dxr = b.x + b.w - (nx - r);
        const dyt = ny + r - b.y, dyb = b.y + b.h - (ny - r);
        const m = Math.min(dxl, dxr, dyt, dyb);
        if (m === dxl) nx = b.x - r; else if (m === dxr) nx = b.x + b.w + r;
        else if (m === dyt) ny = b.y - r; else ny = b.y + b.h + r;
      }
    }
    return { x: nx, y: ny };
  }

  function nearestCar(x, y, maxDist) {
    let best = null, bd = maxDist;
    for (const car of state.cars) {
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bd) { bd = d; best = car; }
    }
    return best;
  }

  function raiseWanted(level, message) {
    if (level > state.wanted) {
      state.wanted = Math.min(WANTED_MAX, level);
      state.wantedTimer = 0; // a fresh crime resets the cool-down clock
      state.message = message || 'Polisi mengejarmu!'; state.messageTimer = 3;
      return EVENT_WANTED;
    }
    return 0;
  }

  function reset() {
    state.player.x = 600; state.player.y = 1700; state.player.angle = -Math.PI / 2;
    state.player.health = PLAYER.health; state.player.ammo = 24; state.player.inCar = null;
    state.cars = []; state.peds = []; state.police = []; state.bullets = []; state.pickups = [];
    state.cash = 50; state.wanted = 0; state.wantedTimer = 0; state.elapsed = 0; state.kills = 0; state.carsStolen = 0;
    spawnTraffic(); spawnPeds(); spawnPickups();
  }

  function step(dt, ctrl) {
    let events = 0;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    const p = state.player;

    // Enter / exit a car.
    if (ctrl.enter) {
      if (p.inCar) {
        const car = p.inCar; p.inCar = null;
        const pos = collide(car.x + Math.cos(car.angle + Math.PI / 2) * 45, car.y + Math.sin(car.angle + Math.PI / 2) * 45, PLAYER.radius);
        p.x = pos.x; p.y = pos.y; p.angle = car.angle;
      } else {
        const car = nearestCar(p.x, p.y, 75);
        if (car) {
          p.inCar = car; state.carsStolen += car.kind === 'traffic' ? 1 : 0;
          if (car.kind === 'traffic') events |= raiseWanted(1, 'Mobil dicuri! Polisi mengejar.');
          else if (car.target) events |= raiseWanted(2, 'Mobil pesanan dicuri! Polisi mengejar.');
          car.kind = 'player';
        }
      }
    }

    // Driving or walking.
    if (p.inCar) {
      const car = p.inCar;
      const accel = ctrl.axis.y < 0 ? CAR.accel : ctrl.axis.y > 0 ? -CAR.accel * 0.7 : 0;
      car.speed += accel * dt;
      car.speed *= Math.max(0, 1 - 1.6 * dt);
      if (ctrl.brake) car.speed *= Math.max(0, 1 - 4 * dt);
      car.speed = Math.max(-CAR.reverse, Math.min(CAR.maxSpeed, car.speed));
      const turn = ctrl.axis.x * CAR.turn * dt * Math.min(1, Math.abs(car.speed) / 120) * (car.speed < 0 ? -1 : 1);
      car.angle += turn;
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const pos = collide(nx, ny, 26);
      if (pos.x !== nx || pos.y !== ny) car.speed *= 0.4;
      car.x = pos.x; car.y = pos.y;
      p.x = car.x; p.y = car.y; p.angle = car.angle;
    } else {
      const speed = ctrl.run ? PLAYER.run : PLAYER.walk;
      const nx = p.x + ctrl.axis.x * speed * dt;
      const ny = p.y + ctrl.axis.y * speed * dt;
      const pos = collide(nx, ny, PLAYER.radius);
      p.x = pos.x; p.y = pos.y;
      if (ctrl.axis.x !== 0 || ctrl.axis.y !== 0) p.angle = Math.atan2(ctrl.axis.y, ctrl.axis.x);
    }

    // Punch: hurt the nearest ped or police car in front.
    if (ctrl.punch && !p.inCar) {
      for (const ped of state.peds) {
        if (Math.hypot(ped.x - p.x, ped.y - p.y) < 55) { ped.health -= 35; ped.flee = 3; if (ped.health <= 0) { state.cash += 10; events |= EVENT_CASH; } break; }
      }
      events |= raiseWanted(1, 'Kekerasan di jalan!');
    }

    // Shooting toward the mouse (world coordinates in ctrl.shootAngle).
    if (ctrl.shoot && p.ammo > 0 && !p.inCar) {
      p.ammo -= 1;
      state.bullets.push({ x: p.x, y: p.y, angle: ctrl.shootAngle, life: 0.7, from: 'player' });
      events |= raiseWanted(1, 'Tembakan terdengar!');
    }

    // Bullets fly and hit peds, cars and police.
    for (const b of state.bullets) {
      b.x += Math.cos(b.angle) * 720 * dt; b.y += Math.sin(b.angle) * 720 * dt; b.life -= dt;
      for (const ped of state.peds) {
        if (ped.health > 0 && Math.hypot(ped.x - b.x, ped.y - b.y) < 16) { ped.health -= 34; b.life = 0; ped.flee = 4; if (ped.health <= 0) { state.cash += 15; state.kills += 1; events |= EVENT_CASH; } }
      }
      for (const car of state.police) {
        if (Math.hypot(car.x - b.x, car.y - b.y) < 32) { car.health -= 20; b.life = 0; if (car.health <= 0) { state.cash += 40; state.kills += 1; events |= EVENT_CASH; } }
      }
    }
    state.bullets = state.bullets.filter((b) => b.life > 0);
    state.peds = state.peds.filter((ped) => ped.health > 0 || ped.flee > 0);

    // Traffic cars drive along the road grid and turn at intersections.
    for (const car of state.cars) {
      if (car.kind !== 'traffic') continue;
      car.speed = car.cruise;
      const stepLen = car.speed * dt * car.dir;
      if (car.axis === 'y') car.y += stepLen; else car.x += stepLen;
      const nearX = ROAD_X.find((r) => Math.abs(car.x - r) < 30);
      const nearY = ROAD_Y.find((r) => Math.abs(car.y - r) < 30);
      if (nearX !== undefined && nearY !== undefined && random() < 0.02) {
        if (car.axis === 'y') { car.axis = 'x'; car.dir = random() < 0.5 ? 1 : -1; car.angle = car.dir > 0 ? 0 : Math.PI; }
        else { car.axis = 'y'; car.dir = random() < 0.5 ? 1 : -1; car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      }
      if (car.x < 80) { car.x = 80; car.dir = 1; } if (car.x > WORLD_W - 80) { car.x = WORLD_W - 80; car.dir = -1; }
      if (car.y < 80) { car.y = 80; car.dir = 1; } if (car.y > 2050) { car.y = 2050; car.dir = -1; }
    }

    // Pedestrians wander the sidewalks and flee from gunfire.
    for (const ped of state.peds) {
      if (ped.flee > 0) { ped.flee -= dt; ped.x += Math.cos(ped.angle) * 150 * dt; ped.y += Math.sin(ped.angle) * 150 * dt; }
      else {
        ped.x += Math.cos(ped.angle) * ped.speed * dt; ped.y += Math.sin(ped.angle) * ped.speed * dt;
        if (random() < 0.005) ped.angle = random() * Math.PI * 2;
      }
      const pos = collide(ped.x, ped.y, 10); ped.x = pos.x; ped.y = pos.y;
    }

    // Police spawn and chase while wanted; they ram the player.
    // A lost/destroyed patrol car is not replaced instantly: a short
    // cooldown gives an escaping player a real gap to use.
    if (state.policeCooldown === undefined) state.policeCooldown = 0;
    if (state.policeCooldown > 0) state.policeCooldown -= dt;
    const wantPolice = state.wanted;
    while (state.police.length < wantPolice && state.policeCooldown <= 0) {
      const a = random() * Math.PI * 2;
      const car = makeCar(p.x + Math.cos(a) * 500, p.y + Math.sin(a) * 500, a, 'police');
      car.speed = 200; state.police.push(car);
    }
    while (state.police.length > wantPolice) state.police.pop();
    for (const cop of state.police) {
      const distToPlayer = Math.hypot(p.x - cop.x, p.y - cop.y);
      // Outrun them: a patrol car that falls more than 850px behind loses
      // the trail and gives up, so a fast car can actually escape.
      if (distToPlayer > 850) { cop.health = 0; continue; }
      const target = Math.atan2(p.y - cop.y, p.x - cop.x);
      let diff = target - cop.angle; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      cop.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      cop.speed = 300 + state.wanted * 22;
      cop.x += Math.cos(cop.angle) * cop.speed * dt; cop.y += Math.sin(cop.angle) * cop.speed * dt;
      const d = Math.hypot(p.x - cop.x, p.y - cop.y);
      if (d < 48) {
        // Ram damage: about 18 health per second of contact on foot or in a car.
        p.health -= 18 * dt;
        if (p.inCar) p.inCar.speed *= 0.92;
        else events |= EVENT_HURT;
      }
    }
    const policeBefore = state.police.length;
    state.police = state.police.filter((c) => c.health > 0);
    if (state.police.length < policeBefore) state.policeCooldown = 8;

    // Wanted cools down over time when the player stops committing crimes:
    // one star fades every WANTED_DECAY_SECONDS, so laying low works.
    // Committing a new crime resets the timer (raiseWanted does that by
    // raising the level; here we only count quiet time).
    if (state.wanted > 0) {
      state.wantedTimer += dt;
      if (state.wantedTimer > WANTED_DECAY_SECONDS) {
        state.wanted -= 1; state.wantedTimer = 0;
        state.message = 'Polisi kehilangan jejakmu.'; state.messageTimer = 3;
      }
    }

    // Pickups.
    for (const pk of state.pickups) {
      if (pk.taken > 0) { pk.taken -= dt; continue; }
      if (Math.hypot(pk.x - p.x, pk.y - p.y) < 34) {
        pk.taken = 25;
        if (pk.kind === 'cash') state.cash += 20;
        else if (pk.kind === 'health') p.health = Math.min(100, p.health + 30);
        else p.ammo += 12;
        events |= EVENT_CASH;
      }
    }

    if (p.health <= 0) { p.health = 0; events |= EVENT_DEAD; }
    return events;
  }

  reset();
  return { state, reset, step, nearestCar, raiseWanted, collide, landmarks };
}
