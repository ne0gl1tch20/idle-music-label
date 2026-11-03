import type { GameSave, Track, ChartWinner } from './types';
const KEY='idle-music-label.chart-cycle.v1';
const WEEK=604800000;
const PRIZES=[1200,650,300];
export function rankings(save:GameSave):Track[]{
 return save.tracks.filter(t=>t.releasedAt!==null).slice().sort((a,b)=>(b.weeklyStreams??0)-(a.weeklyStreams??0)||b.quality-a.quality);
}
export function timeToChart():number{
 let start=Number(localStorage.getItem(KEY));
 if(!start){start=Date.now();localStorage.setItem(KEY,String(start));}
 return Math.max(0,WEEK-(Date.now()-start));
}
export function claimWeeklyChart(save:GameSave):number{
 const start=Number(localStorage.getItem(KEY))||Date.now();
 if(Date.now()-start<WEEK)return -1;
 const top=rankings(save).filter(track=>(track.weeklyStreams??0)>0).slice(0,3);
 const winners:ChartWinner[]=top.map((track,index)=>({
  trackTitle:track.title,
  artistName:save.artists.find(a=>a.id===track.artistId)?.name??'Unknown artist',
  streams:Math.floor(track.weeklyStreams??0),
  rank:index+1,
  reward:PRIZES[index]??0
 }));
 let total=0;
 winners.forEach(winner=>{
  total+=winner.reward;
  save.reputation+=winner.rank===1?3:1;
  save.fans+=winner.rank===1?500:winner.rank===2?250:100;
  const track=top[winner.rank-1];
  const artist=save.artists.find(a=>a.id===track.artistId);
  if(artist)artist.fans+=winner.rank===1?180:80;
 });
 save.cash+=total;
 save.lifetimeEarnings+=total;
 save.chartHistory=[...(save.chartHistory??[]),{endedAt:Date.now(),winners}].slice(-12);
 save.tracks.forEach(track=>{track.weeklyStreams=0;});
 localStorage.setItem(KEY,String(Date.now()));
 return total;
}
