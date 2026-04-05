import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings } from 'lucide-react';

const PRESETS: { label: string; days: number }[] = [
  { label: '1 month', days: 30 },
  { label: '6 months', days: 183 },
  { label: '1 year', days: 365 },
];

const NUDGE_MIN_SEC = 3;
const NUDGE_MAX_SEC = 3600;

export function PremiumSettings() {
  const [priceRupees, setPriceRupees] = useState('39');
  const [validityDays, setValidityDays] = useState(365);
  const [customDays, setCustomDays] = useState('');
  const [nudgeIntervalSec, setNudgeIntervalSec] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        console.log('Loading premium settings...');
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        
        if (error) {
          console.error('Site settings fetch error:', error);
          // Check if it's a "not found" error (PGRST116) which is expected if no settings exist
          if (error.code !== 'PGRST116') {
            setError(`Failed to load settings: ${error.message}`);
          }
        }
        
        if (data) {
          console.log('Found existing settings:', data);
          setPriceRupees(String(data.premium_price_paise / 100));
          setValidityDays(data.premium_validity_days);
          if (typeof data.trial_nudge_interval_seconds === 'number') {
            setNudgeIntervalSec(data.trial_nudge_interval_seconds);
          }
        } else {
          // Insert default settings
          console.log('No settings found, creating defaults...');
          const { data: insertData, error: insertError } = await supabase
            .from('site_settings')
            .insert({
              id: 1,
              premium_price_paise: 3900,
              premium_validity_days: 365,
              trial_nudge_interval_seconds: 10
            })
            .select()
            .single();
          
          if (insertError) {
            console.error('Failed to create default settings:', insertError);
            // Check if it's a duplicate key error (settings might have been created by another request)
            if (insertError.code === '23505') {
              console.log('Settings already exist, fetching...');
              const { data: existingData, error: fetchError } = await supabase
                .from('site_settings')
                .select('*')
                .eq('id', 1)
                .single();
              
              if (fetchError) {
                setError(`Failed to load settings: ${fetchError.message}`);
              } else if (existingData) {
                setPriceRupees(String(existingData.premium_price_paise / 100));
                setValidityDays(existingData.premium_validity_days);
                if (typeof existingData.trial_nudge_interval_seconds === 'number') {
                  setNudgeIntervalSec(existingData.trial_nudge_interval_seconds);
                }
              }
            } else {
              setError(`Failed to initialize settings: ${insertError.message}`);
            }
          } else if (insertData) {
            console.log('Default settings created successfully');
            setPriceRupees(String(insertData.premium_price_paise / 100));
            setValidityDays(insertData.premium_validity_days);
            if (typeof insertData.trial_nudge_interval_seconds === 'number') {
              setNudgeIntervalSec(insertData.trial_nudge_interval_seconds);
            }
          }
        }
      } catch (err: any) {
        console.error('Settings load error:', err);
        setError(`Failed to load settings: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    const rupees = parseFloat(priceRupees);
    if (Number.isNaN(rupees) || rupees <= 0) {
      setError('Enter a valid price in rupees.');
      setSaving(false);
      return;
    }
    const paise = Math.round(rupees * 100);
    const days =
      customDays.trim() !== '' ? parseInt(customDays, 10) : validityDays;
    if (Number.isNaN(days) || days < 1) {
      setError('Validity must be at least 1 day.');
      setSaving(false);
      return;
    }
    const nudgeSec = Math.floor(Number(nudgeIntervalSec));
    if (Number.isNaN(nudgeSec) || nudgeSec < NUDGE_MIN_SEC || nudgeSec > NUDGE_MAX_SEC) {
      setError(
        `Popup interval must be between ${NUDGE_MIN_SEC} and ${NUDGE_MAX_SEC} seconds (after free trial ends).`
      );
      setSaving(false);
      return;
    }
    try {
      const { data: existingData, error: checkError } = await supabase
        .from('site_settings')
        .select('id')
        .eq('id', 1)
        .maybeSingle();

      if (checkError) {
        throw new Error('Database access error: ' + checkError.message);
      }

      const updateData = {
        premium_price_paise: paise,
        premium_validity_days: days,
        trial_nudge_interval_seconds: nudgeSec,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (existingData) {
        result = await supabase
          .from('site_settings')
          .update(updateData)
          .eq('id', 1);
      } else {
        result = await supabase
          .from('site_settings')
          .insert({ ...updateData, id: 1 });
      }

      if (result.error) throw result.error;
      
      setValidityDays(days);
      setCustomDays('');
      setMessage('Premium pricing saved successfully.');
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('relation "site_settings" does not exist')) {
        setError('Database schema not updated. Please run the migration files first.');
      } else if (e.message?.includes('permission denied')) {
        setError('Permission denied. Ensure you are logged in as an admin.');
      } else {
        setError('Save failed: ' + (e.message || 'Unknown error'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-400">Loading settings…</p>;
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Premium pricing</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Price in rupees and how many days of premium access a successful payment grants. Existing
        subscribers get new days added from their current expiry when they pay again.
      </p>

      {message && (
        <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-2 rounded-lg mb-4 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4 bg-gray-800/80 rounded-xl p-6 border border-gray-700">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Price (₹)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={priceRupees}
            onChange={(e) => setPriceRupees(e.target.value)}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
          />
        </div>

        <div>
          <span className="block text-sm text-gray-300 mb-2">Validity preset</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => {
                  setValidityDays(p.days);
                  setCustomDays('');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  validityDays === p.days && customDays === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Custom validity (days)</label>
          <input
            type="number"
            min="1"
            placeholder={`Using ${validityDays} days — override here`}
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
          />
        </div>

        <div className="pt-2 border-t border-gray-600">
          <label className="block text-sm text-gray-300 mb-2">
            Premium reminder popup (seconds)
          </label>
          <p className="text-gray-500 text-xs mb-2">
            After a user&apos;s free trial ends, the extra upgrade popup appears again every this many
            seconds (default 10). Range {NUDGE_MIN_SEC}–{NUDGE_MAX_SEC}.
          </p>
          <input
            type="number"
            min={NUDGE_MIN_SEC}
            max={NUDGE_MAX_SEC}
            value={nudgeIntervalSec}
            onChange={(e) => setNudgeIntervalSec(Number(e.target.value))}
            className="w-full max-w-xs bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
          />
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
