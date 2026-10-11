import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on each matched request (TASK-102).
 *
 * Reads auth cookies from the incoming request and writes refreshed tokens to
 * both the request (for downstream handlers) and the outgoing response (for the
 * browser), using the `@supabase/ssr` `getAll`/`setAll` cookie API.
 *
 * Calling `auth.getUser()` is what triggers the token refresh; the call must
 * stay between client creation and returning the response. Uses the public anon
 * key only — never the service-role key (AGENTS.md §3.4).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh the session (rotates expired access/refresh tokens into the cookies).
  await supabase.auth.getUser();

  return supabaseResponse;
}
