# Anchor Life — Product Requirements Document (PRD)

**Document Version:** 1.1.0

**Status:** Approved for Implementation

**Target Environment:** Mobile-First Progressive Web App (PWA) / Desktop Web

**Client Target:** Next.js 16 (App Router, Turbopack), Three.js (WebGL Orthographic Canvas), Tailwind CSS v4, Zustand

**Backend Target:** Stateless Node.js / Next.js REST API, Supabase (PostgreSQL), Redis (Upstash)

## 1. Executive Summary & Vision

**Anchor Life** is an isometric 2.5D campus life simulation engine modeled after the architectural patterns of *Lagos Life* (`lagoslife.app`). The game simulates the authentic, high-stakes student experience at Anchor University, Ayobo, Lagos.

Players manage their avatar's biological survival, academic standings (CGPA), spiritual compliance (Devotion), and disciplinary threat (SDC Heat). The game balances legitimate campus routines (lectures, chapel services, library study, cafeteria meals) against illicit survival instincts (contraband stashing, curfew breaking, direct PvP room theft, hostel fights, banned substance dealing, and bribing security guards or hostel porters).

The application leverages a lightweight, horizontally scalable architecture: Three.js renders low-poly isometric 3D scenes on an orthographic projection, while standard 2D HTML/CSS overlays handle HUDs and modal interactions. The game simulation runs locally on the player's device via Zustand, synchronizing state with the backend via debounced REST persistence (`POST /save`) and lightweight room-presence polling (`GET /world`).

## 2. Authentication, Onboarding & Student Archetypes

### 2.1 Mandatory Authenticated Matriculation

* **No Anonymous Guest Mode:** all users must authenticate before entering campus.
* **Credentials:** Student Handle (e.g., `@mannykuzzy`), Email, and Password. The **matric number is server-generated** at registration (`AUL/XXX/YY/NNN`) — it is not chosen by the player — and can be used as a login identifier afterwards.
* **Department Selection:** Choice of academic faculty and a department within it.

### 2.2 Socio-Economic Background Archetypes

The **archetype is rolled server-side (reroll-proof, weighted ~85% Campus Hustler / ~15% Nepo Baby)** — the on-screen pick is a cosmetic preview.

| Parameter | 🏛️ Nepo Baby ("Ajebutter") | 🎒 Campus Hustler ("Trenches") |
| ----- | ----- | ----- |
| **Starting Capital** | ₦150,000 | ₦2,500 |
| **Weekly Allowance** | ₦50,000 (automated every Monday 08:00) | Tiered via "Call Mummy": ₦10,000 if CGPA ≥ 3.50 & Devotion ≥ 80%; ₦5,000 if 2.50 ≤ CGPA < 3.50; ₦2,000 (+ sermon, Energy −20) if CGPA < 2.50 or Heat > 1 |
| **Vital Decay Modifiers** | Faster drain: Hunger ×1.30, Energy ×1.20, Morale ×1.35 | Resilient: Hunger ×0.80, Energy ×0.85, Morale ×0.85 |
| **Hustle Modifier** | Normal earning rates | +20% Hustle XP and higher gig payouts |
| **Victory Condition** | Graduate First Class (4.50+ CGPA) | Accumulate ₦1,000,000 net worth, graduate debt-free |

### 2.3 Modular Character Customization Engine

Layered 3D humanoid base meshes with dynamic hex-color material tinting: Body Type (m/f), Style (smart/casual/traditional), Skin tone, Hair & hair color, modular top/bottom attire.

## 3. Core Simulation & State Machine

### 3.1 The Vital & Status Model (4 Vitals + CGPA / Devotion / SDC Heat)

The game tracks **4 continuous vitals** plus three gated status meters, driven by an internal 5-second tick loop (applied as decay-on-action in the early build, then as a real-time tick):

```
1. Hunger  (0.00 - 100.00) — Vital: drains continuously.
2. Energy  (0.00 - 100.00) — Vital: drains during activities.
3. Morale  (0.00 - 100.00) — Vital: Fun + Social combined.
4. Health  (0.00 - 100.00) — Vital: Hygiene / Vitality combined.
5. CGPA     (0.00 - 5.00)  — Academic: term grade point average.
6. Devotion (0.00 - 100%)  — Institutional: chapel & church score.
7. SDC Heat (0 - 5 stars)  — Security: disciplinary threat level.
```

> **Streamlined (LOCKED v1):** The earlier 6-need model (separate hygiene, bladder, fun, social) is retired. Fun + Social merge into **Morale**; Hygiene becomes **Health**; **Bladder is removed entirely**. Bathing/showering are discrete actions that restore Health and clear debuffs.

#### A. Vitals & Base Decay (see .docs/03_GAME_ENGINE.md §2.1)

* **Hunger:** Base decay 4.16%/hr (empty ~24 hrs). At 0 → Starvation Collapse (Energy drains 3× faster, forced Sickbay). Restored by meals, snacks, soaking garri.
* **Energy:** Base decay 3.50%/hr awake (empty ~28 hrs); restored by sleeping on a bunk or clinic bed. At 0 → Hostel Faint (wallet exposed to theft).
* **Morale (Fun + Social):** Base decay 2.50%/hr (empty ~40 hrs). Low morale → Academic Burnout (CGPA gains halved). Restored via sports, peer banter, room visits, music.
* **Health (Hygiene / Vitality):** Base decay 1.50%/hr (empty ~66 hrs). Below 20 → Medical Isolation (Charisma penalties, barred from classes). Restored via bucket baths, showers, Sickbay.
* **Archetype & sleep modifiers:** Nepo ×1.30/×1.20/×1.35 (Hunger/Energy/Morale); Hustler ×0.80/×0.85/×0.85. Sleeping applies a 0.35 damping factor to Hunger and Energy.

