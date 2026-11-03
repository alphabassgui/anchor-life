# Anchor Life — Technical Architecture Specification

**Document Version:** 1.2.0  
**Status:** Approved for Implementation  
**Stack:** Next.js 16 (App Router, Turbopack), React 19, Three.js (WebGL), Tailwind CSS v4, Zustand, Supabase (PostgreSQL), Upstash Redis  

---

## 1. Architectural Philosophy & Core Principles

**Anchor Life** delivers a low-latency, mobile-first 2.5D campus simulation across unstable mobile network conditions (3G/4G/Campus Wi-Fi) without WebSocket degradation.

Modeled after *Lagos Life* (`lagoslife.app`), the system enforces five foundational tenets:

1. **Stateless HTTP REST Over Heavy WebSockets:**  
   Room presence uses lightweight HTTP polling (`GET /api/campus/world`) backed by Upstash Redis In-Memory Sets. State persistence uses debounced client payloads (`POST /api/player/save`).
2. **Client-Authoritative Simulation Engine:**  
   The client Zustand store runs the 5-second deterministic tick loop over the 4 vitals (hunger, energy, morale, health). The server does not calculate real-time decay, acting strictly as an auditable database and ledger validator.
3. **Hybrid Rendering (WebGL 3D Base + DOM 2D Overlay):**  
   Three.js manages the orthographic 3D viewport. HUDs, encounter cards, and modals render in the 2D DOM using Tailwind CSS with `pointer-events` isolation.
4. **Zero Albedo Texture Overhead:**  
   3D models (`.glb`) are untextured low-poly meshes dynamically tinted at runtime via `MeshStandardMaterial` hex colors.
5. **PostgreSQL Relational Safety & Anti-MVCC Architecture:**  
   High-frequency heartbeat coordinates bypass PostgreSQL entirely and live in Redis memory with 10-second TTLs, protecting PostgreSQL from table bloat.

---

## 2. High-Level System Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT VIEWPORT (DEVICE)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  2D UI Overlay Layer (React 19 + Tailwind CSS)                              │
│   • Top HUD: 4 Vital Bars, Clock, Cash (₦), Location, Heat Stars            │
│   • Encounter Dialogs: Combat-logging locked CSO Confrontations             │
│   • Bottom Dock: Hostel / Shopping / Campus Map / Phone Inbox               │
│  2.5D WebGL Viewport Layer (Three.js)                                       │
│   • Orthographic Camera: true isometric pitch 35.264°, yaw 45°              │
│   • Spot Snapping: avatars interpolate between discrete Spot IDs            │
│   • Dynamic Hex Tinting: zero external image texture maps                   │
│  Local Client Store (Zustand + LocalStorage Mirror)                         │
│   • 5-Second Deterministic Vital Tick Loop (hunger/energy/morale/health)    │
│   • Offline Wall-Clock Catch-Up Handler (4h max clamp)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                     │  Stateless HTTP / JSON REST
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 16 APP ROUTER (STATELESS API)                    │
│  • GET  /api/campus/world       (High-speed Redis presence polling: 1.5s)   │
│  • POST /api/campus/heartbeat   (Updates spotId in Redis sorted set)        │
│  • POST /api/player/save        (Debounced delta-clamped state sync: 30s)   │
│  • GET  /api/player/state       (Full state bundle on boot)                 │
│  • POST /api/p2p/theft          (Atomic theft with 60m victim shield)       │
│  • GET  /api/campus/policies    (Centralized inflation index & curfews)     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Upstash Redis (In-Memory): ephemeral presence sets, 10s TTL               │
│  Supabase PostgreSQL 15: profiles, ledger, encounter locks, sim state      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Critical Edge-Case Architectural Mitigations

### 3.1 Combat Logging & Refresh Exploit Prevention
* **The Vulnerability:** Players refreshing or closing the browser when caught by the CSO with contraband.
* **The Architecture:**
  * When an encounter triggers, the server writes `active_encounter_id` and an expiration timestamp to `students`.
  * On subsequent boots (`GET /api/player/state`), the client is forced into the encounter modal until resolved.
  * If the session expires without resolution, the database defaults to an automatic SDC surrender.

### 3.2 Anti-Cheat Delta Clamping on `POST /api/player/save`
* **The Vulnerability:** Client dispatching inflated wallet balances or perfect CGPAs via DevTools.
* **The Architecture:**
  * The server rejects saves where $\Delta\text{wallet} > ₦50,000$ without a corresponding ledger transaction ID.
  * The server rejects saves where $\Delta\text{CGPA} > 0.08$ per sync window.
  * Violations automatically trigger an audit flag and spike `sdc_heat = 5`.

### 3.3 PvP Theft Victim Shield (Anti-Griefing)
* **The Vulnerability:** Coordinated groups repeatedly robbing wealthy Nepo Babies down to ₦0.
* **The Architecture:**
  * Successful theft (15%–35% loot) sets `theft_immunity_until = NOW() + INTERVAL '60 minutes'` on the victim.
  * Subsequent theft attempts fail at the database transaction level before wallet balances are accessed.

### 3.4 Gender-Derived Spawn (Replaces Cross-Hostel Re-Login Trap)
* **The Vulnerability:** A player spawning into the wrong-gender hostel — e.g. a female student defaulting into Peace (male) hostel, or a male avatar waking into a female hostel arrest loop.
* **The Architecture:**
  * Spawn is derived at source: the register route seeds `current_venue` from the student's `assigned_hostel` (male => `peace_hostel`; female => `purity_hostel` | `patience_hostel`).
  * The legacy `sanitize_student_spawn_location` trigger has been **removed** — it relocated players to `main_roundabout`, a venue absent from the catalog, and only handled one direction of the bug.
  * Cross-hostel entry during play is guarded at the API layer (`FORBIDDEN_VENUE_GENDER`), not by a DB trigger.

### 3.5 Broke & Suspended Soft-Lock Mitigation
* **The Vulnerability:** A student with ₦0 suspended with a ₦50,000 fine and unable to work gigs.
* **The Architecture:**
  * An Indigent Labor Pardon path grants community labor access at ₦0 cost, clearing the suspension after 15 real-world minutes of mini-game labor.

---

## 4. Asset Pipeline & Viewport Performance Budgets

* **Camera:** `THREE.OrthographicCamera` positioned at $(20, 20, 20)$ with isometric pitch $35.264^\circ$ and yaw $45.0^\circ$.
* **Geometry Target:** $< 45,000$ triangles for macro exterior scenes; $< 15,000$ triangles for interior rooms.
* **Textures:** Zero external texture image files. Flat low-poly geometry rendered with `MeshStandardMaterial` hex color assignments.
* **Target Frame Rate:** Stable 60 FPS on mobile devices with draw calls capped under 35 per frame.
