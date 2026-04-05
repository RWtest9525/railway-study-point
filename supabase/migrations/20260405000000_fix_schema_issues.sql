-- Simple fix: Drop and recreate site_settings table with correct structure
-- This will fix all Premium Settings errors

-- Drop the existing table and recreate with correct columns
DROP TABLE IF EXISTS site_settings CASCADE;

CREATE TABLE site_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  premium_price_paise integer NOT NULL DEFAULT 3900,
  premium_validity_days integer NOT NULL DEFAULT 365,
  trial_nudge_interval_seconds integer NOT NULL DEFAULT 10,
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings
INSERT INTO site_settings (id, premium_price_paise, premium_validity_days, trial_nudge_interval_seconds)
VALUES (1, 3900, 365, 10);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read site settings"
  ON site_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update site settings"
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

-- Add subject column to exams if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exams' AND column_name = 'subject'
  ) THEN
    ALTER TABLE exams ADD COLUMN subject text;
  END IF;
END $$;