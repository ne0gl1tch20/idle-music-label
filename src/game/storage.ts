import type { GameSave } from './types';
import { MAX_OFFLINE_SECONDS, STARTING_CASH, tick } from './economy';

const SAVE_KEY = 'idle-music-label.save.v2';
const LEGACY_KEY = 'idle-music-label.save.v1';

export function createNewSave(): GameSave {
  return { version: 2, cash: STARTING_CASH, fans: 120, totalStreams: 0, reputation: 1,
    studioLevel: 1, marketingLevel: 0, artists: [], tracks: [], lastSavedAt: Date.now(), lifetimeEarnings: 0 };
}
function validSave(value: unknown): value is Partial<GameSave> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function loadSave(): { save: GameSave; offlineSeconds: number } {
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return { save: createNewSave(), offlineSeconds: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (!validSave(parsed)) return { save: createNewSave(), offlineSeconds: 0 };
    const fresh = createNewSave();
    const save: GameSave = {
      ...fresh, ...parsed, version: 2,
      artists: Array.isArray(parsed.artists) ? parsed.artists : [],
      tracks: Array.isArray(parsed.tracks) ? parsed.tracks : [],
    };
    const elapsed = Math.max(0, Math.floor((Date.now() - (Number(save.lastSavedAt) || Date.now())) / 1000));
    const offlineSeconds = Math.min(elapsed, MAX_OFFLINE_SECONDS);
    if (offlineSeconds > 0) tick(save, offlineSeconds);
    save.lastSavedAt = Date.now();
    return { save, offlineSeconds };
  } catch {
    return { save: createNewSave(), offlineSeconds: 0 };
  }
}
export function persistSave(save: GameSave): void {
  save.lastSavedAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}
export function exportSave(save: GameSave): void {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'idle-music-label-save.json';
  link.click();
  URL.revokeObjectURL(url);
}
export function importSave(file: File): Promise<GameSave> {
  return file.text().then((text) => {
    const parsed: unknown = JSON.parse(text);
    if (!validSave(parsed) || typeof parsed.cash !== 'number' || !Array.isArray(parsed.artists) || !Array.isArray(parsed.tracks)) {
      throw new Error('That file is not a valid Idle Music Label save.');
    }
    const fresh = createNewSave();
    return { ...fresh, ...parsed, version: 2, lastSavedAt: Date.now() } as GameSave;
  });
}
export function resetSave(): GameSave {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(LEGACY_KEY);
  return createNewSave();
}
