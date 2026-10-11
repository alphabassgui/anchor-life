# Anchor Life — Design System & Viewport Specification

**Document Version:** 1.0.0  
**Target Environment:** Mobile-First Responsive Web (PWA), WebGL Canvas (Three.js), Tailwind CSS v4  
**Design Philosophy:** Low-Poly Isometric 3D Foundation with a Clean, Tactile Mobile Native UI Overlay  

---

## 1. Visual Identity & Design Tokens

The visual language of Anchor Life blends the clean, stylized aesthetic of *Lagos Life* with the institutional branding of Anchor University, Ayobo (Navy Blue, Gold, and Warm Cream), layered with playful Nigerian youth campus culture.

### 1.1 Color Palette & Token Definitions

All interface components are styled using Tailwind CSS tokens mapped to semantic roles:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SEMANTIC COLOR SYSTEM                             │
├───────────────────┬───────────────────┬───────────────────┬─────────────────┤
│ Campus Navy       │ Academic Gold     │ Altar Cream       │ Campus Lawn     │
│ #0F172A (Primary) │ #EAB308 (Accent)  │ #F8FAFC (Surface) │ #16A34A (Devot) │
├───────────────────┼───────────────────┼───────────────────┼─────────────────┤
│ Caution Amber     │ SDC Red           │ Trench Hustle     │ Cash Mint       │
│ #F59E0B (Curfew)  │ #DC2626 (Heat)    │ #7C3AED (Hustle)  │ #10B981 (Naira) │
└───────────────────┴───────────────────┴───────────────────┴─────────────────┘
```

#### Tailwind Configuration Tokens (`tailwind.config.ts`)
```typescript
export const themeColors = {
  // Institutional Brand
  brand: {
    primary: '#0F172A',      // Deep Anchor Navy (Headers, navbars, solid frames)
    secondary: '#1E293B',    // Card surfaces and elevated containers
    accent: '#EAB308',       // Anchor University Gold (Highlights, primary buttons)
    accentHover: '#CA8A04',  // Darkened gold for pressed button states
    surface: '#F8FAFC',      // Crisp light card background
    subtle: '#E2E8F0',       // Borders, dividers, and inactive tabs
  },

  // 6 Biological Need Indicators
  meter: {
    hunger: '#F97316',       // Vibrant Orange (Jollof / Food)
    energy: '#3B82F6',       // Electric Blue (Rest / Battery)
    hygiene: '#06B6D4',      // Fresh Cyan (Water / Cleanliness)
    bladder: '#A855F7',      // Soft Purple (Restroom urgency)
    fun: '#EC4899',          // Bubblegum Pink (Sports / Entertainment)
    social: '#10B981',       // Emerald Green (Peer interactions)
  },

  // Campus Status & Disciplinary
  status: {
    cgpa: '#6366F1',         // Academic Indigo (Grades & continuous assessments)
    devotion: '#059669',     // Chapel Pine Green (Spiritual standing)
    heat: '#DC2626',         // SDC Threat Crimson (Security alerts & penalties)
    naira: '#10B981',        // Nigerian Naira Emerald (Balances & transfers)
  },

  // Avatar Hex Tinting Swatches
  avatar: {
    skin: ['#3d2314', '#593110', '#8d5524', '#c68a62', '#e0ac69', '#f1c27d'],
    hair: ['#0f0f10', '#1c1917', '#292524', '#78350f', '#9a3412', '#d97706'],
    clothing: ['#ffffff', '#0f172a', '#1e3a8a', '#dc2626', '#15803d', '#ca8a04'],
  }
};
```

---

### 1.2 Typography & Numerical Formatting

* **Primary Body & Display Font:** `Plus Jakarta Sans` or system sans-serif (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`). Clean, geometric, and highly legible on 360px mobile screens.
* **Monospace & Numerical Font:** `JetBrains Mono` or tabular numerals (`tabular-nums font-mono`) for monetary ledgers, countdown clocks, and CGPA scores to prevent layout shifting during updates.

