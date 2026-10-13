"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useOnboardingStore } from "@/lib/store/useOnboardingStore";
import { FACULTIES, FACULTY_DEPARTMENTS, type Faculty } from "@/lib/constants/faculties";
import { ONBOARDING_ROUTES } from "@/lib/constants/onboardingRoutes";

export default function FacultyStepPage() {
  const router = useRouter();
  const setData = useOnboardingStore((state) => state.setData);

  // Seed from the store so navigating back then forward keeps the picks.
  const [faculty, setFaculty] = useState<Faculty | "">(
    () => useOnboardingStore.getState().faculty,
  );
  const [department, setDepartment] = useState<string>(
    () => useOnboardingStore.getState().department,
  );

  // All faculty/department strings come from faculties.ts — never hardcoded here.
  const facultyOptions = FACULTIES.map((f) => ({ value: f, label: f }));
  const departmentOptions = faculty
    ? FACULTY_DEPARTMENTS[faculty].map((d) => ({ value: d, label: d }))
    : [];

  const handleFacultyChange = (next: Faculty | "") => {
    setFaculty(next);
    // CRITICAL: changing faculty must clear any previously-picked department so a
    // stale department from another faculty never survives (it would fail the
    // register route's belongs-to-faculty check). Reset locally AND in the store.
    setDepartment("");
    setData({ faculty: next, department: "" });
  };

  const handleDepartmentChange = (next: string) => {
    setDepartment(next);
    setData({ department: next });
  };

  const isComplete = faculty !== "" && department !== "";

  const handleContinue = () => {
    if (!isComplete) return;
    // Next step after faculty is the final into-game step. Not built yet — may 404.
    router.push(ONBOARDING_ROUTES.intoGame);
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
            What are you studying?
          </h1>
          <p className="text-sm text-slate-500">Pick your faculty, then your department.</p>
        </header>

        <div className="flex flex-col gap-4">
          <Select
            tone="light"
            label="Faculty"
            placeholder="Select your faculty"
            options={facultyOptions}
            value={faculty}
            onChange={(e) => handleFacultyChange(e.target.value as Faculty | "")}
          />

          <Select
            tone="light"
            label="Department"
            placeholder="Select your department"
            options={departmentOptions}
            value={department}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            disabled={faculty === ""}
            hint={faculty === "" ? "Pick a faculty first." : undefined}
          />
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
          Step 07 / 09
        </p>
      </div>
    </main>
  );
}
