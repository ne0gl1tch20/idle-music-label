import './phase-9-10.css';

type Save = {
  cash:number; fans:number; totalStreams:number; reputation:number; lifetimeEarnings:number;
  artists:Array<{id:string;name:string;fans:number;level:number}>;
  tracks:Array<{id:string;title:string;quality:number;streams:number;weeklyStreams?:number;artistId:string;releasedAt:number|null}>;
  eventHistory?:Array<{id:string;title:string;choice:string;at:number;cash:number;fans:number;streams:number;reputation:number}>;
};

type EventChoice={id:string;label:string;description:string;cash:number;fans:number;streams:number;reputation:number;cost?:number;quality?:number};
type IndustryEvent={id:string;eyebrow:string;title:string;body:string;symbol:string;choices:EventChoice[]};

const SAVE_KEY='idle-music-label.save.v2';
const EVENT_KEY='idle-music-label.phase9.v1';
const events:IndustryEvent[]=[
 {id:'viral',eyebrow:'DIGITAL BUZZ',title:'Your track just caught fire.',body:'A creator used your song in a fast-growing video. The label can amplify the moment before the feed moves on.',symbol:'✦',choices:[{id:'boost',label:'Boost the post',description:'Spend $350 to turn the spark into a wave.',cash:-350,fans:180,streams:5200,reputation:1,cost:350},{id:'organic',label:'Let it grow',description:'Keep it organic and take the free discovery.',cash:0,fans:90,streams:2400,reputation:0}]},
 {id:'brand',eyebrow:'BRAND PARTNERSHIP',title:'A lifestyle brand wants your artist.',body:'They want a short campaign featuring one of your signed artists. It could bring serious attention to the label.',symbol:'◆',choices:[{id:'accept',label:'Accept deal',description:'Fast cash and a reputation bump.',cash:1400,fans:260,streams:1800,reputation:2},{id:'decline',label:'Protect the brand',description:'Turn it down and keep the label independent.',cash:100,fans:40,streams:0,reputation:1}]},
 {id:'festival',eyebrow:'FESTIVAL SLOT',title:'A festival opened one surprise slot.',body:'Your artist can jump onto a small stage tonight. The slot is cheap, but you have to move quickly.',symbol:'♫',choices:[{id:'book',label:'Book the slot',description:'Pay $900 for a live audience boost.',cash:-900,fans:420,streams:7600,reputation:2,cost:900},{id:'pass',label:'Pass',description:'Keep your cash for the next release.',cash:0,fans:0,streams:0,reputation:0}]},
 {id:'producer',eyebrow:'PRODUCER CHALLENGE',title:'A hot producer heard your demo.',body:'They will remix one released track for a small fee. The remix can raise quality and streaming momentum.',symbol:'⌘',choices:[{id:'remix',label:'Commission remix',description:'Pay $650 and add +8 quality to a released track.',cash:-650,fans:150,streams:4500,reputation:1,cost:650,quality:8},{id:'skip',label:'Keep the demo',description:'No cost. Save the opportunity for later.',cash:0,fans:0,streams:0,reputation:0}]},
 {id:'press',eyebrow:'PRESS FEATURE',title:'An indie magazine wants an interview.',body:'A feature could put your label in front of listeners who love discovering new artists.',symbol:'✦',choices:[{id:'feature',label:'Do the interview',description:'Free press with a strong discovery bump.',cash:250,fans:230,streams:2800,reputation:2},{id:'later',label:'Maybe later',description:'Skip this feature for now.',cash:0,fans:0,streams:0,reputation:0}]},
 {id:'playlist',eyebrow:'CURATOR NOTE',title:'A curator is listening.',body:'A respected independent playlist editor wants a quick look at your newest release.',symbol:'◉',choices:[{id:'pitch',label:'Send your best track',description:'Spend $180 on a polished pitch package.',cash:-180,fans:120,streams:6000,reputation:1,cost:180},{id:'wait',label:'Wait for organic',description:'No spend, smaller discovery.',cash:0,fans:45,streams:900,reputation:0}]},
 {id:'award',eyebrow:'AWARDS SEASON',title:'Your label got an award nomination.',body:'You can celebrate the nomination with a small campaign and turn the attention into a lasting reputation boost.',symbol:'♛',choices:[{id:'campaign',label:'Run campaign',description:'Spend $500 and make the nomination count.',cash:-500,fans:300,streams:1500,reputation:4,cost:500},{id:'quiet',label:'Stay focused',description:'Take a modest reputation bump for free.',cash:0,fans:80,streams:0,reputation:1}]},
 {id:'discovery',eyebrow:'A&R DISCOVERY',title:'A demo arrived from nowhere.',body:'A talented unknown artist sent your label a demo. Sign them for a discount before another label notices.',symbol:'♬',choices:[{id:'sign',label:'Sign artist',description:'Spend $700 and add a level-1 artist to the roster.',cash:-700,fans:160,streams:0,reputation:1,cost:700},{id:'pass',label:'Pass for now',description:'Keep your roster focused.',cash:0,fans:20,streams:0,reputation:0}]}
];

