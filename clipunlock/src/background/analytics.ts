import { STORAGE_STATS } from '../shared/constants';
import { getLocal, setLocal } from '../shared/storage';
import { createLogger } from '../shared/logger';

const log = createLogger('analytics');

export interface UsageStats {
  totalUnlocks: number;
  totalCopies: number;
  totalWatermarksStripped: number;
  methodsEncountered: Record<number, number>;
  domainsUnlocked: number;
  firstUsed: number;
  lastUsed: number;
  sessionCount: number;
}

const DEFAULT_STATS: UsageStats = {
  totalUnlocks: 0,
  totalCopies: 0,
  totalWatermarksStripped: 0,
  methodsEncountered: {},
  domainsUnlocked: 0,
  firstUsed: 0,
  lastUsed: 0,
  sessionCount: 0,
};

async function getStats(): Promise<UsageStats> {
  const stats = await getLocal<UsageStats>(STORAGE_STATS);
  return stats ?? { ...DEFAULT_STATS, firstUsed: Date.now() };
}

async function saveStats(stats: UsageStats): Promise<void> {
  stats.lastUsed = Date.now();
  await setLocal(STORAGE_STATS, stats);
}

export async function trackUnlock(methodIds: number[]): Promise<void> {
  const stats = await getStats();
  stats.totalUnlocks++;
  for (const id of methodIds) {
    stats.methodsEncountered[id] = (stats.methodsEncountered[id] ?? 0) + 1;
  }
  await saveStats(stats);
}

export async function trackCopy(watermarkStripped: boolean): Promise<void> {
  const stats = await getStats();
  stats.totalCopies++;
  if (watermarkStripped) stats.totalWatermarksStripped++;
  await saveStats(stats);
}

export async function trackSession(): Promise<void> {
  const stats = await getStats();
  stats.sessionCount++;
  await saveStats(stats);
}

export async function getUsageStats(): Promise<UsageStats> {
  return getStats();
}

export async function resetStats(): Promise<void> {
  await setLocal(STORAGE_STATS, { ...DEFAULT_STATS, firstUsed: Date.now() });
  log.info('stats reset');
}
