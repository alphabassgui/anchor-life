import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// --- DB row shapes ---

interface StudentRow {
  id: string;
}

interface SimSkillRow {
  skill_coding: number;
}

// --- Helper (mirrors allowance/route.ts) ---

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message }, timestamp: Date.now() },
    { status },
  );
}

// Dedicated study skill route — increments skill_coding server-side only.
// Does NOT touch financial_ledger (skills are not money).
// No idempotency gate: repeatable, like the hustle route.
//
// SKILL_GAIN is a placeholder rate; ~12 sessions to reach the 3.00 freelancing gate.
//
// TODO(prereq): once this ships, activate the skill_coding >= 3.00 gate in
//   app/api/player/hustle/route.ts (separate task).

const SKILL_GAIN = 0.25;

export async function POST(): Promise<Response> {
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

  // 2. Look up the students row.
  const { data: studentData, error: studentError } = await admin
    .from("students")
    .select("id")
    .eq("auth_user_id", uid)
    .single();

  if (studentError || !studentData) {
    return errorResponse(404, "STUDENT_NOT_FOUND", "No student profile found for this account.");
  }

  const student = studentData as StudentRow;

  // 3. Read current skill_coding.
  const { data: simData, error: simError } = await admin
    .from("student_simulation_states")
    .select("skill_coding")
    .eq("student_id", student.id)
    .single();

  if (simError || !simData) {
    return errorResponse(
      404,
      "SIM_STATE_NOT_FOUND",
      "Simulation state not found for this student.",
    );
  }

  const sim = simData as SimSkillRow;

  // 4. Compute new skill value server-side (client cannot influence this).
  const newSkill = Math.min(10, sim.skill_coding + SKILL_GAIN);

  // 5. Persist the updated skill.
  const { error: updateError } = await admin
    .from("student_simulation_states")
    .update({ skill_coding: newSkill })
    .eq("student_id", student.id);

  if (updateError) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", updateError.message);
  }

  return Response.json({
    success: true,
    data: { skill: "coding", newSkillCoding: newSkill },
    timestamp: Date.now(),
  });
}
