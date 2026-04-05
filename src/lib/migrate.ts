import { supabase } from './supabase';

export async function ensureSiteSettings() {
  try {
    // Check if site_settings exists and has data
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      // Create the site_settings table if it doesn't exist
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS site_settings (
            id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            premium_price_paise int NOT NULL DEFAULT 3900,
            premium_validity_days int NOT NULL DEFAULT 365,
            trial_nudge_interval_seconds integer NOT NULL DEFAULT 10,
            updated_at timestamptz DEFAULT now()
          );
          
          INSERT INTO site_settings (id, premium_price_paise, premium_validity_days, trial_nudge_interval_seconds)
          VALUES (1, 3900, 365, 10)
          ON CONFLICT (id) DO NOTHING;
        `
      });

      if (createError) {
        console.error('Failed to create site_settings:', createError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}
