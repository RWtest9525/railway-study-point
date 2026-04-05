import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { Check, Crown, Zap, BookOpen, Trophy, BarChart3, X, ArrowLeft } from 'lucide-react';
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
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pricePaise, setPricePaise] = useState(3900);
  const [validityDays, setValidityDays] = useState(365);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay SDK dynamically
  useEffect(() => {
    const loadRazorpay = () => {
      // Check if Razorpay is already loaded
      if (window.Razorpay) {
        setRazorpayLoaded(true);
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('Razorpay SDK loaded successfully');
        setRazorpayLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        setError('Failed to load payment gateway. Please check your internet connection.');
      };
      document.body.appendChild(script);
    };

    loadRazorpay();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('premium_price_paise, premium_validity_days')
          .eq('id', 1)
          .maybeSingle();
        if (!error && data) {
          setPricePaise(data.premium_price_paise);
          setValidityDays(data.premium_validity_days);
        }
      } catch (e) {
        console.error('Error loading site settings:', e);
        /* keep defaults if migration not applied */
      } finally {
        setSettingsLoaded(true);
      }
    })();
  }, []);

  const displayRupees = (pricePaise / 100).toFixed(pricePaise % 100 === 0 ? 0 : 2);

  if (authLoading || !settingsLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleUpgrade = async () => {
    if (!profile) return;

    // 1. Explicit Key Loading and Verification
    const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
    console.log('Razorpay Key Verification:', key ? `${key.substring(0, 8)}...` : 'MISSING');

    if (!key || String(key).trim() === '') {
      setError('Razorpay is not configured. Add VITE_RAZORPAY_KEY_ID in your environment.');
      return;
    }

    // 2. Script Verification
    const RazorpayConstructor = (window as any).Razorpay;
    if (!RazorpayConstructor) {
      alert('Razorpay SDK not loaded. Please check your internet connection and reload the page.');
      setError('Razorpay SDK is not loaded. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 3. Amount Formatting: Ensuring it is in paise (Price * 100 if stored in rupees)
      // Since pricePaise is stored in paise (e.g., 3900 for ₹39), we use it directly.
      // We will log it to confirm the amount being sent.
      const finalAmount = pricePaise; 
      console.log('Processing payment for amount (paise):', finalAmount);

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          amount: finalAmount,
          status: 'pending',
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // 4. Reconstruct Options Object
      const options = {
        key: key,
        amount: finalAmount,
        currency: 'INR',
        name: 'Railway Study Point',
        description: `Premium Access — ${validityDays} Days`,
        image: '/railway-study-point-logo.png',
        handler: async (response: any) => {
          console.log('Payment successful! Response:', response);
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
            const wasActive = profile.premium_until && new Date(profile.premium_until) > new Date();
            
            const premiumPatch: any = {
              is_premium: true,
              premium_until: newUntil,
            };
            if (!wasActive || !profile.premium_started_at) {
              premiumPatch.premium_started_at = new Date().toISOString();
            }

            const { error: premiumError } = await supabase
              .from('profiles')
              .update(premiumPatch)
              .eq('id', profile.id);

            if (premiumError) throw premiumError;

            await refreshProfile();
            navigate('/dashboard');
          } catch (err) {
            console.error('Error updating profile after payment:', err);
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
          ondismiss: () => {
            console.log('Razorpay modal closed by user');
            setLoading(false);
          },
        },
      };

      const rzp = new RazorpayConstructor(options);
      rzp.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay initialization error:', err);
      setError('Could not start payment. Check your connection and Razorpay key.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <h1 className="font-bold text-lg text-white">Go Premium</h1>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 mb-6 shadow-lg shadow-yellow-500/30">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Unlock <span className="text-yellow-400">Premium</span> Access
          </h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Get unlimited access to all premium exams and features
          </p>
        </div>

        {/* Pricing Card */}
        <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border-2 border-yellow-500/30 shadow-2xl shadow-yellow-500/10 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-3xl pointer-events-none" />
          
          <div className="relative">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-yellow-600/20 border border-yellow-500/30 rounded-full px-4 py-1 mb-6">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-bold uppercase tracking-wider">Limited Time Offer</span>
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl text-gray-400">₹</span>
                <span className="text-6xl font-bold text-white">{displayRupees}</span>
              </div>
              <p className="text-gray-400 mt-4">
                {settingsLoaded
                  ? `${validityDays} days of unlimited premium access`
                  : 'Loading pricing…'}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: BookOpen, text: 'All Premium Exams', color: 'text-blue-400', bg: 'bg-blue-600/20' },
                { icon: Zap, text: 'Unlimited Tests', color: 'text-yellow-400', bg: 'bg-yellow-600/20' },
                { icon: Trophy, text: 'Performance Analytics', color: 'text-green-400', bg: 'bg-green-600/20' },
                { icon: BarChart3, text: 'Detailed Solutions', color: 'text-purple-400', bg: 'bg-purple-600/20' },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-700/30 border border-gray-600/30">
                  <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center shrink-0`}>
                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <span className="text-gray-200 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Additional Features */}
            <div className="space-y-3 mb-8">
              {[
                'Priority support access',
                'Ad-free experience',
                'Access on all devices',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-600/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-gray-400">{feature}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-6 flex items-center gap-3">
                <X className="w-5 h-5 text-red-400 shrink-0" />
                <span className="text-red-200 text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={loading || !settingsLoaded}
              className="w-full bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-400 hover:to-yellow-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 active:scale-[0.98] animate-pulse-slow"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                `Upgrade Now — ₹${displayRupees}`
              )}
            </button>

            <p className="text-center text-gray-500 text-sm mt-4 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
              Secure payment powered by Razorpay
            </p>
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gray-800/50 rounded-full px-4 py-2 border border-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-400 text-sm">30-day money-back guarantee</span>
          </div>
        </div>
      </main>
    </div>
  );
}
