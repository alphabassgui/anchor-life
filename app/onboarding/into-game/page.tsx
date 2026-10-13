"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useOnboardingStore } from "@/lib/store/useOnboardingStore";
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

export default function IntoGameStepPage() {
  const router = useRouter();
  const store = useOnboardingStore();

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

  const handleEnter = () => {
    // FINAL SUBMIT — WIRING PENDING. This is the single end-of-flow commit point.
    // At wiring: POST the entire onboarding store to /api/auth/register in ONE call
    // (include is_adult, gender, personality_traits, dream, appearance, faculty, department, assignedHostel,
    //  and server-assign archetype reroll-proof), then sign the user in for auth cookies, THEN navigate into the game.
    // For now this button only navigates to the placeholder game route below.
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

        <Button tone="light" onClick={handleEnter} className="mt-6 w-full">
          Enter Anchor
        </Button>

        <p className="mt-5 text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
          Step 09 / 09
        </p>
      </div>
    </main>
  );
}
