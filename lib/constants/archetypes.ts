/**
 * The 2 game-assigned archetypes (TASK-ONBOARD-6).
 *
 * The archetype is NOT a player choice — it is revealed at random on the
 * `/onboarding/archetype` "birth lottery" screen. `weight` is the SINGLE tuning
 * point for the split (summed and rolled against in one place), so the odds can
 * be rebalanced here without touching the reveal UI. The `id` is the STORED
 * value. `startingCash` is a raw number — format it in the UI (e.g. ₦ +
 * toLocaleString). All other fields (tagline, bullets, etc.) are UI-only copy.
 */
export type ArchetypeId = "campus_hustler" | "nepo_baby";

export interface ArchetypeBullet {
  emoji: string;
  text: string;
}

export interface Archetype {
  id: ArchetypeId;
  name: string;
  tagline: string;
  /** Raw naira amount — format in the UI (₦ + thousands separator). */
  startingCash: number;
  /** Relative odds of being assigned this archetype (see file header). */
  weight: number;
  accentEmoji: string;
  headerPrompt: string;
  footer: string;
  bullets: ArchetypeBullet[];
}

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: "campus_hustler",
    name: "Campus Hustler",
    tagline: "Study. Hustle. Make it happen.",
    startingCash: 2500,
    weight: 85,
    accentEmoji: "🎓",
    headerPrompt:
      "Anchor University life is a hustle, right? What were you called when you first got in?",
    footer: "Same campus. Bigger dreams. Campus Hustler.",
    bullets: [
      { emoji: "📚", text: "Cover your own school fees and still chase your dreams" },
      { emoji: "💪", text: "Build your skills and side hustle at the same time" },
      { emoji: "💻", text: "From lecture halls to late-night grind, you're covered" },
      { emoji: "👥", text: "Start from scratch and grow your name on campus" },
    ],
  },
  {
    id: "nepo_baby",
    name: "NEPO Baby",
    tagline: "Good people. Bigger opportunities.",
    startingCash: 150000,
    weight: 15,
    accentEmoji: "👑",
    headerPrompt:
      "Your parents have a little 'connection,' and it shows. What was it like growing up with that privilege?",
    footer: "Same roots. Different paths. NEPO Baby.",
    bullets: [
      { emoji: "💼", text: "Your parents' connections open doors you didn't know existed" },
      { emoji: "🚀", text: "You get opportunities faster than most people" },
      { emoji: "👥", text: "You're well connected, and people always have your back" },
      { emoji: "😎", text: "It's not always easy, but you make it work, your way" },
    ],
  },
];
