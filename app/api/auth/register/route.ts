import { createAdminClient } from "@/lib/supabase/admin";
import { isValidMatric } from "@/lib/validation/matric";
import { ARCHETYPES as ARCHETYPE_CATALOG } from "@/lib/constants/archetypes";
import { PERSONALITY_TRAITS, REQUIRED_TRAIT_COUNT } from "@/lib/constants/personality";
import { DREAMS } from "@/lib/constants/dreams";

// --- Domain types (mirror the schema enums; zero `any`) ---
type Archetype = "nepo_baby" | "campus_hustler";
type Gender = "male" | "female";
type HostelId = "peace_hostel" | "purity_hostel" | "patience_hostel";

/**
 * Anchor University faculties and their departments. Both `faculty` and
 * `department` are free-text VARCHAR(64) in the schema (no enum/CHECK); the
 * faculty<->department relationship is enforced here in the route.
 */
type Faculty =
  | "Faculty of Basic and Allied Medical Sciences"
  | "Faculty of Education"
  | "Faculty of Environmental Sciences"
  | "Faculty of Humanities"
  | "Faculty of Law"
  | "Faculty of Science"
  | "Faculty of Social And Management Science";

const FACULTY_DEPARTMENTS: Record<Faculty, readonly string[]> = {
  "Faculty of Basic and Allied Medical Sciences": [
    "Nursing Science",
    "Medical Laboratory Science",
    "Public Health",
  ],
  "Faculty of Education": [
    "Mathematics Education",
    "Biology Education",
    "Chemistry Education",
    "Physics Education",
  ],
  "Faculty of Environmental Sciences": ["Architecture"],
  "Faculty of Humanities": [
    "English and Literary Studies",
    "French",
    "History and International Studies",
    "Christian Religious Studies",
  ],
  "Faculty of Law": ["Law (LL.B)"],
  "Faculty of Science": [
    "Mathematics",
    "Computer Science",
    "Information Technology",
    "Software Engineering",
    "Biology",
    "Microbiology",
    "Biotechnology",
    "Biochemistry",
    "Chemistry",
    "Industrial Chemistry",
    "Physics",
    "Physics with Electronics",
    "Geology",
    "Applied Geophysics",
  ],
  "Faculty of Social And Management Science": [
    "Business Administration",
    "Accounting",
    "Economics",
    "Finance",
    "Political Science",
    "Mass Communication",
    "International Relations",
  ],
};

function isFaculty(value: string): value is Faculty {
  return Object.prototype.hasOwnProperty.call(FACULTY_DEPARTMENTS, value);
}

// Handle rule per 04_API_CONTRACT.md: lowercase alphanumeric, 3–20 chars.
const HANDLE_REGEX = /^[a-z0-9]{3,20}$/;

const GENDERS: readonly Gender[] = ["male", "female"];
const HOSTELS: readonly HostelId[] = ["peace_hostel", "purity_hostel", "patience_hostel"];

// Allowed id sets for the onboarding picks, sourced from the SAME constants the
// UI uses — no parallel copies of those lists live in this route.
const VALID_TRAIT_IDS = new Set<string>(PERSONALITY_TRAITS.map((t) => t.id));
const VALID_DREAM_IDS = new Set<string>(DREAMS.map((d) => d.id));

// matric_number is UNIQUE and now server-generated; retry on a generation clash.
const MATRIC_MAX_ATTEMPTS = 5;

/**
 * Archetype is AUTHORITATIVE server-side (reroll-proof). The weighted roll uses
 * the `weight` values from lib/constants/archetypes.ts as the single source of
 * truth, and wallet cash comes from that same entry's `startingCash`. Any
 * `archetype`/cash in the request body is IGNORED — the client
 * /onboarding/archetype roll is now only a cosmetic preview.
 */
function rollArchetype(): { id: Archetype; startingCash: number } {
  const total = ARCHETYPE_CATALOG.reduce((sum, a) => sum + a.weight, 0);
  let roll = Math.random() * total;
  for (const a of ARCHETYPE_CATALOG) {
    roll -= a.weight;
    if (roll < 0) return { id: a.id, startingCash: a.startingCash };
  }
  const last = ARCHETYPE_CATALOG[ARCHETYPE_CATALOG.length - 1];
  return { id: last.id, startingCash: last.startingCash }; // float-rounding fallback
}

/** 3 uppercase letters derived from the department, for the matric XXX segment. */
function departmentCode(department: string): string {
  const letters = department.toUpperCase().replace(/[^A-Z]/g, "");
  return (letters.slice(0, 3) || "AUL").padEnd(3, "X").slice(0, 3);
}

