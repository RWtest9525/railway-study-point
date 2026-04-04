-- Default super-admin email (JWT + profile role + RLS)
-- Premium expiry, configurable price/validity, leaderboard RPC, admin profile updates

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_until timestamptz;

UPDATE profiles
SET premium_until = now() + interval '10 years'
WHERE is_premium = true AND premium_until IS NULL;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(trim(coalesce(auth.jwt() ->> 'email', ''))) = lower(trim('Saichauhan239@gmail.com')) THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_premium_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND (
        (p.premium_until IS NOT NULL AND p.premium_until > now())
        OR (p.is_premium = true AND p.premium_until IS NULL)
      )
  );
$$;

-- Exams: premium visibility
DROP POLICY IF EXISTS "Students can read free exams" ON exams;
CREATE POLICY "Students can read free exams"
  ON exams FOR SELECT
  TO authenticated
  USING (NOT is_premium OR public.has_premium_access());

DROP POLICY IF EXISTS "Admins can insert questions" ON questions;
CREATE POLICY "Admins can insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update questions" ON questions;
CREATE POLICY "Admins can update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete questions" ON questions;
CREATE POLICY "Admins can delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert exams" ON exams;
CREATE POLICY "Admins can insert exams"
  ON exams FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update exams" ON exams;
CREATE POLICY "Admins can update exams"
  ON exams FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete exams" ON exams;
CREATE POLICY "Admins can delete exams"
  ON exams FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all results" ON results;
CREATE POLICY "Admins can read all results"
  ON results FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;
CREATE POLICY "Admins can read all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  premium_price_paise int NOT NULL DEFAULT 3900,
  premium_validity_days int NOT NULL DEFAULT 365,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO site_settings (id, premium_price_paise, premium_validity_days)
VALUES (1, 3900, 365)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read site settings"
  ON site_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins update site settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_n int DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  total_score bigint,
  exams_taken bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    coalesce(sum(r.score), 0)::bigint,
    count(r.id)::bigint
  FROM profiles p
  LEFT JOIN results r ON r.user_id = p.id
  GROUP BY p.id, p.full_name
  HAVING count(r.id) > 0
  ORDER BY coalesce(sum(r.score), 0) DESC
  LIMIT coalesce(limit_n, 50);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_premium_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int) TO authenticated;
