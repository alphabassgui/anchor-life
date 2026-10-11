# Anchor Life — Product Requirements Document (PRD)

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Target Environment:** Mobile-First Progressive Web App (PWA) / Desktop Web  
**Client Target:** Next.js 15 (App Router), Three.js (WebGL Orthographic Canvas), Tailwind CSS, Zustand  
**Backend Target:** Stateless Node.js / Next.js REST API, Supabase (PostgreSQL), Redis (Upstash)  

---

## 1. Executive Summary & Vision

**Anchor Life** is an isometric 2.5D campus life simulation engine modeled after the architectural patterns of *Lagos Life* (`lagoslife.app`). The game simulates the authentic, high-stakes student experience at Anchor University, Ayobo, Lagos.

Players manage their avatar's biological survival, academic standings (CGPA), spiritual compliance (Devotion), and disciplinary threat (SDC Heat). The game balances legitimate campus routines (lectures, chapel services, library study, cafeteria meals) against illicit survival instincts (contraband stashing, curfew breaking, direct PvP room theft, hostel fights, banned substance dealing, and bribing security guards or hostel porters).

The application leverages a lightweight, horizontally scalable architecture: Three.js renders low-poly isometric 3D scenes on an orthographic projection, while standard 2D HTML/CSS overlays handle HUDs and modal interactions. The game simulation runs locally on the player's device via Zustand, synchronizing state with the backend via debounced REST persistence (`POST /save`) and lightweight room-presence polling (`GET /world`).

---

## 2. Authentication, Onboarding & Student Archetypes

### 2.1 Mandatory Authenticated Matriculation
* **No Anonymous Guest Mode:** To support direct peer-to-peer economic transfers, direct PvP room theft, and persistent disciplinary records, all users must authenticate before entering campus.
* **Credentials:** Student Handle (e.g., `@mannykuzzy`), Matriculation Number / Email, and Password.
* **Department Selection:** Choice of academic faculty (Faculty of Science & Computing, Faculty of Humanities, Faculty of Social & Management Sciences).

### 2.2 Socio-Economic Background Archetypes
During character creation, players select one of two distinct economic starting tiers, creating asymmetric gameplay loops and natural replayability:

| Parameter | 🏛️ The Nepo Baby ("Ajebutter") | 🎒 The Campus Hustler ("Trenches") |
| :--- | :--- | :--- |
| **Starting Capital** | ₦150,000 | ₦2,500 |
| **Weekly Allowance** | ₦50,000 (automated every Monday 08:00) | ₦5,000 (manual request via "Call Mummy") |
| **Starting Gear** | High-end Laptop, Flagship Smartphone, Full Provision Basket | Basic Smartphone, 1 cup Garri, 1 sachet Milk |
| **Need Decay Rates** | Fast decay in basic hostel bunks (+30% Fun and Hygiene drain) | Resilient (-20% slower Hunger and Energy decay) |
| **Bribery Affinity** | High liquid cash; easily settles demands from guards/porters | Relies heavily on Charisma skill or evasion checks |
| **Academic Pressure** | Harsh family penalties if CGPA falls below $3.50$ | High resilience; family prioritizes graduation over awards |
| **Hustle Modifier** | Normal earning rates from side gigs | +20% Hustle XP and higher payouts from gigs |
| **Victory Condition** | Graduate First Class ($4.50+$ CGPA) with family reputation intact | Accumulate ₦1,000,000 net worth and graduate debt-free |

### 2.3 Modular Character Customization Engine
The avatar engine uses layered 3D humanoid base meshes with dynamic hex-color material tinting:
* **Body Type:** Male (`m`), Female (`f`).
* **Style:** Corporate Smart (regulation tie/shirt), Casual, Traditional.
* **Skin Tone:** Hex color mapping (e.g., `#c68a62`, `#8d5524`, `#3d2314`).
* **Hair & Hair Color:** Low-poly hair meshes (`afro`, `fade`, `braids`, `lowcut`) with dynamic color tinting.
* **Attire:** Modular top and bottom mesh assignments with dynamic hex tinting (`top: "#f4efe6"`, `bottom: "#1d2433"`).

