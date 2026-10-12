# Anchor Life — REST API Contract Specification

**Document Version:** 1.2.0  
**Target Environment:** Next.js 15 App Router (`app/api/...`), Supabase PostgreSQL, Upstash Redis  
**Protocol:** Stateless HTTP/1.1 & HTTP/2 REST (JSON)  
**Security Model:** Bearer JWT (Supabase Auth) with Row-Level Security (RLS)  

---

## 1. Global API Standards & Conventions

### 1.1 Base URL & Pathing
* **Base URL:** `https://anchorlife.app/api` (Production) / `http://localhost:3000/api` (Development)
* **Versioning:** Resource-based pathing without URI version prefixing.

### 1.2 Headers & Content Negotiation
All endpoints expect and return standard JSON headers:

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <supabase_access_token>
X-Client-Version: 1.2.0
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

#### Error Envelope (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`)
```typescript
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;      // Machine-readable error constant (e.g., "VICTIM_HAS_THEFT_IMMUNITY")
    message: string;   // Human-readable Nigerian campus contextual message
    details?: Record<string, unknown>;
  };
  timestamp: number;
}
```

### 1.4 Rate Limiting & Performance Guardrails
* **Presence Polling (`GET /campus/world`):** Capped at 1 request per $1.2$ seconds per client. Backed by Upstash Redis in-memory sets with 10-second TTLs to avoid PostgreSQL MVCC table bloat.
* **State Persistence (`POST /player/save`):** Debounced on the client (30s window). Server rejects requests faster than 10-second intervals per user.
* **Anti-Cheat Delta Clamping:** Rejects state pushes with unsanctioned jumps ($\Delta\text{wallet} > ₦50,000$ without ledger transaction; $\Delta\text{CGPA} > 0.08$ per sync window).
* **Cash Transactions & PvP Robbery:** Strictly atomic via PostgreSQL stored procedures with advisory row locks (`pg_advisory_xact_lock`).

---

## 2. Authentication & Student Registration

### 2.1 Student Registration & Matriculation
* **Endpoint:** `POST /api/auth/register`
* **Description:** Registers an authenticated student account, sets socio-economic archetype, assigns hostel bunk, and provisions initial simulation state.
* **Auth Required:** No

#### Request Body
```typescript
export interface RegisterStudentRequest {
  email: string;
  password: string;
  matricNumber: string; // Regex: ^AUL\/[A-Z]{3}\/\d{2}\/\d{3}$
  handle: string;       // Unique handle, lowercase alphanumeric, 3-20 chars (e.g., "mannykuzzy")
  fullName: string;
  gender: 'male' | 'female';
  department: string;   // e.g., "Computer Science", "Economics", "Mass Communication"
  archetype: 'nepo_baby' | 'campus_hustler';
  appearance: {
    body: 'm' | 'f';
    style: 'smart' | 'casual' | 'traditional';
    skin: string;       // Hex color (e.g., "#8d5524")
    hair: string;       // Mesh ID (e.g., "afro", "fade", "braids")
    hairColor: string;  // Hex color
    outfit: string;     // Mesh ID (e.g., "corporate_tie", "polo_jeans")
    top: string;        // Hex color
    bottom: string;     // Hex color
  };
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "matricNumber": "AUL/CMP/24/036",
      "handle": "mannykuzzy",
      "fullName": "Emmanuel Joshua",
      "gender": "male",
      "archetype": "campus_hustler",
      "status": "good_standing",
      "assignedHostel": "peace_hostel",
      "bunkNumber": "Bunk 04",
      "walletBalance": 2500,
      "bankBalance": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": 1791642300000
}
```

#### Error Codes
* `MATRIC_ALREADY_EXISTS` (409): Matriculation number has already been registered.
* `HANDLE_TAKEN` (409): Student handle is already claimed.
* `INVALID_MATRIC_FORMAT` (422): Does not match Anchor University matriculation format.

---

### 2.2 Student Login
* **Endpoint:** `POST /api/auth/login`
* **Description:** Authenticates credentials and returns a session JWT.
* **Auth Required:** No

