import type { Artist, GameSave, Track } from './types';

export const STARTING_CASH = 500;
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
export const STUDIO_BASE_COST = 180;
export const MARKETING_BASE_COST = 260;
export const ARTIST_BASE_COST = 350;
export const RECORDING_COST = 140;
export const RELEASE_COST = 90;

export function studioCost(level: number): number { return Math.floor(STUDIO_BASE_COST * 1.62 ** Math.max(0, level - 1)); }
export function marketingCost(level: number): number { return Math.floor(MARKETING_BASE_COST * 1.72 ** level); }
export function artistCost(count: number): number { return Math.floor(ARTIST_BASE_COST * 1.85 ** count); }
export function trackIncome(track: Track): number { return track.releasedAt ? Math.max(0.35, track.quality * 0.12) : 0; }
export function incomePerSecond(save: GameSave): number {
  const released = save.tracks.reduce((sum, track) => sum + trackIncome(track), 0);
  const artistBonus = save.artists.reduce((sum, artist) => sum + artist.level * 0.65, 0);
  return save.studioLevel * 1.4 + save.marketingLevel * 1.1 + released + artistBonus;
}
export function tick(save: GameSave, seconds = 1): void {
  const elapsed = Math.max(0, Math.min(seconds, MAX_OFFLINE_SECONDS));
  const income = incomePerSecond(save) * elapsed;
  save.cash += income;
  save.lifetimeEarnings += income;
  const releasedTracks = save.tracks.filter(track => track.releasedAt);
  const streamGain = releasedTracks.reduce((sum, track) => sum + Math.max(1, track.quality * 0.8), 0) * elapsed;
  save.totalStreams += streamGain;
  save.fans += Math.floor((save.marketingLevel * 0.08 + save.artists.length * 0.025) * elapsed);
  for (const track of releasedTracks) track.streams += Math.floor(Math.max(1, track.quality * 0.8) * elapsed);
}
export function createArtist(id: string, name: string, genre: string): Artist {
  return { id, name, genre, level: 1, fans: 80 };
}
export function createTrack(id: string, title: string, artist: Artist, quality: number): Track {
  return { id, title, artistId: artist.id, genre: artist.genre, quality, releasedAt: null, streams: 0 };
}
export function releaseTrack(save: GameSave, track: Track): void {
  track.releasedAt = Date.now();
  save.fans += 65 + track.quality * 3;
  save.reputation += 1;
}
