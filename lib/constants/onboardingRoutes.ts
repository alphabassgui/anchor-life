/**
 * Named onboarding routes (TASK-ONBOARD-routes).
 *
 * Single source of truth for navigation between onboarding steps, so targets
 * aren't scattered string literals and steps can be reordered/inserted without
 * renumbering. Confirmed flow order: account -> look -> personality -> dream
 * -> archetype -> hostel -> (later: faculty, into-game).
 */
export const ONBOARDING_ROUTES = {
  root: "/onboarding",
  account: "/onboarding/account",
  look: "/onboarding/look",
  personality: "/onboarding/personality",
  dream: "/onboarding/dream",
  archetype: "/onboarding/archetype",
  hostel: "/onboarding/hostel",
  faculty: "/onboarding/faculty", // next step after hostel — not built yet (Continue 404s until then)
} as const;
