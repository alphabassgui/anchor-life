# 07 — Open Conflicts & Triage Register

> **Purpose:** A single source of truth for documentation/code contradictions found in the
> Anchor Life project, so unresolved conflicts are not rediscovered from scratch each session.
> Generated from the automated contradiction audit (TASK-AUDIT-01, 2026-10-12).
>
> **⚠️ Accuracy caveat:** Line references below come from an automated audit and have NOT all been
> independently re-verified line-by-line. Treat each entry as "something flagged this here — open
> the file and confirm before acting," not as gospel. The IDs (C1–C35) match the original audit.
>
> **How to use:** When you start a phase/task, check the "Blocks" column for conflicts tied to it,
> resolve them in context, record the choice on the `Decision:` line, and move the entry to RESOLVED.
> Do NOT batch-resolve open design decisions ahead of their phase — decide them when you have the
> surrounding context.

---

## RESOLVED (do not re-open)

| ID | What it was | Resolution |
|----|-------------|------------|
| C1 | Vital model: 4-vital (CLAUDE.md, API save payload) vs 6-need/9-stat (schema, PRD, globals.css) | **6-need/9-stat is canonical.** Schema unchanged (source of truth). CLAUDE.md invariant 3 and `04_API_CONTRACT.md` save/state payloads corrected to the six real need columns (hunger, energy, hygiene, bladder, fun, social) + cgpa/devotion/sdc_heat. |
| C2 | `faculty` NOT NULL column but register route never sent it → every registration 500s | Route now includes `faculty` in the students INSERT. |
| C3 | API contract department examples ("Computer Science") rejected by route's old 3-faculty check | Route now validates the real 7-faculty / department map. (Doc comment `04_API_CONTRACT.md:74` still pending — see OPEN / doc cleanups.) |
| C4 | Route requires `assignedHostel`; contract omits it / says server assigns | Kept client-sends-`assignedHostel` + server validates against gender. Contract doc to be reconciled at next contract edit. |
| C35 | Schema `department DEFAULT 'Computer Science'` effectively dead; column semantics muddled | Route always supplies `department` explicitly; default not relied upon. (Default left in schema; harmless.) |

---

## OPEN — BLOCKS A SPECIFIC PHASE (resolve when that phase begins)

Each needs a decision IN CONTEXT. `Decision:` left blank intentionally.

### C5 — RLS enabled, no policy on `student_items` and `financial_ledger` (deny-all)
- **Files:** `02_SCHEMA.sql:448,450` enable RLS; policies `:453-461` cover only four other tables.
- **Effect:** All non-service-role access to these two tables is denied until a policy migration is added.
- **Blocks:** Phase 2 (inventory) for `student_items`; whichever phase reads/writes `financial_ledger` client-side.
- **Decision:**

### C6 — `sanitize_student_spawn_location()` defined but never attached; targets unseeded venues
- **Files:** function `02_SCHEMA.sql:404-417`; no `CREATE TRIGGER` for it. Body references `main_roundabout` / `plaza_bench_01`, neither in the `campus_venues` seed `:471-483`.
- **Effect:** Documented cross-hostel eviction never fires.
- **Blocks:** Phase 5 (eviction / spawn logic).
- **Decision:**

### C9 — Bribery formula differs three ways (base term + clamp floor)
- **Files:** `01_PRD.md:246-248` vs `03_GAME_ENGINE.md:208,228` vs `06_TASKS.md:252`. Clamp floor 0.05 vs 0.10; term sets differ (OffenseLevel term present/absent; per-authority base).
- **Blocks:** Bribery / CSO-encounter mechanics phase.
- **Decision:**

### C12 — SDC Heat gain on theft detection: +3 vs +2
- **Files:** `01_PRD.md:366` (+3) vs `03_GAME_ENGINE.md:317` / `04_API_CONTRACT.md:434` (+2).
- **Blocks:** PvP theft resolution phase.
- **Decision:**

### C13 — Banned-substance dealing heat: 4 vs 5 stars
- **Files:** `01_PRD.md:379` (set to 4) vs `03_GAME_ENGINE.md:319` (+5 / immediate max).
- **Blocks:** Contraband / dealing mechanics phase.
- **Decision:**

