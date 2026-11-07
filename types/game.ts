export type { ArchetypeId } from "@/lib/constants/archetypes";
import type { ArchetypeId } from "@/lib/constants/archetypes";

export interface Vitals {
  hunger: number;
  energy: number;
  morale: number;
  health: number;
}

export interface Profile {
  handle: string;
  archetype: ArchetypeId;
  walletBalance: number;
}

export interface Academic {
  cgpa: number;
  devotion: number;
  sdcHeat: number;
}

export interface Spatial {
  currentVenue: string;
  spotId: string;
  currentPose: string;
  isSleeping: boolean;
}

export interface Moodlet {
  id: string;
  expiresAtSimMinute: number;
}

export interface ActionInput {
  durationMinutes: number;
  gains?: Partial<Vitals>;
  cgpaDelta?: number;
  devotionDelta?: number;
}

/** Minimal shape of GET /api/player/state response `.data` used by hydrate(). */
export interface PlayerStateApiData {
  student: {
    handle: string;
    archetype: string;
    wallet_balance: number;
  };
  simulation: {
    vitals: Vitals;
    cgpa: number;
    devotion: number;
    sdcHeat: number;
    currentVenue: string;
    spotId: string | null;
    isSleeping: boolean;
    moodlets: Moodlet[];
  };
}

export interface ActiveAction {
  id: string;
  label: string;
  remainingMinutes: number;
  gainPerMinute: Partial<Record<keyof Vitals, number>>;
  cgpaPerMinute?: number;
  devotionPerMinute?: number;
}

export interface GameState {
  profile: Profile;
  vitals: Vitals;
  academic: Academic;
  spatial: Spatial;
  simTimeMinutes: number;
  loaded: boolean;
  activeAction: ActiveAction | null;
  lastAllowanceWeek: number;
  pendingWalletDelta: number;
  pendingWalletReason: string;
  pendingWalletRef: string | null;
  allowanceMessage: string | null;
  hustleMessage: string | null;
}
