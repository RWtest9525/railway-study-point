import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { loadRazorpayScript } from '../lib/razorpayLoader';
import { Check } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

function computePremiumUntil(
  currentUntil: string | null | undefined,
  validityDays: number
): string {
  const base =
    currentUntil && new Date(currentUntil) > new Date()
      ? new Date(currentUntil)
      : new Date();
  base.setDate(base.getDate() + validityDays);
  return base.toISOString();
}

export function Upgrade() {
  const { profile, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pricePaise, setPricePaise] = useState(3900);
  const [validityDays, setValidityDays] = useState(365);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
        if (!error && data) {
          setPricePaise(data.premium_price_paise);
          setValidityDays(data.premium_validity_days);
        }
      } catch {
        /* keep defaults if migration not applied */
      } finally {
        setSettingsLoaded(true);
      }
    })();
  }, []);

  const displayRupees = (pricePaise / 100).toFixed(pricePaise % 100 === 0 ? 0 : 2);

  const handleUpgrade = async () => {
    if (!profile) return;

    const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!key || String(key).trim() === '') {
      setError('Razorpay is not configured. Add VITE_RAZORPAY_KEY_ID in your environment.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          amount: pricePaise,
          status: 'pending',
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error('Razorpay failed to initialize');
      }

      const options: Record<string, unknown> = {
        key,
        amount: pricePaise,
        currency: 'INR',
        name: 'Railway Study Point',
        description: `Premium — ${validityDays} day${validityDays === 1 ? '' : 's'}`,
        handler: async (response: { razorpay_payment_id?: string }) => {
          try {
            const paymentId = response.razorpay_payment_id;
            const { error: updateError } = await supabase
              .from('transactions')
              .update({
                status: 'success',
                razorpay_payment_id: paymentId ?? null,
              })
              .eq('id', transactionData.id);

            if (updateError) throw updateError;

            const newUntil = computePremiumUntil(profile.premium_until, validityDays);

            const { error: premiumError } = await supabase
              .from('profiles')
              .update({ is_premium: true, premium_until: newUntil })
              .eq('id', profile.id);

            if (premiumError) throw premiumError;

            await refreshProfile();
            navigate('/dashboard');
          } catch (err) {
            console.error(err);
            setError('Payment recorded but updating your account failed. Contact support with your payment ID.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          email: profile.email,
          name: profile.full_name,
        },
        theme: {
          color: '#2563eb',
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', () => {
        setError('Payment failed or was cancelled. You can try again.');
        setLoading(false);
      });
      razorpay.open();
    } catch (err) {
      console.error(err);
      setError('Could not start payment. Check your connection and Razorpay key.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 mb-8 transition"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <BrandLogo variant="hero" className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Go Premium
            </h1>
            <p className="text-gray-400">
              Unlock unlimited access to all premium exams
            </p>
          </div>

          <div className="bg-gray-700 rounded-xl p-8 mb-8 text-center">
            <div className="text-5xl font-bold text-white mb-2">
              ₹{displayRupees}
            </div>
            <p className="text-gray-300">
              {settingsLoaded
                ? `Includes ${validityDays} day${validityDays === 1 ? '' : 's'} of premium access (set by admin)`
                : 'Loading pricing…'}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {[
              'Access all premium exams',
              'Unlimited practice tests',
              'Detailed explanations',
              'Performance analytics',
              'No ads or interruptions',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading || !settingsLoaded}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? 'Processing…' : `Upgrade Now — ₹${displayRupees}`}
          </button>

          <p className="text-center text-gray-400 text-sm mt-4">
            Secure payment powered by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}
