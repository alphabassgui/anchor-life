"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useGameStore } from "@/lib/store/useGameStore";
import type { ActiveAction, Vitals } from "@/types/game";
import { ACTION_PRESETS, type ActionPreset } from "@/lib/game/actionPresets";

const GameCanvas = dynamic(() => import("@/components/viewport/GameCanvas"), {
  ssr: false,
});

const VITAL_BARS: {
  key: keyof Vitals;
  label: string;
  colorClass: string;
  icon: string;
}[] = [
  { key: "hunger", label: "Hunger", colorClass: "bg-meter-hunger", icon: "🍚" },
  { key: "energy", label: "Energy", colorClass: "bg-meter-energy", icon: "🔋" },
  { key: "morale", label: "Morale", colorClass: "bg-meter-morale", icon: "😄" },
  { key: "health", label: "Health", colorClass: "bg-meter-health", icon: "🚿" },
];

function formatSimClock(simTimeMinutes: number): string {
  const day = Math.floor(simTimeMinutes / 1440) + 1;
  const timeInDay = simTimeMinutes % 1440;
  const hh = String(Math.floor(timeInDay / 60)).padStart(2, "0");
  const mm = String(timeInDay % 60).padStart(2, "0");
  return `Day ${day} · ${hh}:${mm}`;
}

function getMoodLabel(vitals: Vitals): string {
  const lowest = Math.min(vitals.hunger, vitals.energy, vitals.morale, vitals.health);
  if (lowest < 20) return "Struggling";
  if (lowest < 40) return "Stressed";
  if (lowest < 60) return "Okay";
  if (lowest < 80) return "Good";
  return "Thriving";
}

function getMoodColor(vitals: Vitals): string {
  const lowest = Math.min(vitals.hunger, vitals.energy, vitals.morale, vitals.health);
  if (lowest < 40) return "text-status-heat";
  if (lowest < 60) return "text-brand-accent";
  return "text-status-devotion";
}

function getActionStatus(active: ActiveAction): string {
  const rising: string[] = [];
  const vitalLabel: Record<keyof Vitals, string> = {
    hunger: "Hunger", energy: "Energy", morale: "Morale", health: "Health",
  };
  for (const key of ["hunger", "energy", "morale", "health"] as Array<keyof Vitals>) {
    if ((active.gainPerMinute[key] ?? 0) > 0) rising.push(vitalLabel[key]);
  }
  if ((active.cgpaPerMinute ?? 0) > 0) rising.push("CGPA");
  if ((active.devotionPerMinute ?? 0) > 0) rising.push("Devotion");
  const riseStr = rising.length > 0 ? ` · ${rising.join(", ")} rising` : "";
  return `${active.label}…${riseStr}`;
}

