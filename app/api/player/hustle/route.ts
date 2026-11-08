import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// --- DB row shapes ---

interface StudentRow {
  id: string;
  wallet_balance: number;
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

// Dedicated hustle payout route — credits wallet directly, exactly like the
// allowance route. Does NOT go through the save route's walletDelta path.
//
// Hustles are REPEATABLE: there is deliberately NO cooldown and NO idempotency gate.
// reference_id is timestamp-unique for audit/ledger only, not for gating.
//
// Energy −35 and Morale −15 are client-authoritative; they are applied client-side
// in a later task, not here.
//
// prereq(DONE): skill_coding >= 3.00 gate is enforced below, before payout.
// TODO(barber): add the "barber" hustle id (flat ₦2,500, owns hair_clippers,
//   10% porter-alert risk) when inventory + SDC Heat systems exist.
// TODO(time): the +60 game-minute sim-clock cost is applied client-side later.

export async function POST(request: Request): Promise<Response> {
  // 1. Parse request body — guard against malformed JSON.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_BODY", "Request body must be valid JSON.");
  }

  // 2. Validate hustle field — only "coding_gig" is supported in v1.
  const { hustle } = body as { hustle?: unknown };
  if (hustle !== "coding_gig") {
    return errorResponse(400, "INVALID_HUSTLE", "Unknown or unsupported hustle.");
  }

  // 3. Resolve auth user from session cookie (anon SSR client).
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

  // 4. Look up the students row (wallet_balance only — prereq gate is v2).
  const { data: studentData, error: studentError } = await admin
    .from("students")
    .select("id, wallet_balance")
    .eq("auth_user_id", uid)
    .single();

  if (studentError || !studentData) {
    return errorResponse(404, "STUDENT_NOT_FOUND", "No student profile found for this account.");
  }

  const student = studentData as StudentRow;

  // Read skill_coding — freelancing requires >= 3.00 (.docs/03_GAME_ENGINE.md §8.1).
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

  // Freelancing skill-gate: below 3.00 coding, reject BEFORE any payout or ledger write.
  const REQUIRED_CODING = 3.0;
  if (sim.skill_coding < REQUIRED_CODING) {
    return Response.json({
      success: true,
      data: {
        granted: false,
        reason: "skill_too_low",
        required: REQUIRED_CODING,
        current: sim.skill_coding,
      },
      timestamp: Date.now(),
    });
  }

  // 5. Compute payout server-side (client must not influence this).
  //    Range: ₦4,000–₦7,500 per .docs/03_GAME_ENGINE.md §8.1.B (Assignment Freelancing).
  const amount = Math.floor(Math.random() * (7500 - 4000 + 1)) + 4000;
  const newBalance = student.wallet_balance + amount;

  // 6. Credit the student's wallet.
  const { error: walletError } = await admin
    .from("students")
    .update({ wallet_balance: newBalance })
    .eq("id", student.id);

  if (walletError) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", walletError.message);
  }

  // 7. Write to the auditable ledger.
  const { error: ledgerError } = await admin.from("financial_ledger").insert({
    student_id: student.id,
    transaction_kind: "hustle",
    amount,
    running_balance: newBalance,
    reference_id: `hustle_coding_gig_${Date.now()}`,
    narrative: "Assignment freelancing gig",
  });

  if (ledgerError) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", ledgerError.message);
  }

  return Response.json({
    success: true,
    data: { granted: true, hustle: "coding_gig", amount, newWallet: newBalance },
    timestamp: Date.now(),
  });
}
