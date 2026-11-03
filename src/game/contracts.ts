import type { Artist } from './types';
export const CONTRACT_LENGTH = 28 * 86400000;
export function isContractActive(artist: Artist): boolean { return !artist.contractEndsAt || artist.contractEndsAt > Date.now(); }
export function contractRenewalCost(artist: Artist): number { return Math.floor(220 * Math.max(1, artist.level) ** 1.35); }
export function renewContract(artist: Artist): void { artist.contractEndsAt = Date.now() + CONTRACT_LENGTH; }
