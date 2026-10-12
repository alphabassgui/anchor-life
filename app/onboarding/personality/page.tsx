"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/lib/store/useOnboardingStore";
import {
  PERSONALITY_TRAITS,
  REQUIRED_TRAIT_COUNT,
  type PersonalityTraitId,
} from "@/lib/constants/personality";
import { ONBOARDING_ROUTES } from "@/lib/constants/onboardingRoutes";

export default function PersonalityStepPage() {
  const [selected, setSelected] = useState<PersonalityTraitId[]>([]);
  const router = useRouter();
  const setData = useOnboardingStore((state) => state.setData);

  const isFull = selected.length >= REQUIRED_TRAIT_COUNT;
  const isComplete = selected.length === REQUIRED_TRAIT_COUNT;

  const toggle = (id: PersonalityTraitId) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((t) => t !== id); // frees a slot
      if (current.length >= REQUIRED_TRAIT_COUNT) return current; // ignore a 3rd pick
      return [...current, id];
    });
  };

  const handleContinue = () => {
    if (!isComplete) return;
    setData({ personalityTraits: selected });
    // Next step after personality is the Dream step. Not built yet — may 404.
    router.push(ONBOARDING_ROUTES.dream);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#eef2f7] px-4 py-10">
      {/* Signature: a soft gold anchor glow, consistent with screen 1. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-accent/25 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold tracking-tight text-brand-primary">
            Who are you on campus?
          </h1>
          <p className="text-sm text-slate-500">
            Pick the 2 that sound most like you.
          </p>
          <p
            aria-live="polite"
            className={cn(
              "mt-1 text-xs font-semibold",
              isComplete ? "text-brand-primary" : "text-slate-400",
            )}
          >
            {selected.length} of {REQUIRED_TRAIT_COUNT} selected
            {isFull ? " — tap a pick to swap it out" : ""}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {PERSONALITY_TRAITS.map((trait) => {
            const isActive = selected.includes(trait.id);
            const isLocked = !isActive && isFull;
            return (
              <button
                key={trait.id}
                type="button"
                onClick={() => toggle(trait.id)}
                disabled={isLocked}
                aria-pressed={isActive}
                className={cn(
                  "flex h-full flex-col gap-1 rounded-2xl border p-4 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                  isActive
                    ? "border-brand-accent bg-white ring-2 ring-brand-accent"
                    : "border-brand-subtle bg-white hover:border-brand-accent",
                  isLocked && "cursor-not-allowed opacity-40 hover:border-brand-subtle",
                )}
              >
                <span className="text-sm font-bold text-brand-primary">{trait.name}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                  {trait.subtitle}
                </span>
                <span className="mt-1 text-xs leading-snug text-slate-500">{trait.description}</span>
              </button>
            );
          })}
        </div>

        <Button
          tone="light"
          onClick={handleContinue}
          disabled={!isComplete}
          className="mt-6 w-full"
        >
          Continue
        </Button>

        <p className="mt-5 text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
          Step 02 / 09
        </p>
      </div>
    </main>
  );
}
