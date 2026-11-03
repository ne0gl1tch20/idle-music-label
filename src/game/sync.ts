import type { GameSave } from './types';

const PREFIX = 'SOUNDHOUSE-SYNC-1:';

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function createSyncCode(save: GameSave): string {
  const payload = { format: 'soundhouse-web-play-sync', formatVersion: 1, exportedAt: Date.now(), save };
  return PREFIX + toBase64Url(JSON.stringify(payload));
}

export function parseSyncCode(code: string): GameSave {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) throw new Error('This is not a Soundhouse Web Play Sync code.');
  if (trimmed.length > 2_000_000) throw new Error('This sync code is too large.');
  let payload: unknown;
  try { payload = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length))); }
  catch { throw new Error('The sync code is damaged or incomplete.'); }
  if (!payload || typeof payload !== 'object') throw new Error('The sync code has an invalid format.');
  const record = payload as Record<string, unknown>;
  const candidate = record.save as Record<string, unknown> | undefined;
  if (record.format !== 'soundhouse-web-play-sync' || record.formatVersion !== 1 || !candidate ||
      candidate.version !== 2 || typeof candidate.cash !== 'number' || !Number.isFinite(candidate.cash) ||
      typeof candidate.fans !== 'number' || !Number.isFinite(candidate.fans) ||
      !Array.isArray(candidate.artists) || !Array.isArray(candidate.tracks) ||
      typeof candidate.studioLevel !== 'number' || typeof candidate.marketingLevel !== 'number') {
    throw new Error('This sync code does not contain a compatible Soundhouse save.');
  }
  return { ...candidate, lastSavedAt: Date.now() } as GameSave;
}