---

## 3. Core Simulation & State Machine

### 3.1 The 9-Meter Need & Status Model
The game state tracks nine continuous variables driven by an internal 5-second tick loop:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ANCHOR LIFE NEED METERS                           │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. Hunger   (0.00 - 100.00, Float)   │ Biological: Drains continuously.      │
│ 2. Energy   (0.00 - 100.00, Float)   │ Biological: Drains during activities. │
│ 3. Hygiene  (0.00 - 100.00, Float)   │ Biological: Drops with heat/workouts. │
│ 4. Bladder  (0.00 - 100.00, Float)   │ Biological: Fills over time.          │
│ 5. Fun      (0.00 - 100.00, Float)   │ Psychological: Drops in study/chapel. │
│ 6. Social   (0.00 - 100.00, Float)   │ Psychological: Drops in isolation.   │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 7. CGPA     (0.00 - 5.00, Float)     │ Academic: Term grade point average.  │
│ 8. Devotion (0.00 - 100.00%, Float)  │ Institutional: Chapel & church score.│
│ 9. SDC Heat (0 - 5 Stars, Integer)   │ Security: Disciplinary threat level. │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

#### A. Biological Needs
* **Hunger:** Depletes at $1.2$ units/hour. Reaching $0$ triggers fainting, hospital bills, and energy drain.
* **Energy:** Depletes at $2.0$ units/hour awake; restored by sleeping on a hostel bunk or resting.
* **Hygiene:** Restored via bucket baths or shower spots. Dropping below $20$ imparts the `"Stinky"` moodlet (blocks social interactions).
* **Bladder:** Restored via restroom spots. Overflowing triggers an emergency accident (instant Hygiene drop to $0$, Social drop to $0$).
* **Fun & Social:** Restored via sports, casual conversation, room visits, and music.

#### B. Academic Standing (CGPA)
* Tracks cumulative academic performance on a $0.00 - 5.00$ scale.
* Attending scheduled lectures and passing continuous assessments adds small increments ($+0.02$ to $+0.08$).
* Skipping lectures, sleeping in class, or failing tests docks CGPA.
* If $\text{CGPA} < 1.50$ at the end of an academic cycle, the player is put on **Academic Probation**.

#### C. Institutional Compliance (Devotion)
* Mandatory chapel services occur on Sundays and Wednesday evenings.
* Attendance and scanning at the chapel biometrics desk restores Devotion to $100\%$.
* Skipping services drains Devotion by $-25\%$ per instance.
* Maintaining $\text{Devotion} \ge 75\%$ is an absolute prerequisite for official Exeat passes at the Main Gate.

#### D. Disciplinary Threat (SDC Heat)
* Measured from $0$ to $5$ stars:
  * **0 Stars (Clean):** Good standing; guards ignore you.
  * **1–2 Stars (Monitored):** Porters conduct frequent room checks; suspicious posture.
  * **3–4 Stars (Targeted):** Porters actively stop you; gate guards demand thorough searches.
  * **5 Stars (Summoned):** Immediate CSO intercept; account placed on administrative hold; forced SDC trial.

### 3.2 Moodlet System
Temporary status buffs and debuffs modify stat decay rates and interaction outcomes:
* **`softLife` (Buff):** $+10$ Fun; passive energy regeneration boost.
* **`guilt` (Debuff):** $-10$ Social; occurs after refusing a peer's urgent financial request.
* **`soakedRain` (Debuff):** $-8$ Hygiene, $-5$ Energy; triggered when caught outdoors during a rain tick.
* **`examPanic` (Debuff):** Fun drops twice as fast; Energy drains faster during lecture hours.
* **`sanctified` (Buff):** $+15$ Devotion; boosts Charisma checks with hostel wardens for 24 in-game hours.

