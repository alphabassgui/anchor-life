"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useOnboardingStore } from "@/lib/store/useOnboardingStore";
import { ONBOARDING_ROUTES } from "@/lib/constants/onboardingRoutes";

type Gender = "male" | "female";

// R3F cannot server-render — load the 3D viewport client-side only.
const AvatarViewport = dynamic(
  () => import("@/components/onboarding/AvatarViewport").then((m) => m.AvatarViewport),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-accent" />
      </div>
    ),
  },
);

export default function LookStepPage() {
  const [gender, setGender] = useState<Gender>("male");
  const router = useRouter();
  const setData = useOnboardingStore((state) => state.setData);

  const handleContinue = () => {
    setData({ gender });
    router.push(ONBOARDING_ROUTES.personality);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#eef2f7] px-4 py-10">
      <div className="relative z-10 flex w-full max-w-md flex-col">
        <header className="mb-5 flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold tracking-tight text-brand-primary">Design your look</h1>
          <p className="text-sm text-slate-500">Set your character up before you hit campus.</p>
        </header>

        {/* Gender selector. For now both genders show the same placeholder model;
            later each loads its own (/models/male.glb, /models/female.glb). */}
        <fieldset className="mb-4 flex flex-col gap-1.5">
          <legend className="sr-only">Gender</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["male", "female"] as const).map((option) => {
              const isActive = gender === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGender(option)}
                  aria-pressed={isActive}
                  className={
                    "rounded-xl border px-4 py-3 text-sm font-semibold capitalize transition-colors " +
                    (isActive
                      ? "border-brand-accent bg-white text-brand-primary ring-2 ring-brand-accent"
                      : "border-brand-subtle bg-white text-slate-500 hover:border-brand-accent")
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* 3D viewport */}
        <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-brand-subtle bg-white">
          <AvatarViewport gender={gender} />
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-primary/70 px-3 py-1 text-xs font-medium text-white">
            Drag to spin
          </span>
        </div>

        {/* Customization stub — NOT built in this task.
            TASK-ONBOARD-look-2: the real avatar customizer (skin/hair/top/bottom
            colour swatches + hairstyle/outfit pickers) lands here once tintable
            models replace the placeholder. */}
        <div
          aria-disabled
          className="mt-4 rounded-2xl border border-dashed border-brand-subtle bg-white/60 p-4 text-center opacity-60"
        >
          <p className="text-sm font-semibold text-brand-primary">Customisation coming soon</p>
          <p className="mt-1 text-xs text-slate-500">
            Skin, hair, and outfit colours unlock once your character model is ready.
          </p>
        </div>

        <Button tone="light" onClick={handleContinue} className="mt-6 w-full">
          Continue
        </Button>

        <p className="mt-5 text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
          Step 02 / 09
        </p>
      </div>
    </main>
  );
}
