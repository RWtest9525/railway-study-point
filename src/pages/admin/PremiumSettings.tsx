import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { doc, getDoc, updateDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Crown, Save } from 'lucide-react';

export function PremiumSettings() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricePaise, setPricePaise] = useState(3900);
  const [validityDays, setValidityDays] = useState(365);
  const [popupInterval, setPopupInterval] = useState(60);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'site_settings', '1');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.premium_price_paise) setPricePaise(data.premium_price_paise);
        if (data.premium_validity_days) setValidityDays(data.premium_validity_days);
        if (data.trial_nudge_interval_seconds) setPopupInterval(data.trial_nudge_interval_seconds);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'site_settings', '1');
      await updateDoc(docRef, {
        premium_price_paise: pricePaise,
        premium_validity_days: validityDays,
        trial_nudge_interval_seconds: popupInterval,
        updated_at: new Date().toISOString(),
      });
      alert('Settings saved successfully!');
    } catch (error: any) {
      if (error.code === 'not-found') {
        // Create the document if it doesn't exist
        await setDoc(doc(collection(db, 'site_settings'), '1'), {
          premium_price_paise: pricePaise,
          premium_validity_days: validityDays,
          trial_nudge_interval_seconds: popupInterval,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        alert('Settings created successfully!');
      } else {
        console.error('Error saving settings:', error);
        alert('Error saving settings');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>;
  }

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Premium Settings</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Configure premium pricing and validity</p>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6 max-w-lg`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-yellow-600/20 flex items-center justify-center">
            <Crown className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Pricing Configuration</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Set premium subscription details</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Premium Price (₹)
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>₹</span>
              <input
                type="number"
                value={pricePaise / 100}
                onChange={(e) => setPricePaise(Math.round(parseFloat(e.target.value) * 100))}
                className={`w-full pl-8 pr-4 py-3 rounded-lg border ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
              />
            </div>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Current price: ₹{(pricePaise / 100).toFixed(2)}
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Premium Validity Period
            </label>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Days</label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Months</label>
                <input
                  type="number"
                  value={Math.floor(validityDays / 30)}
                  onChange={(e) => setValidityDays((parseInt(e.target.value) || 0) * 30)}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Years</label>
                <input
                  type="number"
                  value={Math.floor(validityDays / 365)}
                  onChange={(e) => setValidityDays((parseInt(e.target.value) || 0) * 365)}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                  placeholder="0"
                />
              </div>
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Users get access for {validityDays} days ({Math.floor(validityDays/365)} years, {Math.floor((validityDays%365)/30)} months, {validityDays%30} days) after purchase
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Popup Timer (Seconds)
            </label>
            <input
              type="number"
              value={popupInterval}
              onChange={(e) => setPopupInterval(parseInt(e.target.value) || 0)}
              min="10"
              max="3600"
              className={`w-full px-4 py-3 rounded-lg border ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
            />
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Popup appears every {popupInterval} seconds (min: 10s, max: 3600s)
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}