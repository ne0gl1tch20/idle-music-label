import './style.css';
import type { GameTab, Artist } from './game/types';
import { contractRenewalCost, isContractActive, renewContract } from './game/contracts';
import { launchConcert } from './game/concerts';
import { loadSettings, saveSettings, applySettings, type GameSettings } from './game/settings';
import { contractsPage, concertsPage, settingsPage } from './game/industry-ui';
import { artistCost, artistTrainingCost, createArtist, createTrack, incomePerSecond, marketingCost, RECORDING_COST, RELEASE_COST, releaseTrack, studioCost, tick } from './game/economy';
import { exportSave, importSave, loadSave, persistSave, resetSave } from './game/storage';
import { rankings, timeToChart, claimWeeklyChart } from './game/charts';
import { MILESTONES, milestoneProgress, claimMilestone } from './game/milestones';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing app root');
let { save, offlineSeconds } = loadSave();
let tab: GameTab = 'overview';
let notice = offlineSeconds > 0 ? `Welcome back! Your label earned ${money(incomePerSecond(save) * offlineSeconds)} while you were away.` : '';
let noticeTimer = 0;
let audioContext: AudioContext | null = null;
let settings: GameSettings = loadSettings();
applySettings(settings);
let musicOscillators: OscillatorNode[] = [];
let musicGain: GainNode | null = null;
timeToChart();

