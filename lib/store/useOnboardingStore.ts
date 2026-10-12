import { create } from "zustand";

/**
 * Onboarding data collected across the 9-step flow (TASK-ONBOARD-2).
 *
 * Later steps (gender, appearance, personalityTraits, dream, archetype,
 * assignedHostel, faculty, department) are added as fields here — the store
 * shape doesn't need reshaping; each step just calls `setData({ ... })`.
 */
export interface OnboardingData {
  fullName: string;
  handle: string;
  email: string;
  password: string;
  dateOfBirth: string; // YYYY-MM-DD
  isAdult: boolean;
}

interface OnboardingStore extends OnboardingData {
  /** Generic merge — write any subset of the collected fields. */
  setData: (partial: Partial<OnboardingData>) => void;
  /** Clear everything back to the initial draft (e.g. abandoning onboarding). */
  reset: () => void;
}

const INITIAL_DATA: OnboardingData = {
  fullName: "",
  handle: "",
  email: "",
  password: "",
  dateOfBirth: "",
  isAdult: false,
};

export const useOnboardingStore = create<OnboardingStore>()((set) => ({
  ...INITIAL_DATA,
  setData: (partial) => set(partial),
  reset: () => set(INITIAL_DATA),
}));
