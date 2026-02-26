import type { SiteProfile, UnlockStrategy, UnlockMode } from '../shared/types';
import { STORAGE_PROFILES } from '../shared/constants';
import { getLocal, setLocal } from '../shared/storage';
import { createLogger } from '../shared/logger';

const log = createLogger('site-profiles');

const PROFILE_EXPIRY_DAYS = 30;

async function getAllProfiles(): Promise<Record<string, SiteProfile>> {
  return (await getLocal<Record<string, SiteProfile>>(STORAGE_PROFILES)) ?? {};
}

async function saveAllProfiles(profiles: Record<string, SiteProfile>): Promise<void> {
  await setLocal(STORAGE_PROFILES, profiles);
}

export async function getProfile(domain: string): Promise<SiteProfile | null> {
  const profiles = await getAllProfiles();
  const profile = profiles[domain];
  if (!profile) return null;
  const ageMs = Date.now() - profile.lastVisited;
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  if (ageDays > PROFILE_EXPIRY_DAYS) {
    log.info(`profile expired for ${domain} (${Math.round(ageDays)} days old)`);
    delete profiles[domain];
    await saveAllProfiles(profiles);
    return null;
  }
  return profile;
}

export async function saveProfile(
  domain: string,
  methods: number[],
  strategy: UnlockStrategy,
  success: boolean,
  userMode: UnlockMode
): Promise<void> {
  const profiles = await getAllProfiles();
  profiles[domain] = {
    domain,
    lastVisited: Date.now(),
    methods,
    appliedStrategy: strategy,
    success,
    userMode,
    notes: profiles[domain]?.notes ?? '',
  };
  await saveAllProfiles(profiles);
  log.info(`saved profile for ${domain}: ${methods.length} methods, success=${success}`);
}

export async function clearProfile(domain: string): Promise<void> {
  const profiles = await getAllProfiles();
  delete profiles[domain];
  await saveAllProfiles(profiles);
  log.info(`cleared profile for ${domain}`);
}

export async function updateProfileNotes(domain: string, notes: string): Promise<void> {
  const profiles = await getAllProfiles();
  if (profiles[domain]) {
    profiles[domain]!.notes = notes;
    await saveAllProfiles(profiles);
  }
}

export async function getProfileCount(): Promise<number> {
  const profiles = await getAllProfiles();
  return Object.keys(profiles).length;
}

export async function cleanupExpiredProfiles(): Promise<number> {
  const profiles = await getAllProfiles();
  const now = Date.now();
  let removed = 0;
  for (const [domain, profile] of Object.entries(profiles)) {
    const ageDays = (now - profile.lastVisited) / (24 * 60 * 60 * 1000);
    if (ageDays > PROFILE_EXPIRY_DAYS) {
      delete profiles[domain];
      removed++;
    }
  }
  if (removed > 0) {
    await saveAllProfiles(profiles);
    log.info(`cleaned up ${removed} expired profiles`);
  }
  return removed;
}