function money(value: number): string { return '$' + Math.floor(value).toLocaleString('en-US'); }
function compact(value: number): string { return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.floor(value)); }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char); }
function artistById(id: string): Artist | undefined { return save.artists.find(artist => artist.id === id); }
function ping(): void {
  if (!settings.soundEnabled) return;
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.045 * settings.masterVolume * settings.sfxVolume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + 0.08);
  } catch { /* Optional audio never blocks gameplay. */ }
  if(settings.vibrationEnabled && 'vibrate' in navigator) navigator.vibrate(12);
}
function startMusic():void{if(!settings.musicEnabled||musicOscillators.length)return;try{audioContext??=new AudioContext();if(audioContext.state==='suspended')void audioContext.resume();musicGain=audioContext.createGain();musicGain.gain.value=.012*settings.masterVolume;musicGain.connect(audioContext.destination);[110,164.81,220].forEach((hz,i)=>{const o=audioContext!.createOscillator();o.type=i===1?'sine':'triangle';o.frequency.value=hz;o.connect(musicGain!);o.start();musicOscillators.push(o);});}catch{/* optional audio */}}
function stopMusic():void{musicOscillators.forEach(o=>{try{o.stop();}catch{/* stopped */}});musicOscillators=[];musicGain?.disconnect();musicGain=null;}
function announce(message: string): void {
  notice = message; window.clearTimeout(noticeTimer); render();
  noticeTimer = window.setTimeout(() => { notice = ''; render(); }, 4200);
}
function navButton(id: GameTab, label: string, symbol: string): string {
  return `<button class="nav-item ${tab === id ? 'active' : ''}" data-tab="${id}"><span>${symbol}</span>${label}</button>`;
}
function stat(label: string, value: string, detail: string, id: string): string {
  return `<article class="stat-card"><span>${label}</span><strong id="${id}">${value}</strong><small>${detail}</small></article>`;
}
function heading(): string { return ({ overview: 'Build your sound.', artists: 'Find your next star.', studio: 'Make the next hit.', releases: 'Put music out there.', charts: 'Climb the charts.', milestones: 'Celebrate every milestone.', contracts: 'Build lasting partnerships.', concerts: 'Take the music live.', settings: 'Make it yours.', label: 'Run the business.' })[tab]; }
function subheading(): string { return ({ overview: 'Turn a tiny independent label into a music powerhouse.', artists: 'Sign artists, discover genres and grow your creative roster.', studio: 'Invest in better equipment and make every release count.', releases: 'Produce singles, launch them and build your catalog.', charts: 'Track your biggest songs and collect weekly chart rewards.', milestones: 'Complete label goals and claim one-time rewards.', contracts: 'Renew artist deals and create collaborations.', concerts: 'Book shows, sell tickets and grow your audience.', settings: 'Customize the look, sound and feel of your label office.', label: 'Keep your label healthy and protect your progress.' })[tab]; }
function shell(content: string): string {
  return `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#" data-tab="overview"><span class="brand-mark">♫</span><span>SOUNDHOUSE<small>INDEPENDENT LABEL</small></span></a><div class="nav-caption">MANAGEMENT</div><nav>${navButton('overview', 'Dashboard', '▦')}${navButton('artists', 'Artists', '♬')}${navButton('studio', 'Studio', '⌘')}${navButton('releases', 'Releases', '◉')}${navButton('charts', 'Charts', '♛')}${navButton('milestones', 'Milestones', '✦')}${navButton('contracts', 'Contracts', '♧')}${navButton('concerts', 'Concerts', '♫')}${navButton('settings', 'Settings', '⚙')}${navButton('label', 'Label office', '▤')}</nav><div class="sidebar-bottom"><span class="online-dot"></span> LABEL STATUS<strong>Independent</strong><small>Built from the ground up.</small></div></aside><main class="main-area"><header class="topbar"><span class="mobile-brand">♫ SOUNDHOUSE</span><span class="breadcrumb">LABEL OFFICE <b>/</b> ${tab.toUpperCase()}</span><span class="save-status"><i></i> Saved on this device</span></header><div class="page"><section class="page-heading"><div><span class="eyebrow">✦ YOUR INDEPENDENT MUSIC EMPIRE</span><h1>${heading()}</h1><p>${subheading()}</p></div><span class="day-chip">✦ INDEPENDENT LABEL · LIVE</span></section><section class="stats-grid">${stat('AVAILABLE CASH', money(save.cash), `+${money(incomePerSecond(save))} / second`, 'cash-stat')}${stat('MONTHLY LISTENERS', compact(save.fans), 'Your growing fanbase', 'fans-stat')}${stat('TOTAL STREAMS', compact(save.totalStreams), 'Across your catalog', 'streams-stat')}${stat('LABEL REPUTATION', 'LEVEL ' + save.reputation, 'Earned through releases', 'rep-stat')}</section>${notice ? `<div class="notice" role="status">✦ ${escapeHtml(notice)}</div>` : ''}${content}<footer>♫ SOUNDHOUSE LABEL MANAGER <span>Progress saves automatically · Offline earnings capped at 8 hours</span></footer></div></main><nav class="mobile-nav">${navButton('overview','Home','▦')}${navButton('artists','Artists','♬')}${navButton('releases','Music','◉')}${navButton('concerts','Live','♫')}${navButton('settings','Settings','⚙')}</nav></div>`;
}
function overview(): string {
  const next = save.artists.length === 0 ? 'Sign your first artist' : save.tracks.some(track => !track.releasedAt) ? 'Release your first single' : 'Grow your studio';
  return `<section class="hero-panel"><div><span class="eyebrow">✦ THE LABEL JOURNEY</span><h2>Small label.<br>Big sound.</h2><p>Discover talent, record unforgettable tracks and turn listeners into a loyal fanbase.</p><button class="primary-btn" data-tab="artists">Explore artists <span>→</span></button></div><div class="hero-record"><div>♫</div></div><div class="hero-glow"></div></section><div class="section-heading"><div><span class="eyebrow">YOUR NEXT MOVE</span><h2>Keep the momentum</h2></div><span class="muted-label">ONE STEP AT A TIME</span></div><section class="quick-grid"><button class="quick-card" data-tab="artists"><span class="quick-icon">♬</span><span><b>Discover artists</b><small>Build your creative roster.</small></span><i>→</i></button><button class="quick-card" data-tab="studio"><span class="quick-icon">⌘</span><span><b>Upgrade your studio</b><small>Increase your passive income.</small></span><i>→</i></button><button class="quick-card" data-tab="releases"><span class="quick-icon">◉</span><span><b>Produce a single</b><small>Get your next track ready.</small></span><i>→</i></button></section><div class="section-heading"><div><span class="eyebrow">LABEL SNAPSHOT</span><h2>At a glance</h2></div></div><section class="snapshot-grid"><div><small>ARTISTS SIGNED</small><b>${save.artists.length}</b></div><div><small>TRACKS RELEASED</small><b>${save.tracks.filter(track => track.releasedAt).length}</b></div><div><small>STUDIO LEVEL</small><b>${save.studioLevel}</b></div><div><small>LIFETIME EARNINGS</small><b>${money(save.lifetimeEarnings)}</b></div></section><p class="next-hint">Your next milestone: <strong>${next}</strong></p>`;
}
const artistNames = ['Mika Sol','Neon June','Kai Rivers','Luna Bloom','The Paper Satellites','Echo Park'];
const genres = ['Indie pop','Electronic','R&B','Alternative','Bedroom pop','Lo-fi'];
function artistsPage(): string {
  const roster = save.artists.length ? save.artists.map(artist => `<article class="roster-card"><div class="artist-avatar">${escapeHtml(artist.name.slice(0,1))}</div><div class="roster-info"><span class="eyebrow">SIGNED ARTIST · LEVEL ${artist.level}</span><h3>${escapeHtml(artist.name)}</h3><p>${escapeHtml(artist.genre)} · ${compact(artist.fans)} fans</p></div><button class="train-btn" data-action="train" data-id="${artist.id}" title="Train artist · ${money(artistTrainingCost(artist.level))}">Train ↗</button></article>`).join('') : '<div class="empty-state"><span>♬</span><b>Your roster is empty.</b><p>Every great label starts by discovering one great artist.</p></div>';
  const index = save.artists.length % artistNames.length, cost = artistCost(save.artists.length);
  return `<section class="feature-row"><div><span class="eyebrow">TALENT SCOUTING</span><h2>Discover fresh talent.</h2><p>Sign an artist to unlock new music and grow your label's earning potential.</p></div><div class="scout-card"><span class="artist-avatar large">${artistNames[index].slice(0,1)}</span><span class="eyebrow">UPCOMING ARTIST</span><h3>${artistNames[index]}</h3><p>${genres[index]}</p><button class="primary-btn" data-action="recruit" ${save.cash < cost ? 'disabled' : ''}>Sign artist · ${money(cost)}</button></div></section><div class="section-heading"><div><span class="eyebrow">YOUR TALENT</span><h2>Artist roster <small class="count-pill">${save.artists.length}</small></h2></div></div><section class="roster-list">${roster}</section>`;
}
function studioPage(): string {
  const sCost = studioCost(save.studioLevel), mCost = marketingCost(save.marketingLevel);
  return `<div class="section-heading"><div><span class="eyebrow">PRODUCTION DEPARTMENT</span><h2>Build your facilities</h2><p>Every upgrade adds to your label's passive income.</p></div></div><section class="upgrade-grid"><article class="upgrade-card"><div class="upgrade-art studio-art">⌘</div><div class="upgrade-body"><span class="eyebrow">EQUIPMENT · LEVEL ${save.studioLevel}</span><h3>Recording studio</h3><p>Better microphones, mixing desks and recording equipment.</p><div class="upgrade-bottom"><strong>${money(sCost)}</strong><button class="primary-btn" data-action="studio" ${save.cash < sCost ? 'disabled' : ''}>Upgrade ↗</button></div></div></article><article class="upgrade-card"><div class="upgrade-art promo-art">◉</div><div class="upgrade-body"><span class="eyebrow">PROMOTION · LEVEL ${save.marketingLevel}</span><h3>Marketing team</h3><p>Campaigns and social buzz bring in new listeners over time.</p><div class="upgrade-bottom"><strong>${money(mCost)}</strong><button class="primary-btn" data-action="marketing" ${save.cash < mCost ? 'disabled' : ''}>Upgrade ↗</button></div></div></article></section><div class="section-heading"><div><span class="eyebrow">INCOME BREAKDOWN</span><h2>Where revenue comes from</h2></div></div><section class="income-panel"><div><span>Recording studio</span><b>${money(save.studioLevel * 1.4)}/sec</b></div><div><span>Marketing team</span><b>${money(save.marketingLevel * 1.1)}/sec</b></div><div><span>Released catalog</span><b>${money(save.tracks.reduce((sum, track) => sum + (track.releasedAt ? track.quality * .12 : 0), 0))}/sec</b></div><div><span>Artist roster</span><b>${money(save.artists.reduce((sum, artist) => sum + artist.level * .65, 0))}/sec</b></div><div class="income-total"><span>Total passive income</span><b>${money(incomePerSecond(save))}/sec</b></div></section>`;
}
function releasesPage(): string {
  const ready = save.tracks.filter(track => !track.releasedAt), released = save.tracks.filter(track => track.releasedAt);
  const artists = save.artists.map(artist => `<option value="${escapeHtml(artist.id)}">${escapeHtml(artist.name)} · ${escapeHtml(artist.genre)}</option>`).join('');
  const cards = released.length ? released.map(track => `<article class="track-card"><div class="track-cover"><span>♫</span><small>${escapeHtml(track.genre)}</small></div><div class="track-info"><span class="eyebrow">SINGLE · LIVE</span><h3>${escapeHtml(track.title)}</h3><p>${escapeHtml(artistById(track.artistId)?.name ?? 'Unknown artist')}</p><div class="track-metrics"><span>◉ ${compact(track.streams)} streams</span><b>QUALITY ${track.quality}/100</b></div></div></article>`).join('') : '<div class="empty-state"><span>◉</span><b>No releases yet.</b><p>Record a track and send it out into the world.</p></div>';
  return `<section class="recording-panel"><div><span class="eyebrow">THE RECORDING BOOTH</span><h2>Make something<br>worth listening to.</h2><p>Choose an artist and record a new single. Better studios make higher-quality tracks.</p></div><div class="recording-form"><label for="track-title">TRACK TITLE</label><input id="track-title" maxlength="32" placeholder="e.g. Midnight Memories"><label for="track-artist">PERFORMING ARTIST</label><select id="track-artist" ${save.artists.length === 0 ? 'disabled' : ''}><option value="">Choose an artist</option>${artists}</select><div class="recording-cost"><span>Recording session</span><b>${money(RECORDING_COST)}</b></div><button class="primary-btn full-btn" data-action="record" ${save.artists.length === 0 || save.cash < RECORDING_COST ? 'disabled' : ''}>Record track ↗</button>${save.artists.length === 0 ? '<small class="form-hint">Sign an artist before recording music.</small>' : ''}</div></section>${ready.length ? `<div class="section-heading"><div><span class="eyebrow">READY FOR DISTRIBUTION</span><h2>Unreleased tracks</h2></div></div><section class="ready-list">${ready.map(track => `<article class="ready-track"><div class="mini-cover">♫</div><div><b>${escapeHtml(track.title)}</b><small>${escapeHtml(artistById(track.artistId)?.name ?? 'Unknown artist')} · Quality ${track.quality}/100</small></div><button class="primary-btn" data-action="release" data-id="${track.id}" ${save.cash < RELEASE_COST ? 'disabled' : ''}>Release · ${money(RELEASE_COST)}</button></article>`).join('')}</section>` : ''}<div class="section-heading"><div><span class="eyebrow">DISTRIBUTION</span><h2>Your discography</h2></div><span class="muted-label">${released.length} RELEASES</span></div><section class="track-grid">${cards}</section>`;
}
function chartsPage(): string {
 const ranked=rankings(save);
 const rows=ranked.length?ranked.map((track,index)=>{
  const artist=artistById(track.artistId),prize=['$1,200','$650','$300'][index]??'—';
  return '<article class="chart-row"><span class="chart-rank">#'+(index+1)+'</span><div class="chart-cover">♫</div><div class="chart-song"><b>'+escapeHtml(track.title)+'</b><small>'+escapeHtml(artist?.name??'Unknown artist')+' · '+escapeHtml(track.genre)+'</small></div><div class="chart-streams"><b>'+compact(track.weeklyStreams??0)+'</b><small>this week</small></div><div class="chart-prize"><b>'+prize+'</b><small>weekly prize</small></div></article>';
 }).join(''):'<div class="empty-state"><span>♛</span><b>Your chart is waiting.</b><p>Streams earned this week will decide the leaderboard.</p></div>';
 const seconds=timeToChart(),days=Math.floor(seconds/86400),hours=Math.floor((seconds%86400)/3600);
 const history=(save.chartHistory??[]).slice().reverse().slice(0,3).map(cycle=>{
  const winners=cycle.winners.length?cycle.winners.map(w=>'<span>#'+w.rank+' '+escapeHtml(w.trackTitle)+' · '+compact(w.streams)+' streams</span>').join(''):'<span>No chart entries that week.</span>';
  return '<article class="chart-history-card"><b>Week ended '+new Date(cycle.endedAt).toLocaleDateString()+'</b><div>'+winners+'</div></article>';
 }).join('');
 return '<section class="chart-feature"><div><span class="eyebrow">SOUNDHOUSE TOP 10</span><h2>Every week is a new race.</h2><p>Rankings use streams earned during this chart week only. Lifetime streams stay on each release, while the weekly counter resets after rewards are paid.</p></div><div class="chart-countdown"><small>NEXT CHART PAYOUT</small><b>'+days+'d '+hours+'h</b><span>WEEKLY CHART</span></div></section><div class="section-heading"><div><span class="eyebrow">CURRENT WEEK</span><h2>Live rankings</h2></div><span class="muted-label">'+ranked.length+' TRACKS</span></div><section class="chart-list">'+rows+'</section><p class="chart-footnote">Top three rewards are paid automatically every seven days. Your previous chart winners are saved below.</p><div class="section-heading"><div><span class="eyebrow">YOUR LABEL HISTORY</span><h2>Previous chart weeks</h2></div></div><section class="chart-history-list">'+(history||'<div class="empty-state"><b>No completed chart weeks yet.</b><p>Your first results will appear after the weekly payout.</p></div>')+'</section>';
}

