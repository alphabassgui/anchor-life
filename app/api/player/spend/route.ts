import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// --- DB row shapes ---

interface StudentRow {
  id: string;
  wallet_balance: number;
}

// --- Helper (mirrors allowance/route.ts) ---

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message }, timestamp: Date.now() },
    { status },
  );
}

const CAFETERIA_MEAL_PRICE = 1500; // TODO: source from item_catalog.base_price later

export async function POST(request: Request): Promise<Response> {
  // 1. Parse request body — guard against malformed JSON.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_BODY", "Request body must be valid JSON.");
  }

  // 2. Validate item field — only "cafeteria_meal" is supported in v1.
  const { item } = body as { item?: unknown };
  if (item !== "cafeteria_meal") {
    return errorResponse(400, "INVALID_ITEM", "Unknown or unsupported item.");
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

  // 4. Look up the students row.
  const { data: studentData, error: studentError } = await admin
    .from("students")
    .select("id, wallet_balance")
    .eq("auth_user_id", uid)
    .single();

  if (studentError || !studentData) {
    return errorResponse(404, "STUDENT_NOT_FOUND", "No student profile found for this account.");
  }

  const student = studentData as StudentRow;

  // 5. Insufficient-funds guard (before any write).
  if (student.wallet_balance < CAFETERIA_MEAL_PRICE) {
    return Response.json({
      success: true,
      data: {
        granted: false,
        reason: "insufficient_funds",
        required: CAFETERIA_MEAL_PRICE,
        current: student.wallet_balance,
      },
      timestamp: Date.now(),
    });
  }

  const newBalance = student.wallet_balance - CAFETERIA_MEAL_PRICE;

  // 6. Debit the student's wallet.
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
    transaction_kind: "spend",
    amount: -CAFETERIA_MEAL_PRICE,
    running_balance: newBalance,
    reference_id: `spend_cafeteria_meal_${Date.now()}`,
    narrative: "Cafeteria meal",
  });

  if (ledgerError) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", ledgerError.message);
  }

  return Response.json({
    success: true,
    data: { granted: true, item: "cafeteria_meal", amount: CAFETERIA_MEAL_PRICE, newWallet: newBalance },
    timestamp: Date.now(),
  });
}
