import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// --- DB row shapes ---

interface StudentRow {
  id: string;
  wallet_balance: number;
  archetype: string;
}

interface SimStateRow {
  cgpa: number;
  devotion: number;
  sdc_heat: number;
  sim_time_minutes: number;
}

interface LedgerIdRow {
  id: string;
}

// --- Helper (mirrors save/route.ts) ---

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message }, timestamp: Date.now() },
    { status },
  );
}

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
    .select("id, wallet_balance, archetype")
    .eq("auth_user_id", uid)
    .single();

  if (studentError || !studentData) {
    return errorResponse(404, "STUDENT_NOT_FOUND", "No student profile found for this account.");
  }

  const student = studentData as StudentRow;

  // 3. Read the simulation state.
  const { data: simData, error: simError } = await admin
    .from("student_simulation_states")
    .select("cgpa, devotion, sdc_heat, sim_time_minutes")
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

  // 4. Derive the current game-week and idempotency key.
  const week = Math.floor(sim.sim_time_minutes / 10080);
  const referenceId = `allowance_week_${week}`;

  // 5. Idempotency check: if this week's allowance was already claimed, return early.
  const { data: existingLedger } = await admin
    .from("financial_ledger")
    .select("id")
    .eq("student_id", student.id)
    .eq("reference_id", referenceId)
    .maybeSingle();

  if ((existingLedger as LedgerIdRow | null) !== null) {
    return Response.json({
      success: true,
      data: { granted: false, reason: "already_claimed" },
      timestamp: Date.now(),
    });
  }

  // 6. Compute amount and sermon flag (server is authoritative — client cannot influence this).
  let amount: number;
  let sermon: boolean;

  if (student.archetype === "nepo_baby") {
    amount = 50000;
    sermon = false;
  } else {
    // campus_hustler: check in priority order per .docs/03_GAME_ENGINE.md
    if (sim.sdc_heat > 1 || sim.cgpa < 2.5) {
      amount = 2000;
      sermon = true;
    } else if (sim.cgpa >= 3.5 && sim.devotion >= 80) {
      amount = 10000;
      sermon = false;
    } else {
      amount = 5000;
      sermon = false;
    }
  }

  const newBalance = student.wallet_balance + amount;

  // TODO: wrap steps 7–8 in a Supabase RPC/DB transaction for atomic safety.

  // 7. Credit the student's wallet.
  const { error: walletError } = await admin
    .from("students")
    .update({ wallet_balance: newBalance })
    .eq("id", student.id);

  if (walletError) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", walletError.message);
  }

  // 8. Write to the auditable ledger.
  const { error: ledgerError } = await admin.from("financial_ledger").insert({
    student_id: student.id,
    transaction_kind: "allowance",
    amount,
    running_balance: newBalance,
    reference_id: referenceId,
    narrative: sermon ? "Weekly allowance (with sermon)" : "Weekly allowance",
  });

  if (ledgerError) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", ledgerError.message);
  }

  return Response.json({
    success: true,
    data: { granted: true, amount, sermon, newWallet: newBalance, week },
    timestamp: Date.now(),
  });
}