function milestonesPage(): string {
  const cards = MILESTONES.map(milestone => {
    const progress = milestoneProgress(save, milestone);
    const complete = progress >= milestone.target;
    const claimed = save.claimedMilestones.includes(milestone.id);
    const percent = Math.min(100, Math.floor(progress / milestone.target * 100));
    const status = claimed ? 'REWARD CLAIMED' : complete ? 'GOAL COMPLETE' : 'IN PROGRESS';
    const button = claimed ? '<button class="secondary-btn" disabled>Claimed ✓</button>' : '<button class="primary-btn" data-action="claim-milestone" data-id="' + milestone.id + '" ' + (!complete ? 'disabled' : '') + '>Claim reward</button>';
    return '<article class="milestone-card"><div class="milestone-top"><span class="milestone-icon">✦</span><span class="eyebrow">' + status + '</span></div><h3>' + milestone.title + '</h3><p>' + milestone.description + '</p><div class="milestone-progress"><span style="width:' + percent + '%"></span></div><div class="milestone-bottom"><small>' + compact(Math.min(progress, milestone.target)) + ' / ' + compact(milestone.target) + '</small><b>' + money(milestone.rewardCash) + ' · ' + compact(milestone.rewardFans) + ' fans</b></div>' + button + '</article>';
  }).join('');
  const completed = MILESTONES.filter(m => save.claimedMilestones.includes(m.id)).length;
  return '<section class="milestone-feature"><div><span class="eyebrow">LABEL HALL OF FAME</span><h2>Every great label has a story.</h2><p>Hit meaningful goals as your company grows. Each reward can only be claimed once and is saved with your label.</p></div><div class="milestone-count"><b>' + completed + ' / ' + MILESTONES.length + '</b><small>REWARDS CLAIMED</small></div></section><div class="section-heading"><div><span class="eyebrow">YOUR PROGRESSION</span><h2>Label milestones</h2></div></div><section class="milestone-grid">' + cards + '</section>';
}

