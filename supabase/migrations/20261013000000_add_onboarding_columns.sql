-- ============================================================================
-- ANCHOR LIFE: ADD ONBOARDING COLUMNS TO STUDENTS
-- File: supabase/migrations/20261013000000_add_onboarding_columns.sql
-- Depends on: 20261012000000_add_faculty_column.sql (already run — do not edit it)
-- Description: The onboarding flow now captures three extra pieces of data:
--                * is_adult            — the player's 18+ confirmation (NO DOB stored)
--                * personality_traits  — exactly 2 chosen trait IDs
--                * dream               — 1 chosen dream ID
--              Trait/dream IDs are stored as free text; VALUE validation (which IDs
--              are allowed) lives in the register route, same as faculty/department.
--              The only DB-level value rule is the cheap "exactly 2 traits" count.
-- ============================================================================

-- Safe NOT NULL adds for a live table (same pattern as the faculty migration):
-- ADD COLUMN NOT NULL with a temporary DEFAULT, then DROP DEFAULT.
--   * A bare NOT NULL add with no default would fail if any row already exists;
--     the temporary default backfills existing rows atomically (the table is
--     expected to be empty pre-launch, so no row actually needs the placeholder).
--   * Dropping the default afterward forces every future INSERT to supply the
--     value explicitly (matching how the register route will send it).

-- 1. is_adult — stores ONLY the 18+ confirmation. No date of birth is kept.
ALTER TABLE students
    ADD COLUMN is_adult BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE students
    ALTER COLUMN is_adult DROP DEFAULT;

-- 2. personality_traits — exactly 2 chosen trait IDs from the fixed list of 8
--    (allowance_ceo, last_minute_legend, campus_celebrity, attendance_ghost,
--     mummys_favourite, future_billionaire, steeze_minister, the_plug).
--    The temporary default array has length 2, so the count CHECK holds on backfill.
ALTER TABLE students
    ADD COLUMN personality_traits TEXT[] NOT NULL
        DEFAULT ARRAY['allowance_ceo', 'the_plug'];

-- Count-only constraint. This is the cheap, worthwhile DB-level rule. We do NOT
-- add a CHECK enumerating valid trait VALUES — that validation stays in the route.
ALTER TABLE students
    ADD CONSTRAINT students_personality_traits_len
        CHECK (array_length(personality_traits, 1) = 2);

ALTER TABLE students
    ALTER COLUMN personality_traits DROP DEFAULT;

-- 3. dream — 1 chosen dream ID from the fixed list of 8 (first_class_citizen,
--    sug_president, campus_big_boss, most_popular, chapel_general, clean_record,
--    hostel_landlord, departmental_genius). No value-level CHECK (route validates).
ALTER TABLE students
    ADD COLUMN dream TEXT NOT NULL DEFAULT 'first_class_citizen';

ALTER TABLE students
    ALTER COLUMN dream DROP DEFAULT;
