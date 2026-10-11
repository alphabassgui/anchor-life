-- ============================================================================
-- ANCHOR LIFE: HARDENED DATABASE SCHEMA
-- File: .docs/02_SCHEMA.sql
-- Dialect: PostgreSQL 15+ (Optimized for Supabase & Next.js App Router)
-- Description: Hardened schema with anti-cheat controls, combat-logging locks,
--              PvP victim shields, offline catch-up timestamps, non-permadeath
--              indigent suspension pardon loops, and cross-hostel relocation triggers.
-- NOTE: Ephemeral presence coordinates are delegated to Upstash Redis to prevent
--       PostgreSQL MVCC table bloat.
-- ============================================================================

-- 0. EXTENSIONS & SETUP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMS & DOMAIN TYPES
-- ============================================================================

CREATE TYPE student_archetype AS ENUM (
    'nepo_baby',       -- Ajebutter: ₦150k start, high allowance, low need resilience
    'campus_hustler'   -- Trenches: ₦2.5k start, low allowance, +20% Hustle XP, high resilience
);

CREATE TYPE student_status AS ENUM (
    'good_standing',   -- Normal campus privileges
    'probation',       -- Academic probation (CGPA < 1.50)
    'suspended',       -- Banned from lectures & cafeteria; requires fine/labor to lift
    'expelled'         -- Disciplinary lockout
);

CREATE TYPE gender_type AS ENUM ('male', 'female');

CREATE TYPE hostel_id AS ENUM (
    'peace_hostel',    -- Male hostel exclusively
    'purity_hostel',   -- Female hostel exclusively
    'patience_hostel'  -- Female hostel exclusively
);

CREATE TYPE authority_figure AS ENUM (
    'CSO',             -- Chief Security Officer
    'hall_warden',     -- Hostel inspections & room raids
    'porter',          -- Hostel gate curfew & noise control
    'security_guard',  -- Main gate exeat checks
    'lecturer'         -- Class attendance & CA
);

CREATE TYPE offense_type AS ENUM (
    'chapel_absence',
    'contraband_possession',
    'curfew_breach',
    'cross_hostel_trespass',
    'hostel_theft',
    'fighting',
    'banned_substance_dealing',
    'exam_malpractice'
);

CREATE TYPE resolution_method AS ENUM (
    'bribe_accepted',
    'bribe_failed',
    'sdc_surrender',
    'restitution_fine_paid',
    'community_labor_completed',
    'indigent_pardon_granted',
    'combat_log_forfeit'
);

CREATE TYPE inbox_item_kind AS ENUM (
    'crime',           -- Direct PvP theft notifications
    'sanction',        -- SDC summons and demerits
    'transfer',        -- Peer-to-peer cash transfers
    'allowance',       -- Parental bank drops
    'streak',          -- Reading partner streak updates
    'admin_notice'     -- Campus circulars
);

CREATE TYPE item_storage_slot AS ENUM (
    'inventory',       -- On person
    'mattress',        -- Under bunk mattress (Medium stealth)
    'locker',          -- Inside plastic locker (High stealth)
    'room_floor'       -- Placed as 3D prop
);

-- ============================================================================
-- 2. STUDENT PROFILES & AUTHENTICATION (HARDENED)
-- ============================================================================

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- Supabase auth.users(id)
    matric_number VARCHAR(24) UNIQUE NOT NULL,
    handle VARCHAR(32) UNIQUE NOT NULL,
    full_name VARCHAR(96) NOT NULL,
    gender gender_type NOT NULL,
    department VARCHAR(64) NOT NULL DEFAULT 'Computer Science',
    level INT NOT NULL DEFAULT 100 CHECK (level IN (100, 200, 300, 400)),
    archetype student_archetype NOT NULL DEFAULT 'campus_hustler',
    status student_status NOT NULL DEFAULT 'good_standing',
    assigned_hostel hostel_id NOT NULL,
    bunk_number VARCHAR(16) NOT NULL DEFAULT 'Bunk 01',

    -- Visual 3D Avatar Customization (Modular GLB tinting)
    appearance JSONB NOT NULL DEFAULT '{
        "body": "m",
        "style": "smart",
        "skin": "#8d5524",
        "hair": "afro",
        "hairColor": "#1a1a1a",
        "outfit": "corporate_tie",
        "top": "#ffffff",
        "bottom": "#1d2433"
    }'::JSONB,

    -- Financial Balances (in Naira ₦)
    wallet_balance BIGINT NOT NULL DEFAULT 2500 CHECK (wallet_balance >= 0),
    bank_balance BIGINT NOT NULL DEFAULT 0 CHECK (bank_balance >= 0),
    allowance_due_day INT NOT NULL DEFAULT 1,

    -- Disciplinary State & Anti-Griefing Shields
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    suspension_reason TEXT,
    restitution_fine_owed BIGINT NOT NULL DEFAULT 0,
    community_labor_minutes_remaining INT NOT NULL DEFAULT 0,
    indigent_labor_granted BOOLEAN NOT NULL DEFAULT FALSE,

    -- Combat Logging & Active Encounter Guard
    active_encounter_id UUID,
    active_encounter_expires_at TIMESTAMPTZ,

    -- PvP Theft Shield (Prevents chain-robbing victim down to ₦0)
    theft_immunity_until TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Offline Catch-Up & Wall-Clock Tracking
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_matric ON students(matric_number);
CREATE INDEX idx_students_handle ON students(handle);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_theft_shield ON students(theft_immunity_until);