### 3.3 Environmental Systems (Power, Water, Weather)
* **Campus Power Grid:** Power fluctuates. When power cuts:
  * Room fans stop functioning (Hygiene drains faster).
  * Laptops and phones cannot charge.
  * Reading efficiency at desks drops unless the hostel generator runs.
* **Water Pumping Machine:** Hostel taps run dry if the pump is off; bucket baths become impossible without buying pure water sachets from the kiosk.
* **Weather State Engine:** Tracks clear, overcast, and rainy conditions. Rain forces avatars into outdoor umbrella animations and applies the `"Soaked by Rain"` moodlet if caught outside.

---

## 4. Campus Geography & Venue Spot Architecture

The game world is split into two visual tiers: the **Macro Campus Map** (isometric campus overview) and **Micro Venue Interiors** (isometric 3D rooms with interactable spot coordinates).

```
                              [ MAIN GATE ]
                        (Security Booth / Exeat Check)
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
     [ HOSTEL ZONE ]          [ CENTRAL PLAZA ]        [ ACADEMIC ZONE ]
 ┌──────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
 │ • Peace Hostel (M)   │  │ • University Chapel │  │ • Faculty Blocks    │
 │ • Purity Hostel (F)  │  │ • Student Cafeteria │  │   A, B, C, D, E     │
 │ • Patience Hostel (F)│  │ • Sports Complex    │  │ • Computing Lab     │
 └──────────────────────┘  │ • Health Centre     │  └─────────────────────┘
                           │ • Administrative    │
                           │   Block (SDC Court) │
                           └─────────────────────┘
```

### 4.1 Venue Catalog & Spot Definitions

#### 1. Peace Hostel (Male Residence)
* **Demographics:** Male avatars only.
* **Rule:** Female avatars caught inside trigger an immediate Moral Code Violation.
* **Interactive Spots:**
  * `bunk_bed`: Coordinates `[-1.5, 0.0, 1.0]`. Actions: `sleepHostel`, `nap`, `hideContrabandUnderMattress`.
  * `plastic_locker`: Coordinates `[1.2, 0.0, -1.0]`. Actions: `stashProvisions`, `storeContraband`.
  * `reading_desk`: Coordinates `[0.0, 0.0, -1.8]`. Actions: `studyCSC`, `freelanceGig`.
  * `hostel_hallway`: Coordinates `[0.0, 0.0, 2.0]`. Actions: `hostelBarberHustle`, `initiateHostelFight`.

#### 2. Purity & Patience Hostels (Female Residences)
* **Demographics:** Female avatars only.
* **Trespassing Rule:** Male avatars caught inside trigger an instant **Level 4 SDC Moral Breach Alert** and immediate CSO pursuit.
* **Interactive Spots:**
  * `female_bunk`: Actions: `sleepHostel`, `roomDevotion`, `hideContraband`.
  * `wardrobe_unit`: Actions: `changeOutfit`, `checkDressCode`.

#### 3. Faculty Blocks A–E (Lecture Halls & Labs)
* **Purpose:** Academic classes, continuous assessments, and assignment hand-ins.
* **Interactive Spots:**
  * `lecture_bench`: Coordinates `[-2.0, 0.0, 0.5]`. Actions: `attendLecture`, `sleepInClass`, `signAttendanceSheet`.
  * `podium_desk`: Coordinates `[0.0, 0.0, -2.5]`. Actions: `submitAssignment`, `pleadForGrace`.
  * `computing_terminal`: Coordinates `[1.8, 0.0, 0.5]`. Actions: `runCode`, `freelanceCodingHustle`.

#### 4. University Chapel
* **Purpose:** Spiritual development and compulsory attendance tracking.
* **Interactive Spots:**
  * `chapel_pew`: Coordinates `[-1.0, 0.0, 0.0]`. Actions: `attendService`, `sleepInChapel`, `prayFervently`.
  * `biometric_terminal`: Coordinates `[2.0, 0.0, 2.5]`. Actions: `scanChapelCard`, `dodgeScanner`.

