-- =====================================================
-- ADD CATEGORY_ID TO EXAMS TABLE
-- This migration creates the categories table if needed,
-- then adds the category_id column to exams
-- Created: 2026-04-06
-- =====================================================

-- First, ensure the categories table exists
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

-- Insert default categories (will be ignored if they already exist)
INSERT INTO categories (name, description, icon, sort_order) VALUES
('Group-D', 'Group D Exam Preparation', '📚', 1),
('ALP', 'Assistant Loco Pilot Exam', '🚂', 2),
('Technician', 'Technician Exam Preparation', '🔧', 3),
('BSED', 'Bihar Secondary Education Board', '📖', 4),
('NTPC', 'Non-Technical Popular Categories', '💼', 5),
('Technical', 'Technical Exam Preparation', '⚙️', 6)
ON CONFLICT (name) DO NOTHING;

-- Add category_id column to exams table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'exams' 
    AND column_name = 'category_id'
  ) THEN
    ALTER TABLE exams ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added category_id column to exams table';
  ELSE
    RAISE NOTICE 'category_id column already exists in exams table';
  END IF;
END $$;

-- Create index on category_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_exams_category_id ON exams(category_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';