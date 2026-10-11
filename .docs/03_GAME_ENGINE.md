# Anchor Life — Game Engine & Mathematical Specification

**Document Version:** 1.2.0  
**Target Environment:** Mobile PWA / WebGL Client  
**Engine Stack:** Zustand (Client-Authoritative Loop), Three.js (Orthographic WebGL), Supabase/PostgreSQL (Stateless REST Sync), Upstash Redis (Ephemeral Presence)  

---

## 1. Game Loop, World Clock & Mobile Lifecycle Catch-Up

Anchor Life runs an asynchronous, client-authoritative simulation driven by a deterministic 5-second tick engine inside Zustand, syncing debounced diffs to the PostgreSQL/Supabase backend every 30 seconds.

```
                 [ 60 FPS Three.js Render Loop ]
                   (Canvas Rendering & Tweens)
                               ▲
                               │ Reads State
┌──────────────────────────────┴──────────────────────────────┐
│                  ZUSTAND LOCAL GAME STORE                   │
│  - Needs & Status Meters      - Active Room Grid & Objects  │
│  - Moodlets & Buff Timers     - Inventory & Ledger Diffs    │
└──────────────────────────────▲──────────────────────────────┘
                               │ Mutates State
┌──────────────────────────────┴──────────────────────────────┐
│             CORE TICK LOOP (Every 5 Real Seconds)           │
│  - Need Decay Calculations    - SDC Heat & Curfew Sweeps    │
│  - Moodlet Expiration Checks  - Automatic Event Triggers    │
└──────────────────────────────▲──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
[ Mobile Background Resume ]                [ Debounced Sync: POST /save ]
(Wall-Clock Catch-Up Formula)                (Runs every 30 seconds)
```

### 1.1 Time Compression Ratio
The simulation compresses real time to establish realistic day/night cycles while maintaining mobile gameplay momentum:
* **Ratio:** $1\text{ real second} = 1\text{ in-game minute}$.
* **Game Day:** $1,440\text{ in-game minutes} = 24\text{ real minutes}$.
* **Tick Rate:** The simulation loop fires every $\Delta t_{\text{real}} = 5\text{ seconds}$, advancing the world clock by $\Delta t_{\text{game}} = 5\text{ minutes}$.

### 1.2 Mobile Visibility & Offline Wall-Clock Catch-Up Formula
When a student switches to WhatsApp or locks their phone screen, mobile OS browsers suspend JavaScript execution. To prevent death from un-ticked hours or desynchronization from campus chapel cycles:

1. **Visibility Event Listener:**
   ```typescript
   document.addEventListener('visibilitychange', () => {
     if (document.visibilityState === 'visible') {
       handleAppResume();
     } else {
       recordAppSuspendTimestamp();
     }
   });
   ```

2. **The 4-Hour Decay Clamp Equation:**
   Calculate elapsed real time $\Delta t_{\text{real}}$ in seconds since `last_active_at`:

   $$\Delta t_{\text{offline\_minutes}} = \min\left(240, \left\lfloor \frac{t_{\text{now}} - t_{\text{last\_active}}}{60} \right\rfloor\right)$$

   * **Max Offline Decay:** Hard-clamped to **240 minutes (4 simulated hours)**. Even if absent for 3 days, the avatar does not starve to death while offline.
   * **Sleeping Damping Factor ($D_{\text{sleep}}$):** If the avatar was logged out while resting in a hostel bunk bed:
     $$D_{\text{sleep}} = 0.35$$
     Hunger and Energy decay at only $35\%$ of their normal rate during offline hours.

---

## 2. Streamlined Biological Need Formulations

To keep the game addictive and eliminate tedious bathroom-management chores, needs are consolidated into **4 Core Vital Meters** ($0.00 - 100.00$):

$$N_{t+1} = \max\left(0.00, \min\left(100.00, N_t - (\beta_N \cdot M_{\text{archetype}} \cdot D_{\text{sleep}} + \sum \mu_{N}) \cdot \frac{\Delta t}{60}\right)\right)$$

Where:
* $N_t$: Need value at tick $t$ ($0.00$ to $100.00$).
* $\beta_N$: Base hourly decay rate.
* $M_{\text{archetype}}$: Socio-economic decay modifier.
* $D_{\text{sleep}}$: Sleep damping factor ($1.00$ awake, $0.35$ sleeping on bunk).
* $\sum \mu_N$: Net hourly burn/gain from active moodlets.
* $\frac{\Delta t}{60}$: Hourly tick fraction ($\frac{5}{60} \approx 0.0833$).

