import type { GameSave, Artist, Track } from './types';
import { MAX_OFFLINE_SECONDS, STARTING_CASH, tick } from './economy';

const SAVE_KEY = 'idle-music-label.save.v2';
const LEGACY_KEY = 'idle-music-label.save.v1';

export function createNewSave(): GameSave {
  return { version: 2, cash: STARTING_CASH, fans: 120, totalStreams: 0, reputation: 1,
    studioLevel: 1, marketingLevel: 0, artists: [], tracks: [], lastSavedAt: Date.now(), lifetimeEarnings: 0, claimedMilestones: [], concerts: [] };
}
function validSave(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function migrateLegacy(parsed: Record<string, unknown>, fresh: GameSave): GameSave {
  const oldTrackCount = typeof parsed.tracks === 'number' ? Math.max(0, Math.min(1000, Math.floor(parsed.tracks))) : 0;
  const legacyArtist: Artist = { id: 'legacy-artist', name: 'Legacy Artist', genre: 'Independent', level: 1, fans: 0 };
  const legacyTracks: Track[] = Array.from({ length: oldTrackCount }, (_, index) => ({
    id: `legacy-track-${index + 1}`, title: `Legacy Release #${index + 1}`, artistId: legacyArtist.id,
    genre: 'Independent', quality: 40, releasedAt: Date.now(), streams: 0,
  }));
  return {
    ...fresh,
    cash: typeof parsed.cash === 'number' && Number.isFinite(parsed.cash) ? Math.max(0, parsed.cash) : fresh.cash,
    fans: typeof parsed.fans === 'number' && Number.isFinite(parsed.fans) ? Math.max(0, parsed.fans) : fresh.fans,
    totalStreams: typeof parsed.streams === 'number' && Number.isFinite(parsed.streams) ? Math.max(0, parsed.streams) : 0,
    studioLevel: typeof parsed.studio === 'number' ? Math.max(1, Math.floor(parsed.studio)) : 1,
    marketingLevel: typeof parsed.marketing === 'number' ? Math.max(0, Math.floor(parsed.marketing)) : 0,
    reputation: typeof parsed.reputation === 'number' ? Math.max(1, Math.floor(parsed.reputation)) : 1,
    artists: oldTrackCount > 0 ? [legacyArtist] : [],
    tracks: legacyTracks,
    lifetimeEarnings: 0,
    lastSavedAt: Date.now(),
  };
}
export function loadSave(): { save: GameSave; offlineSeconds: number } {
  try {
    const current = localStorage.getItem(SAVE_KEY);
    const legacy = current ? null : localStorage.getItem(LEGACY_KEY);
    const raw = current ?? legacy;
    if (!raw) return { save: createNewSave(), offlineSeconds: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (!validSave(parsed)) return { save: createNewSave(), offlineSeconds: 0 };
    const fresh = createNewSave();
    const save: GameSave = parsed.version === 2
      ? { ...fresh, ...parsed, version: 2,
          artists: Array.isArray(parsed.artists) ? parsed.artists as Artist[] : [],
          tracks: Array.isArray(parsed.tracks) ? parsed.tracks as Track[] : [],
          claimedMilestones: Array.isArray(parsed.claimedMilestones) ? parsed.claimedMilestones.filter((id): id is string => typeof id === 'string') : [],
          concerts: Array.isArray(parsed.concerts) ? parsed.concerts : [] }
      : migrateLegacy(parsed, fresh);
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
  link.href = url; link.download = 'idle-music-label-save.json'; link.click();
  URL.revokeObjectURL(url);
}
export function importSave(file: File): Promise<GameSave> {
  return file.text().then(text => {
    const parsed: unknown = JSON.parse(text);
    if (!validSave(parsed) || typeof parsed.cash !== 'number' || !Number.isFinite(parsed.cash)
      || !Array.isArray(parsed.artists) || !Array.isArray(parsed.tracks)
      || !Number.isFinite(parsed.studioLevel) || !Number.isFinite(parsed.marketingLevel)) {
      throw new Error('That file is not a valid Idle Music Label save.');
    }
    const fresh = createNewSave();
    return { ...fresh, ...parsed, version: 2,
      claimedMilestones: Array.isArray(parsed.claimedMilestones) ? parsed.claimedMilestones.filter((id): id is string => typeof id === 'string') : [],
      concerts: Array.isArray(parsed.concerts) ? parsed.concerts : [],
      lastSavedAt: Date.now() } as GameSave;
  });
}
export function resetSave(): GameSave {
  localStorage.removeItem(SAVE_KEY); localStorage.removeItem(LEGACY_KEY);
  return createNewSave();
}
