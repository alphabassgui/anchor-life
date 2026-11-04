import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// --- Request body types (04_API_CONTRACT.md §4.1) ---

interface Moodlet {
  id: string;
  expiresAtSimMinute: number;
}

interface SaveVitals {
  hunger: number;
  energy: number;
  morale: number;
  health: number;
}

interface SaveStateRequest {
  simTimeMinutes: number;
  vitals: SaveVitals;
  academic: {
    cgpa: number;
    devotion: number;
    sdcHeat: number;
  };
  spatial: {
    currentVenue: string;
    spotId: string;
    currentPose: string;
    isSleeping: boolean;
  };
  moodlets: Moodlet[];
  financialDiff: {
    walletDelta: number;
    bankDelta: number;
    reason: string;
    referenceId?: string;
  };
}

// --- Minimal DB row shapes needed for this route ---

interface StudentRow {
  id: string;
  wallet_balance: number;
}

interface SimStateRow {
  cgpa: number;
}

// --- Helpers ---

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message }, timestamp: Date.now() },
    { status },
  );
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && isFinite(v);
}

function isStr(v: unknown): v is string {
  return typeof v === "string";
}

function isBool(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isMoodlet(v: unknown): v is Moodlet {
  if (!isObj(v)) return false;
  return isStr(v.id) && isNum(v.expiresAtSimMinute);
}

function parseBody(raw: unknown): SaveStateRequest | null {
  if (!isObj(raw)) return null;

  if (!isNum(raw.simTimeMinutes)) return null;

  if (!isObj(raw.vitals)) return null;
  const v = raw.vitals;
  if (!isNum(v.hunger) || !isNum(v.energy) || !isNum(v.morale) || !isNum(v.health)) return null;

  if (!isObj(raw.academic)) return null;
  const a = raw.academic;
  if (!isNum(a.cgpa) || !isNum(a.devotion) || !isNum(a.sdcHeat)) return null;

  if (!isObj(raw.spatial)) return null;
  const s = raw.spatial;
  if (
    !isStr(s.currentVenue) ||
    !isStr(s.spotId) ||
    !isStr(s.currentPose) ||
    !isBool(s.isSleeping)
  )
    return null;

  if (!Array.isArray(raw.moodlets) || !raw.moodlets.every(isMoodlet)) return null;

  if (!isObj(raw.financialDiff)) return null;
  const f = raw.financialDiff;
  if (!isNum(f.walletDelta) || !isNum(f.bankDelta) || !isStr(f.reason)) return null;
  if (f.referenceId !== undefined && !isStr(f.referenceId)) return null;

  return {
    simTimeMinutes: raw.simTimeMinutes,
    vitals: { hunger: v.hunger, energy: v.energy, morale: v.morale, health: v.health },
    academic: { cgpa: a.cgpa, devotion: a.devotion, sdcHeat: a.sdcHeat },
    spatial: {
      currentVenue: s.currentVenue,
      spotId: s.spotId,
      currentPose: s.currentPose,
      isSleeping: s.isSleeping,
    },
    moodlets: raw.moodlets,
    financialDiff: {
      walletDelta: f.walletDelta,
      bankDelta: f.bankDelta,
      reason: f.reason,
      ...(isStr(f.referenceId) ? { referenceId: f.referenceId } : {}),
    },
  };
}

export async function POST(request: Request): Promise<Response> {
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

  // 2. Look up the students row (need id + wallet_balance for delta validation).
  const { data: studentData, error: studentError } = await admin
    .from("students")
    .select("id, wallet_balance")
    .eq("auth_user_id", uid)
    .single();

  if (studentError || !studentData) {
    return errorResponse(404, "STUDENT_NOT_FOUND", "No student profile found for this account.");
  }

  const student = studentData as StudentRow;

  // 3. Fetch current sim state to validate the cgpa delta.
  const { data: simData, error: simError } = await admin
    .from("student_simulation_states")
    .select("cgpa")
    .eq("student_id", student.id)
    .single();

  if (simError || !simData) {
    return errorResponse(
      404,
      "SIM_STATE_NOT_FOUND",
      "Simulation state not found for this student.",
    );
  }

  const currentSim = simData as SimStateRow;

  // 4. Parse and type body.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const body = parseBody(raw);
  if (!body) {
    return errorResponse(
      400,
      "INVALID_BODY",
      "Request body is malformed or missing required fields.",
    );
  }

  // 5. Validate vitals range 0.00–100.00.
  const { hunger, energy, morale, health } = body.vitals;
  if ([hunger, energy, morale, health].some((n) => n < 0 || n > 100)) {
    return errorResponse(422, "INVALID_NEED_RANGE", "All vitals must be between 0.00 and 100.00.");
  }

  // 6. Validate wallet spike: |delta| > 50,000 without a referenceId.
  if (Math.abs(body.financialDiff.walletDelta) > 50000 && !body.financialDiff.referenceId) {
    return errorResponse(
      400,
      "SUSPICIOUS_LEDGER_SPIKE",
      "Wallet change exceeds ₦50,000 without a referenceId.",
    );
  }

  // 7. Validate cgpa delta vs persisted value.
  if (Math.abs(body.academic.cgpa - currentSim.cgpa) > 0.08) {
    return errorResponse(400, "INVALID_CGPA_DELTA", "CGPA change exceeds 0.08 per sync window.");
  }

  // 8. Persist the simulation state.
  const { error: updateSimError } = await admin
    .from("student_simulation_states")
    .update({
      hunger,
      energy,
      morale,
      health,
      cgpa: body.academic.cgpa,
      devotion: body.academic.devotion,
      sdc_heat: body.academic.sdcHeat,
      current_venue: body.spatial.currentVenue,
      spot_id: body.spatial.spotId,
      current_pose: body.spatial.currentPose,
      is_sleeping: body.spatial.isSleeping,
      moodlets: body.moodlets,
      sim_time_minutes: body.simTimeMinutes,
      last_saved_at: new Date().toISOString(),
    })
    .eq("student_id", student.id);

  if (updateSimError) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", updateSimError.message);
  }

  // 9. Apply wallet delta to students row if non-zero.
  let syncedWallet = student.wallet_balance;

  if (body.financialDiff.walletDelta !== 0) {
    const newBalance = student.wallet_balance + body.financialDiff.walletDelta;
    const { data: updatedStudent, error: walletError } = await admin
      .from("students")
      .update({ wallet_balance: newBalance })
      .eq("id", student.id)
      .select("wallet_balance")
      .single();

    if (walletError || !updatedStudent) {
      return errorResponse(
        500,
        "INTERNAL_SERVER_ERROR",
        walletError?.message ?? "Could not update wallet balance.",
      );
    }

    syncedWallet = (updatedStudent as { wallet_balance: number }).wallet_balance;
  }

  return Response.json({
    success: true,
    data: {
      persistedAt: new Date().toISOString(),
      syncedWallet,
      syncedCgpa: body.academic.cgpa,
      syncedDevotion: body.academic.devotion,
      syncedSdcHeat: body.academic.sdcHeat,
    },
    timestamp: Date.now(),
  });
}