function labelPage(): string {
  return `<section class="office-panel"><span class="eyebrow">LABEL MANAGEMENT</span><h2>Keep your progress safe.</h2><p>Your save lives on this device. Export a backup before clearing browser data or moving to another device.</p><div class="office-actions"><button class="primary-btn" data-action="export">↓ Export save file</button><button class="secondary-btn" data-action="import">↑ Import save file</button><input id="save-import" type="file" accept="application/json,.json" hidden></div></section><section class="office-panel danger-panel"><span class="eyebrow">START FRESH</span><h2>Reset your label</h2><p>This permanently replaces your current local save with a new label. Export a backup first if you want to keep your progress.</p><button class="danger-btn" data-action="reset">Reset all progress</button></section><section class="office-panel"><span class="eyebrow">ABOUT THIS GAME</span><h2>Soundhouse Label Manager</h2><p>An offline-first idle music label game. No account, analytics or forced ads. Your save stays in your browser or app storage.</p><div class="about-meta"><span>GAME VERSION <b>0.2.0</b></span><span>SAVE FORMAT <b>v2</b></span></div></section>`;
}
function render(): void {
  const content = ({ overview, artists: artistsPage, studio: studioPage, releases: releasesPage, charts: chartsPage, milestones: milestonesPage, contracts: () => contractsPage(save), concerts: () => concertsPage(save), settings: () => settingsPage(settings), label: labelPage })[tab]();
  root!.innerHTML = shell(content);
}
function refreshLiveStats(): void {
  const cash = root!.querySelector('#cash-stat'); if (cash) cash.textContent = money(save.cash);
  const fans = root!.querySelector('#fans-stat'); if (fans) fans.textContent = compact(save.fans);
  const streams = root!.querySelector('#streams-stat'); if (streams) streams.textContent = compact(save.totalStreams);
}
function commit(): void { persistSave(save); refreshLiveStats(); }
function handleAction(action: string, target: HTMLElement): void {
  if (action === 'recruit') {
    const cost = artistCost(save.artists.length); if (save.cash < cost) return announce('Not enough cash to sign this artist yet.');
    const index = save.artists.length % artistNames.length; save.cash -= cost;
    const artist = createArtist(`artist-${Date.now()}`, artistNames[index], genres[index]); artist.contractEndsAt = Date.now() + 28 * 86400000; artist.royaltyPercent = 20; save.artists.push(artist);
    ping(); commit(); announce(`${artistNames[index]} has joined your label!`); return;
  }
  if (action === 'renew-contract') { const artist=artistById(target.dataset.id??''); if(!artist)return; const cost=contractRenewalCost(artist); if(save.cash<cost)return announce('Not enough cash to renew this artist.'); save.cash-=cost; renewContract(artist); commit(); ping(); announce(artist.name+' has a new 28-day deal.'); render(); return; }
  if (action === 'collaborate') { const title=root!.querySelector<HTMLInputElement>('#collab-title')?.value.trim()??''; const first=artistById(root!.querySelector<HTMLSelectElement>('#collab-one')?.value??''); const second=artistById(root!.querySelector<HTMLSelectElement>('#collab-two')?.value??''); if(!title||!first||!second||first.id===second.id)return announce('Choose a title and two different artists.'); if(!isContractActive(first)||!isContractActive(second))return announce('Both artists need active contracts.'); if(save.cash<300)return announce('Not enough cash for a collaboration.'); save.cash-=300; const track=createTrack('track-'+Date.now(),title,first,Math.min(100,55+save.studioLevel*7+first.level*2+second.level*2)); track.collaborators=[second.id]; track.royaltyPercent=Math.min(50,Math.round(((first.royaltyPercent??20)+(second.royaltyPercent??20))/2)); save.tracks.push(track); first.collaborations=(first.collaborations??0)+1; second.collaborations=(second.collaborations??0)+1; commit(); ping(); announce(first.name+' feat. '+second.name+' recorded a collaboration!'); render(); return; }
  if (action === 'concert') { const artist=artistById(root!.querySelector<HTMLSelectElement>('#concert-artist')?.value??''); if(!artist||!isContractActive(artist))return announce('Choose an artist with an active contract.'); const show=launchConcert(save,artist,target.dataset.tier??''); if(!show)return announce('This show is unavailable. Check your budget or artist cooldown.'); commit(); ping(); announce(artist.name+' performed at '+show.venue+' for '+show.attendance.toLocaleString()+' fans!'); render(); return; }
  if (action === 'reset-settings') { settings=loadSettings(true); applySettings(settings); saveSettings(settings); stopMusic(); render(); announce('Settings reset to defaults.'); return; }
  if (action === 'train') {
    const artist = save.artists.find(item => item.id === target.dataset.id);
    if (!artist) return;
    const cost = artistTrainingCost(artist.level);
    if (save.cash < cost) return announce('Not enough cash to train this artist.');
    save.cash -= cost; artist.level += 1; artist.fans += 120;
    ping(); commit(); announce(`${artist.name} finished training and reached level ${artist.level}!`); render(); return;
  }
  if (action === 'studio') {
    const cost = studioCost(save.studioLevel); if (save.cash < cost) return announce('Not enough cash for this upgrade.');
    save.cash -= cost; save.studioLevel += 1; ping(); commit(); announce('Studio upgraded. Your production income increased!'); render(); return;
  }
  if (action === 'marketing') {
    const cost = marketingCost(save.marketingLevel); if (save.cash < cost) return announce('Not enough cash for this campaign.');
    save.cash -= cost; save.marketingLevel += 1; save.fans += 45; ping(); commit(); announce('Marketing campaign launched. New listeners are finding you!'); render(); return;
  }
  if (action === 'record') {
    const title = root!.querySelector<HTMLInputElement>('#track-title')?.value.trim() ?? '';
    const artist = artistById(root!.querySelector<HTMLSelectElement>('#track-artist')?.value ?? '');
    if (!title || !artist) return announce('Add a track title and choose an artist first.');
    if (!isContractActive(artist)) return announce('Renew this artist contract before recording.');
    if (save.cash < RECORDING_COST) return announce('Not enough cash for a recording session.');
    save.cash -= RECORDING_COST;
    const quality = Math.min(100, 42 + save.studioLevel * 7 + artist.level * 3 + Math.floor(Math.random() * 13));
    const track=createTrack(`track-${Date.now()}`, title, artist, quality); track.royaltyPercent=artist.royaltyPercent??20; save.tracks.push(track);
    ping(); commit(); announce(`"${title}" is recorded and ready for release!`); render(); return;
  }
  if (action === 'release') {
    const track = save.tracks.find(item => item.id === target.dataset.id); if (!track || track.releasedAt) return;
    if (save.cash < RELEASE_COST) return announce('Not enough cash to distribute this track.');
    save.cash -= RELEASE_COST; releaseTrack(save, track); ping(); commit(); announce(`"${track.title}" is now live. Your audience is growing!`); render(); return;
  }
  if (action === 'claim-milestone') {
    const id = target.dataset.id ?? '';
    const milestone = MILESTONES.find(item => item.id === id);
    if (!milestone || !claimMilestone(save, id)) return announce('That milestone is not ready to claim.');
    commit(); ping(); announce('Milestone unlocked! You earned ' + money(milestone.rewardCash) + ' and ' + compact(milestone.rewardFans) + ' fans.'); render(); return;
  }
  if (action === 'export') { exportSave(save); announce('Save backup exported. Keep that file somewhere safe!'); return; }
  if (action === 'import') { root!.querySelector<HTMLInputElement>('#save-import')?.click(); return; }
  if (action === 'reset') {
    if (!window.confirm('Reset your entire label? This cannot be undone unless you exported a save backup.')) return;
    save = resetSave(); tab = 'overview'; commit(); announce('A fresh label has been created. Let’s make some music!'); return;
  }
}
root.addEventListener('click', event => {
  if(settings.musicEnabled)startMusic();
  const accent=(event.target as HTMLElement).closest<HTMLElement>('[data-accent]'); if(accent?.dataset.accent){settings.accent=accent.dataset.accent as GameSettings['accent'];applySettings(settings);saveSettings(settings);render();return;}
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-tab], [data-action]');
  if (!target) return;
  if (target.dataset.tab) { event.preventDefault(); tab = target.dataset.tab as GameTab; render(); return; }
  if (target.dataset.action) handleAction(target.dataset.action, target);
});
root.addEventListener('change', async event => {
  const target=event.target as HTMLInputElement|HTMLSelectElement;
  if(target.dataset.setting){const key=target.dataset.setting as keyof GameSettings;if(key==='theme')settings.theme=target.value as GameSettings['theme'];else if(key==='customAccent')settings.customAccent=target.value;else if(key==='fontScale')settings.fontScale=Number(target.value) as GameSettings['fontScale'];else if(target instanceof HTMLInputElement&&target.type==='checkbox')(settings as unknown as Record<string,unknown>)[key]=target.checked;else if(target instanceof HTMLInputElement&&target.type==='range')(settings as unknown as Record<string,unknown>)[key]=Number(target.value);applySettings(settings);saveSettings(settings);if(key==='musicEnabled')settings.musicEnabled?startMusic():stopMusic();if(tab==='settings')render();return;}
  if (!(target instanceof HTMLInputElement)||target.id!=='save-import'||!target.files?.[0]) return;
  try { save = await importSave(target.files[0]); tab = 'overview'; commit(); announce('Save imported successfully. Welcome back!'); render(); }
  catch (error) { announce(error instanceof Error ? error.message : 'Could not import that save file.'); }
});
render();
if(settings.musicEnabled)root.addEventListener('pointerdown',()=>startMusic(),{once:true});
if (offlineSeconds > 0) persistSave(save);
window.setInterval(() => { const reward = claimWeeklyChart(save); if (reward > 0) notice = 'Weekly chart rewards collected: ' + money(reward) + '!'; tick(save, 1); commit(); }, 1000);
window.addEventListener('pagehide', () => persistSave(save));
