-- Student phone, premium period start, support tickets

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_started_at timestamptz;

UPDATE profiles SET phone = '' WHERE phone IS NULL;

CREATE TABLE IF NOT EXISTS support_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  admin_reply text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_queries_user_id ON support_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_support_queries_created_at ON support_queries(created_at DESC);

ALTER TABLE support_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own support queries"
  ON support_queries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users select own support queries"
  ON support_queries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins select all support queries"
  ON support_queries FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins update support queries"
  ON support_queries FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