#### Request Body
```typescript
export interface LoginRequest {
  identifier: string; // Matric number OR Student handle OR Email
  password: string;
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "studentId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "handle": "mannykuzzy"
  },
  "timestamp": 1791642300000
}
```

---

## 3. Real-Time Room Presence & Discrete Spot Polling

To prevent bandwidth strain and cellular jitter, avatars report discrete anchor **Spot IDs** (`spotId`) rather than continuous float streams. Stored in **Upstash Redis** memory sets with automatic TTL expiration.

### 3.1 Fetch Room Presence
* **Endpoint:** `GET /api/campus/world`
* **Description:** Polled every $1.5$–$2.0$ seconds by active clients. Reads the Redis in-memory sorted set for the venue and returns active students.
* **Auth Required:** Yes
* **Query Parameters:**
  * `venue` (string, required): e.g., `peace_hostel`, `faculty_complex`, `chapel`, `cafeteria`

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "venueId": "peace_hostel",
    "studentCount": 2,
    "students": [
      {
        "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "handle": "mannykuzzy",
        "spotId": "bunk_04",
        "pose": "sleep",
        "appearance": {
          "skin": "#8d5524",
          "hair": "afro",
          "hairColor": "#1a1a1a",
          "top": "#ffffff",
          "bottom": "#1d2433"
        },
        "status": "good_standing"
      },
      {
        "id": "e3b0c442-98fc-1c14-9af0-2d6b412140e2",
        "handle": "MarcusLife",
        "spotId": "desk_02",
        "pose": "study",
        "appearance": {
          "skin": "#c68a62",
          "hair": "fade",
          "hairColor": "#000000",
          "top": "#3b82f6",
          "bottom": "#111827"
        },
        "status": "good_standing"
      }
    ]
  },
  "timestamp": 1791642301500
}
```

---

### 3.2 Update Player Heartbeat & Active Spot
* **Endpoint:** `POST /api/campus/heartbeat`
* **Description:** Updates the player's discrete spot assignment and pose in the Redis presence set. Sets TTL to 10 seconds.
* **Auth Required:** Yes

#### Request Body
```typescript
export interface HeartbeatRequest {
  venueId: string;
  spotId: string; // Discrete anchor spot (e.g. "cafeteria_table_04", "bunk_02")
  pose: 'idle' | 'walk' | 'sit' | 'sleep' | 'study' | 'pray' | 'brawl';
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": { "acknowledged": true },
  "timestamp": 1791642302000
}
```

---

## 4. State Persistence, Anti-Cheat & Combat Logging

### 4.1 Debounced State Persistence (With Anti-Cheat Delta Clamping)
* **Endpoint:** `POST /api/player/save`
* **Description:** Pushes the debounced simulation state and diff mutations from the Zustand store. Clamps rate of change to block memory editor injection.
* **Auth Required:** Yes

#### Request Body
```typescript
export interface SaveStateRequest {
  simTimeMinutes: number;
  vitals: {
    hunger: number;  // 0.00 - 100.00
    energy: number;  // 0.00 - 100.00
    hygiene: number; // 0.00 - 100.00
    bladder: number; // 0.00 - 100.00
    fun: number;     // 0.00 - 100.00
    social: number;  // 0.00 - 100.00
  };
  academic: {
    cgpa: number;     // 0.00 - 5.00
    devotion: number; // 0.00 - 100.00
    sdcHeat: number;  // 0 - 5
  };
  spatial: {
    currentVenue: string;
    spotId: string;
    currentPose: string;
    isSleeping: boolean;
  };
  moodlets: Array<{
    id: string;
    expiresAtSimMinute: number;
  }>;
  financialDiff: {
    walletDelta: number; // Signed integer (e.g., -1200 for lunch)
    bankDelta: number;
    reason: string;
    referenceId?: string; // Stored transaction reference ID if from P2P/Theft/Allowance
  };
}
```

#### Server-Side Validation Rules:
1. $|\Delta\text{wallet}| > 50000 \land \text{referenceId is null} \implies \text{Reject (HTTP 400)}$
2. $\Delta\text{cgpa} > 0.08 \implies \text{Reject (HTTP 400)}$
3. $\text{vitals values} \notin [0.00, 100.00] \implies \text{Reject (HTTP 422)}$

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "persistedAt": 1791642330000,
    "syncedWallet": 1300,
    "syncedCgpa": 3.54,
    "syncedDevotion": 85.0,
    "syncedSdcHeat": 0
  },
  "timestamp": 1791642330000
}
```

