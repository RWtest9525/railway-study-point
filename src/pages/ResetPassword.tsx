import { useEffect, useState } from 'react';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from '../contexts/RouterContext';
import { Lock } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

export function ResetPassword() {
  const { navigate } = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if we have the oobCode in the URL (Firebase password reset link)
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');
    if (oobCode) {
      setReady(true);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');
    
    if (!oobCode) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setMessage('Password updated. Redirecting to sign in…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
        <div className="flex flex-col items-center mb-6">
          <BrandLogo variant="hero" className="drop-shadow-lg" />
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-2">Set new password</h1>
        {!ready ? (
          <p className="text-gray-400 text-center text-sm">Validating your reset link…</p>
        ) : (
          <>
            <p className="text-gray-400 text-center text-sm mb-6">
              Choose a new password for your account.
            </p>
            {message && (
              <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-3 rounded-lg mb-4 text-sm">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white pl-12 pr-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-gray-700 text-white pl-12 pr-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </>
        )}
        <p className="mt-6 text-center text-gray-400 text-sm">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-blue-400 hover:text-blue-300"
          >
            Back to sign in
          </button>
        </p>
      </div>
    </div>
  );
}