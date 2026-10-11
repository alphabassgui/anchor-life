# Anchor Life — Technical Architecture Specification

**Document Version:** 1.1.0  
**Status:** Approved for Implementation  
**Stack:** Next.js 15 (App Router), React 19, Three.js (WebGL), Tailwind CSS, Zustand, Supabase (PostgreSQL), Upstash Redis  

---

## 1. Architectural Philosophy & Core Principles

**Anchor Life** delivers a low-latency, mobile-first 2.5D campus simulation across unstable mobile network conditions (3G/4G/Campus Wi-Fi) without WebSocket degradation.

Modeled after *Lagos Life* (`lagoslife.app`), the system enforces five foundational tenets:

1. **Stateless HTTP REST Over Heavy WebSockets:**  
   Room presence uses lightweight HTTP polling (`GET /api/campus/world`) backed by Upstash Redis In-Memory Sets. State persistence uses debounced client payloads (`POST /api/player/save`).
2. **Client-Authoritative Simulation Engine:**  
   The client Zustand store runs the 5-second deterministic tick loop. The server does not calculate real-time decay, acting strictly as an auditable database and ledger validator.
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
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2D UI Overlay Layer (React 19 + Tailwind CSS)                         │  │
│  │ • Top HUD: Needs Bars, Clock, Cash (₦), Location, Heat Stars         │  │
│  │ • Encounter Dialogs: Combat-logging locked CSO Confrontations         │  │
│  │ • Bottom Dock: Hostel / Shopping / Campus Map / Phone Inbox           │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │ Pointer Events (Transparent)          │
│  ┌──────────────────────────────────▼────────────────────────────────────┐  │
│  │ 2.5D WebGL Viewport Layer (Three.js)                                  │  │
│  │ • Orthographic Camera: True isometric pitch ($35.264^\circ$, yaw $45^\circ$)│  │
│  │ • Spot Snapping: Avatars interpolate between discrete Spot IDs        │  │
│  │ • Dynamic Hex Tinting: Zero external image texture maps               │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │ Reads / Mutates Local State           │
│  ┌──────────────────────────────────▼────────────────────────────────────┐  │
│  │ Local Client Store (Zustand + LocalStorage Mirror)                    │  │
│  │ • 5-Second Deterministic Need Tick Loop                               │  │
│  │ • Offline Wall-Clock Catch-Up Handler (4h max clamp)                  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                         Stateless HTTP / JSON REST
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                    NEXT.JS 15 APP ROUTER (STATELESS API)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  • GET  /api/campus/world       (High-speed Redis presence polling: 1.5s)   │
│  • POST /api/campus/heartbeat   (Updates spotId in Redis sorted set)        │
│  • POST /api/player/save        (Debounced delta-clamped state sync: 30s)   │
│  • POST /api/p2p/theft          (Atomic theft with 60m victim shield)       │
│  • GET  /api/campus/policies    (Centralized inflation index & curfews)     │
├─────────────────────────────────────────────────────────────────────────────┤
│                         DATA PERSISTENCE & CACHE                            │
│  ┌──────────────────────────────────┐   ┌────────────────────────────────┐  │
│  │ Upstash Redis (In-Memory)        │   │ Supabase PostgreSQL 15         │  │
│  │ • Ephemeral Presence Sets        │   │ • User Profiles & Auth         │  │
│  │ • Zero disk MVCC bloat           │   │ • Audited Financial Ledger     │  │
│  │ • TTL: 10s auto-expire           │   │ • Active Encounter State Lock  │  │
│  └──────────────────────────────────┘   └────────────────────────────────┘  │
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
  * Successful theft sets `theft_immunity_until = NOW() + INTERVAL '60 minutes'` on the victim.
  * Subsequent theft attempts fail at the database transaction level before wallet balances are accessed.

### 3.4 Cross-Hostel Re-Login Trap Eviction
* **The Vulnerability:** Male avatar logging out inside a female hostel and spawning into an immediate arrest loop.
* **The Architecture:**
  * A PostgreSQL trigger (`sanitize_student_spawn_location`) automatically relocates male students found in female hostels on session initialization to `main_roundabout`.

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