-- ============================================================================
-- ANCHOR LIFE: GRANT SERVICE_ROLE INSERT/SELECT ON financial_ledger
-- File: supabase/migrations/20261104000000_grant_service_role_financial_ledger.sql
-- Depends on: 20261014000000_grant_service_role_privileges.sql (already applied)
-- Description: Fixes live error `permission denied for table financial_ledger`
--              from the hustle route (and the allowance route's ledger insert).
--
--              Root cause: `financial_ledger` has RLS ENABLED with no policies.
--              service_role BYPASSES RLS, but BYPASSRLS does NOT substitute for
--              table-level GRANT privileges (see prior migration for precedent).
--              Confirmed: service_role has INSERT/SELECT/UPDATE on students and
--              student_simulation_states, but financial_ledger was never included.
--
--              This migration is PURELY ADDITIVE grants. It does NOT touch any
--              route, client helper, RLS policy, or table structure.
-- ============================================================================

GRANT INSERT, SELECT ON public.financial_ledger TO service_role;
