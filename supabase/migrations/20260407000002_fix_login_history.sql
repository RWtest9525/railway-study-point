-- =====================================================
-- FIX LOGIN_HISTORY TABLE - Add missing columns
-- This migration adds missing columns to login_history
-- Created: 2026-04-07
-- =====================================================

-- Create login_history table if it doesn't exist with all required columns
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    ip_address INET,
    user_agent TEXT
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN 
  -- Add login_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'login_history' 
    AND column_name = 'login_at'
  ) THEN
    ALTER TABLE login_history ADD COLUMN login_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    RAISE NOTICE 'Added login_at column to login_history table';
  END IF;

  -- Add logout_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'login_history' 
    AND column_name = 'logout_at'
  ) THEN
    ALTER TABLE login_history ADD COLUMN logout_at TIMESTAMPTZ;
    RAISE NOTICE 'Added logout_at column to login_history table';
  END IF;

  -- Add duration_seconds if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'login_history' 
    AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE login_history ADD COLUMN duration_seconds INTEGER;
    RAISE NOTICE 'Added duration_seconds column to login_history table';
  END IF;

  -- Add ip_address if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'login_history' 
    AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE login_history ADD COLUMN ip_address INET;
    RAISE NOTICE 'Added ip_address column to login_history table';
  END IF;

  -- Add user_agent if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'login_history' 
    AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE login_history ADD COLUMN user_agent TEXT;
    RAISE NOTICE 'Added user_agent column to login_history table';
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at);

-- Enable RLS if not enabled
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "login_history_select_own" ON login_history;
DROP POLICY IF EXISTS "login_history_insert_own" ON login_history;
DROP POLICY IF EXISTS "login_history_admin_all" ON login_history;

-- Create RLS policies
CREATE POLICY "login_history_select_own" ON login_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "login_history_insert_own" ON login_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "login_history_admin_all" ON login_history FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';