-- ============================================================================
-- 3. THE 9-STAT SIMULATION & NEED STATE (HARDENED)
-- ============================================================================

CREATE TABLE student_simulation_states (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,

    -- Core Needs Meters (Decay clamped between 0.00 and 100.00)
    hunger NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (hunger BETWEEN 0.00 AND 100.00),
    energy NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (energy BETWEEN 0.00 AND 100.00),
    hygiene NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (hygiene BETWEEN 0.00 AND 100.00),
    bladder NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (bladder BETWEEN 0.00 AND 100.00),
    fun NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (fun BETWEEN 0.00 AND 100.00),
    social NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (social BETWEEN 0.00 AND 100.00),

    -- Academic & Spiritual Meters
    cgpa NUMERIC(3, 2) NOT NULL DEFAULT 3.50 CHECK (cgpa BETWEEN 0.00 AND 5.00),
    devotion NUMERIC(5, 2) NOT NULL DEFAULT 85.00 CHECK (devotion BETWEEN 0.00 AND 100.00),
    
    -- Disciplinary Threat Meter
    sdc_heat INT NOT NULL DEFAULT 0 CHECK (sdc_heat BETWEEN 0 AND 5),

    -- Skills Matrix (0.00 - 10.00)
    skill_coding NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    skill_charisma NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    skill_fitness NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    skill_hustle NUMERIC(4, 2) NOT NULL DEFAULT 0.00,

    -- Spatial Position (Last confirmed persistent venue)
    current_venue VARCHAR(48) NOT NULL DEFAULT 'peace_hostel',
    spot_id VARCHAR(32) DEFAULT 'bunk_01',
    current_pose VARCHAR(24) NOT NULL DEFAULT 'idle',
    is_sleeping BOOLEAN NOT NULL DEFAULT FALSE,

    -- Temporary Status Buffs/Debuffs (Moodlets)
    moodlets JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Simulation Clock & Anti-Tamper Ticks
    sim_time_minutes BIGINT NOT NULL DEFAULT 0,
    last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. CAMPUS VENUES CATALOG
-- ============================================================================

CREATE TABLE campus_venues (
    id VARCHAR(48) PRIMARY KEY,
    name VARCHAR(96) NOT NULL,
    building_category VARCHAR(32) NOT NULL,
    gender_restriction gender_type,          -- NULL = co-ed, 'male' = Peace Hostel only
    max_capacity INT NOT NULL DEFAULT 60,
    curfew_start_hour INT,
    curfew_end_hour INT,
    scene_model_url TEXT NOT NULL
);

-- ============================================================================
-- 5. HOSTEL ROOM GRID & INVENTORY / CONTRABAND
-- ============================================================================

CREATE TABLE item_catalog (
    id VARCHAR(48) PRIMARY KEY,
    name VARCHAR(96) NOT NULL,
    category VARCHAR(32) NOT NULL,
    base_price BIGINT NOT NULL,
    grid_w INT NOT NULL DEFAULT 1,
    grid_d INT NOT NULL DEFAULT 1,
    is_contraband BOOLEAN NOT NULL DEFAULT FALSE,
    contraband_heat_penalty INT NOT NULL DEFAULT 0,
    permitted_actions JSONB NOT NULL DEFAULT '[]'::JSONB,
    model_asset_key VARCHAR(64) NOT NULL
);

CREATE TABLE student_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    item_id VARCHAR(48) NOT NULL REFERENCES item_catalog(id),
    slot item_storage_slot NOT NULL DEFAULT 'inventory',
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    grid_x INT,
    grid_y INT,
    rotation INT DEFAULT 0 CHECK (rotation BETWEEN 0 AND 3),
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_items_student_slot ON student_items(student_id, slot);

-- ============================================================================
-- 6. DIRECT PVP CRIME, THEFT & INBOX ENGINE (HARDENED)
-- ============================================================================

CREATE TABLE pvp_theft_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thief_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    victim_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    venue_id VARCHAR(48) NOT NULL REFERENCES campus_venues(id),
    target_slot item_storage_slot NOT NULL,
    amount_stolen BIGINT NOT NULL DEFAULT 0,
    was_detected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_theft_distinct_users CHECK (thief_id <> victim_id)
);

