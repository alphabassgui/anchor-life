# Anchor Life — Phased Engineering Backlog & Task Breakdown

**Document Version:** 1.0.0  
**Status:** Ready for Execution  
**Execution Target:** Next.js 15 (App Router), TypeScript, Three.js, Zustand, Supabase (PostgreSQL), Upstash Redis, Tailwind CSS  

---

## Roadmap Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ANCHOR LIFE EXECUTION ROADMAP                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Phase 0: Project Scaffolding, Tooling & Environment                        │
│  Phase 1: Database Migration, Auth & Matriculation Pipeline                 │
│  Phase 2: Local Simulation Engine & Zustand State Store                     │
│  Phase 3: Three.js Viewport, Isometric Camera & 3D Pipeline                 │
│  Phase 4: 2D HUD Overlay, Campus Venues & Action Catalog                    │
│  Phase 5: Disciplinary Encounters, Bribery & Suspension Loop               │
│  Phase 6: Networking, Room Presence Polling & Debounced Persistence        │
│  Phase 7: Peer-to-Peer Transfers, Direct PvP Theft & Inbox Engine          │
│  Phase 8: Audio Pipeline, PWA Service Worker & Production Hardening         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Project Scaffolding, Tooling & Environment

### TASK-001: Next.js 15 App Shell & Dependency Setup
* **Description:** Initialize the Next.js 15 project using the App Router, TypeScript strict mode, and configure all primary development packages.
* **Target Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`
* **Dependencies:** None
* **Action Items:**
  * [x] Initialize Next.js 15 with App Router and TypeScript.
  * [x] Install production dependencies: `three`, `@types/three`, `zustand`, `@supabase/supabase-js`, `@supabase/ssr`, `@upstash/redis`, `clsx`, `tailwind-merge`, `lucide-react`, `canvas-confetti`.
  * [x] Install dev dependencies: `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `prettier`, `eslint`.
  * [x] Configure `.env.example` with Supabase URL, Anon Key, Service Role Key, and Upstash Redis REST credentials.
* **Acceptance Criteria:** `npm run dev` starts cleanly on port 3000 without build warnings.

---

### TASK-002: Tailwind CSS v4 & Design System Tokens Setup
* **Description:** Configure typography, theme colors, meter gradients, and custom utility classes matching the design system specifications.
* **Target Files:** `app/globals.css`, `tailwind.config.ts`, `lib/utils.ts`
* **Dependencies:** TASK-001
* **Action Items:**
  * [x] Add semantic color tokens from `.docs/05_DESIGN_SYSTEM.md` (`brand`, `meter`, `status`, `avatar`).
  * [x] Configure font families for `Plus Jakarta Sans` and `JetBrains Mono` with tabular numbers.
  * [x] Add utilities for non-interactive UI containers (`pointer-events-none`) and interactable buttons (`pointer-events-auto`).
* **Acceptance Criteria:** Custom color classes like `bg-brand-primary` and `text-status-naira` render correctly.

---

## Phase 1: Database Migration, Auth & Matriculation Pipeline

### TASK-101: PostgreSQL Schema Migration & Supabase Setup
* **Description:** Execute the complete `.docs/02_SCHEMA.sql` database migration into the Supabase PostgreSQL instance.
* **Target Files:** `supabase/migrations/20261010000000_initial_schema.sql`, `supabase/config.toml`
* **Dependencies:** TASK-001
* **Action Items:**
  * [x] Run migration script containing all enums (`student_archetype`, `hostel_id`, `offense_type`).
  * [x] Verify tables: `students`, `student_simulation_states`, `campus_venues`, `venue_presence`, `item_catalog`, `student_items`, `pvp_theft_logs`, `student_inbox`, `disciplinary_encounters`, `sdc_tribunal_hearings`, `financial_ledger`, `campus_global_policies`.
  * [x] Confirm triggers: `trg_auto_lift_suspension`.
  * [x] Confirm Row-Level Security (RLS) policies are active for profiles, state, and private inboxes.
* **Acceptance Criteria:** All 11 tables and seed data exist in Supabase Studio with RLS enabled.

---

