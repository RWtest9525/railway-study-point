-- =====================================================
-- COMPLETE SCHEMA FIX - All Tables and Columns
-- This migration ensures all required tables and columns exist
-- Created: 2026-04-07
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    premium_until TIMESTAMPTZ,
    premium_started_at TIMESTAMPTZ,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student', 'banned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: categories
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, description, icon, sort_order) VALUES
('Group-D', 'Group D Exam Preparation', '📚', 1),
('ALP', 'Assistant Loco Pilot Exam', '🚂', 2),
('Technician', 'Technician Exam Preparation', '🔧', 3),
('BSED', 'Bihar Secondary Education Board', '📖', 4),
('NTPC', 'Non-Technical Popular Categories', '💼', 5),
('Technical', 'Technical Exam Preparation', '⚙️', 6)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- TABLE: questions
-- =====================================================
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    subject TEXT,
    question_text TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: exams
-- =====================================================
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    subject TEXT,
    question_ids UUID[] NOT NULL DEFAULT '{}',
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: results
-- =====================================================
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL,
    time_taken_seconds INTEGER NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: site_settings
-- =====================================================
CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    premium_price_paise INTEGER NOT NULL DEFAULT 3900,
    premium_validity_days INTEGER NOT NULL DEFAULT 365,
    trial_nudge_interval_seconds INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default site settings
INSERT INTO site_settings (id, premium_price_paise, premium_validity_days, trial_nudge_interval_seconds)
VALUES (1, 3900, 365, 10)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TABLE: support_queries
-- =====================================================
CREATE TABLE IF NOT EXISTS support_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    admin_reply TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'replied', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: login_history
-- =====================================================
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    ip_address INET,
    user_agent TEXT
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);

CREATE INDEX IF NOT EXISTS idx_exams_category ON exams(category);
CREATE INDEX IF NOT EXISTS idx_exams_category_id ON exams(category_id);
CREATE INDEX IF NOT EXISTS idx_exams_is_premium ON exams(is_premium);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at);

CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_exam_id ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_created_at ON results(created_at);

CREATE INDEX IF NOT EXISTS idx_support_queries_user_id ON support_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_support_queries_status ON support_queries(status);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP ALL EXISTING POLICIES (Clean Slate)
-- =====================================================

-- Drop all policies on profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_service" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Drop all policies on categories
DROP POLICY IF EXISTS "categories_select_public" ON categories;
DROP POLICY IF EXISTS "categories_admin_all" ON categories;

-- Drop all policies on login_history
DROP POLICY IF EXISTS "login_history_select_own" ON login_history;
DROP POLICY IF EXISTS "login_history_admin_all" ON login_history;
DROP POLICY IF EXISTS "login_history_insert_own" ON login_history;

-- Drop all policies on site_settings
DROP POLICY IF EXISTS "site_settings_select_public" ON site_settings;
DROP POLICY IF EXISTS "site_settings_update_admin" ON site_settings;
DROP POLICY IF EXISTS "Anyone can read site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON site_settings;

-- Drop all policies on questions
DROP POLICY IF EXISTS "questions_select_authenticated" ON questions;
DROP POLICY IF EXISTS "questions_select_public" ON questions;
DROP POLICY IF EXISTS "questions_admin_all" ON questions;
DROP POLICY IF EXISTS "Authenticated users can read questions" ON questions;
DROP POLICY IF EXISTS "Admins can insert questions" ON questions;
DROP POLICY IF EXISTS "Admins can update questions" ON questions;
DROP POLICY IF EXISTS "Admins can delete questions" ON questions;

-- Drop all policies on exams
DROP POLICY IF EXISTS "exams_select_authenticated" ON exams;
DROP POLICY IF EXISTS "exams_select_public" ON exams;
DROP POLICY IF EXISTS "exams_admin_all" ON exams;
DROP POLICY IF EXISTS "Authenticated users can read exams" ON exams;
DROP POLICY IF EXISTS "Admins can insert exams" ON exams;
DROP POLICY IF EXISTS "Admins can update exams" ON exams;
DROP POLICY IF EXISTS "Admins can delete exams" ON exams;