```css
/* Typography Scale Tokens */
--font-display: 'Plus Jakarta Sans', sans-serif;
--font-mono: 'JetBrains Mono', monospace;

.text-hud-time    { font-size: 0.8125rem; font-weight: 700; font-family: var(--font-mono); }
.text-hud-balance { font-size: 0.9375rem; font-weight: 800; font-family: var(--font-mono); }
.text-card-title  { font-size: 1.125rem;  font-weight: 700; line-height: 1.35; }
.text-action-chip { font-size: 0.75rem;   font-weight: 600; letter-spacing: 0.02em; }
```

---

## 2. Three.js Isometric Viewport Mathematics

Anchor Life achieves its distinctive *Lagos Life* aesthetic using true isometric projection via an `OrthographicCamera` rather than perspective projection.

```
                   TRUE ISOMETRIC PROJECTION
                   
                         +Y (World Up)
                            │   
                            │    / +Z (Screen Down-Left)
                            │   /
                            │  /
                            │ /  Yaw = 45.0°
                            └──────────── +X (Screen Down-Right)
                           / 
                          / Pitch = 35.264°
                         ▼
                   [ Camera Position: (20, 20, 20) ]
                   [ LookAt Target:   ( 0,  0,  0) ]
```

### 2.1 Camera Projection Angles & Mathematical Constants
To eliminate visual foreshortening and maintain equal scaling across axes, the camera pitch $\theta_x$ and yaw $\theta_y$ are fixed:

$$\theta_y = 45.0^\circ = \frac{\pi}{4}\text{ rad} \approx 0.785398$$

$$\theta_x = \arcsin\left(\tan(30^\circ)\right) = \arcsin\left(\frac{1}{\sqrt{3}}\right) \approx 35.2643897^\circ \approx 0.6154797\text{ rad}$$

#### Camera Initialization Code
```typescript
import * as THREE from 'three';

export function setupIsometricCamera(width: number, height: number): THREE.OrthographicCamera {
  const aspect = width / height;
  const frustumSize = 14; // View frustum height in world units

  const camera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    1000
  );

  // Position camera on the diagonal vector
  const distance = 30;
  camera.position.set(distance, distance, distance);
  camera.lookAt(0, 0, 0);

  return camera;
}
```

### 2.2 Responsive Dynamic Zoom Formula
Mobile phone viewports vary significantly between portrait ($9:19.5$) and landscape ($16:9$). The frustum scale adjusts dynamically on resize to keep the room grid or campus plaza centered:

$$\text{FrustumSize} = \begin{cases} 
16.0 & \text{if } \text{Aspect} < 0.6 \quad (\text{Tall Portrait Mobile}) \\
13.0 & \text{if } 0.6 \le \text{Aspect} \le 1.0 \quad (\text{Square / Foldable}) \\
10.0 & \text{if } \text{Aspect} > 1.0 \quad (\text{Desktop / Tablet Landscape})
\end{cases}$$

---

### 2.3 Lighting Rig & Flat Low-Poly Shading

Anchor Life scenes use a warm, stylized lighting rig configured to prevent harsh shadows and preserve vibrant colors:

* **Ambient Light:** Warm white (`#F8FAFC`, intensity: $0.75$). Keeps unlit faces clear and prevents pitch-black contours.
* **Key Directional Light (Sun):** Warm golden daylight (`#FFFBEB`, intensity: $1.20$), positioned at $(15, 25, 10)$ with soft shadow mapping ($1024 \times 1024$ resolution).
* **Hemisphere Light (Sky vs Ground):**
  * Sky Color: `#E0F2FE` (Soft Lagos sky blue).
  * Ground Color: `#FEF3C7` (Warm sandy soil).
  * Intensity: $0.45$.

```typescript
export function buildCampusLighting(scene: THREE.Scene) {
  const ambient = new THREE.AmbientLight(0xf8fafc, 0.75);
  scene.add(ambient);

  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xfef3c7, 0.45);
  scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xfffbeb, 1.2);
  sun.position.set(15, 25, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0005;

  const d = 12;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;

  scene.add(sun);
}
```

---

## 3. 3D Modular Asset Pipeline & Standards