### 2.1 Base Hourly Decay Rates ($\beta_N$)

| Need Metric | Base Decay ($\beta_N / \text{hr}$) | 0% Floor Consequence (Emergency State) | Primary Recovery Loop |
| :--- | :--- | :--- | :--- |
| **Hunger** | $4.16\%$ (Empty in 24 hrs) | **Starvation Collapse:** Energy drains $3\times$ faster; forced Sickbay admission. | Cafeteria jollof, kiosk snacks, soaking garri. |
| **Energy** | $3.50\%$ (Empty in ~28 hrs) | **Hostel Faint:** Avatar collapses on floor; wallet open to 100% theft. | Hostel bunk bed, clinic bed rest. |
| **Morale** (Fun+Social) | $2.50\%$ (Empty in 40 hrs) | **Academic Burnout:** CGPA gains from lectures reduced by $50\%$. | Basketball, peer banter, campus music. |
| **Health** (Hygiene/Vitality) | $1.50\%$ (Empty in ~66 hrs) | **Medical Isolation:** Charisma $-40\%$; barred from attending classes. | Hostel bucket bath, Sickbay consultation. |

### 2.2 Archetype Decay Modifiers ($M_{\text{archetype}}$)
* **The Nepo Baby ("Ajebutter"):**
  * $M_{\text{Hunger}} = 1.30$ (Fast hunger drain on hostel food).
  * $M_{\text{Energy}} = 1.20$ (Fatigues faster during manual tasks or long treks).
  * $M_{\text{Morale}} = 1.35$ (High standards; fast morale drain in basic hostels).
* **The Campus Hustler ("Trenches"):**
  * $M_{\text{Hunger}} = 0.80$ (High fasting resilience; garri sustains longer).
  * $M_{\text{Energy}} = 0.85$ (High stamina for side hustles and overnight study).
  * $M_{\text{Morale}} = 0.85$ (Resilient to irregular campus utilities).

---

## 3. Academic & Spiritual Dynamics

Unlike biological needs that decay continuously, **CGPA** and **Devotion** operate as accumulative and gated status systems.

```
       [ Academic Engine ]                      [ Spiritual Engine ]
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ • Scale: 0.00 – 5.00 CGPA    │        │ • Scale: 0% – 100% Devotion  │
│ • Mutators:                  │        │ • Mutators:                  │
│   - Attend Lecture (+0.04)   │        │   - Sunday Chapel (+20%)     │
│   - Surprise CA (-0.04/+0.08)│        │   - Midweek Chapel (+15%)    │
│   - Sleep in Class (-0.02)   │        │   - Unexcused Absence (-25%) │
│   - Fail Assignment (-0.10)  │        │   - Room Devotion (+5%)      │
├──────────────────────────────┤        ├──────────────────────────────┤
│ Thresholds:                  │        │ Thresholds:                  │
│ • CGPA < 1.50 = Probation    │        │ • Devotion < 75% = Exeat Lock│
│ • CGPA ≥ 4.50 = Scholar Perk │        │ • Devotion < 30% = SDC Alert │
└──────────────────────────────┘        └──────────────────────────────┘
```

### 3.1 CGPA Calculation & Continuous Assessment
CGPA evaluates on Anchor University's official $5.00$ scale at the close of every simulated 7-day academic cycle:

$$\text{CGPA} = \frac{\sum_{c=1}^{C} (\text{GradePoint}_c \times \text{Units}_c)}{\sum_{c=1}^{C} \text{Units}_c}$$

Continuous Assessment (CA) scores derive from class presence and department skill levels:

$$\text{Score}_{\text{CA}} = \text{clamp}\left(0, 30, (A_{\text{lecture}} \times 15) + (S_{\text{skill}} \times 1.5) - (\text{Fatigue} \times 0.2)\right)$$

Where:
* $A_{\text{lecture}}$: Percentage of lectures attended ($0.0$ to $1.0$).
* $S_{\text{skill}}$: Relevant departmental skill ($0.0$ to $10.0$, e.g., `skill_coding` for Computer Science).
* $\text{Fatigue}$: Depleted energy factor: $(100 - \text{Energy}) \times 0.1$.

### 3.2 Devotion & Exeat Clearance Rule
Devotion determines exit border clearance at the Main Gate:

