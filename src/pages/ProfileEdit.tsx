import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, KeyRound } from 'lucide-react';
import { getAuthRedirectOrigin } from '../lib/authRedirect';

export function ProfileEdit() {
  const { profile, user, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile?.full_name, profile?.phone, profile?.id]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { error: pErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (pErr) throw pErr;

      const { error: aErr } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), phone: phone.trim() },
      });
      if (aErr) throw aErr;

      await refreshProfile();
      setMessage('Profile updated.');
    } catch (err) {
      console.error(err);
      setError('Could not save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordResetEmail = async () => {
    const email = user?.email?.trim();
    if (!email) return;
    setPwLoading(true);
    setPwError('');
    setPwMessage('');
    const redirectTo = `${getAuthRedirectOrigin()}/reset-password`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setPwLoading(false);
    if (err) {
      setPwError(err.message);
      return;
    }
    setPwMessage('Check your inbox for a link to set a new password.');
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 mb-6 transition"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Profile &amp; security</h1>
          </div>

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

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                Phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+91 …"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                Email
              </label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                readOnly
                className="w-full bg-gray-800/80 text-gray-400 px-4 py-3 rounded-lg border border-gray-600 cursor-not-allowed"
              />
              <p className="text-gray-500 text-xs mt-1">
                Email cannot be changed here. It is tied to your sign-in account.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              Password
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              We&apos;ll email you a secure link to choose a new password (same as &quot;forgot
              password&quot; on the login page).
            </p>
            {pwMessage && (
              <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-2 rounded-lg mb-3 text-sm">
                {pwMessage}
              </div>
            )}
            {pwError && (
              <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-2 rounded-lg mb-3 text-sm">
                {pwError}
              </div>
            )}
            <button
              type="button"
              onClick={sendPasswordResetEmail}
              disabled={pwLoading || !user?.email}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {pwLoading ? 'Sending…' : 'Email me a password reset link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