### 3.1 Unit Grid Scale & Geometry Budgets
* **Unit Scale:** $1.0\text{ Three.js World Unit} = 1.0\text{ Meter} = 1\text{ Room Tile}$.
* **Humanoid Avatar Height:** $1.75\text{ units}$ tall.
* **Bunk Bed Footprint:** $1.0\text{ unit (width)} \times 2.0\text{ units (depth)} \times 1.6\text{ units (height)}$.
* **Mesh Constraints:**
  * Base Humanoid Mesh: $\le 1,800\text{ triangles}$.
  * Single Furniture Prop: $\le 450\text{ triangles}$.
  * Venue Scene File (`.glb`): $\le 18,000\text{ triangles}$.
  * Target File Size: Compressed via Draco to $< 40\text{ kB}$ per prop.

### 3.2 Dynamic Material Hex-Tinting Pipeline
To eliminate multi-megabyte texture downloads over campus networks, assets use zero texture maps (`.png`/`.jpg`). Surfaces are untextured low-poly geometry rendered with `MeshStandardMaterial` hex values.

```typescript
export interface AvatarAppearanceConfig {
  skin: string;        // e.g. '#8d5524'
  hairColor: string;   // e.g. '#1a1a1a'
  top: string;         // e.g. '#ffffff'
  bottom: string;      // e.g. '#1d2433'
  shoes: string;       // e.g. '#000000'
}

export function tintAvatarMeshes(avatarGroup: THREE.Group, config: AvatarAppearanceConfig) {
  avatarGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Clone to avoid mutating shared GLTF cache
      child.material = child.material.clone();
      const mat = child.material as THREE.MeshStandardMaterial;

      mat.roughness = 0.85;
      mat.metalness = 0.05;

      switch (child.name) {
        case 'Mesh_Body':
        case 'Mesh_Head':
          mat.color.set(config.skin);
          break;
        case 'Mesh_Hair':
          mat.color.set(config.hairColor);
          break;
        case 'Mesh_Shirt':
          mat.color.set(config.top);
          break;
        case 'Mesh_Pants':
          mat.color.set(config.bottom);
          break;
        case 'Mesh_Shoes':
          mat.color.set(config.shoes);
          break;
      }
    }
  });
}
```

### 3.3 Animation State Machine & Skeleton Poses
Avatars use a shared humanoid rig containing 6 core animation clips:

| Animation Clip | Triggered By Action | Avatar Position / Pose |
| :--- | :--- | :--- |
| `idle` | Standing in room without orders | Slight breathing sway, upright posture |
| `walk` | Moving between venue spots | Low-poly walk cycle ($1.8\text{ steps/sec}$) |
| `sit` | Canteen eating, study desk, chapel pew | Pelvis lowered $0.45\text{m}$, knees bent $90^\circ$ |
| `sleep` | Hostel bunk bed, clinic bed | Rotated $90^\circ$ horizontally, eyes closed |
| `study` | Reading desk, CSC computing terminal | Head tilted forward, hands resting on table |
| `pray` | Chapel altar, room devotion | Kneeling, hands clasped together |
| `brawl` | Sports Centre brawls, hostel hallway | Boxing guard stance, punch keyframe |

---

## 4. 2D DOM UI Overlay Specifications (Tailwind CSS)

The UI overlay runs in the React DOM positioned over the WebGL `<canvas>`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SCREEN OVERLAY ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Top Status Bar (pointer-events-auto)                                       │
│  [ Day / Time ] [ Devotion / CGPA ] [ Needs Bar Tray ] [ Wallet: ₦2,500 ]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                                             │
│               TRANSPARENT 3D INTERACTION VIEWPORT                           │
│               (Passes pointer events to Three.js canvas)                    │
│                                                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Floating Action Sheet / Encounter Modal (Centered when active)             │
│  [ CSO Confrontation / Bribery Slider / Action Outcome Toast ]              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Bottom Dock Navigation (pointer-events-auto)                               │
│  [ 🛏️ Hostel ]    [ 🛍️ Buy ]    [ 🗺️ Campus Map ]    [ 📱 Phone (3) ]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Top Status HUD Component (`components/hud/TopStatusBar.tsx`)