### TASK-102: Supabase Server & Client SDK Helpers
* **Description:** Implement typed Supabase client factories for client components, server components, and route handlers.
* **Target Files:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`
* **Dependencies:** TASK-101
* **Action Items:**
  * [x] Create browser client factory using `createBrowserClient`.
  * [x] Create server client factory using `createServerClient` with cookie store handling.
  * [x] Implement Next.js middleware to refresh expired auth session tokens.
* **Acceptance Criteria:** Unauthenticated requests to protected API endpoints return HTTP 401.

---

### TASK-103: Mandatory Matriculation Onboarding UI
* **Description:** Build the authenticated matriculation flow with department selection, archetype choice, and modular avatar customization.
* **Target Files:** `app/auth/register/page.tsx`, `components/auth/AvatarCustomizer.tsx`, `app/api/auth/register/route.ts`
* **Dependencies:** TASK-102, TASK-002
* **Action Items:**
  * [ ] Build form validating Matric Number regex (`^AUL\/[A-Z]{3}\/\d{2}\/\d{3}$`) and unique handle.
  * [x] Archetype reveal screen (static UI): weighted birth-lottery reveal of "Nepo Baby" (₦150k) vs. "Campus Hustler" (₦2.5k).
  * [ ] Wire the assigned archetype into POST /api/auth/register (archetype validation + starting wallet cash).
  * [ ] Build avatar creator updating skin color, hair mesh, top/bottom attire, and gender.
  * [ ] Wire up `POST /api/auth/register` to create Supabase auth user, insert `students` profile, assign hostel bunk, and initialize `student_simulation_states`.
* **Acceptance Criteria:** Successful registration redirects to the game viewport with active auth cookies and seeded starting stats.

---

## Phase 2: Local Simulation Engine & Zustand State Store

### TASK-201: World Clock & Curfew Calculus
* **Description:** Implement the simulation clock module converting real elapsed seconds into in-game minutes with curfew and chapel flags.
* **Target Files:** `lib/engine/clock.ts`, `types/engine.ts`
* **Dependencies:** TASK-001
* **Action Items:**
  * [ ] Implement `advanceClock(currentClock, deltaMinutes)` mapping 1 real second = 1 game minute.
  * [ ] Calculate day of week (0 = Sunday, 3 = Wednesday).
  * [ ] Compute `isCurfewActive` (21:00 to 05:00).
  * [ ] Compute `isChapelHours` (Sunday 08:30–11:30, Wednesday 17:30–19:30).
* **Acceptance Criteria:** Unit tests confirm accurate time rollover and flag toggling.

---

### TASK-202: 9-Meter Need Decay Formulation
* **Description:** Implement the differential decay formulas for Hunger, Energy, Hygiene, Bladder, Fun, Social, CGPA, Devotion, and SDC Heat.
* **Target Files:** `lib/engine/decay.ts`
* **Dependencies:** TASK-201
* **Action Items:**
  * [ ] Implement base decay rates ($\beta_N / \text{hr}$) for all biological needs.
  * [ ] Apply archetype multipliers ($M_{\text{Hunger}} = 1.30$ for Nepo, $0.80$ for Hustler).
  * [ ] Handle emergency states: Starvation faint ($0\%$ Hunger), Hostel collapse ($0\%$ Energy), Social lockout ($< 20\%$ Hygiene).
  * [ ] Implement Devotion decay ($-25\%$ on missed chapel) and CGPA calculation math.
* **Acceptance Criteria:** Needs decay deterministically per 5-second tick and clamp within $0.00$ to $100.00$.

---

### TASK-203: Master Zustand Client Store (`useGameStore`)
* **Description:** Construct the unified Zustand state machine managing local state, the 5-second tick loop, optimistic action execution, and localStorage backup.
* **Target Files:** `lib/store/useGameStore.ts`, `types/game.ts`
* **Dependencies:** TASK-201, TASK-202
* **Action Items:**
  * [ ] Define state slices: `profileSlice`, `simulationSlice`, `inventorySlice`, `syncSlice`.
  * [ ] Implement `startSimulationLoop()` triggering every 5 real seconds.
  * [ ] Implement `executeAction(action)` with optimistic local stat mutations and rollback capability.
  * [ ] Implement `localStorage` synchronization writing to `anchor-life-save`.
* **Acceptance Criteria:** State runs locally offline without server dependencies, persisting across page reloads.

---

## Phase 3: Three.js Viewport, Isometric Camera & 3D Pipeline

### TASK-301: Isometric Orthographic Viewport & Canvas Mount
* **Description:** Build the Three.js canvas container with true isometric orthographic camera settings and resize responsiveness.
* **Target Files:** `components/viewport/GameCanvas.tsx`, `lib/three/camera.ts`
* **Dependencies:** TASK-002
* **Action Items:**
  * [ ] Initialize `THREE.OrthographicCamera` positioned at $(20, 20, 20)$ with `lookAt(0, 0, 0)`.
  * [ ] Implement camera pitch $\theta_x = 35.264^\circ$ and yaw $\theta_y = 45.0^\circ$.
  * [ ] Implement responsive frustum zoom formula accounting for mobile portrait aspect ratios.
  * [ ] Configure WebGL renderer with anti-aliasing, pixel ratio clamping ($\le 2$), and tone mapping.
* **Acceptance Criteria:** Viewport renders without distortion across mobile portrait, tablet, and desktop aspect ratios.

---

### TASK-302: Campus Lighting Rig & Shadow Mapping
* **Description:** Construct the stylized low-poly lighting rig with directional sun, warm ambient, and hemisphere daylight.
* **Target Files:** `lib/three/lighting.ts`
* **Dependencies:** TASK-301
* **Action Items:**
  * [ ] Add `THREE.AmbientLight` (`#F8FAFC`, intensity $0.75$).
  * [ ] Add `THREE.HemisphereLight` (`#E0F2FE` sky, `#FEF3C7` ground, intensity $0.45$).
  * [ ] Add `THREE.DirectionalLight` (`#FFFBEB`, intensity $1.20$) at $(15, 25, 10)$ with soft shadow mapping.
