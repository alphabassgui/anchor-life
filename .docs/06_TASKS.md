# Anchor Life — Phased Engineering Backlog & Task Breakdown

**Document Version:** 1.1.0  
**Status:** Ready for Execution  
**Execution Target:** Next.js 16 (App Router, Turbopack), TypeScript, Three.js, Zustand, Supabase (PostgreSQL), Upstash Redis, Tailwind CSS v4  

---

## Roadmap Overview

```
Phase 0: Project Scaffolding, Tooling & Environment
Phase 1: Database Migration, Auth & Matriculation Pipeline
Phase 2: Local Simulation Engine & Zustand State Store
Phase 3: Three.js Viewport, Isometric Camera & 3D Pipeline
Phase 4: 2D HUD Overlay, Campus Venues & Action Catalog
Phase 5: Disciplinary Encounters, Bribery & Suspension Loop
Phase 6: Networking, Room Presence Polling & Debounced Persistence
Phase 7: Peer-to-Peer Transfers, Direct PvP Theft & Inbox Engine
Phase 8: Audio Pipeline, PWA Service Worker & Production Hardening
```

> **Vital model (LOCKED v1):** All need/decay work targets the 4-vital model
> (`hunger`, `energy`, `morale`, `health`). The legacy 6-need / 9-meter language
> has been removed. See `.docs/03_GAME_ENGINE.md` §2 and `.docs/02_SCHEMA.sql` §3.

---

## Phase 0: Project Scaffolding, Tooling & Environment

### TASK-001: Next.js 16 App Shell & Dependency Setup
* **Target Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`
* **Action Items:** Init Next.js 16 (App Router, TS); install `three`, `@types/three`, `zustand`, `@supabase/supabase-js`, `@supabase/ssr`, `@upstash/redis`, `clsx`, `tailwind-merge`, `lucide-react`, `canvas-confetti`; dev deps `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `prettier`, `eslint`; configure `.env.example`.
* **Acceptance:** `npm run dev` starts cleanly on 3000.

### TASK-002: Tailwind CSS v4 & Design System Tokens
* **Target Files:** `app/globals.css`, `tailwind.config.ts`, `lib/utils.ts`
* **Action Items:** Add tokens from `.docs/05_DESIGN_SYSTEM.md` (`brand`, `meter`, `status`, `avatar`). The `meter` group is exactly 4 tokens: `hunger`, `energy`, `morale`, `health`. Fonts Plus Jakarta Sans + JetBrains Mono; pointer-events utilities.

---

## Phase 1: Database Migration, Auth & Matriculation Pipeline

### TASK-101: PostgreSQL Schema Migration & Supabase Setup
* **Target Files:** `supabase/migrations/20261010000000_initial_schema.sql`, `supabase/migrations/<ts>_vitals_4_model.sql`, `supabase/config.toml`
* **Action Items:**
  * Run enums (`student_archetype`, `hostel_id`, `offense_type`, …).
  * Apply the **4-vital migration** (`.docs/02_SCHEMA.sql` §13): rename `hygiene`→`health`, `fun`→`morale`, fold `social` into `morale`, drop `social` and `bladder`. Final sim-state vitals MUST be exactly `hunger, energy, morale, health`.
  * Verify all tables; confirm `trg_auto_lift_suspension` exists and the legacy `sanitize_student_spawn_location` trigger is **removed**.
  * Confirm RLS active; `service_role` has INSERT/SELECT/UPDATE on `students` and `student_simulation_states`.
* **Acceptance:** Sim-state has exactly the 4 vitals; no `main_roundabout` spawn trigger remains.

### TASK-102: Supabase Server & Client SDK Helpers
* **Target Files:** `lib/supabase/client.ts`, `server.ts`, `admin.ts`, `middleware.ts`, `middleware.ts`
* **Action Items:** browser client (anon), server client (cookies), admin/service_role client (`createAdminClient`, server-only), session-refresh middleware.
* **Acceptance:** Unauthenticated protected requests return 401.

### TASK-103: Mandatory Matriculation Onboarding UI
* **Target Files:** `app/auth/register/page.tsx`, `components/auth/AvatarCustomizer.tsx`, `app/api/auth/register/route.ts`
* **Action Items:** Multi-screen onboarding (account → 18+ gate → look → personality → dream → archetype reveal → hostel → faculty/department → recap). Register route SERVER-GENERATES matric and SERVER-ROLLS archetype — never from body. Seed `student_simulation_states` with `current_venue` from `assigned_hostel`.
* **Acceptance:** A female registrant spawns in Purity/Patience, never Peace.

---

## Phase 2: Local Simulation Engine & Zustand State Store

### TASK-201: World Clock & Curfew Calculus
* **Target Files:** `lib/engine/clock.ts`, `types/engine.ts`
* **Action Items:** `advanceClock` (1 real s = 1 game min); day-of-week; `isCurfewActive` (21:00–05:00); `isChapelHours` (Sun 08:30–11:30, Wed 17:30–19:30).

