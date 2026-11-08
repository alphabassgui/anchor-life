import { create } from "zustand";
import type { ArchetypeId } from "@/lib/constants/archetypes";
import type {
  ActionInput,
  Academic,
  ActiveAction,
  GameState,
  Moodlet,
  PlayerStateApiData,
  Profile,
  Spatial,
  Vitals,
} from "@/types/game";
import { ACTION_PRESETS } from "@/lib/game/actionPresets";

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

// ─── Tunable simulation knobs ─────────────────────────────────────────────
const TICK_INTERVAL_MS  = 5_000;  // real ms between decay ticks
const TICK_GAME_MINUTES = 5;      // game minutes advanced per tick
const OFFLINE_CAP       = 240;   // max game-min of offline catch-up (4 hr)
const SAVE_INTERVAL_MS  = 30_000; // real ms between background saves
const SLEEP_DAMP        = 0.35;   // hunger & energy damping when offline-sleeping
// ──────────────────────────────────────────────────────────────────────────

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
  startAction: (action: ActionInput, label: string) => void;
  saveToServer: () => Promise<void>;
  startSimulationLoop: () => void;
  stopSimulationLoop: () => void;
  handleVisibilityHidden: () => void;
  handleVisibilityVisible: () => Promise<void>;
  callMummy: () => Promise<void>;
  runCodingGig: () => Promise<void>;
  study: () => Promise<void>;
}

type GameStore = GameState & GameActions;

// Mutable closure refs — not Zustand state; changing them never triggers a re-render.
let _tickId: ReturnType<typeof setInterval> | null = null;
let _saveId: ReturnType<typeof setInterval> | null = null;
let _lastActiveAt = 0;

