/**
 * The 3 campus hostels (TASK-ONBOARD-7).
 *
 * The `id` is the STORED value and MUST match the register route's enum +
 * gender-match validation (`hostelMatchesGender` in app/api/auth/register/route.ts):
 * Peace is male-only; Purity and Patience are female-only. `gender` reuses the
 * store's exact encoding ("male" | "female"). Descriptions are intentional
 * placeholders — no extra lore. Onboarding picks exactly 1 from the hostels
 * allowed for the player's gender.
 */
export type HostelId = "peace_hostel" | "purity_hostel" | "patience_hostel";

export type HostelGender = "male" | "female";

export interface Hostel {
  id: HostelId;
  name: string;
  gender: HostelGender;
  description: string;
  accentEmoji: string;
}

export const HOSTELS: readonly Hostel[] = [
  {
    id: "peace_hostel",
    name: "Peace Hostel",
    gender: "male",
    description: "The boys' block. Loud nights, fast friends.",
    accentEmoji: "🏠",
  },
  {
    id: "purity_hostel",
    name: "Purity Hostel",
    gender: "female",
    description: "Quiet corners and close-knit crews.",
    accentEmoji: "🏡",
  },
  {
    id: "patience_hostel",
    name: "Patience Hostel",
    gender: "female",
    description: "Where the real campus stories start.",
    accentEmoji: "🏘️",
  },
];
