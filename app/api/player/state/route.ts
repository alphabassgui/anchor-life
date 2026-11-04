import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// --- DB row shapes (no generated types; cast explicitly) ---

interface StudentRow {
  id: string;
  auth_user_id: string | null;
  matric_number: string;
  handle: string;
  full_name: string;
  gender: string;
  department: string;
  level: number;
  archetype: string;
  status: string;
  assigned_hostel: string;
  bunk_number: string;
  appearance: Record<string, unknown>;
  wallet_balance: number;
  bank_balance: number;
  allowance_due_day: number;
  is_suspended: boolean;
  suspension_reason: string | null;
  restitution_fine_owed: number;
  community_labor_minutes_remaining: number;
  indigent_labor_granted: boolean;
  active_encounter_id: string | null;
  active_encounter_expires_at: string | null;
  theft_immunity_until: string;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

interface SimStateRow {
  student_id: string;
  hunger: number;
  energy: number;
  morale: number;
  health: number;
  cgpa: number;
  devotion: number;
  sdc_heat: number;
  skill_coding: number;
  skill_charisma: number;
  skill_fitness: number;
  skill_hustle: number;
  current_venue: string;
  spot_id: string | null;
  current_pose: string;
  is_sleeping: boolean;
  moodlets: Array<{ id: string; expiresAtSimMinute: number }>;
  sim_time_minutes: number;
  last_saved_at: string;
}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message }, timestamp: Date.now() },
    { status },
  );
}

export async function GET(): Promise<Response> {
  // 1. Resolve auth user from session cookie (anon SSR client).
  const serverClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser();

  if (authError || !user) {
    return errorResponse(401, "UNAUTHORIZED", "Valid session required.");
  }

  const uid = user.id;
  const admin = createAdminClient();

  // 2. Look up the students row by auth_user_id (admin bypasses RLS).
  const { data: studentData, error: studentError } = await admin
    .from("students")
    .select("*")
    .eq("auth_user_id", uid)
    .single();

  if (studentError || !studentData) {
    return errorResponse(404, "STUDENT_NOT_FOUND", "No student profile found for this account.");
  }

  const student = studentData as StudentRow;

  // 3. Read the simulation state row.
  const { data: simData, error: simError } = await admin
    .from("student_simulation_states")
    .select("*")
    .eq("student_id", student.id)
    .single();

  if (simError || !simData) {
    return errorResponse(
      404,
      "SIM_STATE_NOT_FOUND",
      "Simulation state not found for this student.",
    );
  }

  const sim = simData as SimStateRow;

  // 4. Include activeEncounter only when id is set AND not yet expired.
  const hasActiveEncounter =
    student.active_encounter_id !== null &&
    student.active_encounter_expires_at !== null &&
    new Date(student.active_encounter_expires_at) > new Date();

  return Response.json({
    success: true,
    data: {
      student,
      ...(hasActiveEncounter
        ? {
            activeEncounter: {
              id: student.active_encounter_id,
              expiresAt: student.active_encounter_expires_at,
            },
          }
        : {}),
      simulation: {
        vitals: {
          hunger: sim.hunger,
          energy: sim.energy,
          morale: sim.morale,
          health: sim.health,
        },
        cgpa: sim.cgpa,
        devotion: sim.devotion,
        sdcHeat: sim.sdc_heat,
        skills: {
          coding: sim.skill_coding,
          charisma: sim.skill_charisma,
          fitness: sim.skill_fitness,
          hustle: sim.skill_hustle,
        },
        currentVenue: sim.current_venue,
        spotId: sim.spot_id,
        isSleeping: sim.is_sleeping,
        moodlets: sim.moodlets,
      },
      items: [],
    },
    timestamp: Date.now(),
  });
}