#### Error Codes
* `SUSPICIOUS_LEDGER_SPIKE` (400): Wallet delta exceeds allowed threshold without transaction ID.
* `INVALID_CGPA_DELTA` (400): CGPA climbed faster than permitted per single sync cycle.
* `INVALID_NEED_RANGE` (422): Vitals values submitted outside the 0.00–100.00 boundaries.
* `ACCOUNT_SUSPENDED` (403): Account is suspended; academic or spatial mutations rejected.

---

### 4.2 Fetch Full Player State (With Combat-Logging Intercept)
* **Endpoint:** `GET /api/player/state`
* **Description:** Retrieves the complete state bundle during game initialization. If an encounter was active when the student disconnected, returns `activeEncounter` to force the confrontation modal back onto the screen.
* **Auth Required:** Yes

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "matricNumber": "AUL/CMP/24/036",
      "handle": "mannykuzzy",
      "fullName": "Emmanuel Joshua",
      "archetype": "campus_hustler",
      "status": "good_standing",
      "assignedHostel": "peace_hostel",
      "walletBalance": 2500,
      "bankBalance": 0,
      "isSuspended": false,
      "restitutionFineOwed": 0,
      "communityLaborMinutesRemaining": 0,
      "theftImmunityUntil": 1791642300000,
      "lastActiveAt": 1791642100000
    },
    "activeEncounter": {
      "id": "enc_892183",
      "authority": "CSO",
      "offense": "contraband_possession",
      "demandedBribe": 5000,
      "expiresAt": 1791642600000
    },
    "simulation": {
      "vitals": {
        "hunger": 78.50,
        "energy": 64.20,
        "hygiene": 72.00,
        "bladder": 55.00,
        "fun": 80.00,
        "social": 68.00
      },
      "cgpa": 3.50,
      "devotion": 85.00,
      "sdcHeat": 0,
      "skills": {
        "coding": 2.40,
        "charisma": 1.50,
        "fitness": 1.00,
        "hustle": 3.20
      },
      "currentVenue": "peace_hostel",
      "spotId": "bunk_04",
      "isSleeping": false,
      "moodlets": []
    },
    "items": [
      {
        "id": "item_01",
        "itemId": "vono_bunk",
        "slot": "room_floor",
        "gridX": 0,
        "gridY": 0,
        "rotation": 0
      },
      {
        "id": "item_02",
        "itemId": "boiling_ring",
        "slot": "mattress",
        "quantity": 1
      }
    ]
  },
  "timestamp": 1791642300000
}
```

---

## 5. Peer-to-Peer Interactions & Campus Crime

### 5.1 Peer-to-Peer Virtual Money Transfer ("Urgent 2k")
* **Endpoint:** `POST /api/p2p/transfer`
* **Description:** Atomic ledger transfer sending virtual Naira from sender to recipient.
* **Auth Required:** Yes

#### Request Body
```typescript
export interface TransferCashRequest {
  recipientHandle: string;
  amount: number; // Min ₦100, Max ₦50,000 per transfer
  note?: string;
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "transferId": "tx_821739812",
    "senderNewBalance": 500,
    "amountSent": 2000,
    "recipientHandle": "MarcusLife",
    "note": "Urgent 2k for cafeteria rice"
  },
  "timestamp": 1791642350000
}
```

#### Error Codes
* `INSUFFICIENT_FUNDS` (400): Sender wallet does not contain the specified amount.
* `RECIPIENT_NOT_FOUND` (404): Handle does not exist.
* `SELF_TRANSFER_PROHIBITED` (422): Cannot transfer money to your own handle.

---

### 5.2 Direct PvP Room Theft (With 60-Minute Victim Immunity Shield)
* **Endpoint:** `POST /api/p2p/theft`
* **Description:** Executes an atomic robbery roll against another student in the same room. Applies a 60-minute victim immunity shield upon success.
* **Auth Required:** Yes

#### Request Body
```typescript
export interface ExecuteTheftRequest {
  victimId: string;
  venueId: string;
  targetSlot: 'inventory' | 'locker';
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "theftSuccess": true,
    "amountLooted": 3400,
    "wasDetected": true,
    "newThiefWallet": 5900,
    "sdcHeatDelta": 2,
    "victimShieldGrantedMinutes": 60,
    "narrative": "You quietly slid ₦3,400 from @MarcusLife's pocket, but his roommate eyed you suspiciously! 👀"
  },
  "timestamp": 1791642380000
}
```

#### Error Codes
* `VICTIM_HAS_THEFT_IMMUNITY` (400): Victim was recently robbed and has an active 60-minute street immunity shield.
* `TARGET_IS_BROKE` (400): Victim has less than ₦200 in their liquid wallet.
* `THEFT_COOLDOWN_ACTIVE` (429): Attacker must wait 3 real-world minutes before attempting another theft.

---

### 5.3 Fetch Student Notification Inbox
* **Endpoint:** `GET /api/player/inbox`
* **Description:** Fetches all alerts, crime notifications (theft attempts on you), administrative demerits, and cash transfers.
* **Auth Required:** Yes
* **Query Parameters:**
  * `unreadOnly` (boolean, optional): Default `false`.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_001",
        "kind": "crime",
        "fromHandle": "mannykuzzy",
        "title": "Pickpocket Alert! 🚨",
        "body": "@mannykuzzy tried to pick your pocket in Peace Hostel Bunk 4. You noticed and slapped his hand away! 💥",
        "isRead": false,
        "createdAt": 1791642157000
      }
    ]
  },
  "timestamp": 1791642400000
}
```

