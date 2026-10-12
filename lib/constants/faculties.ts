/**
 * Anchor University faculties and their departments (TASK-103b-1).
 *
 * SHARED CONSTANT — the onboarding UI, TASK-103b-2 wiring, and any future screen
 * reuse this map instead of copy-pasting it. It MUST stay a character-for-character
 * copy of the map in `app/api/auth/register/route.ts` (same keys, same department
 * strings, same casing). The route re-validates the faculty<->department pairing
 * authoritatively; this copy only drives the UI selects.
 */
export type Faculty =
  | "Faculty of Basic and Allied Medical Sciences"
  | "Faculty of Education"
  | "Faculty of Environmental Sciences"
  | "Faculty of Humanities"
  | "Faculty of Law"
  | "Faculty of Science"
  | "Faculty of Social And Management Science";

export const FACULTY_DEPARTMENTS: Record<Faculty, readonly string[]> = {
  "Faculty of Basic and Allied Medical Sciences": [
    "Nursing Science",
    "Medical Laboratory Science",
    "Public Health",
  ],
  "Faculty of Education": [
    "Mathematics Education",
    "Biology Education",
    "Chemistry Education",
    "Physics Education",
  ],
  "Faculty of Environmental Sciences": ["Architecture"],
  "Faculty of Humanities": [
    "English and Literary Studies",
    "French",
    "History and International Studies",
    "Christian Religious Studies",
  ],
  "Faculty of Law": ["Law (LL.B)"],
  "Faculty of Science": [
    "Mathematics",
    "Computer Science",
    "Information Technology",
    "Software Engineering",
    "Biology",
    "Microbiology",
    "Biotechnology",
    "Biochemistry",
    "Chemistry",
    "Industrial Chemistry",
    "Physics",
    "Physics with Electronics",
    "Geology",
    "Applied Geophysics",
  ],
  "Faculty of Social And Management Science": [
    "Business Administration",
    "Accounting",
    "Economics",
    "Finance",
    "Political Science",
    "Mass Communication",
    "International Relations",
  ],
};

/** Ordered list for the faculty <select> (matches the map's key order). */
export const FACULTIES: readonly Faculty[] = [
  "Faculty of Basic and Allied Medical Sciences",
  "Faculty of Education",
  "Faculty of Environmental Sciences",
  "Faculty of Humanities",
  "Faculty of Law",
  "Faculty of Science",
  "Faculty of Social And Management Science",
];