* **Acceptance Criteria:** Flat-shaded low-poly geometry displays warm highlights without harsh pitch-black shadow surfaces.

---

### TASK-303: Modular Asset Loader & Dynamic Hex-Tinting Pipeline
* **Description:** Implement the GLTF/GLB asset loader that injects runtime hex material colors into untextured meshes.
* **Target Files:** `lib/three/assetLoader.ts`, `lib/three/materials.ts`, `components/viewport/AvatarMesh.tsx`
* **Dependencies:** TASK-301, TASK-302
* **Action Items:**
  * [ ] Configure `GLTFLoader` with Draco compression support.
  * [ ] Implement in-memory asset caching to prevent duplicate model fetches.
  * [ ] Build `applyAvatarAppearance(mesh, appearance)` traversing child nodes and setting `MeshStandardMaterial.color`.
  * [ ] Bind 6 skeletal animations: `idle`, `walk`, `sit`, `sleep`, `study`, `pray`.
* **Acceptance Criteria:** Avatar mesh renders with custom player skin and clothing colors from state without external texture maps.

---

### TASK-304: Micro Venue Interior Scene & 8x8 Grid System
* **Description:** Build the interior room scene with an $8 \times 8$ tile floor plane, furniture prop loading, and raycast coordinate snapping.
* **Target Files:** `components/viewport/MicroRoomScene.tsx`, `lib/engine/grid.ts`
* **Dependencies:** TASK-303
* **Action Items:**
  * [ ] Render $8 \times 8$ grid floor with subtle tile border shaders.
  * [ ] Implement 2D grid matrix to 3D world coordinate transformation math.
  * [ ] Implement furniture collision detection preventing overlapping item placement.
  * [ ] Mount interactable spot coordinates from venue dictionaries.
* **Acceptance Criteria:** Placing a bunk bed occupies its exact $1 \times 2$ grid footprint and snaps avatar to correct coordinates on interaction.

---

## Phase 4: 2D HUD Overlay, Campus Venues & Action Catalog

### TASK-401: Top Status HUD & Need Bars
* **Description:** Build the fixed top HUD displaying time, academic standing, Devotion percentage, SDC Heat stars, and wallet balance.
* **Target Files:** `components/hud/TopStatusBar.tsx`, `components/hud/NeedMeterTray.tsx`
* **Dependencies:** TASK-203, TASK-002
* **Action Items:**
  * [ ] Connect HUD elements to `useGameStore`.
  * [ ] Render clock badge with Day, Hour, and Minute.
  * [ ] Render animated SDC Heat badge when Heat $> 0$.
  * [ ] Render 6 animated progress bars for biological needs with status colors.
  * [ ] Render tabular wallet balance (₦) with quick add button.
