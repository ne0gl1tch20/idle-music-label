import type { Artist, GameSave } from './types';
export type ConcertTier = { id: string; name: string; venue: string; symbol: string; capacity: number; ticketPrice: number; cost: number; description: string };
export const CONCERT_TIERS: ConcertTier[] = [
 { id:'club',name:'Intimate Session',venue:'The Velvet Room',symbol:'◉',capacity:180,ticketPrice:18,cost:450,description:'A close-up show for your earliest supporters.' },
 { id:'theater',name:'Headline Night',venue:'Grand Theater',symbol:'♫',capacity:1200,ticketPrice:32,cost:4200,description:'A bigger stage for a growing fanbase.' },
 { id:'arena',name:'Arena Takeover',venue:'Soundwave Arena',symbol:'✦',capacity:8500,ticketPrice:55,cost:22000,description:'A major production for established stars.' }
];
export type ConcertRecord = { id:string; artistId:string; artistName:string; venue:string; attendance:number; capacity:number; profit:number; performedAt:number };
export function concertQuote(save: GameSave, artist: Artist, tierId: string) {
 const tier=CONCERT_TIERS.find(x=>x.id===tierId); if(!tier) return null;
 const attendance=Math.min(tier.capacity,Math.floor((save.fans*.12+artist.fans*.55+artist.level*32)*(1+save.reputation*.015)));
 return { attendance, profit: attendance*tier.ticketPrice-tier.cost };
}
export function launchConcert(save: GameSave, artist: Artist, tierId: string): ConcertRecord | null {
 const tier=CONCERT_TIERS.find(x=>x.id===tierId); const quote=concertQuote(save,artist,tierId);
 if(!tier||!quote||save.cash<tier.cost||(artist.lastConcertAt && Date.now()-artist.lastConcertAt<43200000)) return null;
 const profit=quote.profit; save.cash+=profit; save.lifetimeEarnings+=Math.max(0,profit);
 save.fans+=Math.floor(quote.attendance*.08)+artist.level*12; save.reputation+=quote.attendance>=tier.capacity*.75?1:0;
 artist.lastConcertAt=Date.now();
 const record={id:'show-'+Date.now(),artistId:artist.id,artistName:artist.name,venue:tier.venue,attendance:quote.attendance,capacity:tier.capacity,profit,performedAt:Date.now()};
 save.concerts=[...(save.concerts??[]),record].slice(-100); return record;
}
