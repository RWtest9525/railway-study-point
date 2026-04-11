import { useEffect, useMemo, useState } from 'react';
import { Crown, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../contexts/ThemeContext';

const unitToDays = (count: number, unit: 'days' | 'months' | 'years') => {
  if (unit === 'years') return count * 365;
  if (unit === 'months') return count * 30;
  return count;
};

const daysToBestUnit = (days: number) => {
  if (days % 365 === 0) return { count: Math.max(1, days / 365), unit: 'years' as const };
  if (days % 30 === 0) return { count: Math.max(1, days / 30), unit: 'months' as const };
  return { count: Math.max(1, days), unit: 'days' as const };
};

export function PremiumSettings() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricePaise, setPricePaise] = useState(3900);
  const [validityCount, setValidityCount] = useState(12);
  const [validityUnit, setValidityUnit] = useState<'days' | 'months' | 'years'>('months');
  const [popupInterval, setPopupInterval] = useState(60);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'site_settings', '1');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.premium_price_paise) setPricePaise(data.premium_price_paise);
        if (data.premium_validity_days) {
          const best = daysToBestUnit(data.premium_validity_days);
          setValidityCount(best.count);
          setValidityUnit(best.unit);
        }
        if (data.trial_nudge_interval_seconds) setPopupInterval(data.trial_nudge_interval_seconds);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load premium settings');
    } finally {
      setLoading(false);
    }
  };

  const validityDays = useMemo(() => unitToDays(validityCount, validityUnit), [validityCount, validityUnit]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        premium_price_paise: pricePaise,
        premium_validity_days: validityDays,
        trial_nudge_interval_seconds: popupInterval,
        updated_at: new Date().toISOString(),
      };
      const docRef = doc(db, 'site_settings', '1');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        await updateDoc(docRef, payload);
      } else {
        await setDoc(docRef, { ...payload, created_at: new Date().toISOString() });
      }
      toast.success('Premium settings saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save premium settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={`py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading premium settings...</div>;
  }

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6">
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Premium Configuration</h1>
        <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Define how much premium costs and exactly when access expires after purchase.</p>
      </div>

      <div className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} max-w-3xl rounded-3xl border p-6 shadow-sm`}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Membership plan</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Premium expiry will be calculated from the user purchase date plus the period below.</p>
          </div>
        </div>

        <div className="space-y-6">
          <label className="block">
            <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Premium price</span>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>₹</span>
              <input
                type="number"
                value={pricePaise / 100}
                onChange={(e) => setPricePaise(Math.round((Number(e.target.value) || 0) * 100))}
                className={`w-full rounded-2xl border py-3 pl-9 pr-4 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              />
            </div>
          </label>

          <div>
            <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Premium validity</span>
            <div className="grid gap-4 md:grid-cols-[160px_1fr]">
              <input
                type="number"
                min="1"
                value={validityCount}
                onChange={(e) => setValidityCount(Math.max(1, Number(e.target.value) || 1))}
                className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              />
              <select
                value={validityUnit}
                onChange={(e) => setValidityUnit(e.target.value as 'days' | 'months' | 'years')}
                className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              >
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
            <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Effective validity: {validityDays} day(s). Example: if a user buys on April 10, expiry is purchase date + {validityDays} days.
            </p>
          </div>

          <label className="block">
            <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Upgrade popup interval</span>
            <input
              type="number"
              min="10"
              max="3600"
              value={popupInterval}
              onChange={(e) => setPopupInterval(Math.max(10, Number(e.target.value) || 10))}
              className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
            />
            <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Controls how often the upgrade reminder appears for non-premium users.</p>
          </label>

          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save premium settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
