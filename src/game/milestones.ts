import type { GameSave } from './types';

export type Milestone = {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardCash: number;
  rewardFans: number;
  rewardReputation: number;
  progress: (save: GameSave) => number;
};

export const MILESTONES: Milestone[] = [
  { id: 'first-artist', title: 'First signing', description: 'Sign your first artist to the label.', target: 1, rewardCash: 250, rewardFans: 80, rewardReputation: 1, progress: save => save.artists.length },
  { id: 'first-release', title: 'First release', description: 'Put your first single out into the world.', target: 1, rewardCash: 350, rewardFans: 120, rewardReputation: 2, progress: save => save.tracks.filter(track => track.releasedAt !== null).length },
  { id: 'five-releases', title: 'A growing catalog', description: 'Build a catalog of five released tracks.', target: 5, rewardCash: 900, rewardFans: 300, rewardReputation: 2, progress: save => save.tracks.filter(track => track.releasedAt !== null).length },
  { id: 'ten-thousand-streams', title: 'First 10K', description: 'Reach 10,000 total streams across your catalog.', target: 10000, rewardCash: 700, rewardFans: 450, rewardReputation: 2, progress: save => save.totalStreams },
  { id: 'hundred-thousand-streams', title: 'On repeat', description: 'Reach 100,000 total streams.', target: 100000, rewardCash: 2400, rewardFans: 1200, rewardReputation: 4, progress: save => save.totalStreams },
  { id: 'five-artists', title: 'Creative collective', description: 'Grow your roster to five signed artists.', target: 5, rewardCash: 1800, rewardFans: 700, rewardReputation: 3, progress: save => save.artists.length },
  { id: 'studio-five', title: 'World-class studio', description: 'Upgrade your recording studio to level five.', target: 5, rewardCash: 1500, rewardFans: 250, rewardReputation: 3, progress: save => save.studioLevel },
  { id: 'lifetime-ten-thousand', title: 'Business is booming', description: 'Earn $10,000 over the lifetime of your label.', target: 10000, rewardCash: 2000, rewardFans: 800, rewardReputation: 3, progress: save => save.lifetimeEarnings },
];

export function milestoneProgress(save: GameSave, milestone: Milestone): number {
  return Math.max(0, milestone.progress(save));
}

export function claimMilestone(save: GameSave, id: string): boolean {
  const milestone = MILESTONES.find(item => item.id === id);
  if (!milestone || save.claimedMilestones.includes(id) || milestoneProgress(save, milestone) < milestone.target) return false;
  save.claimedMilestones.push(id);
  save.cash += milestone.rewardCash;
  save.fans += milestone.rewardFans;
  save.reputation += milestone.rewardReputation;
  save.lifetimeEarnings += milestone.rewardCash;
  return true;
}