let active:IndustryEvent|null=null;
let timer=0;
let lastEventAt=Number(localStorage.getItem(EVENT_KEY)||'0');
const reduced=()=>document.documentElement.classList.contains('reduce-motion');
function readSave():Save|null{try{const raw=localStorage.getItem(SAVE_KEY);return raw?JSON.parse(raw) as Save:null;}catch{return null;}}
function writeSave(save:Save){localStorage.setItem(SAVE_KEY,JSON.stringify({...save,lastSavedAt:Date.now()}));}
function money(n:number){return '$'+Math.floor(n).toLocaleString('en-US');}
function compact(n:number){return Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(Math.floor(n));}
function esc(s:string){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));}
function canChoose(choice:EventChoice,save:Save){return (choice.cost??0)<=save.cash;}
function eventShell(){
 if(document.querySelector('.industry-event-dock'))return;
 const dock=document.createElement('button');dock.className='industry-event-dock';dock.innerHTML='<span class="event-pulse">✦</span><span><b>INDUSTRY EVENT</b><small>Something is happening</small></span><i>→</i>';dock.addEventListener('click',()=>openRandom());document.body.appendChild(dock);
 const toast=document.createElement('div');toast.className='phase-toast-region';document.body.appendChild(toast);
}
function toast(title:string,body:string){const region=document.querySelector('.phase-toast-region');if(!region)return;const item=document.createElement('div');item.className='phase-toast';item.innerHTML='<span>✦</span><div><b>'+esc(title)+'</b><small>'+esc(body)+'</small></div>';region.appendChild(item);setTimeout(()=>item.remove(),4200);}
function openRandom(){if(active)return;const save=readSave();if(!save)return;active=events[Math.floor(Math.random()*events.length)];renderModal();}
function renderModal(){
 if(!active)return;document.querySelector('.industry-event-modal')?.remove();
 const modal=document.createElement('div');modal.className='industry-event-modal';modal.innerHTML='<div class="event-backdrop"></div><section class="event-dialog" role="dialog" aria-modal="true"><button class="event-close" aria-label="Close">×</button><div class="event-symbol">'+active.symbol+'</div><span class="eyebrow">'+active.eyebrow+'</span><h2>'+active.title+'</h2><p>'+active.body+'</p><div class="event-choices">'+active.choices.map((c,i)=>'<button class="event-choice" data-choice="'+i+'"><span><b>'+c.label+'</b><small>'+c.description+'</small></span><strong>'+(c.cash>=0?'+':'')+money(c.cash)+(c.fans?' · +'+compact(c.fans)+' fans':'')+(c.reputation?' · +'+c.reputation+' rep':'')+'</strong></button>').join('')+'</div><small class="event-footer">Industry events are optional and never interrupt your current screen.</small></section>';
 modal.querySelector('.event-close')?.addEventListener('click',closeModal);modal.querySelector('.event-backdrop')?.addEventListener('click',closeModal);
 modal.querySelectorAll<HTMLElement>('[data-choice]').forEach(button=>button.addEventListener('click',()=>choose(Number(button.dataset.choice))));document.body.appendChild(modal);requestAnimationFrame(()=>modal.classList.add('visible'));
}
function closeModal(){const modal=document.querySelector('.industry-event-modal');if(!modal){active=null;return;}modal.classList.remove('visible');setTimeout(()=>modal.remove(),reduced()?0:220);active=null;}
function choose(index:number){const event=active;if(!event)return;const save=readSave();const choice=event.choices[index];if(!save||!choice||!canChoose(choice,save)){toast('Not enough cash','Choose another opportunity.');return;}
 save.cash+=choice.cash;save.fans+=choice.fans;save.totalStreams+=choice.streams;save.lifetimeEarnings+=Math.max(0,choice.cash);save.reputation+=choice.reputation;
 if(choice.streams&&save.tracks.length){const track=save.tracks.filter(t=>t.releasedAt).sort((a,b)=>b.quality-a.quality)[0];if(track){track.streams+=choice.streams;track.weeklyStreams=(track.weeklyStreams??0)+choice.streams;}}
 if(choice.quality&&save.tracks.length){const track=save.tracks.filter(t=>t.releasedAt).sort((a,b)=>b.quality-a.quality)[0];if(track)track.quality=Math.min(100,track.quality+choice.quality);}
 if(event.id==='discovery'&&choice.id==='sign'){const id='event-artist-'+Date.now();save.artists.push({id,name:'Nova Vale',fans:140,level:1});}
 save.eventHistory=[...(save.eventHistory??[]),{id:event.id,title:event.title,choice:choice.label,at:Date.now(),cash:choice.cash,fans:choice.fans,streams:choice.streams,reputation:choice.reputation}].slice(-20);
 localStorage.setItem(EVENT_KEY,String(Date.now()));lastEventAt=Date.now();writeSave(save);closeModal();toast(event.title,choice.label+' · '+(choice.cash>=0?'+':'')+money(choice.cash)+' · +'+compact(choice.fans)+' fans');updateStats(save);document.dispatchEvent(new CustomEvent('idle-label-event',{detail:{event,choice}}));
}
function updateStats(save:Save){const cash=document.querySelector('#cash-stat');const fans=document.querySelector('#fans-stat');const streams=document.querySelector('#streams-stat');const rep=document.querySelector('#rep-stat');if(cash)cash.textContent=money(save.cash);if(fans)fans.textContent=compact(save.fans);if(streams)streams.textContent=compact(save.totalStreams);if(rep)rep.textContent='LEVEL '+save.reputation;}
function maybeEvent(){const save=readSave();if(!save||active)return;const interval=90000+Math.random()*90000;if(Date.now()-lastEventAt<interval)return;openRandom();}
function addHistoryRail(){if(document.querySelector('.phase-event-history'))return;const save=readSave();if(!save)return;const page=document.querySelector('.page');if(!page)return;const recent=(save.eventHistory??[]).slice(-3).reverse();if(!recent.length)return;const rail=document.createElement('section');rail.className='phase-event-history';rail.innerHTML='<div class="phase-history-head"><div><span class="eyebrow">INDUSTRY FEED</span><h2>Recent moments</h2></div><button class="secondary-btn">Open event</button></div><div class="phase-history-grid">'+recent.map(item=>'<article><span>✦</span><div><b>'+esc(item.title)+'</b><small>'+esc(item.choice)+' · '+new Date(item.at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})+'</small></div></article>').join('')+'</div>';rail.querySelector('button')?.addEventListener('click',openRandom);page.appendChild(rail);}
function polish(){eventShell();addHistoryRail();document.querySelectorAll<HTMLElement>('.page > *').forEach((el,i)=>{if(!el.dataset.phaseMotion){el.dataset.phaseMotion='1';el.style.setProperty('--motion-delay',Math.min(i,10)*35+'ms');}});}
const observer=new MutationObserver(()=>{polish();});observer.observe(document.body,{childList:true,subtree:true});
window.setInterval(()=>{maybeEvent();polish();},15000);
window.setTimeout(()=>{polish();if(!reduced())toast('Soundhouse is live','Industry events will appear as your label grows.');},700);
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
