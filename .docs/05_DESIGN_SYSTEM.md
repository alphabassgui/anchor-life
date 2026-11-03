# Anchor Life — Design System & Viewport Specification

**Document Version:** 1.1.0  
**Target Environment:** Mobile-First Responsive Web (PWA), WebGL Canvas (Three.js), Tailwind CSS v4  
**Design Philosophy:** Low-Poly Isometric 3D Foundation with a Clean, Tactile Mobile Native UI Overlay  

---

## 1. Visual Identity & Design Tokens

Brand: Anchor University Navy (#0F172A), Academic Gold (#EAB308), Altar Cream (#F8FAFC), Campus Lawn (#16A34A), Caution Amber (#F59E0B), SDC Red (#DC2626), Trench Hustle (#7C3AED), Cash Mint (#10B981).

```typescript
export const themeColors = {
  brand: {
    primary: '#0F172A', secondary: '#1E293B', accent: '#EAB308',
    accentHover: '#CA8A04', surface: '#F8FAFC', subtle: '#E2E8F0',
  },

  // 4 Vital Indicators (LOCKED v1: hunger, energy, morale, health)
  meter: {
    hunger: '#F97316',  // Vibrant Orange (Jollof / Food)
    energy: '#3B82F6',  // Electric Blue (Rest / Battery)
    morale: '#EC4899',  // Bubblegum Pink (Fun + Social combined)
    health: '#06B6D4',  // Fresh Cyan (Hygiene / Vitality combined)
  },

  status: {
    cgpa: '#6366F1', devotion: '#059669', heat: '#DC2626', naira: '#10B981',
  },

  avatar: {
    skin: ['#3d2314', '#593110', '#8d5524', '#c68a62', '#e0ac69', '#f1c27d'],
    hair: ['#0f0f10', '#1c1917', '#292524', '#78350f', '#9a3412', '#d97706'],
    clothing: ['#ffffff', '#0f172a', '#1e3a8a', '#dc2626', '#15803d', '#ca8a04'],
  }
};
```

> **Note:** The earlier 6-need palette (separate `hygiene`, `bladder`, `fun`, `social` swatches) is retired. `morale` carries the former Fun/Social role; `health` carries the former Hygiene role. Bladder is removed.

### 1.2 Typography
`Plus Jakarta Sans` for display/body; `JetBrains Mono` (tabular nums) for clocks, ledgers, CGPA.

---

## 2. Three.js Isometric Viewport Mathematics

True isometric via `OrthographicCamera`. Yaw θ_y = 45° (0.785398 rad); Pitch θ_x = arcsin(tan 30°) ≈ 35.264° (0.6154797 rad). Camera at (20,20,20) looking at (0,0,0).

```typescript
export function setupIsometricCamera(width: number, height: number): THREE.OrthographicCamera {
  const aspect = width / height;
  const frustumSize = 14;
  const camera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2, (frustumSize * aspect) / 2,
    frustumSize / 2, -frustumSize / 2, 0.1, 1000
  );
  const distance = 30;
  camera.position.set(distance, distance, distance);
  camera.lookAt(0, 0, 0);
  return camera;
}
```

Responsive frustum: 16.0 if aspect < 0.6 (tall portrait); 13.0 if 0.6–1.0; 10.0 if > 1.0.

### 2.3 Lighting Rig
AmbientLight (#F8FAFC, 0.75), HemisphereLight (sky #E0F2FE / ground #FEF3C7, 0.45), DirectionalLight sun (#FFFBEB, 1.2) at (15,25,10) with 1024² soft shadows.

---

## 3. 3D Modular Asset Pipeline

Unit scale 1 world unit = 1m = 1 tile; avatar 1.75 units; bunk 1×2×1.6. Budgets: humanoid ≤ 1,800 tris, prop ≤ 450, venue `.glb` ≤ 18,000, < 40 kB/prop via Draco. Zero texture maps — runtime hex tinting via `MeshStandardMaterial` on named meshes (`Mesh_Body/Head/Hair/Shirt/Pants/Shoes`).

### 3.3 Animation Clips (7)
`idle`, `walk`, `sit`, `sleep`, `study`, `pray`, `brawl`.

---

## 4. 2D DOM UI Overlay (Tailwind)

Overlay container `pointer-events-none`; interactive children `pointer-events-auto`. Layout: Top Status Bar `[Day/Time] [Devotion/CGPA] [4 Vital Bars] [Wallet]`; transparent 3D viewport; centered encounter modal; bottom dock `[🛏️ Hostel] [🛍️ Buy] [🗺️ Campus] [📱 Phone]`.

### 4.2 Vital Meter Tray — exactly 4 vital bars

```tsx
export const VITAL_BARS = [
  { key: 'hunger', label: 'Hunger', colorClass: 'bg-meter-hunger', icon: '🍚' },
  { key: 'energy', label: 'Energy', colorClass: 'bg-meter-energy', icon: '🔋' },
  { key: 'morale', label: 'Morale', colorClass: 'bg-meter-morale', icon: '😄' },
  { key: 'health', label: 'Health', colorClass: 'bg-meter-health', icon: '🚿' },
] as const;

export const NeedBar: React.FC<{ label: string; value: number; colorClass: string; icon: string; }> =
  ({ label, value, colorClass, icon }) => (
    <div className="flex items-center gap-1.5 w-full">
      <span className="text-xs" title={label}>{icon}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <div className={`h-full transition-all duration-500 rounded-full ${colorClass}`}
             style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
```

Core components (full implementations retained from prior spec): `TopStatusBar` (clock + CGPA + Devotion + Heat stars + wallet), `EncounterModal` (bribe slider / surrender / plead), `BottomDock` (4 tabs + unread badge). All responsive down to 360px.

---

## 5. Audio Tokens
Mono clips < 30 kB: `cashRegister`, `coinsDeduct`, `csoWhistle`, `sirenAlarm`, `bribeSucceed`, `chapelBell`, `spoonPlate`, `pencilWrite`, `bedSnore`. `playSound(key)` helper with autoplay-fallback catch.

---

## 6. Implementation Checklist
1. Camera at exactly (20,20,20) → lookAt (0,0,0).
2. `tintAvatarMeshes` runs on `.glb` load without rebinding shaders.
3. HUD renders exactly 4 vital bars (hunger, energy, morale, health) — no legacy hygiene/bladder/fun/social bars.
4. Overlay `pointer-events-none`; buttons/modals/cards `pointer-events-auto`.