#### 5. Student Cafeteria
* **Purpose:** Hunger restoration and casual socialization.
* **Interactive Spots:**
  * `food_counter`: Coordinates `[0.0, 0.0, -2.0]`. Actions: `buyStandardMeal`, `buySpecialJollof`, `requestVendorCredit`.
  * `canteen_table`: Coordinates `[1.2, 0.0, 0.8]`. Actions: `eatMeal`, `chatWithPeer`, `discussAssignment`.

#### 6. Sports Centre
* **Purpose:** Fitness, fun, brawls, and illicit meetings.
* **Interactive Spots:**
  * `basketball_court`: Coordinates `[0.0, 0.0, 0.0]`. Actions: `shootHoops`, `watchMatch`.
  * `track_field`: Coordinates `[-3.0, 0.0, 1.5]`. Actions: `runLaps`, `serveCommunityLabor`.
  * `bleachers_shadow`: Coordinates `[2.5, 0.0, -2.0]`. Actions: `dealBannedSubstance`, `initiateFight`.

#### 7. Main Gate (Security Post)
* **Purpose:** Campus ingress, egress, and security checks.
* **Interactive Spots:**
  * `security_barrier`: Coordinates `[0.0, 0.0, 1.0]`. Actions: `presentExeat`, `forgeExeatPass`, `bribeSecurityGuard`.

#### 8. Administrative Block (Senate / SDC Court)
* **Purpose:** Disciplinary hearings, fine payments, and academic inquiries.
* **Interactive Spots:**
  * `sdc_dock`: Coordinates `[0.0, 0.0, 0.0]`. Actions: `faceSDCHearing`, `pleadGuilty`, `presentLawyerParent`.
  * `accounts_desk`: Coordinates `[2.0, 0.0, -1.0]`. Actions: `payRestitutionFine`.

#### 9. Health Centre (Sickbay)
* **Purpose:** Health recovery and tactical evasion of obligations.
* **Interactive Spots:**
  * `clinic_bed`: Coordinates `[-1.8, 0.0, 0.5]`. Actions: `admitForRest`, `treatInjury`.
  * `doctors_desk`: Coordinates `[1.5, 0.0, -1.2]`. Actions: `requestExcuseDuty`, `feignIllness`.

---

## 5. Items, Inventory & Contraband Systems

### 5.1 Item Schemas
Items follow the modular dictionary schema extracted from the engine:

```typescript
export interface CampusItem {
  id: string;
  name: string;
  category: 'furniture' | 'provision' | 'contraband' | 'academic' | 'clothing';
  price: number; // Base cost in Naira (subject to dynamic inflation index)
  w?: number;    // Width in isometric room tiles
  d?: number;    // Depth in isometric room tiles
  contrabandLevel: 0 | 1 | 2 | 3; // 0 = Legal, 3 = Severe SDC Offense
  actions: string[];
  blurb: string;
  emoji: string;
}
```

### 5.2 Contraband Classification
* **Level 1 (Minor Infraction):** Non-regulation footwear, customized bedding, personal electric clippers.
  * *Penalty:* Confiscation, ₦5,000 fine, $+1$ SDC Heat.
* **Level 2 (Moderate Infraction):** Electric boiling ring, hot plate, immersion heater, cooking pots in hostel rooms.
  * *Penalty:* Permanent confiscation, $+2$ SDC Heat, mandatory hall warden counseling.
* **Level 3 (Major Infraction / Criminal):** Banned narcotic substances, forged stamp seals, exam expo sheets.
  * *Penalty:* Immediate CSO arrest, account placed in Suspended status, formal SDC trial.

