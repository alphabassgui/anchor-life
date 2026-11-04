import type { ActionInput } from "@/types/game";

export interface ActionPreset extends ActionInput {
  label: string;
}

export const ACTION_PRESETS: ActionPreset[] = [
  { label: "Sleep", durationMinutes: 480, gains: { energy: 60 } },
  { label: "Eat", durationMinutes: 30, gains: { hunger: 50 } },
  { label: "Shower", durationMinutes: 20, gains: { health: 45 } },
  { label: "Study", durationMinutes: 60, cgpaDelta: 0.02 },
  { label: "Pray", durationMinutes: 15, devotionDelta: 10 },
  { label: "Hang out", durationMinutes: 45, gains: { morale: 40 } },
];
