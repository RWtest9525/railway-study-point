-- =====================================================
-- MASTER SCHEMA - Exam Prep Application
-- Created: 2026-04-06
-- This is the single source of truth for database schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: profiles
-- Stores user profile information
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
-- TABLE: site_settings
-- Stores global application settings
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
-- TABLE: questions
-- Stores exam questions
-- =====================================================
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- Stores exam definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- Stores exam results for users
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
-- TABLE: support_queries
-- Stores user support requests
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
-- Stores payment transaction records
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
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium);

CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);

CREATE INDEX IF NOT EXISTS idx_exams_category ON exams(category);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject);
CREATE INDEX IF NOT EXISTS idx_exams_is_premium ON exams(is_premium);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);

CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_exam_id ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_created_at ON results(created_at);

CREATE INDEX IF NOT EXISTS idx_support_queries_user_id ON support_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_support_queries_status ON support_queries(status);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- SITE_SETTINGS POLICIES
-- =====================================================

-- Anyone can read site settings
CREATE POLICY "Anyone can read site settings" ON site_settings
    FOR SELECT
    USING (true);

-- Only admins can update site settings
CREATE POLICY "Admins can update site settings" ON site_settings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- QUESTIONS POLICIES
-- =====================================================

-- Authenticated users can read questions
CREATE POLICY "Authenticated users can read questions" ON questions
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins can insert questions
CREATE POLICY "Admins can insert questions" ON questions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update questions
CREATE POLICY "Admins can update questions" ON questions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete questions
CREATE POLICY "Admins can delete questions" ON questions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- EXAMS POLICIES
-- =====================================================

-- Authenticated users can read exams
CREATE POLICY "Authenticated users can read exams" ON exams
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins can insert exams
CREATE POLICY "Admins can insert exams" ON exams
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update exams
CREATE POLICY "Admins can update exams" ON exams
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete exams
CREATE POLICY "Admins can delete exams" ON exams
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- RESULTS POLICIES
-- =====================================================

-- Users can read their own results
CREATE POLICY "Users can read own results" ON results
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own results
CREATE POLICY "Users can insert own results" ON results
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can read all results
CREATE POLICY "Admins can read all results" ON results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- SUPPORT_QUERIES POLICIES
-- =====================================================

-- Users can read their own support queries
CREATE POLICY "Users can read own support queries" ON support_queries
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own support queries
CREATE POLICY "Users can insert own support queries" ON support_queries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own support queries
CREATE POLICY "Users can update own support queries" ON support_queries
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins can read all support queries
CREATE POLICY "Admins can read all support queries" ON support_queries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all support queries
CREATE POLICY "Admins can update all support queries" ON support_queries
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- TRANSACTIONS POLICIES
-- =====================================================

-- Users can read their own transactions
CREATE POLICY "Users can read own transactions" ON transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can read all transactions
CREATE POLICY "Admins can read all transactions" ON transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all transactions
CREATE POLICY "Admins can update all transactions" ON transactions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

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
        NEW.raw_user_meta_data->>'full_name',
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

-- Apply updated_at trigger to support_queries
DROP TRIGGER IF EXISTS update_support_queries_updated_at ON support_queries;
CREATE TRIGGER update_support_queries_updated_at
    BEFORE UPDATE ON support_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================