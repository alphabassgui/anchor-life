# Anchor Life — AI Agent Operational Guidelines & Guardrails

**Document Version:** 1.1.0  
**Target Environment:** Autonomous Coding Agents (Claude Code, Cursor, Windsurf, Roo, Copilot)  
**Primary Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript (Strict), Three.js, Zustand, Supabase (PostgreSQL), Upstash Redis, Tailwind CSS v4  

---

## 1. Mission & System Invariants

You are an expert autonomous software engineer building **Anchor Life**, a mobile-first 2.5D campus simulation game set at Anchor University, Ayobo, Lagos, modeled after the technical architecture of *Lagos Life* (`lagoslife.app`).

### Absolute Architectural Invariants (Non-Negotiables)

1. **Stateless HTTP REST Over WebSockets:**  
   NEVER introduce Socket.io, persistent WebSocket servers, or WebRTC for presence. Room presence MUST strictly use stateless REST polling (`GET /api/campus/world`) backed by Upstash Redis sorted sets. State persistence MUST use debounced client batches (`POST /api/player/save`).

2. **Client-Authoritative Simulation Engine:**  
   The server NEVER calculates biological vital decay, student walking paths, or room layouts. The 5-second tick loop executes entirely on the client device inside Zustand. The server acts as an auditable relational database and transaction post office.

3. **Streamlined 4-Vital Model (LOCKED v1):**  
   Track exactly 4 continuous vitals: `hunger`, `energy`, `morale` (Fun + Social merged), and `health` (Hygiene / Vitality merged). Do NOT reintroduce separate `hygiene`, `bladder`, `fun`, or `social` decay meters — bladder is removed entirely, and bathing/showering are discrete actions. Base decay rates live in `.docs/03_GAME_ENGINE.md` §2.1 (Hunger 4.16, Energy 3.50, Morale 2.50, Health 1.50 %/hr).

4. **No Heavy Texture Maps (Zero Albedo Textures):**  
   NEVER load high-resolution texture maps (`.png`/`.jpg`) onto 3D models. All 3D assets (`.glb`) must be untextured low-poly models styled at runtime using `MeshStandardMaterial` hex-color dynamic tinting (`skin`, `hair`, `top`, `bottom`).

5. **DOM/WebGL Layering & Touch Event Isolation:**  
   The Three.js canvas sits behind the React DOM UI overlay. The root UI overlay container MUST always have `pointer-events-none`. Interactive HUD components, modals, and buttons MUST explicitly declare `pointer-events-auto` so users can interact with 3D props underneath without touch blocking.

6. **No Permadeath Account Wipes:**  
   Never permanently delete player accounts on disciplinary expulsion. Expulsions trigger the **Suspension State Machine** requiring either a ₦50,000 Senate restitution fine or 15 real-world minutes of community labor (or the ₦0 Indigent Labor Pardon).

7. **Gender-Derived Hostel Spawn:**  
   Spawn is derived from `assigned_hostel` and seeded explicitly at registration (male => `peace_hostel`; female => `purity_hostel` | `patience_hostel`). Never rely on the `current_venue` column default, and never reintroduce the removed `main_roundabout` relocation trigger. Cross-hostel entry is guarded at the API layer (`FORBIDDEN_VENUE_GENDER`).

8. **Centralized Price Indexing:**  
   Never hardcode final commodity prices in client UI components. All store, cafeteria, and bribe costs MUST be calculated dynamically by multiplying base prices by the centralized `inflationIndex` fetched from `GET /api/campus/policies`.

9. **Strict Atomic Database Guarantees for Currency & PvP Theft:**  
   Never mutate player wallet balances using separate non-transactional `SELECT` and `UPDATE` statements. All peer transfers and PvP pickpocketing (15%–35% loot) MUST execute via PostgreSQL stored procedures with advisory row locks (`pg_advisory_xact_lock`) to prevent race conditions and duplicate spending.

10. **Server-Authoritative Identity Fields:**  
    `matric_number` is server-generated and `archetype` is server-rolled (reroll-proof). NEVER read either from the request body. Every player route derives `student_id` from the auth session (cookies -> auth user -> `students` row where `auth_user_id = uid`), NEVER from the body — because `service_role` bypasses RLS and the route code is the only guard.

