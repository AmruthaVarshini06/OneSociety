-- ========================================================
-- OneSociety Supabase PostgreSQL Schema
-- Schema for Supabase PostgreSQL
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Societies
CREATE TABLE IF NOT EXISTS societies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Blocks
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Flats
CREATE TABLE IF NOT EXISTS flats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
    number VARCHAR(20) NOT NULL,
    floor INTEGER DEFAULT 1,
    is_at_home BOOLEAN DEFAULT TRUE,
    at_home_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    away_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_id, number)
);

-- 4. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL, -- resident, president, guard, supplier, provider_internal, provider_external, delivery_partner
    society_id UUID REFERENCES societies(id) ON DELETE SET NULL,
    flat_id UUID REFERENCES flats(id) ON DELETE SET NULL,
    must_change_password BOOLEAN DEFAULT FALSE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference_id UUID,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Escrow Entries
CREATE TABLE IF NOT EXISTS escrow_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL, -- HOLD, RELEASE, REFUND, DEDUCT
    amount_paise BIGINT NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    reference_id UUID,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(30) DEFAULT 'CONFIRMED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Group Orders
CREATE TABLE IF NOT EXISTS group_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    unit_name VARCHAR(50) DEFAULT 'kg',
    status VARCHAR(50) DEFAULT 'DEMAND_OPEN',
    demand_close_at TIMESTAMP WITH TIME ZONE,
    offers_close_at TIMESTAMP WITH TIME ZONE,
    payment_close_at TIMESTAMP WITH TIME ZONE,
    pricing_tiers JSONB DEFAULT '[]'::jsonb,
    selected_supplier_id UUID,
    selected_tier_price_paise BIGINT DEFAULT 0,
    total_demanded_quantity NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Demand Items
CREATE TABLE IF NOT EXISTS demand_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_order_id UUID REFERENCES group_orders(id) ON DELETE CASCADE,
    flat_id UUID REFERENCES flats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_order_id, flat_id)
);

-- 9. Commitments
CREATE TABLE IF NOT EXISTS commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_order_id UUID REFERENCES group_orders(id) ON DELETE CASCADE,
    flat_id UUID REFERENCES flats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    total_amount_paise BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    receipt_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_order_id, flat_id)
);

-- 10. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    gstin VARCHAR(50),
    status VARCHAR(50) DEFAULT 'APPROVED',
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Delivery Passes
CREATE TABLE IF NOT EXISTS delivery_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_order_id UUID REFERENCES group_orders(id) ON DELETE CASCADE,
    flat_id UUID REFERENCES flats(id) ON DELETE CASCADE,
    qr_token TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_order_id, flat_id)
);

