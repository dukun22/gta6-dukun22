// Kota Senja — boot and the one loop.
// Screens: title, play, paused, game over, win (all 5 missions done).
// ?shot=start|play|chase|mission stages that scene, paints it twice and
// sets window.__shotReady for a screenshot. No network requests anywhere.
import { STEP, SAVE_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CASH, EVENT_DEAD, EVENT_HURT } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_PUNCH, ACTION_MUTE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createMissions } from './missions.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261119;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const missions = createMissions();
const renderer = createRenderer(canvas);
const audio = createAudio();
const saved = loadSave();

function announce(message) { status.textContent = message; }

function missionTargetFor(state) {
  const step = missions.stepDef();
  if (!step || !step.target) return null;
  return state.landmarks[step.target] || null;
}

function runShot(name) {
  const scene = stageShot(name, world, missions);
  // Keep the marker stageShot chose (port for mission, hideout for chase):
  // the live mission target would point at the garage and hide it off-screen.
  if (!world.state.missionTarget) world.state.missionTarget = missionTargetFor(world.state);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, missions, saved ? saved.cash : 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let hurtCooldown = 0;

  function startGame(fresh) {
    world.reset();
    missions.start();
    if (!fresh && saved) {
      world.state.cash = saved.cash;
      world.state.player.x = saved.x || 600; world.state.player.y = saved.y || 1700;
      world.state.player.health = saved.health || 100;
      announce('Save dimuat. Lanjutkan Kota Senja.');
    }
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Kota Senja. Misi 1: Paket Pertama. WASD jalan, E naik mobil.');
  }

  function endGame(win) {
    screen = win ? SCREEN_WIN : SCREEN_OVER;
    writeSave(world.state);
    announce(win ? 'Semua misi selesai!' : 'Raka tertangkap. Coba lagi.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    if (hurtCooldown > 0) hurtCooldown -= 1 / 60;

    let actions = input.takeActions();
    if (actions & ACTION_MUTE) { const m = audio.toggleMute(); announce(m ? 'Suara mati.' : 'Suara hidup.'); }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) startGame(screen !== SCREEN_TITLE);
      renderer.draw(world.state, screen, missions, saved ? saved.cash : 0);
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      if (screen === SCREEN_PAUSED) writeSave(world.state);
      announce(screen === SCREEN_PAUSED ? 'Jeda. Progress tersimpan.' : 'Lanjut.');
    }
    if (screen === SCREEN_PAUSED) { renderer.draw(world.state, screen, missions, saved ? saved.cash : 0); accumulator = 0; return; }

    // Aim: mouse position in world coordinates, from the camera centre.
    const rect = canvas.getBoundingClientRect();
    const camX = Math.max(0, Math.min(3200 - rect.width, world.state.player.x - rect.width / 2));
    const camY = Math.max(0, Math.min(2400 - rect.height, world.state.player.y - rect.height / 2));
    const shootAngle = Math.atan2((input.mouse.y + camY) - world.state.player.y, (input.mouse.x + camX) - world.state.player.x);

    while (accumulator >= STEP) {
      accumulator -= STEP;
      const ctrl = {
        axis: input.axis(), run: input.run, brake: false,
        enter: !!(actions & ACTION_ENTER), punch: !!(actions & ACTION_PUNCH),
        shoot: input.takeShot(), shootAngle,
      };
      actions &= ~(ACTION_ENTER | ACTION_PUNCH);
      const events = world.step(STEP, ctrl);
      if (events & EVENT_CASH) audio.pickup();
      if (events & EVENT_HURT && hurtCooldown <= 0) { hurtCooldown = 0.5; audio.punch(); }
      if (ctrl.shoot) audio.shot();
      audio.engine(world.state.player.inCar ? Math.abs(world.state.player.inCar.speed) / 430 : 0);
      audio.siren(world.state.wanted > 0);
      world.state.missionTarget = missionTargetFor(world.state);
      const missionEvent = missions.update(STEP, world, world.state.player);
      if (missionEvent === 'complete') { audio.chime(); world.state.message = `Misi selesai! +$${world.state.cash}`; world.state.messageTimer = 3; writeSave(world.state); }
      else if (missionEvent === 'failed') { world.state.message = 'Misi gagal — coba lagi dari awal misi.'; world.state.messageTimer = 4; missions.start(); }
      else if (missionEvent === 'step') { audio.chime(); }
      if (events & EVENT_DEAD) { endGame(false); break; }
      if (missions.done) { endGame(true); break; }
    }
    renderer.draw(world.state, screen, missions, saved ? saved.cash : 0);
  }

  announce('Kota Senja. Tekan Spasi atau klik untuk main.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
