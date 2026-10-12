"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AvatarCustomizer } from "@/components/auth/AvatarCustomizer";
import { isValidMatric } from "@/lib/validation/matric";
import {
  type Faculty,
  FACULTIES,
  FACULTY_DEPARTMENTS,
} from "@/lib/constants/faculties";
import { type AvatarAppearance, DEFAULT_APPEARANCE } from "@/lib/constants/avatar";

// Mirrors the route's private HANDLE_REGEX (app/api/auth/register/route.ts):
// lowercase letters + digits, 3–20 chars. Kept in sync manually.
const HANDLE_REGEX = /^[a-z0-9]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const MAX_FULL_NAME_LENGTH = 96;

type Gender = "male" | "female";
type Archetype = "nepo_baby" | "campus_hustler";
type HostelId = "peace_hostel" | "purity_hostel" | "patience_hostel";

// Hostel options depend on gender (peace = male-only; purity/patience = female-only).
const HOSTELS_BY_GENDER: Record<Gender, readonly { value: HostelId; label: string }[]> = {
  male: [{ value: "peace_hostel", label: "Peace Hostel" }],
  female: [
    { value: "purity_hostel", label: "Purity Hostel" },
    { value: "patience_hostel", label: "Patience Hostel" },
  ],
};

const ARCHETYPES: readonly {
  value: Archetype;
  title: string;
  cash: string;
  blurb: string;
}[] = [
  {
    value: "nepo_baby",
    title: "Nepo Baby",
    cash: "₦150,000",
    blurb: "Deep pockets from day one.",
  },
  {
    value: "campus_hustler",
    title: "Campus Hustler",
    cash: "₦2,500",
    blurb: "Grind your way up from nothing.",
  },
];

/** Exact body contract for POST /api/auth/register (see route.ts). */
interface RegisterPayload {
  email: string;
  password: string;
  matricNumber: string;
  handle: string;
  fullName: string;
  gender: Gender;
  archetype: Archetype;
  faculty: Faculty;
  department: string;
  assignedHostel: HostelId;
  appearance: AvatarAppearance;
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [handle, setHandle] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [archetype, setArchetype] = useState<Archetype | "">("");
  const [faculty, setFaculty] = useState<Faculty | "">("");
  const [department, setDepartment] = useState("");
  const [assignedHostel, setAssignedHostel] = useState<HostelId | "">("");
  const [appearance, setAppearance] = useState<AvatarAppearance>(DEFAULT_APPEARANCE);

  // Dependent option lists.
  const departmentOptions = useMemo(
    () => (faculty ? FACULTY_DEPARTMENTS[faculty].map((d) => ({ value: d, label: d })) : []),
    [faculty],
  );
  const hostelOptions = gender ? HOSTELS_BY_GENDER[gender] : [];

  // Faculty change resets the dependent department.
  const handleFacultyChange = (next: string) => {
    setFaculty(next as Faculty | "");
    setDepartment("");
  };
  // Gender change resets the dependent hostel.
  const handleGenderChange = (next: Gender) => {
    setGender(next);
    setAssignedHostel("");
  };

  // --- Per-field validation (UX only; the server re-validates authoritatively) ---
  const errors = {
    email: !email ? "Email is required." : !EMAIL_REGEX.test(email) ? "Enter a valid email." : "",
    password:
      !password
        ? "Password is required."
        : password.length < MIN_PASSWORD_LENGTH
          ? `At least ${MIN_PASSWORD_LENGTH} characters.`
          : "",
    matricNumber:
      !matricNumber
        ? "Matric number is required."
        : !isValidMatric(matricNumber)
          ? "Format must be AUL/XXX/00/000."
          : "",
    handle:
      !handle
        ? "Handle is required."
        : !HANDLE_REGEX.test(handle)
          ? "3–20 chars, lowercase letters and numbers only."
          : "",
    fullName:
      !fullName.trim()
        ? "Full name is required."
        : fullName.length > MAX_FULL_NAME_LENGTH
          ? `Max ${MAX_FULL_NAME_LENGTH} characters.`
          : "",
    gender: !gender ? "Select a gender." : "",
    archetype: !archetype ? "Choose an archetype." : "",
    faculty: !faculty ? "Select a faculty." : "",
    department: !department ? "Select a department." : "",
    assignedHostel: !assignedHostel ? "Select a hostel." : "",
  };

  const isValid = Object.values(errors).every((message) => message === "");

