/*
  # Exam Prep Web App Database Schema

  ## Overview
  Complete database schema for competitive exam preparation platform with admin and student roles.

  ## New Tables
  
  ### 1. profiles
  - `id` (uuid, references auth.users)
  - `email` (text, unique)
  - `full_name` (text)
  - `is_premium` (boolean, default false)
  - `role` (text, admin/student, default student)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. questions
  - `id` (uuid, primary key)
  - `category` (text: ALP, NTPC, Group-D)
  - `question_text` (text)
  - `options` (jsonb: array of 4 options)
  - `correct_answer` (integer: 0-3 index)
  - `explanation` (text)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 3. exams
  - `id` (uuid, primary key)
  - `title` (text)
  - `category` (text)
  - `question_ids` (jsonb: array of question IDs)
  - `duration_minutes` (integer)
  - `is_premium` (boolean, default false)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 4. results
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `exam_id` (uuid, references exams)
  - `score` (integer)
  - `total_questions` (integer)
  - `time_taken_seconds` (integer)
  - `answers` (jsonb: user's answer choices)
  - `created_at` (timestamptz)

  ### 5. transactions
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `razorpay_order_id` (text)
  - `razorpay_payment_id` (text)
  - `amount` (integer: amount in paise)
  - `status` (text: pending/success/failed)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users based on role
  - Students can only read their own data
  - Admins have full access to manage content
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  is_premium boolean DEFAULT false,
  role text DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('ALP', 'NTPC', 'Group-D')),
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  explanation text NOT NULL DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update questions"
  ON questions FOR UPDATE
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

CREATE POLICY "Admins can delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create exams table
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('ALP', 'NTPC', 'Group-D')),
  question_ids jsonb NOT NULL DEFAULT '[]',
  duration_minutes integer NOT NULL DEFAULT 60,
  is_premium boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read free exams"
  ON exams FOR SELECT
  TO authenticated
  USING (
    NOT is_premium OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_premium = true
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert exams"
  ON exams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update exams"
  ON exams FOR UPDATE
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

CREATE POLICY "Admins can delete exams"
  ON exams FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create results table
CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  exam_id uuid REFERENCES exams(id) NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL,
  time_taken_seconds integer NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own results"
  ON results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own results"
  ON results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all results"
  ON results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_exams_category ON exams(category);
CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_exam_id ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);