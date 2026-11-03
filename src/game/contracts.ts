import type { Artist } from './types';
export function isContractActive(artist: Artist, now = Date.now()): boolean {
  return !artist.contractEndsAt || artist.contractEndsAt > now;
}
export function contractRenewalCost(artist: Artist): number {
  return Math.floor(220 + artist.level * 95 + artist.fans * 0.025);
}
export function renewContract(artist: Artist): void {
  const now = Date.now();
  artist.contractStartedAt = now;
  artist.contractWeeks = 4;
  artist.contractEndsAt = now + 28 * 86400000;
  artist.royaltyPercent = Math.max(10, Math.min(25, artist.royaltyPercent ?? 15));
}