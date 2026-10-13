"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/onboarding/PasswordField";
import { createClient } from "@/lib/supabase/client";
import { ONBOARDING_ROUTES } from "@/lib/constants/onboardingRoutes";

// The game/home route doesn't exist yet — pushing here 404s for now. Matches
// where the into-game screen sends a signed-in user, so both entry points agree.
const GAME_ROUTE = "/campus";

export default function LoginPage() {
  const router = useRouter();

  // Controlled inputs so the reused fields (incl. the password eye toggle) work.
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return; // guard against double-submit
    setSubmitting(true);
    setErrorMsg(null);

    const id = identifier.trim();
    const isEmail = id.includes("@");

    if (!isEmail) {
      // HANDLE→EMAIL LOOKUP — PENDING (next task). Handles are UNIQUE in students.
      // Later: look up the email for this handle (via a small server route or RPC, since
      // the students row isn't readable by an unauthenticated anon client without a policy),
      // then call signInWithPassword with that email. For now we ask the user to use email.
      setErrorMsg("For now, please log in with your email address. Username login is coming soon.");
      setSubmitting(false);
      return;
    }

    // EMAIL path (active): sign in with the BROWSER/anon Supabase client so session
    // cookies are set in the browser. The admin/service_role client stays server-side.
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: id, password });

    if (error) {
      // Generic message — never reveal whether the email exists.
      setErrorMsg("Incorrect email or password.");
      setSubmitting(false);
      return;
    }

    // Success. GAME_ROUTE 404s until the game is built — the auth itself is the win.
    router.push(GAME_ROUTE);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#eef2f7] px-4 py-10">
      {/* Signature: a soft gold anchor glow behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-accent/25 blur-3xl"
      />

      {/* Top-left back link. Landing/home route not built yet — points to "/" for now. */}
      <Link
        href="/"
        className="absolute left-4 top-6 z-10 text-sm font-medium text-slate-500 transition-colors hover:text-brand-primary"
      >
        ← Back to campus
      </Link>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand header */}
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl" role="img" aria-label="Anchor Life">
            👑
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-brand-primary">Anchor Life</h1>
            <span className="rounded-full bg-brand-accent/15 px-2 py-0.5 text-xs font-bold text-brand-primary ring-1 ring-brand-accent/40">
              18+
            </span>
          </div>
          <p className="text-sm text-slate-500">Live your campus story.</p>
        </header>

        {/* Card */}
        <div className="rounded-2xl border border-brand-subtle bg-white p-6 shadow-xl shadow-slate-900/5">
          {/* Create account / Log in tabs — "Log in" is active here. */}
          <div
            role="tablist"
            aria-label="Account"
            className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold"
          >
            {/* "Create account" links to the existing signup flow — no form rendered here. */}
            <Link
              href={ONBOARDING_ROUTES.account}
              role="tab"
              aria-selected={false}
              className="rounded-lg py-2 text-center text-slate-500 transition-colors hover:text-brand-primary"
            >
              Create account
            </Link>
            <span
              role="tab"
              aria-selected
              className="rounded-lg bg-white py-2 text-center text-brand-primary shadow-sm ring-1 ring-brand-accent/40"
            >
              Log in
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              tone="light"
              label="Username or email"
              autoComplete="username"
              placeholder="tolu_eko"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <PasswordField
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Inert link-styled actions — FUTURE PAGES, not built yet. */}
            <div className="flex items-center justify-between text-xs font-medium">
              <a href="#" className="text-slate-500 hover:text-brand-primary">
                Forgot password?
              </a>
              <a href="#" className="text-slate-500 hover:text-brand-primary">
                Can&rsquo;t get in?
              </a>
            </div>

            {errorMsg ? (
              <p role="alert" className="text-center text-sm font-medium text-status-heat">
                {errorMsg}
              </p>
            ) : null}

            {/* Green primary (overrides the light tone's navy background). */}
            <Button
              type="submit"
              tone="light"
              disabled={submitting}
              className="mt-2 w-full bg-status-naira hover:bg-emerald-600"
            >
              {submitting ? "Logging in…" : "Log in"}
            </Button>

            <p className="text-center text-sm text-slate-500">Welcome back to Anchor.</p>
          </form>
        </div>

        {/* NOTE: the reference's decorative "Official" social row is intentionally
            omitted — it's non-core and not needed for this static screen. */}
      </div>
    </main>
  );
}