### 5.3 Provision Pantry
Hostel survival relies on stored provisions consumed without visiting the cafeteria:
* `garri`: High satiety, instant preparation. Consumed via `"Soak Garri"`.
* `sugar`, `milk`: Modifiers enhancing the Hunger and Fun yield of Garri.
* `indomie`: Requires hot water. If the player possesses an electric boiling ring, cooking takes 5 minutes; if using cafeteria hot water, takes 20 minutes.
* `cabinBiscuit`: Low-cost emergency hunger stopgap.

---

## 6. Confrontation & Decision Trees

Infractions do not resolve silently. When an authority condition is met, normal game ticks freeze and an interactive encounter modal mounts.

### 6.1 The Disciplinary Bribery Formula
The mathematical resolution for bribing an authority figure (Gate Security, Hall Porter, Lab Attendant) is governed by:

$$P(\text{BribeSuccess}) = 0.60 + (\text{Charisma} \times 0.04) - (\text{SDC\_Heat} \times 0.08) - (\text{OffenseLevel} \times 0.10)$$

Where $P(\text{BribeSuccess})$ is clamped between $0.05$ ($5\%$) and $0.95$ ($95\%$).

```
                    [ Security / Porter Intercepts Player ]
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
  [ Pay Bribe Demand ]        [ Surrender to SDC ]          [ Plead Charisma ]
  (₦2,000 - ₦15,000)                   │                     (Roll Charisma)
        │                              ▼                              │
 ┌──────┴──────┐                • SDC Heat +2                  ┌──────┴──────┐
 ▼             ▼                • Devotion -25%                ▼             ▼
(Pass: P)     (Fail: 1-P)       • Demerit issued              (Pass: 40%)   (Fail: 60%)
• Cash lost   • Cash seized     • Referral to Admin           • Let off with • SDC Heat +3
• Heat clears • Bribe felony      Block for trial               warning      • Shouted at
• Clean pass    added to file                                 • Charisma +1  • Immediate SDC
              • SDC Heat +4                                                    Escort
```

### 6.2 Decision Tree: The Chapel Security Sweep
* **Condition:** Real-time game clock in Chapel Hours $\land$ Player in Hostel Zone $\land \neg \text{HasClinicExcuse}$.
* **Authority:** Chief Security Officer (CSO) and Hall Marshals.

```
                  [ CSO Sweeps Hostel Room During Chapel ]
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      ▼                              ▼                              ▼
[ Pay Off Marshals ]          [ Hide Inside Locker ]         [ Present Clinic Slip ]
(Cost: ₦3,500)                       │                              │
      │                       ┌──────┴──────┐                ┌──────┴──────┐
┌─────┴─────┐                 ▼             ▼                ▼             ▼
▼           ▼                (Pass: 35%)   (Fail: 65%)      (Valid)       (Forged/Expired)
(Pass: 70%) (Fail: 30%)      • Unseen      • Dragged out    • Excused     • SDC Heat +4
• SDC Heat  • CSO charges     • Chapel      • SDC Heat +3    • Zero penalty• Forgery charge
  unchanged   extortion         missed      • Devotion -30%                • Immediate SDC
• Clear run • SDC Heat +4     • Devotion -25%                              Hearing
```

### 6.3 Decision Tree: The Hostel Contraband Inspection
* **Condition:** Random evening event (20:00–22:00) while in Hostel $\land$ Contraband in room.
* **Authority:** Hall Warden and Senior Porters.

```
                    [ Hall Warden Knocks: Room Search! ]
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      ▼                              ▼                              ▼
[ Stash Under Mattress ]     [ Throw Out Window ]           [ Surrender Items ]
      │                              │                              │
┌─────┴─────┐                 • Item lost forever           • Contraband seized
▼           ▼                 • SDC Heat unchanged          • SDC Heat +1
(Pass: 50%) (Fail: 50%)       • 20% Chance: Porter outside  • Devotion -10%
• Warden    • Contraband        catches falling item        • Demerit slip signed
  leaves      seized            (Triggers SDC Heat +3)
• Heat 0    • SDC Heat +3
```

### 6.4 Decision Tree: The Main Gate Exeat Clearance
* **Condition:** Player attempts to transition to off-campus zones.
* **Authority:** Gate Security Guards.