CREATE INDEX idx_pvp_theft_victim ON pvp_theft_logs(victim_id, created_at DESC);

CREATE TABLE student_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    from_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    kind inbox_item_kind NOT NULL,
    title VARCHAR(96) NOT NULL,
    body TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_inbox_unread ON student_inbox(student_id, is_read, created_at DESC);

-- ============================================================================
-- 7. DISCIPLINARY ENCOUNTERS & SDC TRIBUNALS
-- ============================================================================

CREATE TABLE disciplinary_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    authority authority_figure NOT NULL,
    offense offense_type NOT NULL,
    location_id VARCHAR(48) NOT NULL REFERENCES campus_venues(id),
    resolution resolution_method NOT NULL,
    bribe_paid BIGINT NOT NULL DEFAULT 0,
    sdc_heat_before INT NOT NULL,
    sdc_heat_after INT NOT NULL,
    demerit_issued BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sdc_tribunal_hearings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    case_number VARCHAR(32) UNIQUE NOT NULL,
    primary_offense offense_type NOT NULL,
    verdict student_status NOT NULL,
    restitution_fine BIGINT NOT NULL DEFAULT 0,
    community_labor_minutes INT NOT NULL DEFAULT 0,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. AUDITABLE FINANCIAL LEDGER & ANTI-CHEAT
-- ============================================================================

CREATE TABLE financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    transaction_kind VARCHAR(48) NOT NULL,
    amount BIGINT NOT NULL,                -- Positive = inflow, Negative = outflow
    running_balance BIGINT NOT NULL,
    reference_id VARCHAR(64),
    narrative TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_ledger_student ON financial_ledger(student_id, created_at DESC);

-- ============================================================================
-- 9. GLOBAL POLICIES & CENTRALIZED PRICE CONTROLS
-- ============================================================================

CREATE TABLE campus_global_policies (
    id INT PRIMARY KEY DEFAULT 1,
    campus_name VARCHAR(64) NOT NULL DEFAULT 'Anchor University Lagos',
    inflation_index NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    chapel_check_active BOOLEAN NOT NULL DEFAULT FALSE,
    hostel_raid_active BOOLEAN NOT NULL DEFAULT FALSE,
    main_gate_strict_exeat BOOLEAN NOT NULL DEFAULT TRUE,
    daily_gem_hunt_prize BIGINT NOT NULL DEFAULT 5000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row_policy_check CHECK (id = 1)
);

-- ============================================================================
-- 10. STORED FUNCTIONS & ANTI-CHEAT PROCEDURES
-- ============================================================================

