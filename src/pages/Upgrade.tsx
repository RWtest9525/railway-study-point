import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { Crown, Check } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function Upgrade() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    if (!profile) return;

    setLoading(true);
    setError('');

    try {
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          amount: 3900,
          status: 'pending',
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const razorpay = new window.Razorpay({
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: 3900,
          currency: 'INR',
          name: 'Railway Study Point',
          description: 'Premium Access',
          order_id: transactionData.id,
          handler: async (response: any) => {
            try {
              const { error: updateError } = await supabase
                .from('transactions')
                .update({
                  status: 'success',
                  razorpay_payment_id: response.razorpay_payment_id,
                })
                .eq('id', transactionData.id);

              if (updateError) throw updateError;

              const { error: premiumError } = await supabase
                .from('profiles')
                .update({ is_premium: true })
                .eq('id', profile.id);

              if (premiumError) throw premiumError;

              navigate('/dashboard');
            } catch (err) {
              setError('Payment verification failed. Please contact support.');
              console.error(err);
            }
          },
          prefill: {
            email: profile.email,
            name: profile.full_name,
          },
          theme: {
            color: '#2563eb',
          },
        });

        razorpay.open();
      };

      document.head.appendChild(script);
    } catch (err) {
      setError('Failed to initiate payment. Please try again.');
      console.error(err);
    } finally {
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
            <div className="w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-10 h-10 text-white" />
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
              ₹39
            </div>
            <p className="text-gray-300">One-time payment</p>
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
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? 'Processing...' : 'Upgrade Now - ₹39'}
          </button>

          <p className="text-center text-gray-400 text-sm mt-4">
            Secure payment powered by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}
