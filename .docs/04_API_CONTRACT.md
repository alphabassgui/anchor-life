# Anchor Life — REST API Contract Specification

**Document Version:** 1.3.0  
**Target Environment:** Next.js 16 App Router (`app/api/...`), Supabase PostgreSQL, Upstash Redis  
**Protocol:** Stateless HTTP/1.1 & HTTP/2 REST (JSON)  
**Security Model:** Supabase Auth session (cookies) with Row-Level Security (RLS). Player-write routes run server-side via the `service_role` client and derive `student_id` from the session — NEVER from the body.  

---

## 1. Global API Standards & Conventions

### 1.1 Base URL & Pathing
* **Base URL:** `https://anchorlife.app/api` (Production) / `http://localhost:3000/api` (Development)
* **Versioning:** Resource-based pathing without URI version prefixing.

### 1.2 Headers & Content Negotiation
All endpoints expect and return standard JSON headers. Authentication is via the Supabase session cookie set by `@supabase/ssr`; the route handler resolves the auth user server-side.

```http
Content-Type: application/json
Accept: application/json
X-Client-Version: 1.3.0
```

### 1.3 Standard Response Envelopes

#### Success Envelope (`200 OK`, `201 Created`)
```typescript
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: number;
}
```

#### Error Envelope
```typescript
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: number;
}
```

### 1.4 Rate Limiting & Performance Guardrails
* **Presence Polling (`GET /campus/world`):** Capped at 1 request per 1.2s per client. Redis-backed, 10s TTLs.
* **State Persistence (`POST /player/save`):** Client-debounced (30s). Server rejects requests faster than 10s per user.
* **Anti-Cheat Delta Clamping:** Rejects Δwallet > ₦50,000 without ledger transaction; Δcgpa > 0.08 per sync window.
* **Cash Transactions & PvP Robbery:** Strictly atomic via PostgreSQL stored procedures with advisory row locks.

---

## 2. Authentication & Student Registration

### 2.1 Student Registration & Matriculation
* **Endpoint:** `POST /api/auth/register`
* **Description:** Registers an authenticated student account, server-rolls the archetype, server-generates the matric number, derives hostel spawn from the assigned hostel, and provisions initial simulation state.
* **Auth Required:** No

> **Server-authoritative fields:** `matricNumber` and `archetype` are NOT accepted from the client. The matric number is generated server-side (`AUL/XXX/YY/NNN`, collision-retried) and the archetype is rolled server-side (reroll-proof, weighted 85 campus_hustler / 15 nepo_baby). Any such values in the body are ignored. `wallet_balance` is derived from the rolled archetype.

#### Request Body
```typescript
export interface RegisterStudentRequest {
  email: string;
  password: string;
  fullName: string;
  handle: string;              // Unique, lowercase alphanumeric, 3-20 chars
  gender: 'male' | 'female';
  assignedHostel: 'peace_hostel' | 'purity_hostel' | 'patience_hostel'; // MUST match gender
  faculty: string;             // One of the recognised Anchor University faculties
  department: string;          // Must belong to the selected faculty
  isAdult: boolean;            // Must be explicit true (18+; no DOB stored)
  personalityTraits: string[]; // Exactly 2 valid trait IDs
  dream: string;               // A valid campus dream ID
  appearance?: {
    body: 'm' | 'f';
    style: 'smart' | 'casual' | 'traditional';
    skin: string; hair: string; hairColor: string;
    outfit: string; top: string; bottom: string;
  };
}
```

#### Response (`201 Created`)
```json
{ "success": true, "data": { "studentId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" }, "timestamp": 1791642300000 }
```
> On success the server has created the auth user, inserted the `students` row (generated matric + rolled archetype), and seeded `student_simulation_states` with `current_venue` set from `assignedHostel`. The client then establishes its session and calls `GET /api/player/state`.

#### Error Codes
* `INVALID_EMAIL` / `WEAK_PASSWORD` / `INVALID_FULL_NAME` / `INVALID_HANDLE` (400)
* `NOT_ADULT` (403) — `isAdult` not explicit true.
* `INVALID_PERSONALITY` (400) — not exactly 2 valid trait IDs.
* `INVALID_DREAM` (400); `INVALID_GENDER` (400); `INVALID_HOSTEL` (400)
* `HOSTEL_GENDER_MISMATCH` (400) — Peace male-only; Purity/Patience female-only.
* `INVALID_FACULTY` / `INVALID_DEPARTMENT` (400)
* `HANDLE_TAKEN` (409); `MATRIC_GENERATION_FAILED` (503)

---

### 2.2 Student Login
* **Endpoint:** `POST /api/auth/login` — authenticates by email, matric, or handle and establishes a session. Handle login resolves via `app/api/auth/resolve-handle/route.ts` (admin client, anti-enumeration generic error).
```typescript
export interface LoginRequest { identifier: string; password: string; }
```

---

## 3. Real-Time Room Presence & Discrete Spot Polling

### 3.1 Fetch Room Presence — `GET /api/campus/world?venue=<id>` (Auth: Yes)
Returns `{ venueId, studentCount, students: [{ id, handle, spotId, pose, appearance, status }] }` from the Redis set. Polled every 1.5–2.0s.

### 3.2 Update Heartbeat — `POST /api/campus/heartbeat` (Auth: Yes)
```typescript
export interface HeartbeatRequest {
  venueId: string;
  spotId: string;
  pose: 'idle' | 'walk' | 'sit' | 'sleep' | 'study' | 'pray' | 'brawl';
}
```

---

## 4. State Persistence, Anti-Cheat & Combat Logging