```tsx
import React from 'react';

interface TopStatusBarProps {
  clockText: string;     // e.g. "Wed 10:15 AM"
  walletBalance: number; // e.g. 2500
  cgpa: number;          // e.g. 3.65
  devotion: number;      // e.g. 88
  sdcHeat: number;       // 0 - 5
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  clockText,
  walletBalance,
  cgpa,
  devotion,
  sdcHeat
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 p-2.5 flex items-center justify-between pointer-events-none">
      {/* Clock & Academic Status */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 shadow-lg pointer-events-auto">
        <span className="text-xs font-bold text-slate-200 font-mono">{clockText}</span>
        <span className="text-slate-600">|</span>
        <span className="text-xs font-bold text-indigo-400">CGPA {cgpa.toFixed(2)}</span>
        <span className="text-slate-600">|</span>
        <span className="text-xs font-bold text-emerald-400">{devotion}% ⛪</span>
      </div>

      {/* Disciplinary Threat Heat Stars */}
      {sdcHeat > 0 && (
        <div className="flex items-center gap-0.5 bg-red-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-red-500/40 pointer-events-auto animate-pulse">
          <span className="text-xs font-black text-red-400">HEAT</span>
          {Array.from({ length: sdcHeat }).map((_, i) => (
            <span key={i} className="text-red-500 text-xs">★</span>
          ))}
        </div>
      )}

      {/* Wallet Balance */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg pointer-events-auto">
        <span className="text-xs font-black text-emerald-400 font-mono">
          ₦{walletBalance.toLocaleString()}
        </span>
        <button 
          aria-label="Add funds or view ledger"
          className="w-5 h-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center font-bold text-xs"
        >
          +
        </button>
      </div>
    </header>
  );
};
```

---

### 4.2 Biological Need Meter Tray Component

```tsx
interface NeedBarProps {
  label: string;
  value: number; // 0 - 100
  colorClass: string;
  icon: string;
}

export const NeedBar: React.FC<NeedBarProps> = ({ label, value, colorClass, icon }) => (
  <div className="flex items-center gap-1.5 w-full">
    <span className="text-xs" title={label}>{icon}</span>
    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
      <div 
        className={`h-full transition-all duration-500 rounded-full ${colorClass}`}
        style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
      />
    </div>
  </div>
);
```

---

### 4.3 High-Stakes Confrontation Modal (`components/encounters/EncounterModal.tsx`)

When the CSO or Hall Warden intercepts the avatar, normal controls freeze and this modal renders over the center viewport:

```tsx
import React, { useState } from 'react';

interface EncounterModalProps {
  authorityName: string;   // "Chief Security Officer (CSO)"
  offenseTitle: string;    // "Hostel Curfew & Contraband Violation"
  description: string;
  demandedBribe: number;   // e.g. 5000
  playerWallet: number;
  onBribe: (offered: number) => void;
  onSurrender: () => void;
  onPlead: () => void;
}

export const EncounterModal: React.FC<EncounterModalProps> = ({
  authorityName,
  offenseTitle,
  description,
  demandedBribe,
  playerWallet,
  onBribe,
  onSurrender,
  onPlead,
}) => {
  const [bribeOffer, setBribeOffer] = useState(demandedBribe);
  const canAfford = playerWallet >= bribeOffer;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-red-500/80 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-slate-100">
        
        {/* Header Alert */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center justify-center text-2xl">
            👮🏾‍♂️
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-red-400">Apprehended!</h2>
            <h3 className="text-base font-bold text-white">{authorityName}</h3>
          </div>
        </div>

        {/* Narrative Box */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs leading-relaxed text-slate-300">
          <p className="font-semibold text-amber-300 mb-1">Charge: {offenseTitle}</p>
          <p>{description}</p>
        </div>

        {/* Action Decision Buttons */}
        <div className="flex flex-col gap-2.5 pt-2">
          {/* Option A: Settlement / Bribe */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-200">Settlement (₦):</span>
              <span className="font-mono font-bold text-emerald-400">₦{bribeOffer.toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min={1000} 
              max={Math.max(10000, demandedBribe * 2)} 
              step={500} 
              value={bribeOffer} 
              onChange={(e) => setBribeOffer(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <button
              disabled={!canAfford}
              onClick={() => onBribe(bribeOffer)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow-md"
            >
              {canAfford ? `Pay ₦${bribeOffer.toLocaleString()} Settlement` : 'Insufficient Funds (Sapa)'}
            </button>
          </div>

          {/* Option B: Surrender to SDC */}
          <button
            onClick={onSurrender}
            className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-200 font-bold text-xs transition"
          >
            Surrender to Senate SDC (+2 Heat)
          </button>

          {/* Option C: Plead Innocence */}
          <button
            onClick={onPlead}
            className="w-full py-2 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 font-medium text-xs transition"
          >
            Plead Sudden Illness / Charisma Check
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### 4.4 Bottom Navigation Dock (`components/hud/BottomDock.tsx`)

```tsx
import React from 'react';

