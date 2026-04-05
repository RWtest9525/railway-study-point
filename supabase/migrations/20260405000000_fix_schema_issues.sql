-- Fix schema issues for site_settings table
-- This adds missing columns to the existing site_settings table

-- Add premium_price_paise column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' AND column_name = 'premium_price_paise'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN premium_price_paise integer DEFAULT 3900;
  END IF;
END $$;

-- Add premium_validity_days column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' AND column_name = 'premium_validity_days'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN premium_validity_days integer DEFAULT 365;
  END IF;
END $$;

-- Add trial_nudge_interval_seconds column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' AND column_name = 'trial_nudge_interval_seconds'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN trial_nudge_interval_seconds integer DEFAULT 10;
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update the existing row (id=1) with default values if columns were just added
UPDATE site_settings 
SET 
  premium_price_paise = COALESCE(premium_price_paise, 3900),
  premium_validity_days = COALESCE(premium_validity_days, 365),
  trial_nudge_interval_seconds = COALESCE(trial_nudge_interval_seconds, 10),
  updated_at = now()
WHERE id = 1;

-- If no row exists, insert the default
INSERT INTO site_settings (id, premium_price_paise, premium_validity_days, trial_nudge_interval_seconds)
SELECT 1, 3900, 365, 10
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE id = 1);

-- Enable RLS if not already
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Authenticated read site settings" ON site_settings;
CREATE POLICY "Authenticated read site_settings"
  ON site_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins update site settings" ON site_settings;
CREATE POLICY "Admins update site_settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add subject column to exams table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exams' AND column_name = 'subject'
  ) THEN
    ALTER TABLE exams ADD COLUMN subject text;
  END IF;
END $$;

-- Add phone column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text DEFAULT '';
  END IF;
END $$;

-- Add premium_started_at column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'premium_started_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN premium_started_at timestamptz;
  END IF;
END $$;

-- Add premium_until column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'premium_until'
  ) THEN
    ALTER TABLE profiles ADD COLUMN premium_until timestamptz;
  END IF;
END $$;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);