$$\text{CanObtainExeat} = (\text{Devotion} \ge 75.00) \land (\text{SDC\_Heat} = 0) \land (\text{Status} \ne \text{'suspended'})$$

If an Exeat pass is requested while $\text{Devotion} < 75.00$, the Hall Warden issues an automatic refusal, forcing the student to either attend chapel, forge the clearance slip, or attempt a security guard bribe.

---

## 4. Spatial Spot Snapping & Isometric Mathematics

Hostel rooms (Peace Hostel bunks, desks, and lockers) utilize discrete Spot IDs and an $8 \times 8$ discrete 2D grid projected into Three.js 3D isometric space.

```
       GRID SPACE (2D Matrix)                       WORLD SPACE (Three.js 3D)
  0   1   2   3   4   5   6   7                         +Y (Up)
0 ┌───┬───┬───┬───┬───┬───┬───┬───┐                          │
  │ B │ B │   │   │   │   │   │   │                          │
1 ├───┼───┼───┼───┼───┼───┼───┼───┤                          │
  │ D │   │   │   │   │   │ L │ L │                          └─────── +X (Screen Right)
2 ├───┼───┼───┼───┼───┼───┼───┼───┤                         /
  │   │   │   │   │   │   │   │   │                        /
3 └───┴───┴───┴───┴───┴───┴───┴───┘                      +Z (Screen Down-Left)
  B = Bunk Bed (1x2)  D = Desk (1x1)
  L = Locker (1x2)
```

### 4.1 Discrete Spot Architecture
To eliminate network jitter and bandwidth waste on mobile networks, avatars do not stream continuous micro-coordinates. Avatars snap to predefined **Spot IDs**:

```typescript
export interface VenueSpot {
  id: string;             // e.g. "cafeteria_table_04"
  label: string;          // "Dining Table 4"
  prop: string;           // Asset key
  x: number;              // Discrete Three.js coordinate
  z: number;
  facing: number;         // Euler yaw
  permittedActions: string[];
}
```

* **Client Movement:** The client Three.js engine tweens the avatar from their current spot to the target spot over $1.2$ seconds using cubic easing.
* **Server Payload:** Polling payloads transmit `{ studentId, spotId: "table_04", pose: "eating" }`, keeping presence payload sizes under $100\text{ bytes}$ per student.

### 4.2 Three.js Isometric Camera Projection
The Three.js viewport uses an **Orthographic Camera** configured with an isometric projection:
* **Euler Order:** `YXZ`
* **Pitch (X-axis):** $\theta_x = \arcsin(\tan(30^\circ)) \approx 35.264^\circ$ ($0.6155\text{ rad}$)
* **Yaw (Y-axis):** $\theta_y = 45.0^\circ$ ($0.7854\text{ rad}$)
* **Camera Zoom Formula:**
  $$\text{CamZoom} = \text{clamp}\left(35.0, 60.0, \frac{\text{ViewportWidth}}{16}\right)$$

---

## 5. Disciplinary Confrontation & Combat-Logging Protection

Infractions do not resolve silently. When caught by the CSO or Hall Warden, regular gameplay freezes and an interactive encounter modal mounts.

### 5.1 Combat-Logging & Disconnect Intercept
To prevent players from hitting `Ctrl+R` or closing the browser tab to escape CSO arrests:

1. **Server Lock:** The moment an encounter triggers, `active_encounter_id` and `active_encounter_expires_at = NOW() + INTERVAL '5 minutes'` are written to the database.
2. **Re-Login Intercept:** On initial boot (`GET /api/player/state`), if `active_encounter_id` is not null and has not expired, the game boots directly into the confrontation modal.
3. **Session Timeout Forfeit:** If the player stays offline until `active_encounter_expires_at` lapses, the server automatically executes **Automatic SDC Surrender**:
   * SDC Heat $+3$ Stars
   * Devotion $-30\%$
   * Fine of ₦10,000 recorded in ledger

### 5.2 The Disciplinary Bribery Formula

$$P(\text{BribeSuccess}) = \text{clamp}\left(0.10, 0.95, P_{\text{base}} + (\text{Skill}_{\text{charisma}} \times 0.04) - (\text{Heat}_{\text{sdc}} \times 0.08) + \left(\frac{B_{\text{offered}} - B_{\text{demanded}}}{B_{\text{demanded}}}\right) \times 0.25\right)$$