### C14 — CSO bribe demand (₦25,000) exceeds stated bribe range (₦2,000–₦15,000)
- **Files:** `01_PRD.md:256,425` (range) vs `03_GAME_ENGINE.md:217` (₦25,000 base demand).
- **Blocks:** Bribery mechanics phase.
- **Decision:**

### C11 — PvP theft loot %: "up to 20%" vs 15%–35%
- **Files:** `01_PRD.md:354` vs `03_GAME_ENGINE.md:271` / `06_TASKS.md:337`.
- **Blocks:** PvP theft phase.
- **Decision:**

### C17 — Anti-cheat CGPA delta cap (>0.08 reject) vs a legitimate +0.12 gain
- **Files:** cap `04_API_CONTRACT.md:271,291` / ARCHITECTURE.md:91; PRD surprise-test gain `01_PRD.md:339-340` (+0.12); `03_GAME_ENGINE.md:113` lists +0.08 max. A legit event would be rejected by the cap.
- **Blocks:** Academic mechanics + save-validation phase.
- **Decision:**

### C15 — Campus Hustler allowance: flat ₦5,000 vs tiered ₦10k/₦5k/₦2k
- **Files:** `01_PRD.md:34` vs `03_GAME_ENGINE.md:340-344`.
- **Blocks:** Economy / allowance phase.
- **Decision:**

### C23 — Devotion recovery: restore-to-100 vs increments (+20/+15)
- **Files:** `01_PRD.md:89` vs `03_GAME_ENGINE.md:113-114`.
- **Blocks:** Chapel / devotion mechanics phase.
- **Decision:**

### C24 — Coding-gig / assignment payout: ₦5,000 flat vs ₦4,000–₦7,500
- **Files:** `01_PRD.md:420` vs `03_GAME_ENGINE.md:354`.
- **Blocks:** Side-hustle economy phase.
- **Decision:**

### C8 — Community-labor duration: 10 vs 15 minutes
- **Files:** 10 → `01_PRD.md:405-406,528,538` / `06_TASKS.md:269` / AGENTS.md:28. 15 → CLAUDE.md §5 / `03_GAME_ENGINE.md:303` / `04_API_CONTRACT.md:574`.
- **Blocks:** TASK-503 (per original backlog note).
- **Decision:**

---

## OPEN — RENDERING / 3D (resolve at the Three.js phases)

### C16 — Camera position: prose/diagram (20,20,20) vs code (30,30,30)
- **Files:** `05_DESIGN_SYSTEM.md:106-107,571` / ARCHITECTURE.md:114 / AGENTS.md:73 / `06_TASKS.md:144` (20,20,20) vs `05_DESIGN_SYSTEM.md:135-137` (30,30,30).
- **Blocks:** TASK-105/106 (GameCanvas / camera).
- **Decision:**

### C22 — Camera zoom model: frustum-size steps vs CamZoom formula
- **Files:** `05_DESIGN_SYSTEM.md:125,146-150` (frustumSize 14, responsive) vs `03_GAME_ENGINE.md:187-188` (CamZoom = clamp(35,60,width/16)).
- **Blocks:** Camera phase.
- **Decision:**

### C21 — Interior/venue triangle budget: 15,000 vs 18,000
- **Files:** ARCHITECTURE.md:115 (<15,000 interior) vs `05_DESIGN_SYSTEM.md:203` (≤18,000 venue).
- **Blocks:** Asset-pipeline / venue-modeling phase.
- **Decision:**

### C19 — Animation clip count "6" vs 7; brawl inconsistently included
- **Files:** `05_DESIGN_SYSTEM.md:252` says 6 but table `:254-262` lists 7 (incl. brawl); `06_TASKS.md:172` binds 6 (no brawl) while `04_API_CONTRACT.md:213` heartbeat pose includes 'brawl'.
- **Blocks:** TASK-106 (avatar animation binding).
- **Decision:**

### C25 — `shoes` appearance field only in Design System, absent elsewhere
- **Files:** `05_DESIGN_SYSTEM.md:210-215,243-244` has shoes/Mesh_Shoes; absent from schema appearance default `02_SCHEMA.sql:104-113`, RegisterStudentRequest.appearance `04_API_CONTRACT.md:76-85`, presence appearance `:170-177`.
- **Blocks:** Avatar customizer (103b appearance) AND TASK-106 mesh — **relevant soon** if the 103b avatar customizer is built.
- **Decision:**

