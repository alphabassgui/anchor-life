"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/onboarding/PasswordField";
import { Checkbox } from "@/components/onboarding/Checkbox";
import { Modal } from "@/components/onboarding/Modal";
import { isValidHandle } from "@/lib/validation/handle";
import { calculateAge, isAdult } from "@/lib/validation/age";
import { useOnboardingStore } from "@/lib/store/useOnboardingStore";
import { ONBOARDING_ROUTES } from "@/lib/constants/onboardingRoutes";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_FULL_NAME_LENGTH = 96;
const DOB_INPUT_ID = "onboarding-dob";

/**
 * Age-gate state machine:
 *  - idle: form is open
 *  - adult-confirm / under18: a confirmation modal is open
 *  - blocked: the user confirmed they're under 18 → permanent compliance stop
 */
type GateStatus = "idle" | "adult-confirm" | "under18" | "blocked";

/** Format a "YYYY-MM-DD" string as a readable local date (e.g. "12 March 2001"). */
function formatDob(dateOfBirth: string): string {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  if (!y || !m || !d) return dateOfBirth;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function OnboardingAccountPage() {
  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsTouched, setTermsTouched] = useState(false);
  const [gateStatus, setGateStatus] = useState<GateStatus>("idle");

  const router = useRouter();
  const setData = useOnboardingStore((state) => state.setData);

  // Set the date-input ceiling after mount to avoid an SSR/client hydration
  // mismatch on the `max` attribute. (No age math here — that's TASK-ONBOARD-2.)
  const [maxDob, setMaxDob] = useState("");
  useEffect(() => {
    setMaxDob(new Date().toISOString().slice(0, 10));
  }, []);

  const errors = {
    fullName: !fullName.trim()
      ? "Enter your full name."
      : fullName.length > MAX_FULL_NAME_LENGTH
        ? `Keep it under ${MAX_FULL_NAME_LENGTH} characters.`
        : "",
    handle: !handle
      ? "Pick a username."
      : !isValidHandle(handle)
        ? "3–20 characters, lowercase letters and numbers only."
        : "",
    email: !email ? "Enter your email." : !EMAIL_REGEX.test(email) ? "That email doesn't look right." : "",
    password: !password
      ? "Create a password."
      : password.length < MIN_PASSWORD_LENGTH
        ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
        : "",
    dateOfBirth: !dateOfBirth ? "Enter your date of birth." : "",
    agreedToTerms: !agreedToTerms ? "Please confirm to continue." : "",
  };

  const isValid = Object.values(errors).every((message) => message === "");

  /** Reveal an error only once the field is dirty; the disabled button covers pristine fields. */
  const show = (message: string, dirty: boolean) => (dirty && message ? message : undefined);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || gateStatus === "blocked") return;

    // Persist the account fields into the shared onboarding store (no API call;
    // isAdult is written later, only once they confirm in the adult modal).
    setData({ fullName, handle, email, password, dateOfBirth });

    // Age gate: compute against the real current date and open the matching modal.
    setGateStatus(isAdult(dateOfBirth, new Date()) ? "adult-confirm" : "under18");
  };

  /** Adult confirm → "Yes, that's right": mark adult and advance. */
  const confirmAdult = () => {
    setData({ isAdult: true });
    setGateStatus("idle");
    // Next step in the flow is the Look (3D avatar) step. Not built yet — may 404
    // for now; it's the next task.
    router.push(ONBOARDING_ROUTES.look);
  };

  /** Under-18 → "Go back and fix it": close and return focus to the DOB field. */
  const fixDateOfBirth = () => {
    setGateStatus("idle");
    requestAnimationFrame(() => document.getElementById(DOB_INPUT_ID)?.focus());
  };

  /** Under-18 → "Yes, I'm under 18": permanent compliance stop, no navigation. */
  const confirmUnderage = () => setGateStatus("blocked");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#eef2f7] px-4 py-10">
      {/* Signature: a soft gold anchor glow behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-accent/25 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand header */}
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          <AnchorMark />
          <h1 className="text-xl font-bold tracking-tight text-brand-primary">Anchor Life</h1>
          <p className="text-sm text-slate-500">Your campus life starts here.</p>
        </header>

        {/* Card */}
        <div className="rounded-2xl border border-brand-subtle bg-white p-6 shadow-xl shadow-slate-900/5">
          {/* Create account / Log in tabs */}
          <div
            role="tablist"
            aria-label="Account"
            className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold"
          >
            <span
              role="tab"
              aria-selected
              className="rounded-lg bg-white py-2 text-center text-brand-primary shadow-sm ring-1 ring-brand-accent/40"
            >
              Create account
            </span>
            {/* "Log in" is visible but inert on this screen (built in a later task). */}
            <button
              type="button"
              role="tab"
              aria-selected={false}
              aria-disabled
              disabled
              className="cursor-not-allowed rounded-lg py-2 text-center text-slate-400"
            >
              Log in
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              tone="light"
              label="Full name"
              autoComplete="name"
              maxLength={MAX_FULL_NAME_LENGTH}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={show(errors.fullName, fullName !== "")}
            />
            <Input
              tone="light"
              label="Username"
              autoComplete="username"
              placeholder="mannykuzzy"
              hint="Lowercase letters and numbers, 3–20 characters."
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              error={show(errors.handle, handle !== "")}
            />
            <Input
              tone="light"
              label="Email"
              type="email"
              autoComplete="email"
              hint="You'll use this or your username to log in."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={show(errors.email, email !== "")}
            />
            <PasswordField
              label="Password"
              autoComplete="new-password"
              hint="At least 8 characters."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={show(errors.password, password !== "")}
            />
            <Input
              id={DOB_INPUT_ID}
              tone="light"
              label="Date of birth"
              type="date"
              max={maxDob || undefined}
              hint="You must be 18 or older to play."
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              error={show(errors.dateOfBirth, dateOfBirth !== "")}
            />

            <Checkbox
              checked={agreedToTerms}
              onChange={(next) => {
                setAgreedToTerms(next);
                setTermsTouched(true);
              }}
              error={show(errors.agreedToTerms, termsTouched)}
            >
              I&rsquo;m 18 or older and I agree to the{" "}
              {/* Inert link-styled text — no navigation on this screen. */}
              <span className="font-medium text-brand-primary underline underline-offset-2">Terms</span>{" "}
              and{" "}
              <span className="font-medium text-brand-primary underline underline-offset-2">
                Privacy Policy
              </span>
              .
            </Checkbox>

            <Button
              type="submit"
              tone="light"
              disabled={!isValid || gateStatus === "blocked"}
              className="mt-2 w-full"
            >
              Create account
            </Button>

            {gateStatus === "blocked" ? (
              <p role="alert" className="text-center text-sm text-status-heat">
                Anchor Life is for adults only, so you can&rsquo;t sign up right now.
              </p>
            ) : null}
          </form>
        </div>

        {/* Honest progress marker — onboarding is a real 9-step sequence. */}
        <p className="mt-5 text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
          Step 01 / 09
        </p>
      </div>

      {/* Adult confirm — shown when the entered DOB is 18+. */}
      <Modal
        open={gateStatus === "adult-confirm"}
        onClose={() => setGateStatus("idle")}
        labelledBy="adult-confirm-title"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <CalendarIcon />
          <h2 id="adult-confirm-title" className="text-lg font-bold text-brand-primary">
            Are you sure?
          </h2>
          <p className="text-sm text-slate-600">
            You&rsquo;re confirming you were born on{" "}
            <span className="font-semibold text-brand-primary">{formatDob(dateOfBirth)}</span> and are
            18 or older.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button tone="light" data-autofocus onClick={confirmAdult} className="w-full">
            Yes, that&rsquo;s right
          </Button>
          <Button
            tone="light"
            variant="secondary"
            onClick={() => setGateStatus("idle")}
            className="w-full"
          >
            Go back
          </Button>
        </div>
      </Modal>

      {/* Under-18 block — shown when the entered DOB is below 18. */}
      <Modal open={gateStatus === "under18"} onClose={fixDateOfBirth} labelledBy="under18-title">
        <div className="flex flex-col items-center gap-3 text-center">
          <CakeIcon />
          <h2 id="under18-title" className="text-lg font-bold text-brand-primary">
            Are you sure you&rsquo;re under 18?
          </h2>
          <p className="text-sm text-slate-600">
            Anchor Life is for adults, so you won&rsquo;t be able to sign up.
          </p>
          <div className="w-full rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            You picked{" "}
            <span className="font-semibold text-brand-primary">{formatDob(dateOfBirth)}</span>
            {dateOfBirth ? ` (age ${calculateAge(dateOfBirth, new Date())})` : ""}. Picked the wrong year
            by mistake? Go back and fix it.
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button tone="light" data-autofocus onClick={fixDateOfBirth} className="w-full">
            Go back and fix it
          </Button>
          <Button
            tone="light"
            variant="secondary"
            onClick={confirmUnderage}
            className="w-full text-status-heat"
          >
            Yes, I&rsquo;m under 18
          </Button>
        </div>
      </Modal>
    </main>
  );
}

/** Calendar glyph for the adult-confirm modal. */
function CalendarIcon() {
  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-brand-accent"
    >
      <rect x={3} y={4} width={18} height={18} rx={2} />
      <line x1={16} y1={2} x2={16} y2={6} />
      <line x1={8} y1={2} x2={8} y2={6} />
      <line x1={3} y1={10} x2={21} y2={10} />
    </svg>
  );
}

/** Birthday-cake glyph for the under-18 modal. */
function CakeIcon() {
  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-brand-accent"
    >
      <path d="M4 21h16" />
      <path d="M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
      <path d="M4 16c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" />
      <line x1={12} y1={4} x2={12} y2={8} />
      <circle cx={12} cy={3} r={0.6} fill="currentColor" />
    </svg>
  );
}

/** Small gold anchor glyph — the brand's namesake (Anchor University). */
function AnchorMark() {
  return (
    <svg
      width={36}
      height={36}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Anchor Life"
      className="text-brand-accent"
    >
      <circle cx={12} cy={5} r={2} />
      <line x1={12} y1={7} x2={12} y2={21} />
      <line x1={8} y1={11} x2={16} y2={11} />
      <path d="M5 14a7 7 0 0 0 14 0" />
    </svg>
  );
}
