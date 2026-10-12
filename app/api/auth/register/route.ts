import { createAdminClient } from "@/lib/supabase/admin";
import { isValidMatric } from "@/lib/validation/matric";

// --- Domain types (mirror the schema enums; zero `any`) ---
type Archetype = "nepo_baby" | "campus_hustler";
type Gender = "male" | "female";
type HostelId = "peace_hostel" | "purity_hostel" | "patience_hostel";

/** Schema-backed starting cash by archetype (wallet_balance). */
const STARTING_CASH: Record<Archetype, number> = {
  nepo_baby: 150_000,
  campus_hustler: 2_500,
};

const ARCHETYPES: readonly Archetype[] = ["nepo_baby", "campus_hustler"];
const GENDERS: readonly Gender[] = ["male", "female"];
const HOSTELS: readonly HostelId[] = ["peace_hostel", "purity_hostel", "patience_hostel"];

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
  department?: string;
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
  const matricNumber = asString(body.matricNumber)?.trim();
  const fullName = asString(body.fullName)?.trim();
  const handle = asString(body.handle)?.trim();
  const archetype = asString(body.archetype);
  const gender = asString(body.gender);
  const assignedHostel = asString(body.assignedHostel);

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
  if (!matricNumber || !isValidMatric(matricNumber)) {
    return errorResponse(
      400,
      "INVALID_MATRIC",
      "Matric number must match the format AUL/XXX/00/000.",
    );
  }
  if (!fullName || fullName.length > 96) {
    return errorResponse(400, "INVALID_FULL_NAME", "Full name is required (max 96 characters).");
  }
  if (!handle || handle.length > 32) {
    return errorResponse(400, "INVALID_HANDLE", "Handle is required (max 32 characters).");
  }
  if (!archetype || !ARCHETYPES.includes(archetype as Archetype)) {
    return errorResponse(
      400,
      "INVALID_ARCHETYPE",
      "Archetype must be either 'nepo_baby' or 'campus_hustler'.",
    );
  }
  if (!gender || !GENDERS.includes(gender as Gender)) {
    return errorResponse(400, "INVALID_GENDER", "Gender must be either 'male' or 'female'.");
  }
  if (!assignedHostel || !HOSTELS.includes(assignedHostel as HostelId)) {
    return errorResponse(400, "INVALID_HOSTEL", "A valid hostel assignment is required.");
  }

  const validArchetype = archetype as Archetype;
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
  const department = asString(body.department)?.trim() || undefined;

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

  // 2. Insert the students profile (links to the new auth user).
  const studentInsert: StudentInsert = {
    auth_user_id: authUserId,
    matric_number: matricNumber,
    handle,
    full_name: fullName,
    gender: validGender,
    assigned_hostel: validHostel,
    archetype: validArchetype,
    wallet_balance: STARTING_CASH[validArchetype],
    ...(department ? { department } : {}),
    ...(appearance ? { appearance } : {}),
  };

  const { data: insertedStudent, error: studentError } = await admin
    .from("students")
    .insert(studentInsert)
    .select("id")
    .single();

  const student = insertedStudent as { id: string } | null;

  if (studentError || !student) {
    // Rollback: remove the orphaned auth user (the students insert failed, so
    // there is no students row to delete).
    await admin.auth.admin.deleteUser(authUserId);

    // Postgres unique_violation (23505) on matric_number or handle (both UNIQUE)
    // is a client error, not a server fault.
    if (studentError?.code === "23505") {
      return errorResponse(
        409,
        "DUPLICATE_REGISTRATION",
        "That matric number or handle is already registered.",
      );
    }

    return errorResponse(
      500,
      "PROFILE_CREATE_FAILED",
      studentError?.message ?? "Could not create the student profile. Please try again.",
    );
  }

  const studentId = student.id;

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
