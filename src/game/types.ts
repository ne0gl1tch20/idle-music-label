export type Artist = {
  id: string; name: string; genre: string; level: number; fans: number;
  contractStartedAt?: number; contractEndsAt?: number; contractWeeks?: number;
  royaltyPercent?: number; lastConcertAt?: number; collaborations?: number;
};
export type Track = {
  id: string; title: string; artistId: string; genre: string; quality: number;
  releasedAt: number | null; streams: number; royaltyPercent?: number; collaborators?: string[];
};
export type Concert = {
  id: string; artistId: string; artistName: string; tier: string; venue: string;
  attendance: number; capacity: number; ticketPrice: number; revenue: number;
  cost: number; profit: number; performedAt: number;
};
export type GameSave = { version: 2; cash: number; fans: number; totalStreams: number; reputation: number; studioLevel: number; marketingLevel: number; artists: Artist[]; tracks: Track[]; lastSavedAt: number; lifetimeEarnings: number; claimedMilestones: string[]; concerts: Concert[]; };
export type GameTab = 'overview' | 'artists' | 'studio' | 'releases' | 'charts' | 'milestones' | 'contracts' | 'concerts' | 'settings' | 'label';