```
                    [ Gate Guard Demands Exeat Pass ]
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      ▼                              ▼                              ▼
[ Present Legit Exeat ]       [ Forge Exeat Pass ]          [ Bribe Guard (₦2k) ]
(Requires Devotion $\ge 75\%$)       │                              │
      │                       ┌──────┴──────┐                ┌──────┴──────┐
• Instant exit allowed        ▼             ▼                ▼             ▼
• No risk                     (Pass: 40%)   (Fail: 60%)      (Pass: 75%)   (Fail: 25%)
                              • Passes gate • Signature fake • Gate open   • Guard alerts CSO
                              • Charisma +2 • ID Confiscated • Money gone  • SDC Heat +3
                                            • SDC Heat +4                  • Gate lock
```

### 6.5 Decision Tree: The Surprise Lecture Assessment
* **Condition:** Entering Faculty Block for lecture $\land$ `surpriseTest: true`.
* **State Check:** Player current Energy and Academic Skills.

```
                  [ Lecturer Announces Surprise Test! ]
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      ▼                              ▼                              ▼
[ Write on Merit ]            [ "Giraffe" / Expo ]          [ Walk Out Feigning Ill ]
      │                       (Peek at peer's paper)                │
• Energy -25                         │                      • Academic failure
• CGPA changes based          ┌──────┴──────┐               • Health Centre route
  on study level:             ▼             ▼               • Energy -10
  - Prepared: $+0.08$         (Pass: 55%)   (Fail: 45%)     • CGPA $-0.10$
  - Unprepared: $-0.05$       • CGPA $+0.12$• Exam sheet
                              • Hustle +2     torn in half
                                            • SDC Trial: Cheating
```

---

## 7. The Illicit & Crime System

### 7.1 Direct Peer-to-Peer (PvP) Room Theft
Unlike single-player life simulators, Anchor Life allows authenticated students to rob other real players located in the same spatial room:
* **The Action:** Player A approaches Player B and selects *"Pickpocket / Steal Allowance"*.
* **Resolution Engine:**
  * Checks Player A's **Hustle Skill** against Player B's current activity (if Player B is asleep, success probability increases by $+35\%$).
  * Success transfers up to $20\%$ of Player B's liquid cash to Player A.
* **Asynchronous Crime Inbox Notification:**
  * When robbed, Player B receives a persistent message in their `inbox` array:
    ```json
    {
      "id": "crm_98234",
      "kind": "crime",
      "body": "@mannykuzzy tried to pick your pocket in Peace Hostel Bunk 4. You caught them and slapped them! 💥",
      "from": "mannykuzzy",
      "at": 1791641777677
    }
    ```
* **Failure Penalty:** Failing a theft in a public room triggers immediate peer retaliation (Energy loss $-30$), spikes SDC Heat by $+3$, and alerts campus security.

### 7.2 Campus Brawls (Fighting)
* **Initiation:** Triggered in the Sports Centre bleachers or hostel hallways.
* **Effects:**
  * Drains Energy by $-40$.
  * Boosts Fun by $+20$ and street reputation.
  * Generates high environmental noise. If security is within range, initiates an immediate CSO confrontation.
  * Injured players receive the `"Bruised"` status (requires medical attention at the Health Centre).

### 7.3 Banned Substance Dealing
* **Action:** Purchasing contraband from off-campus and distributing to wealthy students behind the Sports Complex.
* **Yield:** Generates ₦20,000 – ₦50,000 per deal.
* **Cost:** Instantly zeroes out Devotion ($0\%$) and sets SDC Heat to $4$ Stars.
* **CSO Intercept Risk:** Every deal carries a $35\%$ base chance of an immediate armed CSO sting.

---

## 8. Disciplinary Tribunal, Sanctions & Suspension Recovery

