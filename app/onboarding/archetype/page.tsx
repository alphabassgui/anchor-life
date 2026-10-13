"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useOnboardingStore } from "@/lib/store/useOnboardingStore";
import { ARCHETYPES, type Archetype } from "@/lib/constants/archetypes";
import { ONBOARDING_ROUTES } from "@/lib/constants/onboardingRoutes";

// Accept-only — kept as one string so the label is easy to change in one place.
const CONTINUE_LABEL = "Continue";

/**
 * Data-driven weighted pick: sums every archetype's `weight` and rolls once, so
 * the split is tunable from lib/constants/archetypes.ts alone.
 *
 * NOTE: this client-side randomness is PROVISIONAL. At wiring time the pick will
 * be made reroll-proof server-side (so refreshing can't fish for a better roll).
 */
function rollArchetype(): Archetype {
  const total = ARCHETYPES.reduce((sum, a) => sum + a.weight, 0);
  let roll = Math.random() * total;
  for (const archetype of ARCHETYPES) {
    roll -= archetype.weight;
    if (roll < 0) return archetype;
  }
  return ARCHETYPES[ARCHETYPES.length - 1]; // fallback for float rounding
}

export default function ArchetypeRevealPage() {
  const router = useRouter();

  // Pick EXACTLY ONCE, client-side only. The roll lives in an effect (not a
  // render-time initializer) because Math.random() during prerender is rejected
  // by Next.js and would also bake a fixed result into the static HTML. Reuse an
  // already-assigned archetype (e.g. navigating back then forward) instead of
  // re-rolling. `archetype` stays null until the effect runs on mount.
  const [archetype, setArchetype] = useState<Archetype | null>(null);

  useEffect(() => {
    const { archetype: existing, setData } = useOnboardingStore.getState();
    const chosen = existing
      ? ARCHETYPES.find((a) => a.id === existing) ?? rollArchetype()
      : rollArchetype();
    setArchetype(chosen);
    setData({ archetype: chosen.id });
  }, []);

  const handleContinue = () => {
    // Next step after archetype is the Hostel step. Not built yet — may 404.
    router.push(ONBOARDING_ROUTES.hostel);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#eef2f7] px-4 py-10">
      {/* Signature: a soft gold anchor glow, consistent with the other screens. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-accent/25 blur-3xl"
      />

      {/* Reveal mounts once the client-side roll resolves; the appearance itself
          plays the entrance (fade + slight scale/translate), Tailwind only. */}
      <div
        className={`relative z-10 w-full max-w-md transition-all duration-500 ease-out ${
          archetype
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-[0.98] opacity-0"
        }`}
      >
        {!archetype ? null : (
          <>
        {/* 1. Header prompt */}
        <p className="mb-6 text-center text-sm leading-relaxed text-slate-500">
          {archetype.headerPrompt}
        </p>

        <div className="flex flex-col items-center text-center">
          {/* 2. Hero tile — PLACEHOLDER art. Swap the emoji for a real illustration later. */}
          <div className="flex aspect-square w-40 items-center justify-center rounded-3xl bg-brand-accent/15 ring-1 ring-brand-accent/30">
            <span className="text-7xl" role="img" aria-label={archetype.name}>
              {archetype.accentEmoji}
            </span>
          </div>

          {/* 3. Name */}
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-brand-primary">
            {archetype.name}
          </h1>

          {/* 4. Tagline */}
          <p className="mt-1 text-sm text-slate-500">{archetype.tagline}</p>

          {/* 5. Starting-cash chip — the "birth lottery" flex (top emphasis after the name). */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-status-naira/30 bg-status-naira/10 px-5 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-status-naira/80">
              Starting cash
            </span>
            <span className="font-mono text-xl font-bold text-status-naira">
              ₦{archetype.startingCash.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 6. Perk list */}
        <ul className="mt-7 flex flex-col gap-3">
          {archetype.bullets.map((bullet) => (
            <li
              key={bullet.text}
              className="flex items-center gap-3 rounded-2xl border border-brand-subtle bg-white p-4"
            >
              <span className="text-2xl" role="img" aria-hidden>
                {bullet.emoji}
              </span>
              <span className="text-sm leading-snug text-slate-600">{bullet.text}</span>
            </li>
          ))}
        </ul>

        {/* 7. Footer */}
        <p className="mt-6 text-center text-sm text-slate-500">{archetype.footer}</p>

        {/* 8. Accept-only Continue */}
        <Button tone="light" onClick={handleContinue} className="mt-6 w-full">
          {CONTINUE_LABEL}
        </Button>

        <p className="mt-5 text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
          Step 05 / 09
        </p>
          </>
        )}
      </div>
    </main>
  );
}