#### B. Academic Standing (CGPA)
0.00–5.00 scale. Lectures & CAs add +0.02 to +0.08; skipping/sleeping/failing docks it. CGPA < 1.50 at cycle end → Academic Probation.

#### C. Institutional Compliance (Devotion)
Chapel on Sundays & Wednesday evenings restores Devotion to 100%. Skipping drains −25% per instance. Devotion ≥ 75% required for Exeat passes.

#### D. Disciplinary Threat (SDC Heat)
0 (clean) → 5 (summoned; administrative hold, forced SDC trial).

### 3.2 Moodlet System (mapped to the 4-vital model)
* `softLife` (Buff): +10 Morale; passive energy regen.
* `guilt` (Debuff): −10 Morale; after refusing a peer's urgent financial request.
* `soakedRain` (Debuff): −8 Health, −5 Energy; caught outdoors in rain.
* `examPanic` (Debuff): Morale drops twice as fast; Energy drains faster in lecture hours.
* `sanctified` (Buff): +15 Devotion; Charisma boost for 24 in-game hours.

### 3.3 Environmental Systems
Power grid (fans off → Health drains faster; no charging), water pump (no bucket baths without pure-water sachets), weather (rain → "Soaked by Rain" moodlet).

## 4. Campus Geography

Macro campus map + micro venue interiors. **Spawn rule:** starting venue derived from `assigned_hostel` (male => Peace; female => Purity | Patience), seeded at registration. There is no `main_roundabout` venue. Venues: Peace (M), Purity (F), Patience (F), Faculty Blocks A–E, Chapel, Cafeteria, Sports Centre, Main Gate, Admin Block, Health Centre — each with interactable spot coordinates and actions (sleep, study, pray, eat, bathe, hustle, etc.).

## 5. Items, Inventory & Contraband
Modular `CampusItem` schema (furniture/provision/contraband/academic/clothing) with contrabandLevel 0–3. Contraband tiers: L1 (₦5k fine, +1 Heat), L2 (confiscation, +2 Heat), L3 (CSO arrest, suspension). Provision pantry: garri, sugar, milk, indomie, cabin biscuit.

## 6. Confrontation & Decision Trees

### 6.1 Bribery Formula (Canonical — see .docs/03_GAME_ENGINE.md §5.2)
P(BribeSuccess) = clamp(0.10, 0.95, P_base + Charisma×0.04 − SDC_Heat×0.08 + ((offered − demanded)/demanded)×0.25). Base demands: Porter ₦2,000 @ 0.70; Security ₦3,000 @ 0.65; Warden ₦5,000 @ 0.50; CSO ₦25,000 @ 0.35.

Decision trees: Chapel Security Sweep, Hostel Contraband Inspection, Main Gate Exeat Clearance, Surprise Lecture Assessment (each with pay/hide/surrender branches and stat outcomes).

## 7. The Illicit & Crime System
* **PvP Theft:** success based on Hustle vs victim activity/crowd; loots **15%–35%** of victim's liquid cash; grants 60-min shield. Exact formulas in .docs/03_GAME_ENGINE.md §6.2. Failure → peer retaliation (−30 Energy), +3 Heat, security alert.
* **Brawls:** −40 Energy, +20 Morale, noise risk; injured → "Bruised".
* **Banned Substance Dealing:** ₦20k–₦50k per deal; Devotion → 0, Heat → 4; 35% CSO sting risk.

## 8. Disciplinary Tribunal & Suspension Recovery
5 Heat → arrest → trial → `status = "suspended"` (blocked from lectures/hostels/cafeteria). Recovery: Path A ₦50,000 fine, Path B **15 real-world minutes** community labor, or ₦0 Indigent Pardon if broke.

## 9. Campus Economy
Inflows: allowances (₦50k Nepo; tiered ₦10k/₦5k/₦2k Hustler), barber (₦2,500/cut), coding gigs (₦4,000–₦7,500), P2P transfers. Outflows: meals (₦800–₦2,500), provisions, bribes (₦2,000–₦25,000), fines. Prices scale by central `inflationIndex` from `GET /api/campus/policies` (EffectivePrice = BasePrice × InflationMultiplier).

## 10. Social & Multiplayer
Low-bandwidth room presence via HTTP polling (`GET /api/campus/world?venue=`, every 1.5–2.0s, discrete spotId + pose + appearance < 100 bytes/student). Peer interaction modal: Send Money, Visit Bunk, Study Streak (+10% CGPA bonus), one-tap chat chips, async DMs.

## 11. Technical Architecture
Browser client (2D Tailwind HUD over Three.js orthographic WebGL, Zustand 4-vital decay loop + localStorage mirror) ↔ stateless Next.js 16 REST API ↔ Supabase (PostgreSQL) + Upstash (Redis presence).

## 12. Phased Engineering Roadmap
* **Phase 1 (MVP):** login/registration/archetype reveal; campus map + initial venues; 4-vital decay loop; pantry cooking; lectures; chapel; basic encounters; `POST /save` + `GET /world`.
* **Phase 2:** PvP theft + inbox, brawls, substance trade; full SDC trials, suspension, 15-minute labor; off-campus travel; dynamic inflation.

## 13. Acceptance Criteria
1. CGPA < 1.50 → Academic Probation.
2. 5 Heat → lockout, routed to Admin Block.
3. Suspended player blocked until ₦50,000 fine recorded or 15 real-world minutes of labor verified.
4. Offline resilience: local Zustand sim continues; diffs queue and sync on reconnect.
