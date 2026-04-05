-- Fix schema issues for profiles and site_settings tables
-- This migration ensures all required columns exist

-- Ensure profiles table has created_at column
DO $$
BEGIN
  -- Add created_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Add phone if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text NOT NULL DEFAULT '';
  END IF;

  -- Add premium_started_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'premium_started_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN premium_started_at timestamptz;
  END IF;

  -- Add premium_until if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'premium_until'
  ) THEN
    ALTER TABLE profiles ADD COLUMN premium_until timestamptz;
  END IF;
END $$;

-- Ensure site_settings table exists with all required columns
CREATE TABLE IF NOT EXISTS site_settings (
  id int PRIMARY KEY CHECK (id = 1),
  premium_price_paise int NOT NULL DEFAULT 3900,
  premium_validity_days int NOT NULL DEFAULT 365,
  trial_nudge_interval_seconds int NOT NULL DEFAULT 10,
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings if not exists
INSERT INTO site_settings (id, premium_price_paise, premium_validity_days, trial_nudge_interval_seconds)
VALUES (1, 3900, 365, 10)
ON CONFLICT (id) DO UPDATE SET
  premium_price_paise = COALESCE(site_settings.premium_price_paise, 3900),
  premium_validity_days = COALESCE(site_settings.premium_validity_days, 365),
  trial_nudge_interval_seconds = COALESCE(site_settings.trial_nudge_interval_seconds, 10);

-- Enable RLS on site_settings if not already
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Authenticated read site settings" ON site_settings;
CREATE POLICY "Authenticated read site settings"
  ON site_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins update site settings" ON site_settings;
CREATE POLICY "Admins update site settings"
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

-- Ensure exams table has subject column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exams' AND column_name = 'subject'
  ) THEN
    ALTER TABLE exams ADD COLUMN subject text;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);

-- Grant necessary permissions
GRANT ALL ON site_settings TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON exams TO authenticated;
GRANT ALL ON questions TO authenticated;