* **Acceptance Criteria:** HUD updates continuously every tick without triggering full canvas re-renders.

---

### TASK-402: Bottom Navigation Dock
* **Description:** Implement the floating bottom navigation bar for quick access to Hostel, Market, Campus Map, and Student Phone.
* **Target Files:** `components/hud/BottomDock.tsx`
* **Dependencies:** TASK-002
* **Action Items:**
  * [ ] Build tactile tab buttons: `🛏️ Hostel`, `🛍️ Market`, `🗺️ Campus`, `📱 Phone`.
  * [ ] Add unread badge counter to Phone icon linked to inbox state.
  * [ ] Ensure container has `pointer-events-auto` and floats above 3D canvas.
* **Acceptance Criteria:** Tapping tabs smoothly mounts respective full-screen modals without layout shifts.

---

### TASK-403: Campus Venues & Action Registry Catalog
* **Description:** Build the complete dictionary of campus actions with costs, instant effects, duration, and narrative toasts.
* **Target Files:** `lib/data/actions.ts`, `components/venues/ActionSheetModal.tsx`
* **Dependencies:** TASK-203
* **Action Items:**
  * [ ] Seed cafeteria actions: `aulCafeteriaMeal`, `aulIndomieHostel`, `aulVendorCredit`.
  * [ ] Seed academic actions: `aulLectureCSC`, `aulContinuousAssessment`, `aulStudyDesk`.
  * [ ] Seed spiritual actions: `aulSundayChapel`, `aulMidweekChapel`, `aulRoomDevotion`.
  * [ ] Seed side hustle actions: `aulHostelBarber`, `aulCodingGig`, `aulCallMummy`.
  * [ ] Implement action outcome toast notifications with Nigerian campus flavor text.
* **Acceptance Criteria:** Clicking an action updates local stats optimistically and displays outcome toast.

---

## Phase 5: Disciplinary Encounters, Bribery & Suspension Loop

### TASK-501: Authority Detection & Interruption Trigger
* **Description:** Build the background sweep engine checking for active chapel absences, hostel curfews, and contraband possession.
* **Target Files:** `lib/engine/encounters.ts`
* **Dependencies:** TASK-201, TASK-203
* **Action Items:**
  * [ ] Trigger check: If clock in chapel hours $\land$ avatar in hostel $\land \neg \text{hasExcuseDuty} \rightarrow$ mount CSO sweep.
  * [ ] Trigger check: If clock in curfew hours (21:00–05:00) $\land$ avatar outdoors $\rightarrow$ mount Porter intercept.
  * [ ] Trigger check: Random evening tick $\land$ contraband in hostel room $\rightarrow$ mount Warden inspection.
  * [ ] Freeze regular movement and simulation clock when encounter modal mounts.
* **Acceptance Criteria:** Infraction immediately halts gameplay and triggers the confrontation modal.

---

### TASK-502: Bribery & Decision Resolution Engine
* **Description:** Implement the mathematical probability calculation for authority payoffs, charism pleading, and SDC surrenders.
* **Target Files:** `lib/engine/bribery.ts`, `components/encounters/EncounterModal.tsx`
* **Dependencies:** TASK-501
* **Action Items:**
  * [ ] Implement formula: $P(\text{Bribe}) = 0.60 + (\text{Charisma} \times 0.04) - (\text{Heat} \times 0.08) + \text{Incentive}$.
  * [ ] Build modal UI with dynamic bribe amount slider.
  * [ ] Handle Bribe Success: Deduct cash, clear incident, play pass audio.
  * [ ] Handle Bribe Failure: Deduct cash, spike Heat by $+4$, route to Administrative Block.
  * [ ] Handle Surrender to SDC: Grant demerit, dock Devotion by $-25\%$, refer to tribunal.
* **Acceptance Criteria:** Bribery rolls evaluate deterministically against player stats and wallet balances.

---

