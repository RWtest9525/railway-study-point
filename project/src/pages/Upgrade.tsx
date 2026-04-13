import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { doc, getDoc, updateDoc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, BarChart3, BookOpen, Check, Crown, Trophy, X, Zap } from 'lucide-react';

function computePremiumUntil(currentUntil: string | null | undefined, validityDays: number): string {
  const base = currentUntil && new Date(currentUntil) > new Date() ? new Date(currentUntil) : new Date();
  base.setDate(base.getDate() + validityDays);
  return base.toISOString();
}

export function Upgrade() {
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);
  const [pricePaise, setPricePaise] = useState(3900);
  const [validityDays, setValidityDays] = useState(365);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).Razorpay) {
      setSdkReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => {
      setSdkReady(false);
      setError('Failed to load payment gateway. Please refresh and try again.');
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const docRef = doc(db, 'site_settings', '1');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.premium_price_paise) setPricePaise(data.premium_price_paise);
          if (data.premium_validity_days) setValidityDays(data.premium_validity_days);
        }
      } catch (e) {
        console.error('Error loading site settings:', e);
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

    const RazorpayConstructor = (window as any).Razorpay;
    if (!RazorpayConstructor || !sdkReady) {
      setError('Razorpay SDK is not loaded. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalAmount = pricePaise;
      const transactionRef = doc(collection(db, 'transactions'));
      const planType = validityDays >= 365 ? 'yearly' : validityDays >= 30 ? 'monthly' : 'lifetime';

      await setDoc(transactionRef, {
        user_id: profile.id,
        amount: finalAmount,
        status: 'pending',
        payment_method: 'razorpay',
        plan_type: planType,
        created_at: serverTimestamp(),
      });

      let orderId = undefined;
      try {
        const orderRes = await fetch('/api/createOrder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: finalAmount })
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.error || 'Failed to generate Secure Order');
        orderId = orderData.id;
      } catch (orderApiError) {
        console.warn('Order API Failed:', orderApiError);
        // Continue and try fallback direct checkout if their account somehow still allows it
      }

      const options: any = {
        key,
        amount: finalAmount,
        currency: 'INR',
        ...(orderId ? { order_id: orderId } : {}),
        name: 'Railway Study Point',
        description: `Premium Access - ${validityDays} Days`,
        image: '/railway-study-point-logo.png',
        handler: async (response: any) => {
          try {
            await updateDoc(transactionRef, {
              status: 'success',
              razorpay_payment_id: response.razorpay_payment_id ?? null,
              completed_at: new Date().toISOString(),
            });

            const profileRef = doc(db, 'profiles', profile.id);
            const newUntil = computePremiumUntil((profile as any).premium_until, validityDays);
            const wasActive = (profile as any).premium_until && new Date((profile as any).premium_until) > new Date();
            const premiumPatch: any = {
              is_premium: true,
              premium_until: newUntil,
            };

            if (!wasActive || !(profile as any).premium_started_at) {
              premiumPatch.premium_started_at = new Date().toISOString();
            }

            await updateDoc(profileRef, premiumPatch);
            await refreshProfile();
            navigate('/dashboard');
          } catch (err) {
            console.error('Error updating profile after payment:', err);
            setError('Payment recorded but account update failed. Contact support with your payment ID.');
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
          ondismiss: async () => {
            try {
              await updateDoc(transactionRef, {
                status: 'cancelled',
                failure_reason: 'User closed Razorpay popup',
                updated_at: new Date().toISOString(),
              });
            } catch (dismissError) {
              console.error('Failed to mark transaction cancelled:', dismissError);
            }
            setLoading(false);
          },
        },
      };

      const rzp = new RazorpayConstructor(options);
      rzp.on('payment.failed', async (response: any) => {
        try {
          await updateDoc(transactionRef, {
            status: 'failed',
            failure_reason: response.error?.description || 'Payment failed',
            updated_at: new Date().toISOString(),
          });
        } catch (failureUpdateError) {
          console.error('Failed to update failed transaction:', failureUpdateError);
        }
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

  if (authLoading || !settingsLoaded) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-yellow-600/10 blur-3xl animate-pulse" />
        <div className="absolute -left-40 top-1/2 h-60 w-60 rounded-full bg-blue-600/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/3 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <header className={`relative ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white/95 border-gray-200'} sticky top-0 z-50 border-b backdrop-blur-md`}>
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4">
          <button onClick={() => window.history.back()} className={`rounded-full p-2 transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            <ArrowLeft className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Go Premium</h1>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="animate-in slide-in-from-bottom-4 text-center duration-700">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 shadow-lg shadow-yellow-500/30">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className={`mb-2 text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Unlock <span className="text-yellow-400">Premium</span>
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Get unlimited access to all features</p>
        </div>

        <div className={`relative rounded-2xl border p-6 shadow-xl ${isDark ? 'border-yellow-500/30 bg-gradient-to-br from-gray-800 to-gray-900 shadow-yellow-500/10' : 'border-yellow-300 bg-white shadow-yellow-100'}`}>
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-500/5 to-transparent" />

          <div className="relative">
            <div className="mb-6 text-center">
              <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 ${isDark ? 'border-yellow-500/30 bg-yellow-600/20' : 'border-yellow-300 bg-yellow-100'}`}>
                <Zap className={`h-3 w-3 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className={`${isDark ? 'text-yellow-400' : 'text-yellow-700'} text-xs font-bold uppercase tracking-wider`}>Limited Offer</span>
              </div>
              <div className="flex items-baseline justify-center gap-2">
                <span className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rs</span>
                <span className={`text-5xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{displayRupees}</span>
              </div>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-2 text-sm`}>
                {settingsLoaded ? `${validityDays} days access` : 'Loading...'}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              {[
                { icon: BookOpen, text: 'All Exams', color: 'text-blue-400' },
                { icon: Zap, text: 'Unlimited', color: 'text-yellow-400' },
                { icon: Trophy, text: 'Analytics', color: 'text-green-400' },
                { icon: BarChart3, text: 'Solutions', color: 'text-purple-400' },
              ].map((feature, index) => (
                <div key={index} className={`flex items-center gap-2 rounded-lg p-2 ${isDark ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                  <feature.icon className={`h-4 w-4 ${feature.color}`} />
                  <span className={`${isDark ? 'text-gray-200' : 'text-gray-700'} text-sm`}>{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="mb-6 space-y-2">
              {['Priority support', 'Ad-free experience', 'All devices'].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full ${isDark ? 'bg-green-600/20' : 'bg-green-100'}`}>
                    <Check className={`h-2 w-2 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>{feature}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className={`${isDark ? 'border-red-500/50 bg-red-900/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700'} mb-4 flex items-center gap-2 rounded-lg border p-3`}>
                <X className={`h-4 w-4 shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={loading || !settingsLoaded || !sdkReady}
              className="w-full rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500 py-3 font-bold text-white shadow-lg shadow-yellow-500/30 transition-all hover:from-yellow-500 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Processing...' : !sdkReady ? 'Loading payment gateway...' : `Upgrade Now - Rs ${displayRupees}`}
            </button>

            <p className={`mt-3 flex items-center justify-center gap-1 text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" /></svg>
              Secure payment via Razorpay
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-100'}`}>
            <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${isDark ? 'bg-green-500' : 'bg-green-600'}`} />
            <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs`}>30-day money-back guarantee</span>
          </div>
        </div>
      </main>
    </div>
  );
}