---

## 2. Source of Truth Directory Hierarchy

Before implementing any feature or modifying state, consult the documentation suite located in `.docs/`:

```
anchor-life/
├── AGENTS.md                  # [THIS FILE] Operational rules and AI guardrails
├── ARCHITECTURE.md            # Master system topology, Three.js & polling contracts
└── .docs/
    ├── 01_PRD.md              # Product specs, lore, decision trees, and victory states
    ├── 02_SCHEMA.sql          # PostgreSQL schema, enums, triggers, and RLS policies
    ├── 03_GAME_ENGINE.md      # Mathematical decay curves, tick rates, and probability trees
    ├── 04_API_CONTRACT.md     # REST endpoints, payload schemas, and error codes
    ├── 05_DESIGN_SYSTEM.md    # Viewport math, Tailwind tokens, lighting, and audio
    └── 06_TASKS.md            # Phased engineering task backlog (Reference TASK-ID)
```

**Rule of Conflict:** If prompt instructions or code comments contradict the documentation files, the `.docs/` specifications take precedence unless explicitly overridden by the project lead. Among the docs, `03_GAME_ENGINE.md` is canonical for mechanics numbers and the 4-vital model; `02_SCHEMA.sql` is canonical for data shape.

---

## 3. Technology Stack Directives

### 3.1 Next.js 16 App Router Directives
* Use React Server Components (RSC) for initial page layouts and static shells.
* Mark client components explicitly with `'use client'` only where state, Three.js canvas mounts, or browser APIs are required (`GameCanvas.tsx`, `TopStatusBar.tsx`, `EncounterModal.tsx`).
* Place all backend endpoints in `app/api/.../route.ts` using Next.js Route Handlers (`GET`, `POST`, `PATCH`).
* Always wrap route handler outputs in the standard response envelopes defined in `.docs/04_API_CONTRACT.md`:
  * Success: `{ success: true, data: T, timestamp: number }`
  * Error: `{ success: false, error: { code: string, message: string }, timestamp: number }`

### 3.2 Three.js Isometric Viewport Directives
* Always use `THREE.OrthographicCamera` with true isometric angles:
  * Pitch: $\theta_x = \arcsin(\tan(30^\circ)) \approx 35.264^\circ$ ($0.6155\text{ rad}$)
  * Yaw: $\theta_y = 45.0^\circ$ ($0.7854\text{ rad}$)
  * Position: `camera.position.set(20, 20, 20); camera.lookAt(0, 0, 0);`
