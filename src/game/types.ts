export type Artist = { id: string; name: string; genre: string; level: number; fans: number; contractEndsAt?: number; lastConcertAt?: number; collaborations?: number; royaltyPercent?: number; };
export type Track = { id: string; title: string; artistId: string; genre: string; quality: number; releasedAt: number | null; streams: number; collaborators?: string[]; royaltyPercent?: number; };
export type ConcertRecord = { id:string; artistId:string; artistName:string; venue:string; attendance:number; capacity:number; profit:number; performedAt:number };
export type GameSave = { version: 2; cash: number; fans: number; totalStreams: number; reputation: number; studioLevel: number; marketingLevel: number; artists: Artist[]; tracks: Track[]; lastSavedAt: number; lifetimeEarnings: number; claimedMilestones: string[]; concerts:ConcertRecord[] };
export type GameTab = 'overview' | 'artists' | 'studio' | 'releases' | 'charts' | 'milestones' | 'contracts' | 'concerts' | 'settings' | 'label';
