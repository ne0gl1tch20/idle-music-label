export type GameSettings = {
  theme: 'system' | 'dark' | 'light' | 'amoled';
  accent: 'violet' | 'blue' | 'rose' | 'mint' | 'amber' | 'custom';
  customAccent: string;
  musicEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  masterVolume: number;
  sfxVolume: number;
  notificationsEnabled: boolean;
  reducedMotion: boolean;
  reduceFlashes: boolean;
  compactLayout: boolean;
  fontScale: 0.9 | 1 | 1.1 | 1.2;
};
export const DEFAULT_SETTINGS: GameSettings = {
  theme: 'system', accent: 'violet', customAccent: '#b69aff',
  musicEnabled: false, soundEnabled: true, vibrationEnabled: true,
  masterVolume: 0.7, sfxVolume: 0.65, notificationsEnabled: false,
  reducedMotion: false, reduceFlashes: false, compactLayout: false, fontScale: 1,
};
const KEY = 'idle-music-label.settings.v1';
const accents: Record<Exclude<GameSettings['accent'],'custom'>,string> = {
  violet:'#b69aff', blue:'#75baff', rose:'#ff91b6', mint:'#76dfb2', amber:'#ffc36e'
};
export function loadSettings(reset = false): GameSettings {
  if (reset) localStorage.removeItem(KEY);
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<GameSettings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    if (!/^#[0-9a-fA-F]{6}$/.test(merged.customAccent)) merged.customAccent = DEFAULT_SETTINGS.customAccent;
    merged.masterVolume = Math.max(0, Math.min(1, Number(merged.masterVolume) || 0));
    merged.sfxVolume = Math.max(0, Math.min(1, Number(merged.sfxVolume) || 0));
    if (![0.9,1,1.1,1.2].includes(merged.fontScale)) merged.fontScale = 1;
    return merged;
  } catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(settings: GameSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
export function applySettings(settings: GameSettings): void {
  const root = document.documentElement;
  const systemLight = window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
  const theme = settings.theme === 'system' ? (systemLight ? 'light' : 'dark') : settings.theme;
  root.dataset.theme = theme;
  root.dataset.reduceFlashes = String(settings.reduceFlashes);
  root.dataset.reducedMotion = String(settings.reducedMotion);
  root.dataset.compact = String(settings.compactLayout);
  const accent = settings.accent === 'custom' ? settings.customAccent : accents[settings.accent];
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--purple', accent);
  root.style.setProperty('--font-scale', String(settings.fontScale));
  root.style.fontSize = (settings.fontScale * 16) + 'px';
  if (settings.reducedMotion) root.dataset.reducedMotion = 'true';
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'light' ? '#f4f1f8' : theme === 'amoled' ? '#000000' : '#100f16';
}