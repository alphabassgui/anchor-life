-- ============================================================================
-- ANCHOR LIFE: GRANT SERVICE_ROLE TABLE PRIVILEGES (REGISTRATION FIX)
-- File: supabase/migrations/20261014000000_grant_service_role_privileges.sql
-- Depends on: 20261013000000_add_onboarding_columns.sql (already run — do not edit it)
-- Description: Fixes live error `permission denied for table students` from the
--              register route (error code PROFILE_CREATE_FAILED).
--
--              Root cause: `students` (and `student_simulation_states`) have RLS
--              ENABLED with only SELECT/UPDATE policies and NO base GRANTs. The
--              register route inserts via the service_role key. `service_role`
--              BYPASSES RLS, but BYPASSRLS does NOT substitute for table-level
--              privileges — so the role was refused at the GRANT layer, not the
--              RLS layer (hence "permission denied for table", not "new row
--              violates row-level security policy"). Confirmed live:
--              SELECT has_table_privilege('service_role','public.students','INSERT')
--              returned FALSE.
--
--              This migration is PURELY ADDITIVE grants. It does NOT touch the
--              route, client helpers, RLS, or any policy, and does NOT disable or
--              weaken RLS. Grants are SCOPED to exactly what server-side
--              registration needs (INSERT + SELECT on the two tables it writes).
--
-- Sequence grants: NONE needed. Every primary key in this schema is a UUID
--              (gen_random_uuid()); there are no SERIAL/BIGSERIAL/sequence-backed
--              columns, so no GRANT USAGE, SELECT ON SEQUENCE is required.
-- ============================================================================

-- Schema access (idempotent; safe even if already granted at project init).
GRANT USAGE ON SCHEMA public TO service_role;

-- The register route writes these two tables (students first, then its sim state).
-- SELECT is included because the inserts use `.select("id")` to return the new row.
GRANT INSERT, SELECT ON public.students TO service_role;
GRANT INSERT, SELECT ON public.student_simulation_states TO service_role;

-- OPTIONAL (enable if you get tired of granting per-table as you add tables):
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, SELECT, UPDATE ON TABLES TO service_role;
-- (This auto-grants service_role on FUTURE tables. Left off by default to keep grants explicit.)
