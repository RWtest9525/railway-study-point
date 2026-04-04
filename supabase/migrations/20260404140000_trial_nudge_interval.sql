-- Seconds between premium upgrade popups when free trial has ended (admin-editable, default 10)

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS trial_nudge_interval_seconds integer;

UPDATE site_settings
SET trial_nudge_interval_seconds = 10
WHERE id = 1 AND trial_nudge_interval_seconds IS NULL;

ALTER TABLE site_settings
  ALTER COLUMN trial_nudge_interval_seconds SET DEFAULT 10,
  ALTER COLUMN trial_nudge_interval_seconds SET NOT NULL;

ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_trial_nudge_interval_seconds_check;
ALTER TABLE site_settings
  ADD CONSTRAINT site_settings_trial_nudge_interval_seconds_check
  CHECK (trial_nudge_interval_seconds >= 3 AND trial_nudge_interval_seconds <= 3600);