### TASK-202: 4-Vital Need Decay Formulation
* **Target Files:** `lib/engine/decay.ts`
* **Action Items:** Base rates Hunger 4.16, Energy 3.50, Morale 2.50, Health 1.50 (%/hr); archetype multipliers (Nepo 1.30/1.20/1.35; Hustler 0.80/0.85/0.85); sleep damping 0.35 on Hunger/Energy; emergency states (Hunger 0 → Energy 3× faster, Energy 0 collapse, Health < 20 isolation); Devotion −25% on missed chapel.
* **Acceptance:** 4 vitals clamp 0–100; same formula reusable per-tick and per-action (decay-on-action).

### TASK-203: Master Zustand Store (`useGameStore`)
* **Target Files:** `lib/store/useGameStore.ts`, `types/game.ts`
* **Action Items:** slices `profileSlice`, `simulationSlice` (4 vitals + CGPA/Devotion/SDC), `inventorySlice`, `syncSlice`; decay on action (Part A/B) + 5s `startSimulationLoop()` (Part C); `executeAction` with optimistic rollback; localStorage `anchor-life-save`.
* **Acceptance:** Store exposes exactly 4 vitals; persists across reloads.

---

## Phase 3: Three.js Viewport & 3D Pipeline
* **TASK-301** Isometric orthographic viewport (camera (20,20,20), pitch 35.264°, yaw 45°, pixel ratio ≤ 2).
* **TASK-302** Lighting rig (ambient/hemisphere/directional per design system).
* **TASK-303** GLTF/Draco loader + `applyAvatarAppearance`; bind **7** clips `idle, walk, sit, sleep, study, pray, brawl`.
* **TASK-304** 8×8 interior grid, furniture collision, spot snapping.

---

## Phase 4: 2D HUD, Venues & Action Catalog
* **TASK-401** Top HUD + **4 vital bars** (hunger, energy, morale, health) in `components/hud/VitalMeterTray.tsx`; clock, Heat badge, wallet.
* **TASK-402** Bottom dock (Hostel/Market/Campus/Phone) with unread badge.
* **TASK-403** Action registry `lib/data/actions.ts`; effects map to 4 vitals (eat → +hunger; sleep → +energy; shower → +health; socialize/sports → +morale); Nigerian flavor toasts.

---

## Phase 5: Disciplinary Encounters, Bribery & Suspension
* **TASK-501** Authority detection sweeps (chapel/curfew/contraband); freeze clock on modal.
* **TASK-502** Bribery engine — canonical formula `.docs/03_GAME_ENGINE.md` §5.2: `P = clamp(0.10, 0.95, P_base + Charisma×0.04 − Heat×0.08 + ((offered−demanded)/demanded)×0.25)`; slider modal; success/failure/surrender handling.
* **TASK-503** Suspension & restitution loop: 5 Heat → suspended; venue lockouts; Path A ₦50,000 fine; Path B **15 real-world minutes** community labor (or ₦0 Indigent Pardon); auto-restore via trigger.

---

## Phase 6: Networking, Presence Polling & Persistence
* **TASK-601** Redis presence (`POST /api/campus/heartbeat`, `GET /api/campus/world`), 1.5s client poll, 10s TTL prune.
* **TASK-602** Debounced persistence & anti-cheat. *(Note: the minimal `GET /api/player/state` + `POST /api/player/save` pair is built early in Part A/B to prove the loop; this task hardens it.)* Target Files: `app/api/player/save/route.ts`, `app/api/player/state/route.ts`, `lib/supabase/saveProcedure.sql`. Derive `student_id` from session; anti-cheat bounds (Δwallet > ₦50k w/o referenceId, Δcgpa > 0.08); atomic update of 4 vitals + ledger; offline queue + retry.
* **TASK-603** Global policies & inflation (`GET /api/campus/policies`, 15s cache, prices × inflationIndex).

---

## Phase 7: P2P Transfers, PvP Theft & Inbox
* **TASK-701** P2P transfers (`POST /api/p2p/transfer`, row-locked, ledger both sides, inbox credit).
* **TASK-702** PvP theft engine (`execute_pvp_theft`, 15%–35% loot, P_steal/P_detect, inbox crime alert, 3-min cooldown).
* **TASK-703** Inbox UI (fetch, badges for crime/transfer/sanction/admin_notice, mark-read, dock counter).

---

## Phase 8: Audio, PWA & Production Hardening
* **TASK-801** Sound manager + clips bound to actions.
* **TASK-802** PWA manifest + service worker (cache-first `.glb`/audio, network-only REST, offline banner).
* **TASK-803** Performance audit (< 35 draw calls, < 45k tris, 60 FPS, `EXPLAIN ANALYZE` on world/save < 10 ms, Redis stress test; Lighthouse mobile > 90; Vercel deploy).
