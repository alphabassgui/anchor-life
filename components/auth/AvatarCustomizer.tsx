"use client";

import { cn } from "@/lib/utils";
import {
  type AvatarAppearance,
  BODY_OPTIONS,
  STYLE_OPTIONS,
  HAIR_OPTIONS,
  OUTFIT_OPTIONS,
  SKIN_SWATCHES,
  HAIR_COLOR_SWATCHES,
  CLOTHING_SWATCHES,
} from "@/lib/constants/avatar";

interface AvatarCustomizerProps {
  value: AvatarAppearance;
  onChange: (next: AvatarAppearance) => void;
}

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

function Segmented<T extends string>({ label, options, selected, onSelect }: SegmentedProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-brand-surface">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option.value === selected;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              aria-pressed={isActive}
              className={cn(
                "overlay-interactive rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                isActive
                  ? "border-brand-accent bg-brand-accent text-brand-primary"
                  : "border-brand-subtle/30 bg-brand-secondary text-brand-surface hover:border-brand-accent",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SwatchRowProps {
  label: string;
  swatches: readonly string[];
  selected: string;
  onSelect: (hex: string) => void;
}

function SwatchRow({ label, swatches, selected, onSelect }: SwatchRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-brand-surface">{label}</span>
      <div className="flex flex-wrap gap-2">
        {swatches.map((hex) => {
          const isActive = hex.toLowerCase() === selected.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onSelect(hex)}
              aria-label={`${label}: ${hex}`}
              aria-pressed={isActive}
              style={{ backgroundColor: hex }}
              className={cn(
                "overlay-interactive h-9 w-9 rounded-full border-2 transition-transform",
                isActive
                  ? "border-brand-accent scale-110"
                  : "border-brand-subtle/30 hover:scale-105",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * 2D avatar customizer (TASK-103b-1). Edits the 8-field schema/contract
 * `appearance` object. No Three.js / no .glb — a lightweight tinted SVG preview.
 */
export function AvatarCustomizer({ value, onChange }: AvatarCustomizerProps) {
  const set = <K extends keyof AvatarAppearance>(key: K, next: AvatarAppearance[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-brand-subtle/20 bg-brand-secondary/40 p-4">
      <div className="flex flex-col items-center gap-2">
        <AvatarPreview appearance={value} />
        <span className="text-xs text-brand-subtle">Live preview</span>
      </div>

      <Segmented
        label="Body"
        options={BODY_OPTIONS}
        selected={value.body}
        onSelect={(body) => set("body", body)}
      />
      <Segmented
        label="Style"
        options={STYLE_OPTIONS}
        selected={value.style}
        onSelect={(style) => set("style", style)}
      />
      <Segmented
        label="Hairstyle"
        options={HAIR_OPTIONS}
        selected={value.hair}
        onSelect={(hair) => set("hair", hair)}
      />
      <Segmented
        label="Outfit"
        options={OUTFIT_OPTIONS}
        selected={value.outfit}
        onSelect={(outfit) => set("outfit", outfit)}
      />

      <SwatchRow
        label="Skin"
        swatches={SKIN_SWATCHES}
        selected={value.skin}
        onSelect={(skin) => set("skin", skin)}
      />
      <SwatchRow
        label="Hair colour"
        swatches={HAIR_COLOR_SWATCHES}
        selected={value.hairColor}
        onSelect={(hairColor) => set("hairColor", hairColor)}
      />
      <SwatchRow
        label="Top colour"
        swatches={CLOTHING_SWATCHES}
        selected={value.top}
        onSelect={(top) => set("top", top)}
      />
      <SwatchRow
        label="Bottom colour"
        swatches={CLOTHING_SWATCHES}
        selected={value.bottom}
        onSelect={(bottom) => set("bottom", bottom)}
      />
    </div>
  );
}

/** Minimal blocky SVG figure tinted by the chosen colours. */
function AvatarPreview({ appearance }: { appearance: AvatarAppearance }) {
  return (
    <svg
      viewBox="0 0 80 120"
      width={96}
      height={144}
      role="img"
      aria-label="Avatar preview"
      className="rounded-xl bg-brand-primary"
    >
      {/* hair */}
      <rect x={26} y={10} width={28} height={16} rx={6} fill={appearance.hairColor} />
      {/* head */}
      <rect x={28} y={16} width={24} height={22} rx={8} fill={appearance.skin} />
      {/* top */}
      <rect x={22} y={40} width={36} height={34} rx={6} fill={appearance.top} />
      {/* arms */}
      <rect x={14} y={42} width={8} height={28} rx={4} fill={appearance.skin} />
      <rect x={58} y={42} width={8} height={28} rx={4} fill={appearance.skin} />
      {/* bottom */}
      <rect x={24} y={74} width={14} height={34} rx={4} fill={appearance.bottom} />
      <rect x={42} y={74} width={14} height={34} rx={4} fill={appearance.bottom} />
    </svg>
  );
}