export const useGameStore = create<GameStore>()((set, get) => ({
  profile: DEFAULT_PROFILE,
  vitals: DEFAULT_VITALS,
  academic: DEFAULT_ACADEMIC,
  spatial: DEFAULT_SPATIAL,
  simTimeMinutes: 0,
  loaded: false,
  activeAction: null,
  lastAllowanceWeek: -1,
  pendingWalletDelta: 0,
  pendingWalletReason: "action",
  pendingWalletRef: null,
  allowanceMessage: null,
  hustleMessage: null,
  skillCoding: 0,
  studyMessage: null,
  hoveredAction: null,
  setHoveredAction: (label) => set({ hoveredAction: label }),

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
      skillCoding: data.simulation.skills?.coding ?? 0,
      loaded: true,
    });
  },

  startAction: (action: ActionInput, label: string): void => {
    set(() => {
      const gainPerMinute: Partial<Record<keyof Vitals, number>> = {};
      if (action.gains) {
        for (const key of VITAL_KEYS) {
          const total = action.gains[key];
          if (total !== undefined && total !== 0) {
            gainPerMinute[key] = total / action.durationMinutes;
          }
        }
      }
      const newActive: ActiveAction = {
        id: label,
        label,
        remainingMinutes: action.durationMinutes,
        gainPerMinute,
        cgpaPerMinute:
          action.cgpaDelta !== undefined
            ? action.cgpaDelta / action.durationMinutes
            : undefined,
        devotionPerMinute:
          action.devotionDelta !== undefined
            ? action.devotionDelta / action.durationMinutes
            : undefined,
      };
      return { activeAction: newActive };
    });
  },

  saveToServer: async (): Promise<void> => {
    const {
      vitals,
      academic,
      spatial,
      simTimeMinutes,
      pendingWalletDelta,
      pendingWalletReason,
      pendingWalletRef,
    } = get();

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
      financialDiff: {
        walletDelta: pendingWalletDelta,
        bankDelta: 0,
        reason: pendingWalletReason,
        ...(pendingWalletRef ? { referenceId: pendingWalletRef } : {}),
      },
    };

    const res = await fetch("/api/player/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json = await res.json() as { data?: { syncedWallet?: number } };
      const synced = json.data?.syncedWallet;
      if (typeof synced === "number") {
        set((state) => ({
          profile: { ...state.profile, walletBalance: synced },
          pendingWalletDelta: 0,
          pendingWalletReason: "action",
          pendingWalletRef: null,
        }));
      }
    } else {
      console.error("[GameStore] save failed", res.status);
    }
  },

  stopSimulationLoop: () => {
    if (_tickId !== null) { clearInterval(_tickId); _tickId = null; }
    if (_saveId !== null) { clearInterval(_saveId); _saveId = null; }
  },

  startSimulationLoop: () => {
    if (_tickId !== null) return; // guard against double-start

    _tickId = setInterval(() => {
      let actionJustCompleted = false;
      set((state) => {
        const mod = ARCH_MOD[state.profile.archetype];
        const dh  = TICK_GAME_MINUTES / 60;
        const v   = { ...state.vitals };

        // 1. Passive decay for 5 game minutes
        for (const key of VITAL_KEYS) {
          v[key] = clamp(0, 100, v[key] - BASE_RATE[key] * mod[key] * dh);
        }

        // 2. Active action gains for the same 5 game minutes (net of decay above)
        let newActive = state.activeAction;
        let newAcademic = state.academic;
        if (state.activeAction !== null) {
          const m   = Math.min(TICK_GAME_MINUTES, state.activeAction.remainingMinutes);
          const gpm = state.activeAction.gainPerMinute;
          for (const key of VITAL_KEYS) {
            const g = gpm[key];
            if (g !== undefined) v[key] = clamp(0, 100, v[key] + g * m);
          }
          if (state.activeAction.cgpaPerMinute !== undefined) {
            newAcademic = { ...newAcademic, cgpa: clamp(0, 5, newAcademic.cgpa + state.activeAction.cgpaPerMinute * m) };
          }
          if (state.activeAction.devotionPerMinute !== undefined) {
            newAcademic = { ...newAcademic, devotion: clamp(0, 100, newAcademic.devotion + state.activeAction.devotionPerMinute * m) };
          }
          const remaining = state.activeAction.remainingMinutes - m;
          if (remaining <= 0) {
            newActive = null;
            actionJustCompleted = true;
          } else {
            newActive = { ...state.activeAction, remainingMinutes: remaining };
          }
        }

        return {
          vitals: v,
          academic: newAcademic,
          activeAction: newActive,
          simTimeMinutes: state.simTimeMinutes + TICK_GAME_MINUTES,
        };
      });
      if (actionJustCompleted) void get().saveToServer();
    }, TICK_INTERVAL_MS);

    _saveId = setInterval(() => { void get().saveToServer(); }, SAVE_INTERVAL_MS);
  },

  handleVisibilityHidden: () => {
    _lastActiveAt = Date.now();
    get().stopSimulationLoop();
  },

  callMummy: async (): Promise<void> => {
    let res: Response;
    try {
      res = await fetch("/api/player/allowance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      set({ allowanceMessage: "Couldn't reach Mummy — try again." });
      return;
    }

    const json = await res.json() as {
      success: boolean;
      data?: {
        granted: boolean;
        reason?: string;
        amount?: number;
        sermon?: boolean;
        newWallet?: number;
        week?: number;
      };
    };

    if (!res.ok || !json.success) {
      set({ allowanceMessage: "Couldn't reach Mummy — try again." });
      return;
    }

    const d = json.data!;

    if (!d.granted) {
      set({ allowanceMessage: "You already called Mummy this week." });
      return;
    }

    const { vitals } = get();
    set((state) => ({
      profile: { ...state.profile, walletBalance: d.newWallet! },
      vitals: d.sermon
        ? { ...state.vitals, energy: Math.max(0, vitals.energy - 20) }
        : state.vitals,
      lastAllowanceWeek: d.week!,
      allowanceMessage: d.sermon
        ? `Mummy lectured you — ₦${d.amount!.toLocaleString("en-NG")} and a sermon (−20 energy)`
        : `Mummy sent ₦${d.amount!.toLocaleString("en-NG")} 💸`,
    }));

    // Persist the energy drop if a sermon was delivered (wallet is already server-synced;
    // pendingWalletDelta stays 0 so this save does not credit money again).
    if (d.sermon) {
      void get().saveToServer();
    }
  },

  runCodingGig: async (): Promise<void> => {
    const { vitals } = get();
    if (vitals.energy < 35) {
      set({ hustleMessage: "Too exhausted for a gig — rest first. 🥱" });
      return;
    }

    let res: Response;
    try {
      res = await fetch("/api/player/hustle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hustle: "coding_gig" }),
      });
    } catch {
      set({ hustleMessage: "Gig fell through — try again." });
      return;
    }

    const json = await res.json() as {
      success: boolean;
      data?: {
        granted: boolean;
        amount?: number;
        newWallet?: number;
        reason?: string;
        required?: number;
        current?: number;
      };
    };

    if (!res.ok || !json.success) {
      set({ hustleMessage: "Gig fell through — try again." });
      return;
    }

    const d = json.data!;

    if (!d.granted) {
      set({
        hustleMessage:
          d.reason === "skill_too_low"
            ? "Your coding isn't sharp enough yet — study more. 📚"
            : "Gig fell through — try again.",
      });
      return;
    }

    const { vitals: v } = get();
    set((state) => ({
      profile: { ...state.profile, walletBalance: d.newWallet! },
      vitals: {
        ...state.vitals,
        energy: Math.max(0, v.energy - 35),
        morale: Math.max(0, v.morale - 15),
      },
      hustleMessage: `You earned ₦${d.amount!.toLocaleString("en-NG")} from a coding gig. 💻`,
    }));

    // TODO(time): apply the +60 game-minute sim-clock cost here once the client
    //   sim-clock field is confirmed (deferred — do not implement now).

    void get().saveToServer();
  },

  study: async (): Promise<void> => {
    // Start the cgpa-accruing action immediately (preserves existing Study behavior).
    const studyPreset = ACTION_PRESETS.find((p) => p.label === "Study");
    if (studyPreset) {
      const { label, ...action } = studyPreset;
      get().startAction(action, label);
    }

    let res: Response;
    try {
      res = await fetch("/api/player/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      set({ studyMessage: "Study session failed — try again." });
      return;
    }

    const json = await res.json() as {
      success: boolean;
      data?: {
        skill: string;
        newSkillCoding: number;
      };
    };

    if (!res.ok || !json.success || !json.data) {
      set({ studyMessage: "Study session failed — try again." });
      return;
    }

    set({ skillCoding: json.data.newSkillCoding, studyMessage: `Coding skill: ${json.data.newSkillCoding.toFixed(2)} / 10 📈` });
  },

  handleVisibilityVisible: async () => {
    const elapsed        = Date.now() - _lastActiveAt;
    const rawGameMin     = Math.floor(elapsed / 1000); // 1 real sec = 1 game min
    const clampedGameMin = Math.min(rawGameMin, OFFLINE_CAP);

    set((state) => {
      const mod      = ARCH_MOD[state.profile.archetype];
      const dh       = clampedGameMin / 60;
      const sleeping = state.spatial.isSleeping;
      const v        = { ...state.vitals };

      // Passive decay for the offline period
      for (const key of VITAL_KEYS) {
        const damp = sleeping && (key === "hunger" || key === "energy") ? SLEEP_DAMP : 1;
        v[key] = clamp(0, 100, v[key] - BASE_RATE[key] * mod[key] * dh * damp);
      }

      // Active action gains for the offline period
      let newActive = state.activeAction;
      let newAcademic = state.academic;
      if (state.activeAction !== null) {
        const m   = Math.min(clampedGameMin, state.activeAction.remainingMinutes);
        const gpm = state.activeAction.gainPerMinute;
        for (const key of VITAL_KEYS) {
          const g = gpm[key];
          if (g !== undefined) v[key] = clamp(0, 100, v[key] + g * m);
        }
        if (state.activeAction.cgpaPerMinute !== undefined) {
          newAcademic = { ...newAcademic, cgpa: clamp(0, 5, newAcademic.cgpa + state.activeAction.cgpaPerMinute * m) };
        }
        if (state.activeAction.devotionPerMinute !== undefined) {
          newAcademic = { ...newAcademic, devotion: clamp(0, 100, newAcademic.devotion + state.activeAction.devotionPerMinute * m) };
        }
        const remaining = state.activeAction.remainingMinutes - m;
        newActive = remaining <= 0 ? null : { ...state.activeAction, remainingMinutes: remaining };
      }

      return {
        vitals: v,
        academic: newAcademic,
        activeAction: newActive,
        simTimeMinutes: state.simTimeMinutes + clampedGameMin,
      };
    });

    get().startSimulationLoop();
    await get().saveToServer();
  },
}));
