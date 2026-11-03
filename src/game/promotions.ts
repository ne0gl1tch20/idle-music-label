import type { GameSave, Track } from './types';
export type PromotionTier={id:string;name:string;cost:number;baseStreams:number;qualityMultiplier:number;fans:number;reputation:number;description:string};
export const PROMOTION_TIERS:PromotionTier[]=[
 {id:'social',name:'Social media push',cost:250,baseStreams:900,qualityMultiplier:16,fans:35,reputation:0,description:'Short-form buzz and community posts.'},
 {id:'playlist',name:'Playlist pitching',cost:900,baseStreams:4200,qualityMultiplier:48,fans:120,reputation:1,description:'Pitch the single to independent curators.'},
 {id:'radio',name:'Radio rotation',cost:2500,baseStreams:11500,qualityMultiplier:105,fans:300,reputation:2,description:'A wider campaign across music stations.'}
];
export const PROMOTION_COOLDOWN=8*60*60*1000;
export type PromotionResult={tier:PromotionTier;streams:number;fans:number};
export function applyPromotion(save:GameSave,track:Track,tierId:string):PromotionResult|null{
 const tier=PROMOTION_TIERS.find(x=>x.id===tierId);
 if(!tier||!track.releasedAt||save.cash<tier.cost||(track.lastPromotedAt&&Date.now()-track.lastPromotedAt<PROMOTION_COOLDOWN))return null;
 const streams=Math.floor((tier.baseStreams+track.quality*tier.qualityMultiplier)*(1+save.marketingLevel*.04));
 const fans=Math.floor(tier.fans*(1+track.quality/200));
 save.cash-=tier.cost;track.streams+=streams;track.weeklyStreams=(track.weeklyStreams??0)+streams;
 track.promotions=(track.promotions??0)+1;track.lastPromotedAt=Date.now();
 save.totalStreams+=streams;save.fans+=fans;save.reputation+=tier.reputation;
 const artist=save.artists.find(a=>a.id===track.artistId);if(artist)artist.fans+=Math.floor(fans*.7);
 return {tier,streams,fans};
}
