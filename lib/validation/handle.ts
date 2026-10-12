/**
 * Shared handle/username validation (TASK-ONBOARD-1).
 *
 * Rule: lowercase letters + digits, 3–20 chars (e.g. "mannykuzzy"). Mirrors the
 * private `HANDLE_REGEX` in `app/api/auth/register/route.ts`; the route re-validates
 * authoritatively. Pure module — safe to import from both client and server code.
 */
export const HANDLE_REGEX = /^[a-z0-9]{3,20}$/;

export function isValidHandle(value: string): boolean {
  return HANDLE_REGEX.test(value);
}
