"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/lib/store/useOnboardingStore";
import { HOSTELS, type HostelId } from "@/lib/constants/hostels";
import { ONBOARDING_ROUTES } from "@/lib/constants/onboardingRoutes";

export default function HostelStepPage() {
  const [selected, setSelected] = useState<HostelId | null>(null);
  const router = useRouter();
  const gender = useOnboardingStore((state) => state.gender);
  const setData = useOnboardingStore((state) => state.setData);

  // Gender is a store-only value (set on the Look screen); no picker here.
  // Male -> [Peace]; Female -> [Purity, Patience].
  const allowed = HOSTELS.filter((hostel) => hostel.gender === gender);

  const handleContinue = () => {
    if (!selected) return;
    setData({ assignedHostel: selected });
    // Next step after hostel is the Faculty step. Not built yet — may 404.
    router.push(ONBOARDING_ROUTES.faculty);
  };

  // Deep-link guard: `gender` is a non-empty union defaulting to "male", so a
  // real empty-gender state can't occur — this is defensive. If a deep link ever
  // lands here with no matching hostels, send them back to pick their look
  // instead of rendering an empty, un-completable screen.
  if (allowed.length === 0) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#eef2f7] px-4 py-10">
        <div className="relative z-10 w-full max-w-md text-center">
          <h1 className="text-xl font-bold tracking-tight text-brand-primary">
            Pick your look first
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            We need to know a bit about you before sorting your hostel.
          </p>
          <Button
            tone="light"
            onClick={() => router.push(ONBOARDING_ROUTES.look)}
            className="mt-6 w-full"
          >
            Go back
          </Button>
        </div>
      </main>
    );
  }

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
            Where are you staying?
          </h1>
          <p className="text-sm text-slate-500">Pick the hostel you&rsquo;ll call home.</p>
        </header>

        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Hostel">
          {allowed.map((hostel) => {
            const isActive = selected === hostel.id;
            return (
              <button
                key={hostel.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setSelected(hostel.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                  isActive
                    ? "border-brand-accent bg-white ring-2 ring-brand-accent"
                    : "border-brand-subtle bg-white hover:border-brand-accent",
                )}
              >
                <span className="text-3xl" role="img" aria-hidden>
                  {hostel.accentEmoji}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold text-brand-primary">{hostel.name}</span>
                  <span className="mt-0.5 text-xs leading-snug text-slate-500">
                    {hostel.description}
                  </span>
                </span>
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
          Step 06 / 09
        </p>
      </div>
    </main>
  );
}