Anchor Life enforces accountability without permanent character erasure (permadeath):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE DISCIPLINARY LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. INFRACTION: SDC Heat reaches 5 Stars OR severe crime detected.           │
│ 2. ARREST: Avatar locked; automatically routed to Administrative Block.    │
│ 3. TRIAL: SDC Committee convenes; student enters formal plea.               │
│ 4. STATUS CHANGE: Account flags change: `status = "SUSPENDED"`.             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         THE SUSPENDED STATE LOCKOUT                         │
│ • Blocked from attending lectures (CGPA decays passively).                  │
│ • Blocked from Peace, Purity, and Patience Hostels.                         │
│ • Cafeteria meal purchases disabled.                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                          RESTITUTION / CLEARANCE PATHS                      │
│ ┌────────────────────────────────────┐ ┌──────────────────────────────────┐ │
│ │ Path A: Restitution Fine           │ │ Path B: Community Labor          │ │
│ │ • Pay ₦50,000 cash fine at the     │ │ • Perform 10 minutes real-time   │ │
│ │   Senate accounts desk.            │ │   labor mini-game at the Sports  │ │
│ │ • Clears record instantly.         │ │   Centre track or Chapel grounds.│ │
│ └────────────────────────────────────┘ └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Campus Economy & Centralized Price Controls

### 9.1 Monetary Outflows & Inflows
* **Inflows:**
  * Weekly allowances (automated for Nepo Babies; conditional for Hustlers).
  * Hostel Barber side hustle (₦2,500/cut).
  * Coding/assignment assistance for peers (₦5,000/task).
  * Peer-to-peer transfers (requesting "Urgent 2k" from friends).
* **Outflows:**
  * Cafeteria meals (₦800 – ₦2,500).
  * Provision restocking at kiosks.
  * Security and porter bribes (₦2,000 – ₦15,000).
  * Restitution fines at the Admin Block.

### 9.2 Centralized Dynamic Price Controls (Inflation Index)
Following the architecture of `lagoslife.app` (`GET /gov`), in-game commodity prices are not hardcoded on the client:
* The client polls `GET /api/campus/policies` on startup.
* The backend returns a global `inflationMultiplier` controlled via the admin dashboard:

$$\text{EffectivePrice} = \text{BasePrice} \times \text{InflationMultiplier}$$

* When enabled by server administration, food prices, hostel supplies, and bribery demands increase simultaneously campus-wide, mirroring real-world economic pressures.

---

## 10. Social & Multiplayer Experience

### 10.1 Low-Bandwidth Room Presence Engine
To support massive concurrency without WebSocket connection failures on unstable mobile networks, real-time presence operates via HTTP polling:
* **The Route:** `GET /api/campus/world?venue=[venueId]`.
* **Frequency:** Polled every $1.5$ to $2.0$ seconds by active clients.
* **Payload:** Returns a lightweight array of student avatars present in that specific room:
  ```json
  [
    {
      "id": "usr_8231",
      "handle": "@MarcusLife",
      "pos": [1.2, 0.0, -0.8],
      "pose": "study",
      "appearance": { "skin": "#c68a62", "hair": "afro", "top": "#f4efe6" }
    }
  ]
  ```
* **Client Rendering:** Three.js dynamically instantiates, updates, or unmounts low-poly student avatars at those coordinates.

### 10.2 Peer-to-Peer Interaction Modal
Clicking on any visible student avatar opens a direct interaction card:
* **Send Money:** Immediate virtual cash transfer (`POST /api/social/transfer`).
* **Visit Bunk:** Teleports the player to that student's hostel room.
* **Study Streak:** Initiates a mutual 24-hour reading partner streak; maintaining daily streaks yields a $+10\%$ bonus to CGPA gains.
* **One-Tap Chat Chips:** Zero-latency quick communications:
  * *"How far? 👏"*
  * *"I dey o ✌️"*
  * *"Wetin dey happen?"*
  * *"Lend me Urgent 2k 🙏"*
* **Campus Direct Messaging:** Asynchronous student-to-student text threads (`GET /api/social/messages`).

