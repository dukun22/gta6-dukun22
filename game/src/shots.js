// Screenshot scenes behind ?shot=start|play|chase|mission.
// Each one stages a real game state (no fake pixels): the title over a live
// city, driving with traffic, a police chase at 3 wanted stars, and a
// mission with its yellow target marker. Then the renderer paints it twice
// and sets window.__shotReady for the screenshot.
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

function simulate(world, seconds, drive) {
  const steps = Math.floor(seconds * 60);
  for (let i = 0; i < steps; i += 1) {
    world.step(1 / 60, drive || { axis: { x: 0, y: 0 }, run: false, enter: false, punch: false, shoot: false, brake: false });
  }
}

export function stageShot(name, world, missions) {
  world.reset();
  missions.start();
  const p = world.state.player;
  if (name === 'play') {
    // Put Raka in a car on the main road, traffic around him.
    const car = world.state.cars.find((c) => c.kind === 'parked');
    if (car) { p.inCar = car; car.kind = 'player'; car.x = 1000; car.y = 1000; car.angle = 0; car.speed = 220; p.x = car.x; p.y = car.y; }
    simulate(world, 4, { axis: { x: 0, y: -1 }, run: false, enter: false, punch: false, shoot: false, brake: false });
    world.state.missionTarget = world.landmarks.shop;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    const car = world.state.cars.find((c) => c.kind === 'parked');
    if (car) { p.inCar = car; car.kind = 'player'; car.x = 1400; car.y = 1400; car.angle = 0; car.speed = 300; p.x = car.x; p.y = car.y; }
    world.state.wanted = 3;
    simulate(world, 3, { axis: { x: 0, y: -1 }, run: false, enter: false, punch: false, shoot: false, brake: false });
    world.state.wanted = 3;
    world.state.missionTarget = world.landmarks.hideout;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    p.x = 2500; p.y = 350;
    world.state.missionTarget = world.landmarks.port;
    simulate(world, 2, { axis: { x: 0, y: 0 }, run: false, enter: false, punch: false, shoot: false, brake: false });
    world.state.missionTarget = world.landmarks.port;
    return { screen: SCREEN_PLAY };
  }
  // start: title over a living city.
  simulate(world, 5, { axis: { x: 0, y: 0 }, run: false, enter: false, punch: false, shoot: false, brake: false });
  return { screen: SCREEN_TITLE };
}