interface BottomDockProps {
  activeTab: 'hostel' | 'buy' | 'map' | 'phone';
  unreadInboxCount: number;
  onTabSelect: (tab: 'hostel' | 'buy' | 'map' | 'phone') => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  activeTab,
  unreadInboxCount,
  onTabSelect
}) => {
  const tabs = [
    { id: 'hostel', label: 'Hostel', icon: '🛏️' },
    { id: 'buy',    label: 'Market', icon: '🛍️' },
    { id: 'map',    label: 'Campus', icon: '🗺️' },
    { id: 'phone',  label: 'Phone',  icon: '📱', badge: unreadInboxCount },
  ] as const;

  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-1 sm:gap-3 pointer-events-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            className={`relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition ${
              isActive 
                ? 'bg-amber-400/15 text-amber-400 font-bold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
            }`}
          >
            <span className="text-lg leading-none mb-0.5">{tab.icon}</span>
            <span className="text-[10px] tracking-tight">{tab.label}</span>

            {/* Notification Badge */}
            {tab.badge && tab.badge > 0 ? (
              <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-red-500 text-white font-bold text-[9px] flex items-center justify-center animate-bounce">
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};
```

---

## 5. Audio & Sound Design Tokens

All audio cues are lightweight mono `.mp3` or `.webm` files under $30\text{ kB}$ each:

```typescript
export const SOUND_REGISTRY = {
  // Monetary
  cashRegister: '/assets/audio/cash_register.mp3', // Triggered by allowance drops, transfers
  coinsDeduct:  '/assets/audio/coins_pay.mp3',      // Triggered by cafeteria meals, kiosk purchases
  
  // Alarms & Security
  csoWhistle:    '/assets/audio/cso_whistle.mp3',    // Triggered by curfew / contraband raid
  sirenAlarm:    '/assets/audio/sdc_alarm.mp3',      // Triggered by 5-star SDC tribunal summons
  bribeSucceed:  '/assets/audio/bribe_pass.mp3',     // Soft zipper/pocket tuck sound
  
  // Daily Routine
  chapelBell:    '/assets/audio/chapel_bell.mp3',    // Triggered when Sunday/Wed chapel opens
  spoonPlate:    '/assets/audio/eat_cafeteria.mp3',  // Triggered by eating cafeteria food
  pencilWrite:   '/assets/audio/lecture_study.mp3',  // Triggered by attending lecture or CA
  bedSnore:      '/assets/audio/hostel_sleep.mp3',   // Triggered by sleeping on hostel bunk
};

export function playSound(key: keyof typeof SOUND_REGISTRY) {
  if (typeof window === 'undefined') return;
  const audio = new Audio(SOUND_REGISTRY[key]);
  audio.volume = 0.65;
  audio.play().catch(() => {
    // Autoplay policy fallback: Ignore unprompted play rejections
  });
}
```

---

## 6. Implementation Checklist

1. **Verify Camera Math:** Ensure Three.js camera position uses exact $(20, 20, 20)$ coordinates with lookAt set to $(0, 0, 0)$ for zero-distortion isometric alignment.
2. **Apply Hex Tinting:** Confirm `tintAvatarMeshes` runs on `.glb` load without rebinding new shaders to retain 60 FPS performance on low-end mobile devices.
3. **Pass-Through Touch Events:** Wrap the 2D UI overlay container with `pointer-events-none` and apply `pointer-events-auto` exclusively to buttons, modals, and HUD cards so Three.js orbit/tap controls function seamlessly underneath.