-- Function 1: Atomic PvP Theft with 60-Minute Victim Immunity Shield
CREATE OR REPLACE FUNCTION execute_pvp_theft(
    p_thief_id UUID,
    p_victim_id UUID,
    p_venue_id VARCHAR(48),
    p_steal_percentage NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_victim_wallet BIGINT;
    v_stolen_amount BIGINT;
    v_thief_wallet BIGINT;
    v_immunity_until TIMESTAMPTZ;
BEGIN
    -- 1. Deterministic lock order to prevent deadlocks
    IF p_thief_id < p_victim_id THEN
        PERFORM pg_advisory_xact_lock(hashtext(p_thief_id::text));
        PERFORM pg_advisory_xact_lock(hashtext(p_victim_id::text));
    ELSE
        PERFORM pg_advisory_xact_lock(hashtext(p_victim_id::text));
        PERFORM pg_advisory_xact_lock(hashtext(p_thief_id::text));
    END IF;

    -- 2. Check victim theft immunity shield
    SELECT wallet_balance, theft_immunity_until 
    INTO v_victim_wallet, v_immunity_until 
    FROM students WHERE id = p_victim_id FOR UPDATE;

    IF v_immunity_until > NOW() THEN
        RAISE EXCEPTION 'VICTIM_HAS_THEFT_IMMUNITY';
    END IF;

    IF v_victim_wallet < 200 THEN
        RAISE EXCEPTION 'TARGET_IS_BROKE';
    END IF;

    -- 3. Calculate Loot & Mutate Wallets
    v_stolen_amount := ROUND(v_victim_wallet * p_steal_percentage);

    UPDATE students 
    SET wallet_balance = wallet_balance - v_stolen_amount,
        theft_immunity_until = NOW() + INTERVAL '60 minutes' -- 60m shield applied!
    WHERE id = p_victim_id;

    UPDATE students 
    SET wallet_balance = wallet_balance + v_stolen_amount 
    WHERE id = p_thief_id 
    RETURNING wallet_balance INTO v_thief_wallet;

    -- 4. Audit Log & Victim Inbox
    INSERT INTO pvp_theft_logs (thief_id, victim_id, venue_id, target_slot, amount_stolen, was_detected)
    VALUES (p_thief_id, p_victim_id, p_venue_id, 'inventory', v_stolen_amount, TRUE);

    INSERT INTO student_inbox (student_id, from_student_id, kind, title, body)
    VALUES (
        p_victim_id,
        p_thief_id,
        'crime',
        'Hostel Pickpocket Alert! 🚨',
        'Caught a coursemate slipping hands into your pocket! Stolen: ₦' || v_stolen_amount || '. You have gained a 60-min street immunity shield.'
    );

    RETURN jsonb_build_object(
        'success', true,
        'stolenAmount', v_stolen_amount,
        'newThiefBalance', v_thief_wallet
    );
END;
$$ LANGUAGE plpgsql;

-- Function 2: Cross-Hostel Login Guard (Evicts male students from female hostels on boot)
CREATE OR REPLACE FUNCTION sanitize_student_spawn_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.gender = 'male' AND NEW.assigned_hostel = 'peace_hostel' THEN
        -- If current venue in simulation state points to female hostel, force relocation
        UPDATE student_simulation_states
        SET current_venue = 'main_roundabout',
            spot_id = 'plaza_bench_01'
        WHERE student_id = NEW.id 
          AND current_venue IN ('purity_hostel', 'patience_hostel');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Auto-Lift Suspension when fine or labor is cleared
CREATE OR REPLACE FUNCTION check_suspension_lift()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_suspended = TRUE THEN
        IF (NEW.restitution_fine_owed <= 0 AND NEW.community_labor_minutes_remaining <= 0)
           OR NEW.indigent_labor_granted = TRUE THEN
            NEW.is_suspended := FALSE;
            NEW.status := 'good_standing';
            NEW.suspension_reason := NULL;
            NEW.restitution_fine_owed := 0;
            NEW.community_labor_minutes_remaining := 0;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_lift_suspension
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION check_suspension_lift();

-- ============================================================================
-- 11. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_simulation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_global_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public student directory" ON students FOR SELECT USING (true);
CREATE POLICY "Users update self profile" ON students FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users own sim state" ON student_simulation_states FOR ALL USING (
    student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Private student inbox" ON student_inbox FOR ALL USING (
    student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Public campus policies" ON campus_global_policies FOR SELECT USING (true);

-- ============================================================================
-- 12. SEED INITIAL DATA
-- ============================================================================

INSERT INTO campus_global_policies (id, campus_name, inflation_index)
VALUES (1, 'Anchor University Lagos', 1.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO campus_venues (id, name, building_category, gender_restriction, max_capacity, curfew_start_hour, curfew_end_hour, scene_model_url)
VALUES
('peace_hostel', 'Peace Hostel (Male)', 'hostel', 'male', 80, 21, 5, '/assets/venues/peace_hostel.glb'),
('purity_hostel', 'Purity Hostel (Female)', 'hostel', 'female', 80, 21, 5, '/assets/venues/purity_hostel.glb'),
('patience_hostel', 'Patience Hostel (Female)', 'hostel', 'female', 80, 21, 5, '/assets/venues/patience_hostel.glb'),
('faculty_complex', 'Faculty Blocks A–E', 'academic', NULL, 120, 18, 7, '/assets/venues/faculty_complex.glb'),
('chapel', 'University Chapel', 'spiritual', NULL, 250, 22, 5, '/assets/venues/chapel.glb'),
('cafeteria', 'Student Cafeteria', 'lifestyle', NULL, 90, 21, 6, '/assets/venues/cafeteria.glb'),
('sports_centre', 'Sports Centre & Track', 'lifestyle', NULL, 100, 19, 6, '/assets/venues/sports_centre.glb'),
('main_gate', 'Main Gate Security Post', 'lifestyle', NULL, 30, NULL, NULL, '/assets/venues/main_gate.glb'),
('admin_block', 'Administrative Block & SDC', 'academic', NULL, 40, 17, 8, '/assets/venues/admin_block.glb'),
('health_centre', 'Campus Health Centre', 'lifestyle', NULL, 30, NULL, NULL, '/assets/venues/health_centre.glb')
ON CONFLICT (id) DO NOTHING;