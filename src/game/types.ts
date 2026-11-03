export type Artist = { id: string; name: string; genre: string; level: number; fans: number; };
export type Track = { id: string; title: string; artistId: string; genre: string; quality: number; releasedAt: number | null; streams: number; };
export type GameSave = { version: 2; cash: number; fans: number; totalStreams: number; reputation: number; studioLevel: number; marketingLevel: number; artists: Artist[]; tracks: Track[]; lastSavedAt: number; lifetimeEarnings: number; };
export type GameTab = 'overview' | 'artists' | 'studio' | 'releases' | 'charts' | 'label';
