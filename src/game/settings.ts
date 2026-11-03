export type GameSettings = {
 theme:'system'|'dark'|'light'|'amoled'; accent:'violet'|'blue'|'rose'|'mint'|'amber';
 customAccent:string; fontScale:0.9|1|1.1|1.2; compactLayout:boolean;
 musicEnabled:boolean; soundEnabled:boolean; masterVolume:number; sfxVolume:number;
 vibrationEnabled:boolean; reducedMotion:boolean; reduceFlashes:boolean; notificationsEnabled:boolean;
};
export const DEFAULT_SETTINGS:GameSettings={theme:'system',accent:'violet',customAccent:'#b69aff',fontScale:1,compactLayout:false,musicEnabled:false,soundEnabled:true,masterVolume:.65,sfxVolume:.7,vibrationEnabled:false,reducedMotion:false,reduceFlashes:false,notificationsEnabled:false};
const KEY='idle-music-label.settings.v1';
export function loadSettings(reset=false):GameSettings {
 if(reset){localStorage.removeItem(KEY);return {...DEFAULT_SETTINGS};}
 try {const raw=localStorage.getItem(KEY);return raw?{...DEFAULT_SETTINGS,...JSON.parse(raw)}:{...DEFAULT_SETTINGS};}catch{return {...DEFAULT_SETTINGS};}
}
export function saveSettings(value:GameSettings):void {localStorage.setItem(KEY,JSON.stringify(value));}
export function applySettings(value:GameSettings):void {
 const root=document.documentElement;
 root.dataset.theme=value.theme;root.dataset.accent=value.accent;
 root.style.setProperty('--user-accent',value.customAccent);
 root.style.setProperty('--font-scale',String(value.fontScale));
 root.classList.toggle('compact-layout',value.compactLayout);
 root.classList.toggle('reduce-motion',value.reducedMotion);
 root.classList.toggle('reduce-flashes',value.reduceFlashes);
}
