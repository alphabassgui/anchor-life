"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useOnboardingStore } from "@/lib/store/useOnboardingStore";
import { createClient } from "@/lib/supabase/client";
import { ARCHETYPES } from "@/lib/constants/archetypes";
import { HOSTELS } from "@/lib/constants/hostels";
import { DREAMS } from "@/lib/constants/dreams";
import { PERSONALITY_TRAITS } from "@/lib/constants/personality";

// Placeholder for any field the store hasn't captured. This is deliberately
// visible rather than hidden: an unexpected "— not set —" here surfaces a
// store-capture bug in an earlier step BEFORE the register call is wired.
const NOT_SET = "— not set —";

// The game/home route doesn't exist yet — pushing here 404s for now, matching
// the forward-wiring pattern used by the earlier onboarding steps.
const GAME_ROUTE = "/campus";

// Friendly text for the register route's known error codes. Unknown codes fall
// back to the server's own message; a missing body falls back to the generic.
const ERROR_MESSAGES: Record<string, string> = {
  NOT_ADULT: "You must be 18 or older to join Anchor.",
  INVALID_PERSONALITY: "Something's off with your personality picks — go back and choose 2.",
  INVALID_DREAM: "Something's off with your campus dream — go back and pick one.",
  HANDLE_TAKEN: "That handle is already taken. Go back and choose another.",
  INVALID_EMAIL: "That email doesn't look right. Go back and fix it.",
  WEAK_PASSWORD: "Your password is too short. Go back and use at least 8 characters.",
  INVALID_FULL_NAME: "Your name is missing or too long. Go back and fix it.",
  INVALID_HANDLE: "That handle isn't valid. Go back and choose another.",
  INVALID_GENDER: "Your character setup is incomplete. Go back to the look step.",
  INVALID_HOSTEL: "Pick a hostel before continuing.",
  INVALID_FACULTY: "Pick a valid faculty before continuing.",
  INVALID_DEPARTMENT: "Your department doesn't match your faculty. Go back and reselect.",
  HOSTEL_GENDER_MISMATCH: "That hostel doesn't match your gender. Go back and reselect.",
  MATRIC_GENERATION_FAILED: "We couldn't assign a matric number. Please try again.",
};
const GENERIC_ERROR = "Something went wrong. Please try again.";

export default function IntoGameStepPage() {
  const router = useRouter();
  const store = useOnboardingStore();
  const reset = useOnboardingStore((s) => s.reset);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resolve stored ids to human-readable names via the shared constants — no
  // display strings are hardcoded here.
  const archetype = ARCHETYPES.find((a) => a.id === store.archetype);
  const archetypeValue = archetype
    ? `${archetype.name} · ₦${archetype.startingCash.toLocaleString()}`
    : NOT_SET;

  const hostelValue = HOSTELS.find((h) => h.id === store.assignedHostel)?.name ?? NOT_SET;
  const dreamValue = DREAMS.find((d) => d.id === store.dream)?.name ?? NOT_SET;

  const traitNames = store.personalityTraits
    .map((id) => PERSONALITY_TRAITS.find((t) => t.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const personalityValue = traitNames.length > 0 ? traitNames.join(", ") : NOT_SET;

  const recap: { label: string; value: string }[] = [
    { label: "Name", value: store.fullName || NOT_SET },
    { label: "Handle", value: store.handle ? `@${store.handle}` : NOT_SET },
    { label: "Archetype", value: archetypeValue },
    { label: "Hostel", value: hostelValue },
    { label: "Faculty", value: store.faculty || NOT_SET },
    { label: "Department", value: store.department || NOT_SET },
    { label: "Dream", value: dreamValue },
    { label: "Personality", value: personalityValue },
  ];

  const handleEnter = async () => {
    if (submitting) return; // guard against double-submit
    setSubmitting(true);
    setErrorMsg(null);

    // FINAL SUBMIT — the single end-of-flow commit point. Map the store to the
    // EXACT body keys the register route reads. We intentionally do NOT send
    // `archetype` or `matricNumber`: the server assigns both (archetype is rolled
    // reroll-proof server-side; matric is generated server-side).
    const body = {
      email: store.email,
      password: store.password,
      fullName: store.fullName,
      handle: store.handle,
      gender: store.gender,
      assignedHostel: store.assignedHostel,
      faculty: store.faculty,
      department: store.department,
      isAdult: store.isAdult,
      personalityTraits: store.personalityTraits,
      dream: store.dream,
    };

    let json: { success?: boolean; error?: { code?: string; message?: string } } | null = null;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        // Surface a friendly message by code, else the server's message, else generic.
        const code = json?.error?.code;
        setErrorMsg(
          (code && ERROR_MESSAGES[code]) || json?.error?.message || GENERIC_ERROR,
        );
        setSubmitting(false); // re-enable; do NOT navigate
        return;
      }
    } catch {
      setErrorMsg(GENERIC_ERROR); // network/unexpected failure
      setSubmitting(false);
      return;
    }

    // Registration succeeded. Sign in with the BROWSER/anon Supabase client so
    // session cookies are established in the browser. The admin/service_role
    // client stays server-side only and is never used here.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: store.email,
      password: store.password,
    });

    if (signInError) {
      // Edge case: the account WAS created but auto sign-in failed. Don't treat
      // the whole flow as failed — clear the draft and send them to log in.
      reset();
      router.push("/login");
      return;
    }

    // Fully done: clear the onboarding draft so a refresh can't resubmit, then
    // head into the game. GAME_ROUTE (/campus) 404s until the game is built —
    // the register + sign-in succeeding IS the success here.
    reset();
    router.push(GAME_ROUTE);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#eef2f7] px-4 py-10">
      {/* Signature: a soft gold anchor glow, consistent with the other screens. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-accent/25 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl" role="img" aria-hidden>
            🎉
          </span>
          <h1 className="text-xl font-bold tracking-tight text-brand-primary">You&rsquo;re all set!</h1>
          <p className="text-sm text-slate-500">
            Here&rsquo;s your story so far. Ready to start campus life at Anchor?
          </p>
        </header>

        <div className="rounded-2xl border border-brand-subtle bg-white p-5 shadow-xl shadow-slate-900/5">
          <dl className="flex flex-col divide-y divide-brand-subtle">
            {recap.map((row) => {
              const isMissing = row.value === NOT_SET;
              return (
                <div key={row.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <dt className="text-sm text-slate-500">{row.label}</dt>
                  <dd
                    className={
                      isMissing
                        ? "text-right text-sm font-medium text-slate-400"
                        : "text-right text-sm font-semibold text-brand-primary"
                    }
                  >
                    {row.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        {errorMsg ? (
          <p role="alert" className="mt-6 text-center text-sm font-medium text-status-heat">
            {errorMsg}
          </p>
        ) : null}

        <Button
          tone="light"
          onClick={handleEnter}
          disabled={submitting}
          className={errorMsg ? "mt-3 w-full" : "mt-6 w-full"}
        >
          {submitting ? "Entering…" : "Enter Anchor"}
        </Button>

        <p className="mt-5 text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
          Step 09 / 09
        </p>
      </div>
    </main>
  );
}