---

## 11. Technical Architecture & Constraints

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                           BROWSER CLIENT (DEVICE)                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2D UI Overlay (Tailwind CSS, HTML DOM)                                │  │
│  │ • Top HUD (Meters, Cash, Time, Location)                              │  │
│  │ • Bottom Dock (Hostel, Buy, Campus Map, Phone)                        │  │
│  │ • Modals (Encounter Trees, Confrontations, Chat)                      │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │ Layered transparently                 │
│  ┌──────────────────────────────────▼────────────────────────────────────┐  │
│  │ Three.js WebGL Engine (Isometric Orthographic Projection)             │  │
│  │ • Macro Campus Viewport: Low-poly buildings, roads, trees             │  │
│  │ • Micro Room Viewport: Low-poly `.glb` modular furniture, avatars     │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │ Drives rendering                      │
│  ┌──────────────────────────────────▼────────────────────────────────────┐  │
│  │ Zustand State Machine (Local Client Simulation)                       │  │
│  │ • 5-Second Need Decay Tick Loop                                       │  │
│  │ • Optimistic Action Dispatcher                                        │  │
│  │ • LocalStorage Mirror (`anchor-life-save`)                            │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ Stateless HTTP REST (fetch)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STATELESS BACKEND API                            │
│  • POST /api/player/save       (Debounced save payload every 30s)           │
│  • GET  /api/campus/world      (Room presence polling every 1.5s)           │
│  • POST /api/social/transfer   (Peer-to-peer wallet mutations)              │
│  • GET  /api/campus/policies   (Global inflation & curfew configurations)   │
├─────────────────────────────────────────────────────────────────────────────┤
│                          PERSISTENCE & CACHE TIERS                          │
│  • Supabase (PostgreSQL): User profiles, ledgers, inventory, sanctions      │
│  • Upstash (Redis): High-speed venue presence sets (`venue:[id]:students`)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Phased Engineering Roadmap

### Phase 1: MVP Release (The Core Campus Loop)
* **Identity:** Mandatory login, matriculation registration, and archetype selection (Nepo Baby vs. Campus Hustler).
* **Visuals:** Isometric 3D Three.js campus map and initial 6 venues (Peace Hostel, Purity Hostel, Faculty Blocks A–E, Chapel, Cafeteria, Main Gate).
* **Simulation:** 9-stat decay tick loop, provision pantry cooking, lecture attendance, chapel services.
* **Encounters:** Chapel security sweep, basic porter contraband inspection, and gate exeat verification.
* **Networking:** Debounced state saving (`POST /save`) and room presence polling (`GET /world`).

### Phase 2: Crime, Expansion & Economy Pack
* **Illicit Systems:** Direct PvP room theft with asynchronous inbox notifications, campus brawls, and banned substance trade behind the Sports Centre.
* **Disciplinary Court:** Full SDC hearing trials at the Administrative Block, official suspension status, and 10-minute community labor restitution mini-games.
* **Off-Campus Travel:** Transit to off-campus locations (Ikeja, Yaba) through the Main Gate.
* **Centralized Price Controls:** Dynamic inflation index and administrative policy switches via `/api/campus/policies`.

---

## 13. Acceptance Criteria & Failure Conditions

1. **Academic Failure:** A student whose CGPA drops below $1.50$ receives a formal Academic Probation notice; failure to improve over the next academic cycle results in administrative withdrawal.
2. **Disciplinary Lockdown:** An avatar accumulating 5 SDC Heat stars is automatically locked out of normal gameplay and routed to the Administrative Block dock.
3. **Recovery Validation:** A suspended player cannot access any educational or residential venue until the ₦50,000 fine is recorded in the ledger or 10 real-world minutes of community labor are verified by the game engine.
4. **Offline Resilience:** If network connection drops, the local Zustand simulation continues uninterrupted; debounced state payloads queue locally and synchronize immediately upon reconnection.