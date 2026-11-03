import type { Artist, Concert, GameSave } from './types';
export const CONCERT_TIERS = [
  { id:'club', name:'Intimate club show', venue:'Club stage', capacity:120, ticketPrice:12, cost:250, multiplier:1, symbol:'♫', description:'A close-up performance for your earliest supporters.' },
  { id:'theater', name:'Theater night', venue:'Grand theater', capacity:650, ticketPrice:22, cost:1500, multiplier:3.2, symbol:'♬', description:'A bigger room for a growing fanbase.' },
  { id:'arena', name:'Arena headline', venue:'Metro arena', capacity:2800, ticketPrice:38, cost:6500, multiplier:8, symbol:'✦', description:'A major production for artists with serious momentum.' },
] as const;
export type ConcertTierId = typeof CONCERT_TIERS[number]['id'];
export function concertQuote(save: GameSave, artist: Artist, tierId: string) {
  const tier = CONCERT_TIERS.find(item => item.id === tierId);
  if (!tier) return null;
  const demand = Math.max(12, Math.floor((save.fans * 0.045 + artist.fans * 0.16 + save.marketingLevel * 35 + save.reputation * 4) * tier.multiplier));
  const attendance = Math.min(tier.capacity, demand);
  const revenue = attendance * tier.ticketPrice;
  return { attendance, revenue, cost:tier.cost, profit:revenue-tier.cost };
}
export function launchConcert(save: GameSave, artist: Artist, tierId: string): Concert | null {
  const tier = CONCERT_TIERS.find(item => item.id === tierId);
  if (!tier || (artist.lastConcertAt && Date.now()-artist.lastConcertAt < 43200000)) return null;
  const quote = concertQuote(save, artist, tierId);
  if (!quote || save.cash < tier.cost) return null;
  const now = Date.now();
  const concert: Concert = {
    id:'concert-'+now, artistId:artist.id, artistName:artist.name, tier:tier.id, venue:tier.venue,
    attendance:quote.attendance, capacity:tier.capacity, ticketPrice:tier.ticketPrice,
    revenue:quote.revenue, cost:tier.cost, profit:quote.profit, performedAt:now
  };
  save.cash += quote.profit;
  save.lifetimeEarnings += quote.revenue;
  save.fans += Math.floor(quote.attendance * 0.18);
  artist.fans += Math.floor(quote.attendance * 0.3);
  artist.lastConcertAt = now;
  save.reputation += tier.id === 'arena' ? 4 : tier.id === 'theater' ? 2 : 1;
  save.concerts.unshift(concert);
  return concert;
}