// Kota Senja — shared constants for the open world.
// Original sunset coastal city: no real place, no Rockstar names, all our own.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD = 96;
export const BLOCK = 400;
export const SAVE_KEY = 'kota-senja-save-v1';
export const STEP = 1 / 60;

export const DISTRICTS = [
  { name: 'Pantai Senja', x: 0, y: 2000, w: 3200, h: 400, colour: '#e8b06a' },
  { name: 'Kota Lama', x: 0, y: 0, w: 1100, h: 900, colour: '#c98a5a' },
  { name: 'Pusat Kota', x: 1100, y: 0, w: 1100, h: 1100, colour: '#7a6a9a' },
  { name: 'Pelabuhan', x: 2200, y: 0, w: 1000, h: 1100, colour: '#5a7a8a' },
  { name: 'Bukit Senja', x: 2200, y: 1100, w: 1000, h: 900, colour: '#6a8a5a' },
];

export const PLAYER = { walk: 175, run: 265, radius: 14, health: 100 };
export const CAR = { length: 62, width: 30, accel: 420, maxSpeed: 430, reverse: 140, turn: 2.6 };
export const WANTED_MAX = 5;
export const WANTED_DECAY_SECONDS = 22;
export const MISSION_REWARDS = [120, 180, 300, 350, 500];

export const PALETTE = {
  grass: '#3d6b3a', road: '#2e2a33', roadLine: '#e8d27a',
  sidewalk: '#8a7a68', water: '#2a6a9a', sand: '#e8c98a',
  building: ['#b06a5a', '#7a5a8a', '#5a7a6a', '#a08a4a', '#6a6a8a', '#8a4a5a'],
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