---

### 5.4 Mark Inbox Notification Read
* **Endpoint:** `PATCH /api/player/inbox/:id/read`
* **Description:** Marks a single notification as read.
* **Auth Required:** Yes

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": { "id": "notif_001", "isRead": true },
  "timestamp": 1791642410000
}
```

---

## 6. Disciplinary Encounters, Bribery & Indigent Pardons

### 6.1 Resolve Authority Confrontation (Clears Combat Lock)
* **Endpoint:** `POST /api/campus/encounter/resolve`
* **Description:** Resolves an encounter modal with the CSO, Hall Warden, or Security Guard. Clears `active_encounter_id` upon resolution.
* **Auth Required:** Yes

#### Request Body
```typescript
export interface ResolveEncounterRequest {
  encounterId: string;
  authority: 'CSO' | 'hall_warden' | 'porter' | 'security_guard';
  offense: 'chapel_absence' | 'contraband_possession' | 'curfew_breach' | 'fighting' | 'banned_substance_dealing';
  venueId: string;
  actionChosen: 'bribe' | 'sdc_surrender' | 'plead_illness';
  bribeOfferedNaira?: number;
}
```

#### Response (`200 OK - Bribe Accepted`)
```json
{
  "success": true,
  "data": {
    "outcome": "bribe_accepted",
    "narrative": "Security slipped the ₦2,000 into his breast pocket and looked away: 'Oya commot here sharp sharp!' 🤫",
    "statMutations": {
      "walletDelta": -2000,
      "sdcHeatDelta": 0,
      "devotionDelta": -5
    },
    "forcedRelocation": null,
    "combatLockCleared": true
  },
  "timestamp": 1791642430000
}
```

#### Response (`200 OK - Bribe Failed / Forced SDC Escort`)
```json
{
  "success": true,
  "data": {
    "outcome": "bribe_failed",
    "narrative": "CSO shoved your money away: 'You dey try bribe officer?! Follow me to the Senate building immediately!' 🚨",
    "statMutations": {
      "walletDelta": -2000,
      "sdcHeatDelta": 4,
      "devotionDelta": -20
    },
    "forcedRelocation": "admin_block",
    "combatLockCleared": true
  },
  "timestamp": 1791642430000
}
```

---

### 6.2 Clear Suspension Status (With ₦0 Indigent Labor Pardon)
* **Endpoint:** `POST /api/campus/suspension/clear`
* **Description:** Resolves an active suspension by paying the ₦50,000 fine, completing community labor, or claiming the indigent pardon (if broke).
* **Auth Required:** Yes

#### Request Body
```typescript
export interface ClearSuspensionRequest {
  resolutionType: 'pay_fine' | 'submit_labor' | 'indigent_pardon';
}
```

#### Response (`200 OK - Indigent Pardon Granted`)
```json
{
  "success": true,
  "data": {
    "status": "good_standing",
    "isSuspended": false,
    "narrative": "Dean of Student Affairs approved your Indigent Labor Pardon! 15 minutes of chapel sweeping registered. You are cleared! 🎓",
    "walletBalance": 150,
    "restitutionFineRemaining": 0
  },
  "timestamp": 1791642460000
}
```

#### Error Codes
* `INSUFFICIENT_FUNDS_FOR_FINE` (400): Wallet balance is lower than the ₦50,000 fine owed.
* `INCOMPLETE_LABOR_TIME` (400): Real-world community labor minutes not yet fulfilled.
* `INDIGENT_PARDON_DISQUALIFIED` (400): Player wallet exceeds ₦1,000; indigent pardon is only for broke students.
* `NOT_CURRENTLY_SUSPENDED` (422): Account is already in good standing.

---

## 7. Campus Governance & Global Economy Settings

### 7.1 Fetch Campus Policies & Inflation Index
* **Endpoint:** `GET /api/campus/policies`
* **Description:** Fetches active campus-wide administrative policies, dynamic price inflation multipliers, curfew statuses, and event flags. Modeled after the `/gov` pattern in `lagoslife.app`.
* **Auth Required:** No
* **Cache Strategy:** `Cache-Control: public, max-age=15, stale-while-revalidate=30`

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "campusName": "Anchor University Lagos",
    "inflationIndex": 1.15,
    "policies": {
      "chapelCheckActive": true,
      "hostelRaidActive": false,
      "mainGateStrictExeat": true
    },
    "activeCircular": "Midweek Chapel biometric attendance is strictly compulsory this evening. Hall wardens are patrolling Peace & Purity Hostels.",
    "gemHunt": {
      "venue": "sports_centre",
      "prizeNaira": 5000,
      "totalFoundToday": 1420
    },
    "serverTime": 1791642480000
  },
  "timestamp": 1791642480000
}
```