export default function CampusPage() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    loaded,
    profile,
    vitals,
    academic,
    simTimeMinutes,
    activeAction,
    allowanceMessage,
    hustleMessage,
    skillCoding,
    studyMessage,
    hydrate,
    startAction,
    startSimulationLoop,
    stopSimulationLoop,
    handleVisibilityHidden,
    handleVisibilityVisible,
    callMummy,
    runCodingGig,
    study,
  } = useGameStore();

  useEffect(() => {
    fetch("/api/player/state")
      .then((res) => res.json())
      .then((json: { success: boolean; data: Parameters<typeof hydrate>[0] }) => {
        if (json.success) hydrate(json.data);
      })
      .catch((err: unknown) => console.error("[CampusPage] fetch state failed", err));
  }, [hydrate]);

  useEffect(() => {
    if (!loaded) return;

    startSimulationLoop();

    const onVisibility = () => {
      if (document.hidden) handleVisibilityHidden();
      else void handleVisibilityVisible();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopSimulationLoop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loaded, startSimulationLoop, stopSimulationLoop, handleVisibilityHidden, handleVisibilityVisible]);

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-surface">
        <p className="font-mono text-sm text-brand-primary/40">Loading…</p>
      </main>
    );
  }

  const initials = profile.handle.charAt(0).toUpperCase();
  const moodLabel = getMoodLabel(vitals);
  const moodColor = getMoodColor(vitals);

  return (
    <>
      {/* ── Full-screen 3D canvas — behind everything (z-0) ── */}
      <GameCanvas />

      {/* ── DOM overlay — pointer-events-none so the canvas is never blocked ── */}
      <div className="pointer-events-none fixed inset-0 z-10">
      {/* ── Collapsed chip (always rendered when card is closed) ── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto fixed bottom-6 left-4 z-20 flex w-64 flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-brand-subtle transition-transform active:scale-95"
        >
          {/* Handle row */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-accent text-sm font-bold text-brand-primary">
              {initials}
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold text-brand-primary">
                @{profile.handle}
              </p>
              <p className="font-mono text-xs text-brand-primary/50">
                {formatSimClock(simTimeMinutes)}
              </p>
            </div>
          </div>

          {/* Mini vital indicators */}
          <div className="grid grid-cols-4 gap-1.5">
            {VITAL_BARS.map(({ key, colorClass, icon }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <span className="text-xs leading-none">{icon}</span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-subtle">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
                    style={{ width: `${Math.max(2, vitals[key])}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </button>
      )}

      {/* ── Open card ── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close player card"
            onClick={() => setIsOpen(false)}
            className="pointer-events-auto fixed inset-0 z-10 w-full bg-brand-primary/10 backdrop-blur-[2px]"
          />

          {/* Card */}
          <div className="pointer-events-auto fixed bottom-4 left-4 right-4 z-20 max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-brand-subtle sm:right-auto sm:w-80">
            {/* Header: avatar · handle · mood · clock · close */}
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-accent text-base font-bold text-brand-primary">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-primary">@{profile.handle}</p>
                <p className={`text-xs font-medium ${moodColor}`}>{moodLabel}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="rounded-full bg-brand-surface px-2 py-0.5 font-mono text-xs text-brand-primary/50">
                  {formatSimClock(simTimeMinutes)}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-subtle text-xs font-bold text-brand-primary/50 hover:bg-brand-primary/10"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Vitals section */}
            <div className="mb-4">
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-brand-primary/40">
                Vitals
              </p>
              <div className="space-y-2.5">
                {VITAL_BARS.map(({ key, label, colorClass, icon }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 text-xs leading-none">{icon}</span>
                    <span className="w-12 shrink-0 text-xs text-brand-primary/60">{label}</span>
                    <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-brand-subtle">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
                        style={{ width: `${Math.max(2, vitals[key])}%` }}
                      />
                    </div>
                    <span className="w-7 shrink-0 text-right font-mono text-xs text-brand-primary/50">
                      {Math.round(vitals[key])}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active action indicator */}
            {activeAction && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-brand-surface px-3 py-2">
                <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand-accent" />
                <p className="text-xs font-medium text-brand-primary/70">
                  {getActionStatus(activeAction)}
                </p>
              </div>
            )}

            {/* Status row */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-brand-surface p-2.5">
                <p className="text-[10px] text-brand-primary/40">CGPA</p>
                <p className="font-mono text-base font-bold text-status-cgpa">
                  {academic.cgpa.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl bg-brand-surface p-2.5">
                <p className="text-[10px] text-brand-primary/40">Devotion</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-brand-subtle">
                  <div
                    className="h-full rounded-full bg-status-devotion transition-all duration-300"
                    style={{ width: `${Math.max(0, academic.devotion)}%` }}
                  />
                </div>
                <p className="mt-0.5 font-mono text-xs font-semibold text-status-devotion">
                  {Math.round(academic.devotion)}
                </p>
              </div>
              <div className="rounded-xl bg-brand-surface p-2.5">
                <p className="text-[10px] text-brand-primary/40">SDC Heat</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className={`text-sm leading-none ${
                        i < academic.sdcHeat ? "text-status-heat" : "text-brand-subtle"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-brand-surface p-2.5">
                <p className="text-[10px] text-brand-primary/40">Wallet</p>
                <p className="font-mono text-sm font-bold text-status-naira">
                  ₦{profile.walletBalance.toLocaleString("en-NG")}
                </p>
              </div>
              <div className="rounded-xl bg-brand-surface p-2.5">
                <p className="text-[10px] text-brand-primary/40">Coding Skill</p>
                <p className="font-mono text-base font-bold text-status-cgpa">
                  {skillCoding.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div>
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-brand-primary/40">
                Actions
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {ACTION_PRESETS.filter((p): p is ActionPreset =>
                  p.label === "Hang out" || p.label === "Pray"
                ).map(({ label, ...action }) => {
                  const isActive = activeAction?.id === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => startAction(action, label)}
                      className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors active:scale-95 ${
                        isActive
                          ? "bg-brand-accent text-brand-primary ring-2 ring-brand-primary/20"
                          : "bg-brand-surface text-brand-primary hover:bg-brand-accent hover:text-brand-primary"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => { void callMummy(); }}
                className="mt-1.5 w-full rounded-xl bg-brand-surface px-2 py-2.5 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-accent active:scale-95"
              >
                📞 Call Mummy
              </button>
              {allowanceMessage !== null && (
                <p className="mt-1.5 text-xs text-brand-primary/70">{allowanceMessage}</p>
              )}
              <button
                type="button"
                onClick={() => { void runCodingGig(); }}
                className="mt-1.5 w-full rounded-xl bg-brand-surface px-2 py-2.5 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-accent active:scale-95"
              >
                💻 Coding Gig
              </button>
              {hustleMessage !== null && (
                <p className="mt-1.5 text-xs text-brand-primary/70">{hustleMessage}</p>
              )}
              <button
                type="button"
                onClick={() => { void study(); }}
                className="mt-1.5 w-full rounded-xl bg-brand-surface px-2 py-2.5 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-accent active:scale-95"
              >
                📚 Study
              </button>
              {studyMessage !== null && (
                <p className="mt-1.5 text-xs text-brand-primary/70">{studyMessage}</p>
              )}
            </div>
          </div>
        </>
      )}
      </div>
    </>
  );
}