-- 12. Rental Items
CREATE TABLE IF NOT EXISTS rental_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    flat_id UUID REFERENCES flats(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    age_years NUMERIC DEFAULT 1,
    condition VARCHAR(50) DEFAULT 'GOOD',
    hourly_rate_paise BIGINT DEFAULT 0,
    daily_rate_paise BIGINT DEFAULT 0,
    safe_deposit_paise BIGINT DEFAULT 0,
    ai_verified BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Rental Bookings
CREATE TABLE IF NOT EXISTS rental_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    item_id UUID REFERENCES rental_items(id) ON DELETE CASCADE,
    renter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    renter_flat_id UUID REFERENCES flats(id) ON DELETE CASCADE,
    owner_flat_id UUID REFERENCES flats(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'REQUESTED',
    billing_unit VARCHAR(20) DEFAULT 'HOURS',
    booked_units INTEGER DEFAULT 1,
    rate_per_unit_paise BIGINT DEFAULT 0,
    charge_paise BIGINT DEFAULT 0,
    safe_deposit_paise BIGINT DEFAULT 0,
    total_escrow_paise BIGINT DEFAULT 0,
    start_at TIMESTAMP WITH TIME ZONE,
    expected_end_at TIMESTAMP WITH TIME ZONE,
    actual_start_at TIMESTAMP WITH TIME ZONE,
    effective_end_at TIMESTAMP WITH TIME ZONE,
    pickup_photos JSONB DEFAULT '[]'::jsonb,
    return_photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Service Providers
CREATE TABLE IF NOT EXISTS service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_type VARCHAR(50) DEFAULT 'PERMANENT', -- TEMPORARY, PERMANENT
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    category VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'VERIFIED',
    hourly_rate_paise BIGINT DEFAULT 0,
    daily_rate_paise BIGINT DEFAULT 0,
    monthly_rate_paise BIGINT DEFAULT 0,
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Service Agreements
CREATE TABLE IF NOT EXISTS service_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    seeker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    flat_code VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    rate_paise BIGINT NOT NULL,
    frequency VARCHAR(50) DEFAULT 'RECURRING',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    schedule JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Service Visits
CREATE TABLE IF NOT EXISTS service_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID REFERENCES service_agreements(id) ON DELETE CASCADE,
    seeker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    flat_code VARCHAR(50) NOT NULL,
    scheduled_date DATE NOT NULL,
    time_slot JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Issue Clusters & Complaints
CREATE TABLE IF NOT EXISTS issue_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'NEW',
    assigned_vendor_id UUID,
    cost_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES issue_clusters(id) ON DELETE SET NULL,
    resident_id UUID REFERENCES users(id) ON DELETE CASCADE,
    flat_code VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    rating NUMERIC DEFAULT 4.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Gate Security (QR Passes & Events)
CREATE TABLE IF NOT EXISTS qr_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    pass_type VARCHAR(50) NOT NULL, -- FAMILY, PRESIDENT, SERVICE_PROVIDER, VISITOR, EVENT_GUEST
    pass_code VARCHAR(100) UNIQUE NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    flat_code VARCHAR(50),
    visitor_name VARCHAR(255),
    visitor_phone VARCHAR(50),
    purpose VARCHAR(255),
    expected_people INTEGER DEFAULT 1,
    people_currently_inside INTEGER DEFAULT 0,
    people_entered_total INTEGER DEFAULT 0,
    people_exited_total INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    service_category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gate_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    pass_id UUID REFERENCES qr_passes(id) ON DELETE SET NULL,
    pass_code VARCHAR(100) NOT NULL,
    pass_type VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL, -- ENTRY, EXIT
    count INTEGER NOT NULL DEFAULT 1,
    guard_name VARCHAR(255) NOT NULL,
    flat_code VARCHAR(50),
    owner_name VARCHAR(255) NOT NULL,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manual_visitor_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    visitor_type VARCHAR(50) NOT NULL, -- VISITOR, DELIVERY
    visitor_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    vehicle_number VARCHAR(50),
    flat_code VARCHAR(50) NOT NULL,
    purpose VARCHAR(255),
    delivery_company VARCHAR(100),
    in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    out_time TIMESTAMP WITH TIME ZONE,
    people_count INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'ALLOWED', -- ALLOWED, DENIED, EXITED
    accepted_parcel_at_gate BOOLEAN DEFAULT FALSE,
    guard_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Maintenance Dues & Ledger
CREATE TABLE IF NOT EXISTS maintenance_dues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    resident_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    flat_code VARCHAR(50) NOT NULL,
    billing_month VARCHAR(20) NOT NULL, -- YYYY-MM
    amount_paise BIGINT NOT NULL DEFAULT 250000,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE
    paid_amount_paise BIGINT,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_mode VARCHAR(50),
    receipt_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(flat_code, billing_month)
);

CREATE TABLE IF NOT EXISTS maintenance_ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    entry_number VARCHAR(100) NOT NULL,
    entry_type VARCHAR(50) NOT NULL, -- INCOME, EXPENSE
    transaction_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount_paise BIGINT NOT NULL,
    payee_or_payer VARCHAR(255) NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'ONLINE',
    description TEXT,
    proof_photos JSONB DEFAULT '[]'::jsonb,
    balance_after_paise BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    ledger_entry_id UUID REFERENCES maintenance_ledgers(id) ON DELETE CASCADE,
    resident_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resident_flat_code VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    president_reply TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Community Events & Emergency SOS
CREATE TABLE IF NOT EXISTS community_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    daily_time_from VARCHAR(20),
    daily_time_to VARCHAR(20),
    host_flat_code VARCHAR(50) NOT NULL,
    estimated_visitors INTEGER DEFAULT 10,
    has_loud_sound BOOLEAN DEFAULT FALSE,
    is_quiet_hours_flagged BOOLEAN DEFAULT FALSE,
    guest_pass_code VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emergency_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    flat_code VARCHAR(50) NOT NULL,
    resident_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, ACKNOWLEDGED, RESOLVED, CANCELLED
    notes TEXT,
    acknowledged_by_guard_id UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_society_role ON users(society_id, role);
CREATE INDEX IF NOT EXISTS idx_flats_society_block ON flats(society_id, block_id);
CREATE INDEX IF NOT EXISTS idx_qr_passes_code ON qr_passes(pass_code);
CREATE INDEX IF NOT EXISTS idx_gate_events_scanned ON gate_events(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_ledger_date ON maintenance_ledgers(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