/**
 * Generate a matric number satisfying MATRIC_REGEX (AUL/XXX/YY/NNN) and the
 * VARCHAR(24) column — the result is 14 chars. XXX = department code, YY =
 * 2-digit year, NNN = random 3-digit serial (the segment retried on collision).
 */
function generateMatric(department: string): string {
  const dept = departmentCode(department);
  const year = String(new Date().getFullYear() % 100).padStart(2, "0");
  const serial = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `AUL/${dept}/${year}/${serial}`;
}

// Supabase enforces a minimum password length (default 6).
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface StudentInsert {
  auth_user_id: string;
  matric_number: string;
  handle: string;
  full_name: string;
  gender: Gender;
  assigned_hostel: HostelId;
  archetype: Archetype;
  wallet_balance: number;
  faculty: Faculty;
  department: string;
  is_adult: boolean;
  personality_traits: string[];
  dream: string;
  appearance?: Record<string, unknown>;
}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message }, timestamp: Date.now() },
    { status },
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
    ? (value as string[])
    : null;
}

/** Peace Hostel is male-only; Purity & Patience are female-only (per schema). */
function hostelMatchesGender(hostel: HostelId, gender: Gender): boolean {
  return gender === "male"
    ? hostel === "peace_hostel"
    : hostel === "purity_hostel" || hostel === "patience_hostel";
}