### TASK-503: Disciplinary Suspension & Restitution Recovery Loop
* **Description:** Implement the non-permadeath disciplinary state machine locking suspended players into restitution or community labor.
* **Target Files:** `app/admin/sdc/page.tsx`, `components/encounters/CommunityLaborModal.tsx`, `app/api/campus/suspension/clear/route.ts`
* **Dependencies:** TASK-502
* **Action Items:**
  * [ ] Set `is_suspended = true` and `status = 'suspended'` when Heat reaches 5 stars.
  * [ ] Enforce venue lockouts: Block entering lecture halls and buying cafeteria food while suspended.
  * [ ] Path A: Restitution Fine (Pay ₦50,000 cash fine at Administrative Block).
  * [ ] Path B: Community Labor (10 real-world minutes cleaning Sports Complex track).
  * [ ] Automatically restore `good_standing` when fine or labor reaches 0 via database trigger.
* **Acceptance Criteria:** Suspended players cannot attend classes until fine is cleared or labor completed.

---

## Phase 6: Networking, Room Presence Polling & Debounced Persistence

### TASK-601: Redis Presence Engine & Spatial Polling Route
* **Description:** Implement high-speed room presence polling via Upstash Redis sorted sets and Next.js route handlers.
* **Target Files:** `app/api/campus/world/route.ts`, `app/api/campus/heartbeat/route.ts`, `lib/redis/presence.ts`
* **Dependencies:** TASK-102
* **Action Items:**
  * [ ] Build `POST /api/campus/heartbeat` adding player coordinates to Redis sorted set `venue:[id]` with timestamp score.
  * [ ] Build `GET /api/campus/world?venue=[id]` pruning stale players older than 10 seconds and returning active avatars.
  * [ ] Implement client presence hook polling every $1.5$ seconds using `fetch`.
  * [ ] Instantiate/update other-player low-poly avatar instances inside Three.js scene dynamically.
* **Acceptance Criteria:** Moving in a venue updates coordinates across other browser windows within 2 seconds.

---

### TASK-602: Debounced State Persistence & Anti-Cheat Validation
* **Description:** Implement the debounced state synchronization endpoint updating PostgreSQL every 30 seconds.
* **Target Files:** `app/api/player/save/route.ts`, `lib/supabase/saveProcedure.sql`
* **Dependencies:** TASK-102, TASK-203
* **Action Items:**
  * [ ] Build client debounce queue triggering save on 30s timer or major financial transactions.
  * [ ] Implement server-side anti-cheat bounds check (reject single saves with $\Delta\text{wallet} > ₦50,000$).
  * [ ] Execute atomic database procedure updating `student_simulation_states` and `financial_ledger`.
  * [ ] Handle network failures: Queue failed diffs locally and retry on connection restoration.
* **Acceptance Criteria:** State synchronizes cleanly to database without dropouts on intermittent networks.

---

### TASK-603: Global Policies & Dynamic Price Inflation
* **Description:** Implement centralized campus governance endpoint controlling dynamic commodity prices and event circulars.
* **Target Files:** `app/api/campus/policies/route.ts`, `lib/store/usePolicyStore.ts`
* **Dependencies:** TASK-102
* **Action Items:**
  * [ ] Build `GET /api/campus/policies` returning `inflationIndex`, active curfews, and circular notices.
  * [ ] Apply cache strategy: `Cache-Control: public, max-age=15, stale-while-revalidate=30`.
  * [ ] Multiply all cafeteria and shop base prices by `inflationIndex` globally on client.
* **Acceptance Criteria:** Changing the inflation index in the database updates in-game item prices within 30 seconds.

---

## Phase 7: Peer-to-Peer Transfers, Direct PvP Theft & Inbox Engine

### TASK-701: Peer-to-Peer Cash Transfers ("Urgent 2k")
* **Description:** Build the atomic direct money transfer engine between students in the same room.
* **Target Files:** `app/api/p2p/transfer/route.ts`, `components/social/TransferMoneyModal.tsx`
* **Dependencies:** TASK-601
* **Action Items:**
  * [ ] Build avatar click card displaying handle (`@user`), online status, and "Send Money" button.
  * [ ] Implement `POST /api/p2p/transfer` with database row-level locking preventing negative balance race conditions.
  * [ ] Record transaction in `financial_ledger` for both sender and recipient.
  * [ ] Dispatch transfer credit notification to recipient's `student_inbox`.
* **Acceptance Criteria:** Sending ₦2,000 debits sender and credits recipient atomically within a single transaction.

---

