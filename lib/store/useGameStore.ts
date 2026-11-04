import { create } from "zustand";
import type { ArchetypeId } from "@/lib/constants/archetypes";
import type {
  ActionInput,
  Academic,
  GameState,
  Moodlet,
  PlayerStateApiData,
  Profile,
  Spatial,
  Vitals,
} from "@/types/game";

// TUNABLE: base hourly decay rates (%/hr) — source: .docs/03_GAME_ENGINE.md §2.1
const BASE_RATE: Record<keyof Vitals, number> = {
  hunger: 4.16,
  energy: 3.5,
  morale: 2.5,
  health: 1.5,
};

// TUNABLE: archetype decay multipliers — source: .docs/03_GAME_ENGINE.md §2.2
const ARCH_MOD: Record<ArchetypeId, Record<keyof Vitals, number>> = {
  nepo_baby: { hunger: 1.3, energy: 1.2, morale: 1.35, health: 1.0 },
  campus_hustler: { hunger: 0.8, energy: 0.85, morale: 0.85, health: 1.0 },
};

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

const VITAL_KEYS: ReadonlyArray<keyof Vitals> = [
  "hunger",
  "energy",
  "morale",
  "health",
];

const DEFAULT_PROFILE: Profile = {
  handle: "",
  archetype: "campus_hustler",
  walletBalance: 0,
};

const DEFAULT_VITALS: Vitals = {
  hunger: 100,
  energy: 100,
  morale: 100,
  health: 100,
};

const DEFAULT_ACADEMIC: Academic = { cgpa: 0, devotion: 0, sdcHeat: 0 };

const DEFAULT_SPATIAL: Spatial = {
  currentVenue: "",
  spotId: "",
  currentPose: "idle",
  isSleeping: false,
};

interface GameActions {
  hydrate: (data: PlayerStateApiData) => void;
  executeAction: (action: ActionInput) => void;
  saveToServer: () => Promise<void>;
}

type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()((set, get) => ({
  profile: DEFAULT_PROFILE,
  vitals: DEFAULT_VITALS,
  academic: DEFAULT_ACADEMIC,
  spatial: DEFAULT_SPATIAL,
  simTimeMinutes: 0,
  loaded: false,

  hydrate: (data: PlayerStateApiData): void => {
    set({
      profile: {
        handle: data.student.handle,
        archetype: data.student.archetype as ArchetypeId,
        walletBalance: data.student.wallet_balance,
      },
      vitals: data.simulation.vitals,
      academic: {
        cgpa: data.simulation.cgpa,
        devotion: data.simulation.devotion,
        sdcHeat: data.simulation.sdcHeat,
      },
      spatial: {
        currentVenue: data.simulation.currentVenue,
        spotId: data.simulation.spotId ?? "",
        // current_pose is not returned by the state route — default to idle
        currentPose: "idle",
        isSleeping: data.simulation.isSleeping,
      },
      // sim_time_minutes is not returned by the state route — starts at Day 1 · 00:00
      simTimeMinutes: 0,
      loaded: true,
    });
  },

  executeAction: (action: ActionInput): void => {
    set((state) => {
      const { vitals, academic, simTimeMinutes } = state;
      const archetype = state.profile.archetype;
      const mod = ARCH_MOD[archetype];
      const deltaHours = action.durationMinutes / 60;

      // Step 1: apply decay to each vital
      const decayed = { ...vitals };
      for (const key of VITAL_KEYS) {
        decayed[key] = clamp(
          0,
          100,
          vitals[key] - BASE_RATE[key] * mod[key] * deltaHours,
        );
      }

      // Step 2: apply gains on top of decayed values
      const newVitals = { ...decayed };
      if (action.gains) {
        for (const key of VITAL_KEYS) {
          const gain = action.gains[key] ?? 0;
          newVitals[key] = clamp(0, 100, decayed[key] + gain);
        }
      }

      return {
        vitals: newVitals,
        academic: {
          cgpa: clamp(0, 5, academic.cgpa + (action.cgpaDelta ?? 0)),
          devotion: clamp(
            0,
            100,
            academic.devotion + (action.devotionDelta ?? 0),
          ),
          sdcHeat: academic.sdcHeat,
        },
        simTimeMinutes: simTimeMinutes + action.durationMinutes,
      };
    });

    void get().saveToServer();
  },

  saveToServer: async (): Promise<void> => {
    const { vitals, academic, spatial, simTimeMinutes } = get();

    const moodlets: Moodlet[] = [];

    const body = {
      simTimeMinutes,
      vitals,
      academic: {
        cgpa: academic.cgpa,
        devotion: academic.devotion,
        sdcHeat: academic.sdcHeat,
      },
      spatial: {
        currentVenue: spatial.currentVenue,
        spotId: spatial.spotId,
        currentPose: spatial.currentPose,
        isSleeping: spatial.isSleeping,
      },
      moodlets,
      financialDiff: { walletDelta: 0, bankDelta: 0, reason: "action" },
    };

    const res = await fetch("/api/player/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[GameStore] save failed", res.status);
    }
  },
}));
