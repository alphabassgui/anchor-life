/**
 * Named onboarding routes (TASK-ONBOARD-routes).
 *
 * Single source of truth for navigation between onboarding steps, so targets
 * aren't scattered string literals and steps can be reordered/inserted without
 * renumbering. Confirmed flow order: account -> look -> personality -> dream
 * -> (later: archetype, hostel, faculty, into-game).
 */
export const ONBOARDING_ROUTES = {
  root: "/onboarding",
  account: "/onboarding/account",
  look: "/onboarding/look",
  personality: "/onboarding/personality",
  dream: "/onboarding/dream",
} as const;
