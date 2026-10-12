"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/lib/store/useOnboardingStore";
import { DREAMS, type DreamId } from "@/lib/constants/dreams";
import { ONBOARDING_ROUTES } from "@/lib/constants/onboardingRoutes";

export default function DreamStepPage() {
  const [selected, setSelected] = useState<DreamId | null>(null);
  const router = useRouter();
  const setData = useOnboardingStore((state) => state.setData);

  const handleContinue = () => {
    if (!selected) return;
    setData({ dream: selected });
    // Next step after dream is the Archetype step. Not built yet — may 404.
    router.push(ONBOARDING_ROUTES.archetype);
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
          <h1 className="text-xl font-bold tracking-tight text-brand-primary">
            What&rsquo;s your campus dream?
          </h1>
          <p className="text-sm text-slate-500">Pick the 1 goal you&rsquo;re chasing.</p>
        </header>

        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Campus dream">
          {DREAMS.map((dream) => {
            const isActive = selected === dream.id;
            return (
              <button
                key={dream.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setSelected(dream.id)}
                className={cn(
                  "flex h-full flex-col gap-1 rounded-2xl border p-4 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                  isActive
                    ? "border-brand-accent bg-white ring-2 ring-brand-accent"
                    : "border-brand-subtle bg-white hover:border-brand-accent",
                )}
              >
                <span className="text-sm font-bold text-brand-primary">{dream.name}</span>
                <span className="mt-1 text-xs leading-snug text-slate-500">{dream.description}</span>
              </button>
            );
          })}
        </div>

        <Button
          tone="light"
          onClick={handleContinue}
          disabled={!selected}
          className="mt-6 w-full"
        >
          Continue
        </Button>

        <p className="mt-5 text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
          Step 04 / 09
        </p>
      </div>
    </main>
  );
}
