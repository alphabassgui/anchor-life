-- ============================================================================
-- ANCHOR LIFE: ADD FACULTY COLUMN TO STUDENTS
-- File: supabase/migrations/20261012000000_add_faculty_column.sql
-- Depends on: 20261010000000_initial_schema.sql (already run — do not edit it)
-- Description: Matriculation now requires BOTH a faculty and a department.
--              Both are stored as free-text VARCHAR(64); the faculty<->department
--              mapping is validated in the register route, NOT in the database.
--              No enums and no CHECK constraints on the values (by design).
-- ============================================================================

-- Add the NOT NULL `faculty` column safely for a live table.
--
-- Pattern: ADD COLUMN NOT NULL with a temporary DEFAULT, then DROP DEFAULT.
--   * A bare `ADD COLUMN ... NOT NULL` with no default would fail if any row
--     already exists. The temporary default backfills existing rows atomically.
--   * Dropping the default afterward means every future INSERT must supply
--     `faculty` explicitly (matching how the register route sends it).
--
-- Assumption: pre-launch the `students` table is expected to be empty, so no row
-- actually needs the placeholder. If rows DO exist, they receive the placeholder
-- 'Faculty of Science & Computing', which may need manual correction. The pattern
-- is correct either way, so it does not branch on row count.
ALTER TABLE students
    ADD COLUMN faculty VARCHAR(64) NOT NULL DEFAULT 'Faculty of Science & Computing';

ALTER TABLE students
    ALTER COLUMN faculty DROP DEFAULT;

-- `department` is left unchanged: VARCHAR(64) already holds the longest real
-- values (longest faculty = 44 chars, longest department = 33 chars; both <= 64).
