/**
 * Avatar appearance model + palettes (TASK-103b-1).
 *
 * Field set is the SCHEMA source of truth: the `students.appearance` JSONB DEFAULT
 * in `.docs/02_SCHEMA.sql` (8 keys), which the `RegisterStudentRequest.appearance`
 * type in `.docs/04_API_CONTRACT.md` matches exactly. This is what gets stored.
 *
 * C25 NOTE: `AvatarAppearanceConfig` in `.docs/05_DESIGN_SYSTEM.md` is STALE — it
 * lists a `shoes` field (absent from the schema default and the API contract) and
 * omits `body`/`style`/`hair`/`outfit`. We build the schema/contract 8-field set
 * (no `shoes`); the DS interface should be reconciled separately.
 */
export interface AvatarAppearance {
  body: "m" | "f";
  style: "smart" | "casual" | "traditional";
  skin: string; // hex
  hair: string; // mesh id
  hairColor: string; // hex
  outfit: string; // mesh id
  top: string; // hex
  bottom: string; // hex
}

/** Typed option lists for the non-color selectors. */
export const BODY_OPTIONS: readonly { value: AvatarAppearance["body"]; label: string }[] = [
  { value: "m", label: "Masculine" },
  { value: "f", label: "Feminine" },
];

export const STYLE_OPTIONS: readonly { value: AvatarAppearance["style"]; label: string }[] = [
  { value: "smart", label: "Smart" },
  { value: "casual", label: "Casual" },
  { value: "traditional", label: "Traditional" },
];

// Mesh ids are free-text in the schema; these are the values documented in
// .docs/04_API_CONTRACT.md. Extend as more meshes ship.
export const HAIR_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "afro", label: "Afro" },
  { value: "fade", label: "Fade" },
  { value: "braids", label: "Braids" },
];

export const OUTFIT_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "corporate_tie", label: "Corporate Tie" },
  { value: "polo_jeans", label: "Polo & Jeans" },
];

/**
 * Swatch hex values. These mirror the `--color-avatar-*` design tokens in
 * `app/globals.css`; they live here (not as Tailwind classes) because the
 * appearance payload must carry literal hex strings as DATA. All UI *chrome*
 * styling still uses the Tailwind token utilities, never hardcoded hex.
 */
export const SKIN_SWATCHES: readonly string[] = [
  "#3d2314",
  "#593110",
  "#8d5524",
  "#c68a62",
  "#e0ac69",
  "#f1c27d",
];

export const HAIR_COLOR_SWATCHES: readonly string[] = [
  "#0f0f10",
  "#1c1917",
  "#292524",
  "#78350f",
  "#9a3412",
  "#d97706",
];

export const CLOTHING_SWATCHES: readonly string[] = [
  "#ffffff",
  "#0f172a",
  "#1e3a8a",
  "#dc2626",
  "#15803d",
  "#ca8a04",
];

/** Seed matching the schema `appearance` DEFAULT so the customizer starts valid. */
export const DEFAULT_APPEARANCE: AvatarAppearance = {
  body: "m",
  style: "smart",
  skin: "#8d5524",
  hair: "afro",
  hairColor: "#1a1a1a",
  outfit: "corporate_tie",
  top: "#ffffff",
  bottom: "#1d2433",
};