#### Base Authority Demands

| Authority Figure | Offense Type | Base Demand ($B_{\text{demanded}}$) | Base Chance ($P_{\text{base}}$) | Failure Consequence |
| :--- | :--- | :--- | :--- | :--- |
| **Hostel Porter** | Curfew Breach / Noise | ₦2,000 | $0.70$ ($70\%$) | SDC Heat $+1$, Demerit issued. |
| **Security Guard** | No Exeat at Main Gate | ₦3,000 | $0.65$ ($65\%$) | Gate locked, SDC Heat $+2$. |
| **Hall Warden** | Skipping Midweek Chapel | ₦5,000 | $0.50$ ($50\%$) | Devotion $-25\%$, SDC Heat $+3$. |
| **CSO** | Contraband / Drugs / Brawl | ₦25,000 | $0.35$ ($35\%$) | Immediate Arrest, Formal Tribunal. |

```typescript
export function resolveBribe(
  baseProb: number,
  charisma: number,
  sdcHeat: number,
  offered: number,
  demanded: number
): boolean {
  const financialIncentive = ((offered - demanded) / demanded) * 0.25;
  const totalProbability = Math.min(0.95, Math.max(0.10, 
    baseProb + (charisma * 0.04) - (sdcHeat * 0.08) + financialIncentive
  ));
  return Math.random() < totalProbability;
}
```

---

## 6. Anti-Griefing Direct PvP Theft Engine

Students can pickpocket other real players visible in their current room presence list:

```
                 [ Attacker Clicks "Steal" on Victim ]
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   [ Victim Shield Active? ]                 [ Victim liquid wallet < ₦200? ]
   (theft_immunity_until > now)              (Target is broke)
              │                                         │
        ┌─────┴─────┐                             ┌─────┴─────┐
        ▼           ▼                             ▼           ▼
      (YES)        (NO)                         (YES)        (NO)
     BLOCKED:    Proceed to                    BLOCKED:    Proceed to
    Theft fails;  theft roll                  "Target is   theft roll
    guard alerted                              broke!"
```

### 6.1 The 60-Minute Victim Immunity Shield
* When a student is successfully robbed, the database updates `theft_immunity_until = NOW() + INTERVAL '60 minutes'`.
* During this 60-minute window, subsequent theft attempts against that victim return HTTP 400 (`VICTIM_HAS_THEFT_IMMUNITY`).
* Prevents organized groups from chain-robbing wealthy Nepo Babies down to ₦0.

### 6.2 Theft Mathematical Formulas
1. **Theft Success Probability ($P_{\text{steal}}$):**
   $$P_{\text{steal}} = \text{clamp}\left(0.15, 0.85, 0.50 + (\text{Hustle}_{\text{attacker}} \times 0.05) - (\text{Charisma}_{\text{victim}} \times 0.03) - V_{\text{crowd}}\right)$$
   Where $V_{\text{crowd}} = \min(0.25, N_{\text{students\_in\_room}} \times 0.02)$.

2. **Detection Probability ($P_{\text{detect}}$):**
   $$P_{\text{detect}} = \text{clamp}\left(0.20, 0.90, 0.60 - (\text{Hustle}_{\text{attacker}} \times 0.04) + (\text{Energy}_{\text{victim}} \times 0.002)\right)$$

3. **Loot Calculation ($L$):**
   $$L = \text{round}\left(\text{Wallet}_{\text{victim}} \times \text{random}(0.15, 0.35)\right)$$

4. **Victim Notification Payload (Dispatched to `student_inbox`):**
   ```json
   {
     "kind": "crime",
     "from": "thief_handle",
     "title": "Hostel Pickpocket Alert! 🚨",
     "body": "Caught @mannykuzzy001 attempting to rob your locker in Peace Hostel! Stolen: ₦3,400. You have gained a 60-minute street immunity shield.",
     "at": 1791642157
   }
   ```

---

## 7. Non-Permadeath Suspension & Indigent Pardon Loop

Anchor Life enforces severe accountability without character erasure:

```
                  [ Student Accumulates 5 SDC Heat Stars ]
                                     │
                                     ▼
                      [ Status: SUSPENDED Account Lock ]
                      • Banned from entering lecture halls
                      • Cafeteria meal vendors refuse service
                      • Exeat clearance permanently revoked
                                     │
        ┌────────────────────────────┴────────────────────────────┐
        ▼                                                         ▼
 [ Path A: Wealthy Restitution ]            [ Path B: Indigent Labor Pardon (₦0) ]
 • Pay ₦50,000 cash fine at Admin Block     • For broke students (wallet < ₦1,000)
 • Restores Good Standing instantly         • 15 real-world minutes community labor
                                              sweeping chapel / cleaning sports track
        │                                                         │
        └────────────────────────────┬────────────────────────────┘
                                     ▼
                         [ Status: Good Standing ]
                         (Heat reset to 1 Star)
```

### 7.1 Heat Accumulation & Natural Decay
* **Accumulation:**
  * Skipping Chapel: $+1$ Star
  * Hostel Curfew Violation: $+1$ Star
  * Contraband Seizure: $+2$ Stars
  * Direct PvP Theft Detection: $+2$ Stars
  * Campus Fighting / Brawling: $+3$ Stars
  * Banned Substance Dealing: $+5$ Stars (Immediate maximum)
* **Natural Decay:**
  * Heat decays by $1\text{ Star}$ every $48\text{ real hours}$ ($2,880\text{ game minutes}$) of infraction-free behavior and consistent chapel attendance.

---

## 8. Centralized Economic Formulas & Price Control

All monetary transactions are multiplied by the **Global Inflation Index** from `GET /api/campus/policies`:

$$\text{FinalPrice} = \text{round}(\text{BasePrice} \times I_{\text{campus}})$$

Where $I_{\text{campus}}$ is the centralized price index controlled by administration (Default: $1.00$).

### 8.1 Student Cash Flow Models

#### A. Weekly Parental Allowance (Monday 08:00 Drop)
* **Nepo Baby:** 
  $$\text{Allowance} = ₦50,000 \quad (\text{Automated credit to bank balance})$$
* **Campus Hustler:**
  Must trigger the `"Call Mummy"` interaction:
  $$\text{Allowance} = \begin{cases} 
  ₦10,000 & \text{if } \text{CGPA} \ge 3.50 \land \text{Devotion} \ge 80\% \\
  ₦5,000 & \text{if } 2.50 \le \text{CGPA} < 3.50 \\
  ₦2,000 + \text{Sermon (Energy } -20) & \text{if } \text{CGPA} < 2.50 \lor \text{Heat} > 1
  \end{cases}$$

#### B. Hostel Side Hustle Payouts
1. **Hostel Barber (Peace Hostel):**
   * Pre-requisite: Possesses `hair_clippers` (Contraband item).
   * Payout: ₦2,500 per haircut.
   * Costs: $15\text{ Energy}$, $20\text{ game minutes}$.
   * Risk: $10\%$ noise chance per client of alerting the floor porter.
2. **Assignment Freelancing (Computing Lab):**
   * Pre-requisite: $\text{Skill}_{\text{coding}} \ge 3.00$.
   * Payout: ₦4,000 – ₦7,500.
   * Costs: $35\text{ Energy}$, $60\text{ game minutes}$, $\text{Morale} -15$.

---

## 9. Optimistic Action Dispatcher (Zustand Pipeline)

```typescript
// store/useGameStore.ts
export const executeGameAction = (action: CampusAction) => {
  const state = get();

  // 1. Validate Pre-conditions
  if (state.needs.energy < action.cost.energy) {
    showToast("Too exhausted! Sleep or rest first. 🥱");
    return false;
  }
  if (state.wallet < action.cost.naira) {
    showToast("Insufficient cash! Sapa is real. 💸");
    return false;
  }

  // 2. Snapshot Previous State for Rollback
  const previousState = { ...state };

  // 3. Optimistic Local Mutation
  set((s) => ({
    wallet: s.wallet - action.cost.naira,
    needs: {
      hunger: clamp(s.needs.hunger + (action.gains.hunger || 0)),
      energy: clamp(s.needs.energy - (action.cost.energy || 0)),
      morale: clamp(s.needs.morale + (action.gains.morale || 0)),
      health: clamp(s.needs.health + (action.gains.health || 0)),
    },
    ledgerDiffs: [
      ...s.ledgerDiffs,
      { actionId: action.id, amount: -action.cost.naira, at: Date.now() }
    ]
  }));

  // 4. Play Local SFX & Animations Instantly
  playAudioEffect(action.sfx);
  triggerAvatarPose(action.pose);

  return true;
};
```