import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Root middleware (TASK-102): refreshes the Supabase auth session on every
 * matched request so server components and route handlers see valid tokens.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets:
     * - _next/static (build output)
     * - _next/image (image optimizer)
     * - favicon.ico
     * - common image/font files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|glb)$).*)",
  ],
};
