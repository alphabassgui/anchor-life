/**
 * The 8 selectable personality traits (TASK-ONBOARD-4).
 *
 * The `id` is the STORED value: it must match the fixed list in the migration
 * `supabase/migrations/20261013000000_add_onboarding_columns.sql` and whatever
 * route later validates it. Display name/subtitle/description live here (UI only).
 * Onboarding requires exactly 2 — mirroring the DB CHECK array_length(...) = 2.
 */
export type PersonalityTraitId =
  | "allowance_ceo"
  | "last_minute_legend"
  | "campus_celebrity"
  | "attendance_ghost"
  | "mummys_favourite"
  | "future_billionaire"
  | "steeze_minister"
  | "the_plug";

export interface PersonalityTrait {
  id: PersonalityTraitId;
  name: string;
  subtitle: string;
  description: string;
}

export const REQUIRED_TRAIT_COUNT = 2;

export const PERSONALITY_TRAITS: readonly PersonalityTrait[] = [
  {
    id: "allowance_ceo",
    name: "Allowance CEO",
    subtitle: "Budgeting Expert",
    description:
      "Has already planned how to spend money before it even enters their account. Broke by Wednesday, budgeting again by Thursday.",
  },
  {
    id: "last_minute_legend",
    name: "Last-Minute Legend",
    subtitle: "Academic Sprinter",
    description:
      "Does absolutely nothing all semester, then reads three topics overnight and walks into the exam hall with confidence.",
  },
  {
    id: "campus_celebrity",
    name: "Campus Celebrity",
    subtitle: "Social Butterfly",
    description:
      "Knows everybody from the hostel to the lecture hall. If something happens on campus, they've heard about it already.",
  },
  {
    id: "attendance_ghost",
    name: "Attendance Ghost",
    subtitle: "Professional Disappearing Act",
    description:
      "Always says, 'I'll be there in five minutes.' Somehow misses the lecture but appears when food is served.",
  },
  {
    id: "mummys_favourite",
    name: "Mummy's Favourite",
    subtitle: "Survival Specialist",
    description:
      "Has food in the room, extra provisions in the bag, and enough snacks to feed the entire hostel. Always prepared.",
  },
  {
    id: "future_billionaire",
    name: "Future Billionaire",
    subtitle: "The Big Dreamer",
    description:
      "Has five business ideas, three unfinished projects, and a master plan to become a millionaire before graduation.",
  },
  {
    id: "steeze_minister",
    name: "Steeze Minister",
    subtitle: "Fashion Icon",
    description:
      "Can spend two hours choosing an outfit for a 30-minute lecture. Looking good is part of the academic journey.",
  },
  {
    id: "the_plug",
    name: "The Plug",
    subtitle: "Problem Solver",
    description:
      "Knows who has the notes, who can help with an assignment, where to get cheap food, and who to call when things go wrong.",
  },
];