* Clamp device pixel ratios: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));`
* Clean up WebGL resources on component unmount: dispose of geometries, materials, renderers, and animation frame IDs to prevent memory leaks.

### 3.3 Zustand Client State Store Directives
* Store structure must live in `lib/store/useGameStore.ts`.
* Use slice-based architecture:
  * `createProfileSlice`: Matric number, handle, archetype, wallet balance.
  * `createSimulationSlice`: 4 vitals (`hunger`, `energy`, `morale`, `health`), CGPA, Devotion, SDC Heat, tick loops.
  * `createInventorySlice`: 8x8 hostel room grid, items on person, mattress stashes.
  * `createSyncSlice`: Pending diff queues, optimistic rollbacks, localStorage backup.
* State mutations that trigger immediate sound effects and optimistic UI changes must support automatic rollback if rejected by `/api/player/save`.

### 3.4 Supabase & PostgreSQL Directives
* Use `@supabase/ssr` with cookie handling for server route handlers.
* Never expose the `SUPABASE_SERVICE_ROLE_KEY` to browser clients.
* Respect Row-Level Security (RLS). Ensure every query on `student_simulation_states`, `student_items`, and `student_inbox` evaluates against the authenticated user ID. Player-write routes use the `service_role` client (which bypasses RLS) and MUST derive `student_id` from the session, never the body.

---

## 4. Coding Conventions & Quality Standards

### 4.1 TypeScript & Type Safety
* `strict: true` is enforced in `tsconfig.json`.
* **Zero `any` Policy:** Explicitly type all state models, API payloads, and Three.js event listeners using interfaces from `types/`.
* Export interfaces alongside their implementation or within dedicated schema declarations.

### 4.2 Tailwind CSS & UI Styling
* Utilize Tailwind utility classes aligned with design tokens (`bg-brand-primary`, `text-status-naira`, `border-meter-hunger`).
* Use `clsx` and `tailwind-merge` (via a standard `cn()` helper) for dynamic class combination.
* Ensure all modals, encounter cards, and HUD trays are fully responsive on viewports as small as 360px wide (iPhone SE / Galaxy A-series).

### 4.3 Error Handling & Campus Flavor Text
* Error messages must reflect Nigerian university campus context rather than generic HTTP errors:
  * Low cash: `"Insufficient funds! Sapa is real. 💸"`
  * High fatigue: `"Too exhausted! Sleep on your bunk first. 🥱"`
  * Gate blockage: `"Exeat rejected! Devotion is below 75%. Go to chapel! ⛪"`
  * Suspended: `"Senate hold active! Clear your suspension at Admin block. 🏛️"`

---

## 5. Agent Workflow & Execution Protocol

When assigned a task from `.docs/06_TASKS.md`, follow this five-step execution protocol:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AGENT TASK EXECUTION CYCLE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. LOCATE: Identify the TASK-ID in `.docs/06_TASKS.md`.                     │
│ 2. READ: Inspect dependencies and specifications across `.docs/`.           │
│ 3. IMPLEMENT: Create or modify target files adhering to invariants.        │
│ 4. VERIFY: Run build, typecheck, and acceptance tests.                      │
│ 5. LOG: Mark task checklist `[x]` in `.docs/06_TASKS.md`.                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Protocol Steps:

1. **Step 1: Context Verification:**  
   Before creating or editing files, confirm you have reviewed the relevant schema in `02_SCHEMA.sql` or math formula in `03_GAME_ENGINE.md`.

2. **Step 2: Incremental Modification:**  
   Never perform sweeping multi-phase refactors across unrelated directories. Execute one task at a time, keeping changes cohesive and reviewable.

3. **Step 3: Verification Commands:**  
   After completing code changes, run the following commands to ensure repository integrity:
   ```bash
   # Typecheck TypeScript definitions
   npm run typecheck # or npx tsc --noEmit

   # Verify Tailwind and Next.js build compilation
   npm run build

   # Run automated unit tests
   npm test
   ```
   The `proof` plugin auto-runs typecheck + lint after file changes and before commits. On failure, FIX THE CODE — never edit `.claude/proof.json` or a check to get past it.

4. **Step 4: Checklist Maintenance:**  
   Upon verifying that all acceptance criteria are met, update the task status in `.docs/06_TASKS.md` from `[ ]` to `[x]`.

---

## 6. Prohibited Anti-Patterns

* ❌ **Do NOT introduce WebSockets:** Do not import `ws` or `socket.io-client` for multiplayer room updates. Use `GET /api/campus/world`.
* ❌ **Do NOT reintroduce 6-need / 9-meter vitals:** The model is exactly 4 vitals (hunger, energy, morale, health). No separate hygiene/bladder/fun/social decay meters.
* ❌ **Do NOT perform full-screen canvas re-renders on state tick:** Do not remount the Three.js `<canvas>` when hunger or energy ticks change. Keep canvas references stable in React refs.
* ❌ **Do NOT hardcode item prices:** Do not write `price: 1500` directly into shop UI buttons. Always compute via `price * inflationIndex`.
* ❌ **Do NOT write destructive permadeath triggers:** Do not write database functions that drop or wipe student rows on expulsion. Always update `status = 'suspended'`.
* ❌ **Do NOT accept `student_id`, `matric_number`, or `archetype` from the request body:** Derive `student_id` from the session; matric and archetype are server-authoritative.
* ❌ **Do NOT use CSS absolute pixel layouts:** Never use hardcoded pixel widths (`w-[380px]`) for viewport containers. Use relative viewport classes (`w-full max-w-sm px-4`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