### TASK-702: Direct PvP Room Theft Engine
* **Description:** Build the asynchronous room pickpocketing and locker looting mechanic with deterministic success checks.
* **Target Files:** `app/api/p2p/theft/route.ts`, `lib/engine/theft.ts`, `components/social/PlayerInteractionModal.tsx`
* **Dependencies:** TASK-701, TASK-203
* **Action Items:**
  * [ ] Implement theft success formula ($P_{\text{steal}}$ based on Hustle skill and room crowd penalty).
  * [ ] Implement detection formula ($P_{\text{detect}}$).
  * [ ] Build atomic database stored function `execute_pvp_theft` locking rows and transferring 15%–35% of victim wallet.
  * [ ] Insert alert record into victim's `student_inbox` (`kind: 'crime'`).
  * [ ] Enforce 3-minute cooldown between robbery attempts per user.
* **Acceptance Criteria:** Successful theft credits thief, debits victim, and places an alert in victim's notification tray.

---

### TASK-703: Student Notification Inbox UI
* **Description:** Build the student phone inbox modal displaying real-time alerts, crime attempts, transfer receipts, and demerits.
* **Target Files:** `components/social/CampusInboxModal.tsx`, `app/api/player/inbox/route.ts`
* **Dependencies:** TASK-702
* **Action Items:**
  * [ ] Fetch notifications from `GET /api/player/inbox`.
  * [ ] Render distinct badge styles for `crime`, `transfer`, `sanction`, and `admin_notice`.
  * [ ] Implement swipe/tap to mark notifications as read (`PATCH /api/player/inbox/:id/read`).
  * [ ] Update unread badge counter in bottom navigation dock in real time.
* **Acceptance Criteria:** Victims can open their phone and view exactly who attempted to rob them and when.

---

## Phase 8: Audio Pipeline, PWA Service Worker & Production Hardening

### TASK-801: Campus Sound Effects Engine
* **Description:** Implement the audio manager handling ambient background audio, action sound cues, and security sirens.
* **Target Files:** `lib/audio/soundManager.ts`, `public/assets/audio/*`
* **Dependencies:** TASK-002
* **Action Items:**
  * [ ] Add lightweight sound clips: `cash_register.mp3`, `coins_pay.mp3`, `cso_whistle.mp3`, `sdc_alarm.mp3`, `chapel_bell.mp3`.
  * [ ] Build audio helper with autoplay restriction fallbacks and volume ducking.
  * [ ] Bind sounds to respective actions (eating, study, alarms, bribery success).
* **Acceptance Criteria:** Audio plays instantaneously upon action dispatch without UI thread latency.

---

### TASK-802: PWA Manifest & Custom Service Worker
* **Description:** Configure Progressive Web App manifest and install service worker for asset precaching and offline resilience.
* **Target Files:** `public/manifest.json`, `public/sw.js`, `app/layout.tsx`
* **Dependencies:** TASK-001, TASK-303
* **Action Items:**
  * [ ] Configure web app manifest with standalone display mode, orientation lock (`portrait-primary`), and icons.
  * [ ] Implement service worker caching strategy: Cache-first for 3D `.glb` assets and audio; Network-only for REST routes.
  * [ ] Implement offline banner indicating queued local simulation diffs.
* **Acceptance Criteria:** Application is installable on mobile devices (Add to Home Screen) and loads cached assets instantly on subsequent visits.

---

### TASK-803: Production Performance Profiling & Launch Verification
* **Description:** Execute end-to-end performance audits, WebGL frame rate verification, and database query optimizations.
* **Target Files:** `next.config.ts`, `supabase/migrations/20261010000000_initial_schema.sql`
* **Dependencies:** All prior tasks
* **Action Items:**
  * [ ] Profile Three.js draw calls (verify $< 35$ draw calls and $< 45,000$ triangles per frame).
  * [ ] Verify WebGL frame rate stays at steady 60 FPS on mid-range Android devices.
  * [ ] Run `EXPLAIN ANALYZE` on `GET /api/campus/world` and `POST /api/player/save` queries (ensure response $< 10\text{ ms}$).
  * [ ] Conduct stress test simulating 1,000 concurrent room presence polling requests against Redis.
* **Acceptance Criteria:** Lighthouse mobile score $> 90$, Zero memory leaks across 30 minutes of continuous simulation, production deployment live on Vercel.