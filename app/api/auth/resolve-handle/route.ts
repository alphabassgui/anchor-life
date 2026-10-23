import { createAdminClient } from "@/lib/supabase/admin";
import { isValidHandle } from "@/lib/validation/handle";

/**
 * Handle → email resolution (server-only).
 *
 * Supabase authenticates by EMAIL only, but the login screen accepts a handle.
 * The `students` row that maps handle → auth_user_id is NOT readable by the
 * unauthenticated browser anon client (RLS has no SELECT policy for it), so the
 * lookup MUST run here with the service_role/admin client, which bypasses RLS.
 *
 * Email is NOT stored on `students` — it lives in auth.users. So resolution is
 * two hops: students.handle -> auth_user_id -> auth.users.email (getUserById).
 *
 * ANTI-ENUMERATION: a missing handle and a found handle must be indistinguishable
 * to the client. A not-found handle returns 200 { email: null } — exactly the
 * shape of a found handle but with no address — so the client can treat it like a
 * failed sign-in and show the SAME generic message. No response code ever reveals
 * whether a username exists.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message }, timestamp: Date.now() },
    { status },
  );
}

/** Both the found and not-found success shapes; email === null means "not found". */
function emailResponse(email: string | null): Response {
  return Response.json(
    { success: true, data: { email }, timestamp: Date.now() },
    { status: 200 },
  );
}

export async function POST(request: Request): Promise<Response> {
  // --- Parse body ---
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const body = asRecord(raw);
  if (!body) {
    return errorResponse(400, "INVALID_BODY", "Request body must be a JSON object.");
  }

  // Register stores lowercase-only handles (HANDLE_REGEX); lowercasing here makes
  // username entry case-insensitive before we validate and look up.
  const handle = asString(body.handle)?.trim().toLowerCase();
  if (!handle || !isValidHandle(handle)) {
    return errorResponse(
      400,
      "INVALID_HANDLE",
      "Handle must be 3–20 characters, lowercase letters and numbers only.",
    );
  }

  // --- Service-role client (server-only; bypasses RLS) ---
  const admin = createAdminClient();

  // 1. handle -> auth_user_id. maybeSingle(): no row is not an error here.
  const { data: student, error: studentError } = await admin
    .from("students")
    .select("auth_user_id")
    .eq("handle", handle)
    .maybeSingle();

  if (studentError) {
    return errorResponse(
      500,
      "LOOKUP_FAILED",
      "Could not look up that account. Please try again.",
    );
  }

  // Not found — generic success with no email (anti-enumeration).
  if (!student) {
    return emailResponse(null);
  }

  const authUserId = (student as { auth_user_id: string }).auth_user_id;

  // 2. auth_user_id -> auth.users.email.
  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(authUserId);

  if (userError) {
    return errorResponse(
      500,
      "LOOKUP_FAILED",
      "Could not look up that account. Please try again.",
    );
  }

  // A handle with no resolvable email is treated the same as not-found.
  const email = userResult.user?.email ?? null;
  return emailResponse(email);
}