  /**
   * Surface a field's error only once it is "dirty" (the user has entered
   * something). Pristine-empty required fields stay quiet — the disabled submit
   * button signals the form is incomplete; dirty-but-invalid fields show inline.
   */
  const show = (message: string, dirty: boolean) => (dirty && message ? message : undefined);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;

    // Narrowing: isValid guarantees these unions are no longer "".
    const payload: RegisterPayload = {
      email,
      password,
      matricNumber,
      handle,
      fullName,
      gender: gender as Gender,
      archetype: archetype as Archetype,
      faculty: faculty as Faculty,
      department,
      assignedHostel: assignedHostel as HostelId,
      appearance,
    };

    // TASK-103b-2: POST this payload to /api/auth/register, then handle
    // auth/session + redirect to the game viewport. For now, just log it.
    console.log("[register] payload", payload);
  };

  return (
    <main className="min-h-screen bg-brand-primary px-4 py-8">
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-brand-surface">Matriculate</h1>
          <p className="text-sm text-brand-subtle">
            Create your Anchor University student and step onto campus.
          </p>
        </header>

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={show(errors.email, email !== "")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={show(errors.password, password !== "")}
          hint="At least 6 characters."
        />
        <Input
          label="Matric number"
          value={matricNumber}
          onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
          error={show(errors.matricNumber, matricNumber !== "")}
          hint="Format: AUL/XXX/00/000"
          placeholder="AUL/CSC/23/045"
        />
        <Input
          label="Handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase())}
          error={show(errors.handle, handle !== "")}
          hint="3–20 chars, lowercase letters and numbers only."
          placeholder="mannykuzzy"
        />
        <Input
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={show(errors.fullName, fullName !== "")}
          maxLength={MAX_FULL_NAME_LENGTH}
        />

        {/* Gender toggle */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-brand-surface">Gender</legend>
          <div className="flex gap-2">
            {(["male", "female"] as const).map((option) => {
              const isActive = gender === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleGenderChange(option)}
                  aria-pressed={isActive}
                  className={
                    "overlay-interactive flex-1 rounded-xl border px-4 py-3 text-sm font-semibold capitalize transition-colors " +
                    (isActive
                      ? "border-brand-accent bg-brand-accent text-brand-primary"
                      : "border-brand-subtle/30 bg-brand-secondary text-brand-surface hover:border-brand-accent")
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
          {show(errors.gender, gender !== "") ? (
            <p className="text-xs text-status-heat">{errors.gender}</p>
          ) : null}
        </fieldset>

        {/* Archetype cards */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-brand-surface">Archetype</legend>
          <div className="grid grid-cols-2 gap-2">
            {ARCHETYPES.map((option) => {
              const isActive = archetype === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setArchetype(option.value)}
                  aria-pressed={isActive}
                  className={
                    "overlay-interactive flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors " +
                    (isActive
                      ? "border-brand-accent bg-brand-secondary"
                      : "border-brand-subtle/30 bg-brand-secondary/60 hover:border-brand-accent")
                  }
                >
                  <span className="text-sm font-semibold text-brand-surface">{option.title}</span>
                  <span className="font-mono text-sm text-status-naira">{option.cash}</span>
                  <span className="text-xs text-brand-subtle">{option.blurb}</span>
                </button>
              );
            })}
          </div>
          {show(errors.archetype, archetype !== "") ? (
            <p className="text-xs text-status-heat">{errors.archetype}</p>
          ) : null}
        </fieldset>

        <Select
          label="Faculty"
          options={FACULTIES.map((f) => ({ value: f, label: f }))}
          value={faculty}
          onChange={(e) => handleFacultyChange(e.target.value)}
          placeholder="Select a faculty"
          error={show(errors.faculty, faculty !== "")}
        />
        <Select
          label="Department"
          options={departmentOptions}
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder={faculty ? "Select a department" : "Pick a faculty first"}
          disabled={!faculty}
          error={show(errors.department, department !== "")}
        />
        <Select
          label="Hostel"
          options={hostelOptions}
          value={assignedHostel}
          onChange={(e) => setAssignedHostel(e.target.value as HostelId)}
          placeholder={gender ? "Select a hostel" : "Pick a gender first"}
          disabled={!gender}
          error={show(errors.assignedHostel, assignedHostel !== "")}
        />

        {/* Avatar */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-brand-surface">Appearance</span>
          <AvatarCustomizer value={appearance} onChange={setAppearance} />
        </div>

        <Button type="submit" disabled={!isValid} className="w-full">
          Matriculate
        </Button>
      </form>
    </main>
  );
}