-- Drop all policies on results
DROP POLICY IF EXISTS "results_select_own" ON results;
DROP POLICY IF EXISTS "results_insert_own" ON results;
DROP POLICY IF EXISTS "results_admin_all" ON results;
DROP POLICY IF EXISTS "Users can read own results" ON results;
DROP POLICY IF EXISTS "Users can insert own results" ON results;
DROP POLICY IF EXISTS "Admins can read all results" ON results;

-- Drop all policies on support_queries
DROP POLICY IF EXISTS "support_queries_select_own" ON support_queries;
DROP POLICY IF EXISTS "support_queries_insert_own" ON support_queries;
DROP POLICY IF EXISTS "support_queries_update_own" ON support_queries;
DROP POLICY IF EXISTS "support_queries_admin_all" ON support_queries;
DROP POLICY IF EXISTS "Users can read own support queries" ON support_queries;
DROP POLICY IF EXISTS "Users can insert own support queries" ON support_queries;
DROP POLICY IF EXISTS "Users can update own support queries" ON support_queries;
DROP POLICY IF EXISTS "Admins can read all support queries" ON support_queries;
DROP POLICY IF EXISTS "Admins can update all support queries" ON support_queries;

-- Drop all policies on transactions
DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;
DROP POLICY IF EXISTS "transactions_admin_all" ON transactions;
DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update all transactions" ON transactions;

-- =====================================================
-- HELPER FUNCTION: Zero-Recursion Admin Check
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Direct query with SECURITY DEFINER to avoid RLS recursion
  SELECT p.role INTO user_role 
  FROM profiles p 
  WHERE p.id = auth.uid() 
  LIMIT 1;
  
  RETURN user_role = 'admin';
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- ZERO-RECURSION RLS POLICIES
-- =====================================================

-- ---- PROFILES POLICIES ----
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "profiles_insert_service" ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ---- CATEGORIES POLICIES ----
CREATE POLICY "categories_select_public" ON categories FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "categories_admin_all" ON categories FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---- LOGIN_HISTORY POLICIES ----
CREATE POLICY "login_history_select_own" ON login_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "login_history_insert_own" ON login_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "login_history_admin_all" ON login_history FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---- SITE_SETTINGS POLICIES ----
CREATE POLICY "site_settings_select_public" ON site_settings FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "site_settings_update_admin" ON site_settings FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---- QUESTIONS POLICIES ----
CREATE POLICY "questions_select_public" ON questions FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "questions_admin_all" ON questions FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---- EXAMS POLICIES ----
CREATE POLICY "exams_select_public" ON exams FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "exams_admin_all" ON exams FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---- RESULTS POLICIES ----
CREATE POLICY "results_select_own" ON results FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "results_insert_own" ON results FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "results_admin_all" ON results FOR SELECT
    USING (public.is_admin());

-- ---- SUPPORT_QUERIES POLICIES ----
CREATE POLICY "support_queries_select_own" ON support_queries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "support_queries_insert_own" ON support_queries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "support_queries_update_own" ON support_queries FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "support_queries_admin_all" ON support_queries FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---- TRANSACTIONS POLICIES ----
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_admin_all" ON transactions FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(limit_n INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    total_score BIGINT,
    exams_taken BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS user_id,
        p.full_name,
        COALESCE(SUM(r.score), 0) AS total_score,
        COUNT(r.id) AS exams_taken
    FROM profiles p
    LEFT JOIN results r ON r.user_id = p.id
    WHERE p.role != 'banned'
    GROUP BY p.id, p.full_name
    ORDER BY total_score DESC, exams_taken DESC
    LIMIT limit_n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to support_queries
DROP TRIGGER IF EXISTS update_support_queries_updated_at ON support_queries;
CREATE TRIGGER update_support_queries_updated_at
    BEFORE UPDATE ON support_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SCHEMA RELOAD NOTIFICATION
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================