---

## OPEN — API / ENDPOINT CONSISTENCY (resolve when those endpoints are built)

### C10 — Register success response shape: `{student{...}, token}` vs `{studentId}`
- **Files:** `04_API_CONTRACT.md:89-111` vs `route.ts:257-261`.
- **Note:** Relevant to 103b wiring (what the UI reads on 201). Current route returns `{ success, data:{ studentId }, timestamp }`. Decide whether 103b needs more than `studentId`, and whether to reconcile the contract doc to the route or vice versa.
- **Decision:**

### C18 — P2P endpoint paths: `/api/social/*` vs `/api/p2p/*`
- **Files:** `01_PRD.md:461,469,506` (social) vs `04_API_CONTRACT.md:377,413` / ARCHITECTURE.md:63 (p2p).
- **Blocks:** P2P transfer/theft phase.
- **Decision:**

### C20 — ResolveEncounter enum subset vs schema
- **Files:** schema `offense_type` 8 values / `authority_figure` 5 `02_SCHEMA.sql:40-57`; contract `04_API_CONTRACT.md:507-508` allows only 5 offenses / 4 authorities (drops cross_hostel_trespass, hostel_theft, exam_malpractice, lecturer).
- **Blocks:** Encounter-resolution endpoint phase.
- **Decision:**

### C29 — Inbox timestamp units: ms vs s
- **Files:** `01_PRD.md:363` (ms) vs `03_GAME_ENGINE.md:280` (s).
- **Blocks:** Inbox phase (TASK-4xx).
- **Decision:**

### C30 — PRD inbox JSON omits required `title`
- **Files:** `01_PRD.md:357-364` (no title) vs schema `02_SCHEMA.sql:256` `title NOT NULL`.
- **Blocks:** Inbox phase.
- **Decision:**

### C31 — Redis "sets" vs "sorted sets"
- **Files:** sorted set → CLAUDE.md §2.1 / `04_API_CONTRACT.md:158` / AGENTS.md:16; plain set → `04_API_CONTRACT.md:51` / ARCHITECTURE.md:16,68.
- **Blocks:** Presence/Redis phase.
- **Decision:**

### C34 — MVP venue list (6, lists Purity not Patience) vs catalog (9) vs seed (10)
- **Files:** `01_PRD.md:521` vs `01_PRD.md:139-198` vs `02_SCHEMA.sql:471-483`.
- **Blocks:** Venue/scene scope decisions.
- **Decision:**

---

## OPEN — CHEAP DOC CLEANUPS (fix anytime, low stakes)

| ID | Issue | Files |
|----|-------|-------|
| C7 | TASK-101 lists `venue_presence` among tables / "12 names" but schema has 11 and presence is Redis-only | `06_TASKS.md:64,67` vs schema |
| C26 | Docs say "Next.js 15"; actual is 16 (CLAUDE.md already resolves this) | PRD:6, API:4, TASKS:5, ARCH:5, AGENTS:5 |
| C27 | AGENTS.md references `02_SCHEMA.md`; actual file is `02_SCHEMA.sql` | AGENTS.md:48,133 |
| C28 | CLAUDE.md §3 says ARCHITECTURE.md/AGENTS.md live "in .docs/"; they're at repo root | CLAUDE.md §3 |
| C32 | Migration comment says "longest faculty = 44 chars"; actual longest ("...Social And Management Science") is 39 | `20261012000000_add_faculty_column.sql:30` |
| C33 | "8×8 grid" diagram draws only 4 rows (0–3) | `03_GAME_ENGINE.md:148,152-159` |
| C3-doc | `04_API_CONTRACT.md:74` department comment still shows old major examples; model is now faculty+department | `04_API_CONTRACT.md:74` |

---

## COUNTS (from original audit)
- Resolved: C1, C2, C3, C4, C35 (5)
- Open blockers-by-phase + rendering + API: ~23
- Cheap doc cleanups: ~7
- Original audit severity tally: BLOCKER 7 · MEDIUM 18 · LOW 10