---

## 8. Complete Error Code Catalog

| Error Code | HTTP Status | Context / Explanation |
| :--- | :--- | :--- |
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired Supabase Bearer token. |
| `FORBIDDEN_VENUE_GENDER` | 403 | Male avatar attempting entry into female hostels (Purity/Patience) or vice versa. |
| `ACCOUNT_SUSPENDED` | 403 | Account is in disciplinary suspension; lectures and hostels blocked. |
| `INSUFFICIENT_FUNDS` | 400 | Wallet or bank balance insufficient for action, bribe, or transfer. |
| `INSUFFICIENT_ENERGY` | 400 | Character Energy too low to execute side gig or attend classes. |
| `VICTIM_HAS_THEFT_IMMUNITY` | 400 | Target has an active 60-minute street immunity shield from a recent robbery. |
| `TARGET_IS_BROKE` | 400 | Victim has less than ₦200 in liquid cash; robbery aborted. |
| `TARGET_NOT_IN_VENUE` | 400 | The victim of a PvP action is no longer inside the specified room. |
| `MATRIC_ALREADY_EXISTS` | 409 | Matriculation number is already tied to another registered account. |
| `HANDLE_TAKEN` | 409 | Desired student handle is taken. |
| `THEFT_COOLDOWN_ACTIVE` | 429 | Action attempted before the 3-minute PvP robbery cooldown expired. |
| `RATE_LIMIT_EXCEEDED` | 429 | Client polling `/world` faster than once every $1.2$ seconds. |
| `SUSPICIOUS_LEDGER_SPIKE` | 400 | Anti-cheat flag triggered by abnormal client wallet diff ($> ₦50,000$). |
| `INDIGENT_PARDON_DISQUALIFIED`| 400 | Student wallet $\ge ₦1,000$; ineligible for emergency indigent pardon. |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled database or server exception. |