export async function POST(request: Request): Promise<Response> {
  // --- Parse body ---
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const body = asRecord(raw);
  if (!body) {
    return errorResponse(400, "INVALID_BODY", "Request body must be a JSON object.");
  }

  // --- Extract & validate required fields ---
  const email = asString(body.email)?.trim();
  const password = asString(body.password);
  const fullName = asString(body.fullName)?.trim();
  const handle = asString(body.handle)?.trim();
  const gender = asString(body.gender);
  const assignedHostel = asString(body.assignedHostel);
  const faculty = asString(body.faculty)?.trim();
  const department = asString(body.department)?.trim();
  // Previously-dropped onboarding fields — now required by the NOT-NULL schema.
  const isAdult = body.isAdult;
  const personalityTraits = asStringArray(body.personalityTraits);
  const dream = asString(body.dream)?.trim();
  // NOTE: matric_number and archetype are NO LONGER read from the body — matric
  // is generated and archetype is rolled server-side (reroll-proof) below.

  if (!email || !EMAIL_REGEX.test(email)) {
    return errorResponse(400, "INVALID_EMAIL", "A valid email address is required.");
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return errorResponse(
      400,
      "WEAK_PASSWORD",
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  if (!fullName || fullName.length > 96) {
    return errorResponse(400, "INVALID_FULL_NAME", "Full name is required (max 96 characters).");
  }
  if (!handle || !HANDLE_REGEX.test(handle)) {
    return errorResponse(
      400,
      "INVALID_HANDLE",
      "Handle must be 3–20 characters, lowercase letters and numbers only.",
    );
  }
  if (isAdult !== true) {
    // Stores only the 18+ confirmation (no DOB). Must be an explicit boolean true.
    return errorResponse(403, "NOT_ADULT", "You must confirm you are 18 or older to register.");
  }
  if (
    !personalityTraits ||
    personalityTraits.length !== REQUIRED_TRAIT_COUNT ||
    !personalityTraits.every((id) => VALID_TRAIT_IDS.has(id))
  ) {
    // Mirrors the DB CHECK (array_length = 2) so the user gets a clean 4xx, not a 500.
    return errorResponse(
      400,
      "INVALID_PERSONALITY",
      `Pick exactly ${REQUIRED_TRAIT_COUNT} valid personality traits.`,
    );
  }
  if (!dream || !VALID_DREAM_IDS.has(dream)) {
    return errorResponse(400, "INVALID_DREAM", "A valid campus dream is required.");
  }
  if (!gender || !GENDERS.includes(gender as Gender)) {
    return errorResponse(400, "INVALID_GENDER", "Gender must be either 'male' or 'female'.");
  }
  if (!assignedHostel || !HOSTELS.includes(assignedHostel as HostelId)) {
    return errorResponse(400, "INVALID_HOSTEL", "A valid hostel assignment is required.");
  }
  if (!faculty || !isFaculty(faculty)) {
    return errorResponse(
      400,
      "INVALID_FACULTY",
      "Faculty must be one of the recognised Anchor University faculties.",
    );
  }
  if (!department || !FACULTY_DEPARTMENTS[faculty].includes(department)) {
    return errorResponse(
      400,
      "INVALID_DEPARTMENT",
      "Department must belong to the selected faculty.",
    );
  }

  const validFaculty = faculty;
  const validDepartment = department;
  const validGender = gender as Gender;
  const validHostel = assignedHostel as HostelId;

  if (!hostelMatchesGender(validHostel, validGender)) {
    return errorResponse(
      400,
      "HOSTEL_GENDER_MISMATCH",
      "Hostel assignment does not match gender: Peace is male-only; Purity and Patience are female-only.",
    );
  }

  // --- Optional fields ---
  const appearance = asRecord(body.appearance) ?? undefined;

  // --- Server-assigned, reroll-proof fields ---
  const assignedArchetype = rollArchetype(); // authoritative; any client archetype ignored

  // --- Supabase service-role client (server-only; bypasses RLS) ---
  const admin = createAdminClient();

  // 1. Create the auth user.
  const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !createdAuth.user) {
    return errorResponse(
      500,
      "AUTH_CREATE_FAILED",
      authError?.message ?? "Could not create the student account. Please try again.",
    );
  }

  const authUserId = createdAuth.user.id;

  // 2. Insert the students profile, generating a UNIQUE matric number per attempt
  //    and retrying on a matric collision. Since matric is server-generated now, a
  //    23505 on it means a generation clash to retry — NOT a user-facing error.
  //    (is_adult / personality_traits / dream are columns on this same row, so the
  //    single-row rollback below already covers those new inserts.)
  let studentId: string | null = null;

  for (let attempt = 1; attempt <= MATRIC_MAX_ATTEMPTS; attempt++) {
    let matricNumber = generateMatric(validDepartment);
    if (!isValidMatric(matricNumber)) matricNumber = generateMatric(validDepartment); // defensive

    const studentInsert: StudentInsert = {
      auth_user_id: authUserId,
      matric_number: matricNumber,
      handle,
      full_name: fullName,
      gender: validGender,
      assigned_hostel: validHostel,
      archetype: assignedArchetype.id,
      wallet_balance: assignedArchetype.startingCash,
      faculty: validFaculty,
      department: validDepartment,
      is_adult: true,
      personality_traits: personalityTraits,
      dream,
      ...(appearance ? { appearance } : {}),
    };

    const { data: insertedStudent, error: studentError } = await admin
      .from("students")
      .insert(studentInsert)
      .select("id")
      .single();

    if (!studentError && insertedStudent) {
      studentId = (insertedStudent as { id: string }).id;
      break;
    }

    // Postgres unique_violation (23505): distinguish the column by constraint name.
    if (studentError?.code === "23505") {
      const sig = `${studentError.message} ${studentError.details}`;
      const matricCollision =
        sig.includes("students_matric_number_key") || sig.includes("(matric_number)");
      const handleCollision =
        sig.includes("students_handle_key") || sig.includes("(handle)");

      if (handleCollision) {
        // Handle IS user-provided — a real conflict, not retryable.
        await admin.auth.admin.deleteUser(authUserId);
        return errorResponse(409, "HANDLE_TAKEN", "That handle is already taken.");
      }
      if (matricCollision) {
        // Generated serial clashed — try a fresh one unless attempts are exhausted.
        if (attempt < MATRIC_MAX_ATTEMPTS) continue;
        await admin.auth.admin.deleteUser(authUserId);
        return errorResponse(
          503,
          "MATRIC_GENERATION_FAILED",
          "Could not allocate a unique matric number. Please try again.",
        );
      }
      // Some other unique column — do not guess; roll back the orphaned auth user.
      await admin.auth.admin.deleteUser(authUserId);
      return errorResponse(409, "CONFLICT", "A unique field is already registered.");
    }

    // Non-unique failure (NOT NULL / CHECK / connectivity) — roll back and report.
    await admin.auth.admin.deleteUser(authUserId);
    return errorResponse(
      500,
      "PROFILE_CREATE_FAILED",
      studentError?.message ?? "Could not create the student profile. Please try again.",
    );
  }

  if (!studentId) {
    // Defensive: loop ended without a row and without a definitive error.
    await admin.auth.admin.deleteUser(authUserId);
    return errorResponse(
      503,
      "MATRIC_GENERATION_FAILED",
      "Could not allocate a unique matric number. Please try again.",
    );
  }

  // 3. Seed the simulation state. Only `student_id` is set; all needs/CGPA/Devotion/
  //    SDC Heat/skills/position use the schema's column DEFAULTs.
  const { error: simError } = await admin
    .from("student_simulation_states")
    .insert({ student_id: studentId });

  if (simError) {
    // Rollback: remove the student row (then the auth user) to avoid orphans.
    await admin.from("students").delete().eq("id", studentId);
    await admin.auth.admin.deleteUser(authUserId);
    return errorResponse(
      500,
      "SIM_STATE_CREATE_FAILED",
      simError.message ?? "Could not initialize simulation state. Please try again.",
    );
  }

  // 4. Success — return the new student id only (no secrets).
  return Response.json(
    { success: true, data: { studentId }, timestamp: Date.now() },
    { status: 201 },
  );
}
