
# CLAUDE.md — Anchor Life Engineering Instructions
> NOTE: This project runs Next.js 16 (App Router). Where any doc says "Next.js 15", treat it as 16. All other invariants stand.

## Project Overview
Anchor Life is a mobile-first 2.5D campus simulation game set at Anchor University, Ayobo, Lagos, inspired by the architecture of *Lagos Life* (`lagoslife.app`). Built using Next.js 15 (App Router), React 19, Three.js (Orthographic WebGL), Tailwind CSS, Zustand, Supabase (PostgreSQL), and Upstash Redis.

---

## 1. Build, Test & Verification Commands
- **Dev Server:** `npm run dev` (Runs locally on `http://localhost:3000`)
- **Production Build:** `npm run build`
- **TypeScript Check:** `npx tsc --noEmit`
- **Linter:** `npm run lint`
- **Unit & Logic Tests:** `npm test`
- **Database Migrations:** `npx supabase db push` or execute SQL in Supabase Studio

---

## 2. Core Architectural Invariants (Strict & Non-Negotiable)

1. **Stateless HTTP REST Over WebSockets:**
   - NEVER introduce Socket.io, persistent WebSocket servers, or WebRTC for presence.
   - Room presence is strictly driven by high-frequency stateless HTTP polling (`GET /api/campus/world`) backed by Upstash Redis in-memory sorted sets (10-second TTLs).
   - State persistence is strictly driven by debounced batch payloads (`POST /api/player/save`) sent every 30 seconds.

2. **Client-Authoritative Simulation Engine:**
   - Biological need decay, campus clocks, and avatar animations execute locally on the client device inside Zustand (`lib/store/useGameStore.ts`) on a 5-second tick loop.
   - The server acts strictly as an auditable relational database and transaction post office.

3. **9-Stat / 6-Need System:**
   - Track exactly 6 core continuous needs — `hunger`, `energy`, `hygiene`, `bladder`, `fun`, `social` — plus the three status stats `cgpa`, `devotion`, and `sdc_heat` (the 9-stat model). These need names match the `student_simulation_states` columns in `.docs/02_SCHEMA.sql` exactly; do NOT collapse them into combined `morale`/`health` vitals (those are not real columns).
   - Implement continuous decay for all six needs, including `hygiene` and `bladder`. Bathrooms and showers may additionally act as discrete action triggers and debuff clearers, but they do not replace the continuous `hygiene`/`bladder` meters.

4. **Mobile Visibility & 4-Hour Offline Catch-Up Clamp:**
   - Handle app minimizing and lock screens via `document.addEventListener('visibilitychange')`.
   - Calculate elapsed wall-clock minutes upon resume and hard-clamp offline decay to a strict maximum of **240 simulated minutes (4 hours)**.
   - Apply the $0.35$ sleep damping factor ($D_{\text{sleep}} = 0.35$) if the student logged out while resting in a hostel bunk bed.

5. **No Permadeath (Disciplinary State Machine):**
   - Expulsion never wipes or deletes a student account.
   - Reaching 5 SDC Heat stars triggers the **Suspension State Machine** (`status = "suspended"`).
   - Recovery requires either paying the ₦50,000 Senate fine or completing 15 real-world minutes of community labor (or the ₦0 Indigent Labor Pardon).

6. **Combat-Logging Intercept:**
   - When an encounter triggers with the CSO or Hall Warden, write `active_encounter_id` and an expiration timestamp to the database immediately.
   - Any browser reload or session drop boots directly back into that encounter modal until resolved, forfeiting to automatic SDC surrender upon timeout.

7. **Anti-Griefing PvP Theft Shield:**
   - Direct PvP room theft is atomic via PostgreSQL transactions.
   - Successfully robbed victims automatically receive `theft_immunity_until = NOW() + INTERVAL '60 minutes'`, blocking subsequent robbery attempts campus-wide.

8. **Zero Albedo Texture Maps (Runtime Hex Tinting):**
   - NEVER load image textures (`.png`/`.jpg`) onto 3D models.
   - All 3D assets (`.glb`) are low-poly, untextured meshes dynamically tinted at runtime via `MeshStandardMaterial` hex colors.

9. **DOM Layering & Touch Event Isolation:**
   - The Three.js canvas sits behind the React DOM overlay.
   - The overlay container must have `pointer-events-none`.
   - All interactive HUD buttons, modals, and dock tabs must explicitly declare `pointer-events-auto`.

---

## 3. Directory Navigation & Source of Truth

Before creating or editing any code, always consult the documentation in `.docs/`:
- **`ARCHITECTURE.md`:** System topology, Redis presence tier, and Three.js canvas lifecycle.
- **`AGENTS.md`:** AI agent rules, error message standards, and anti-patterns.
- **`.docs/01_PRD.md`:** Campus lore, archetypes (Nepo Baby vs. Campus Hustler), and decision trees.
- **`.docs/02_SCHEMA.sql`:** Hardened PostgreSQL schema, tables, triggers, and RLS policies.
- **`.docs/03_GAME_ENGINE.md`:** Mathematical formulas, tick rates, and probability curves.
- **`.docs/04_API_CONTRACT.md`:** Exact REST route definitions, request/response types, and error codes.
- **`.docs/05_DESIGN_SYSTEM.md`:** Isometric camera angles, Tailwind tokens, and UI components.
- **`.docs/06_TASKS.md`:** Phased implementation backlog (always reference TASK-IDs).

---

## 4. Operational Instructions for Claude

1. **Verify Context First:** Always review the corresponding documentation in `.docs/` before implementing any feature.
2. **Execute Incrementally:** Focus on one specific task from `.docs/06_TASKS.md` at a time.
3. **Verify Integrity:** Run `npx tsc --noEmit` and `npm run build` after editing to ensure zero compiler or type errors.
4. **Update Tasks:** Mark completed task checkboxes `[x]` in `.docs/06_TASKS.md`.