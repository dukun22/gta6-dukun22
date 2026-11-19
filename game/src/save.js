// Save and load for Kota Senja, in this browser only (localStorage).
// Saved: cash, missions completed, health, player position, play time.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch { return null; }
}

export function writeSave(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash, missionsDone: state.missionsDone,
      health: state.player.health, x: state.player.x, y: state.player.y,
      played: state.played, savedAt: Date.now(),
    }));
    return true;
  } catch { return false; }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* storage off */ }
}