### 4.1 Debounced State Persistence — `POST /api/player/save` (Auth: Yes)
Derives `student_id` from the session; 4-vital model.
```typescript
export interface SaveStateRequest {
  simTimeMinutes: number;
  vitals: {
    hunger: number;  // 0.00 - 100.00
    energy: number;  // 0.00 - 100.00
    morale: number;  // 0.00 - 100.00 (Fun + Social merged)
    health: number;  // 0.00 - 100.00 (Hygiene / Vitality merged)
  };
  academic: { cgpa: number; devotion: number; sdcHeat: number; };
  spatial: { currentVenue: string; spotId: string; currentPose: string; isSleeping: boolean; };
  moodlets: Array<{ id: string; expiresAtSimMinute: number; }>;
  financialDiff: { walletDelta: number; bankDelta: number; reason: string; referenceId?: string; };
}
```
#### Server-Side Validation
1. |Δwallet| > 50000 ∧ referenceId null ⟹ Reject (400 `SUSPICIOUS_LEDGER_SPIKE`)
2. Δcgpa > 0.08 ⟹ Reject (400 `INVALID_CGPA_DELTA`)
3. vitals ∉ [0.00, 100.00] ⟹ Reject (422 `INVALID_NEED_RANGE`)
* `ACCOUNT_SUSPENDED` (403): academic/spatial mutations rejected while suspended.

Response: `{ persistedAt, syncedWallet, syncedCgpa, syncedDevotion, syncedSdcHeat }`.

### 4.2 Fetch Full Player State — `GET /api/player/state` (Auth: Yes)
Derives `student_id` from the session. Returns `{ student, activeEncounter?, simulation, items }`. `simulation.vitals` = `{ hunger, energy, morale, health }`; plus `cgpa, devotion, sdcHeat, skills {coding,charisma,fitness,hustle}, currentVenue, spotId, isSleeping, moodlets`. If `active_encounter_id` is set and unexpired, returns `activeEncounter` to force the modal.

---

## 5. Peer-to-Peer Interactions & Campus Crime

### 5.1 `POST /api/p2p/transfer` (Auth: Yes)
`{ recipientHandle, amount (₦100–₦50,000), note? }`. Errors: `INSUFFICIENT_FUNDS` (400), `RECIPIENT_NOT_FOUND` (404), `SELF_TRANSFER_PROHIBITED` (422).

### 5.2 `POST /api/p2p/theft` (Auth: Yes)
Atomic robbery looting **15%–35%** of the victim's liquid wallet; 60-min shield on success. Formulas in .docs/03_GAME_ENGINE.md §6.2. `{ victimId, venueId, targetSlot: 'inventory'|'locker' }`. Errors: `VICTIM_HAS_THEFT_IMMUNITY` (400), `TARGET_IS_BROKE` (400), `THEFT_COOLDOWN_ACTIVE` (429).

### 5.3 `GET /api/player/inbox?unreadOnly=` (Auth: Yes) — notifications list.
### 5.4 `PATCH /api/player/inbox/:id/read` (Auth: Yes) — mark one read.

---

## 6. Disciplinary Encounters, Bribery & Indigent Pardons

### 6.1 `POST /api/campus/encounter/resolve` (Auth: Yes)
Bribe resolution uses the Game Engine Spec formula (§5.2). `{ encounterId, authority, offense, venueId, actionChosen: 'bribe'|'sdc_surrender'|'plead_illness', bribeOfferedNaira? }`. Returns outcome, narrative, statMutations, forcedRelocation, combatLockCleared.

### 6.2 `POST /api/campus/suspension/clear` (Auth: Yes)
`{ resolutionType: 'pay_fine' | 'submit_labor' | 'indigent_pardon' }`. Labor path = **15 real-world minutes**. Errors: `INSUFFICIENT_FUNDS_FOR_FINE` (400), `INCOMPLETE_LABOR_TIME` (400), `INDIGENT_PARDON_DISQUALIFIED` (400), `NOT_CURRENTLY_SUSPENDED` (422).

---

## 7. Campus Governance
`GET /api/campus/policies` (Auth: No; `Cache-Control: public, max-age=15, stale-while-revalidate=30`) → `{ campusName, inflationIndex, policies, activeCircular, gemHunt, serverTime }`.

---

## 8. Complete Error Code Catalog

| Error Code | HTTP | Context |
| :--- | :--- | :--- |
| `UNAUTHORIZED` | 401 | Missing/expired Supabase session. |
| `FORBIDDEN_VENUE_GENDER` | 403 | Wrong-gender hostel entry. |
| `ACCOUNT_SUSPENDED` | 403 | Disciplinary suspension. |
| `NOT_ADULT` | 403 | Registration without 18+ confirmation. |
| `INSUFFICIENT_FUNDS` | 400 | Wallet/bank short for action/bribe/transfer. |
| `INSUFFICIENT_ENERGY` | 400 | Energy too low for gig/class. |
| `VICTIM_HAS_THEFT_IMMUNITY` | 400 | Active 60-min shield. |
| `TARGET_IS_BROKE` | 400 | Victim wallet < ₦200. |
| `TARGET_NOT_IN_VENUE` | 400 | Victim left the room. |
| `HOSTEL_GENDER_MISMATCH` | 400 | Registration hostel ≠ gender. |
| `HANDLE_TAKEN` | 409 | Handle already claimed. |
| `MATRIC_GENERATION_FAILED` | 503 | Could not allocate unique matric. |
| `THEFT_COOLDOWN_ACTIVE` | 429 | Within 3-min PvP cooldown. |
| `RATE_LIMIT_EXCEEDED` | 429 | Polling `/world` too fast. |
| `SUSPICIOUS_LEDGER_SPIKE` | 400 | Δwallet > ₦50,000 without referenceId. |
| `INDIGENT_PARDON_DISQUALIFIED` | 400 | Wallet ≥ ₦1,000. |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled exception. |
