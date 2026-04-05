import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { User as UserIcon, Mail, Phone, KeyRound } from 'lucide-react';
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
    if (!user) {
      setError('You must be signed in to save profile changes.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      // 1. Update profiles table
      const { error: pErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (pErr) throw pErr;

      // 2. Update auth metadata (important for things like Google login or initial setup)
      const { error: aErr } = await supabase.auth.updateUser({
        data: { 
          full_name: fullName.trim(),
          phone: phone.trim()
        },
      });
      if (aErr) throw aErr;

      // 3. Force refresh the global state
      await refreshProfile();
      setMessage('Profile updated successfully!');
      
      // Auto-clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Profile save error:', err);
      setError(err.message || 'Could not save. Try again.');
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
    <div className="min-h-screen bg-gray-900 py-6 sm:py-12 px-4">
      <div className="max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 mb-6 transition flex items-center gap-1 text-sm sm:text-base"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 sm:p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
              <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Profile & Security</h1>
              <p className="text-gray-500 text-xs sm:text-sm">Manage your personal information</p>
            </div>
          </div>

          {message && (
            <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-700/50 text-white pl-11 pr-4 py-3.5 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-700 transition"
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-700/50 text-white pl-11 pr-4 py-3.5 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-700 transition"
                  placeholder="+91 …"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group opacity-60">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  readOnly
                  className="w-full bg-gray-800/80 text-gray-400 pl-11 pr-4 py-3.5 rounded-xl border border-gray-700 cursor-not-allowed"
                />
              </div>
              <p className="text-gray-500 text-[10px] ml-1 italic">
                Email cannot be changed as it is your login ID.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-900/20 active:scale-95 mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving Changes...
                </div>
              ) : 'Update Profile'}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-white">Security</h2>
            </div>
            
            <div className="bg-amber-600/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 mb-6">
              <p className="text-gray-300 text-sm leading-relaxed">
                Need to change your password? Click below and we'll send a secure reset link to your registered email.
              </p>
            </div>

            {pwMessage && (
              <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {pwMessage}
              </div>
            )}
            {pwError && (
              <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-3 rounded-xl mb-4 text-sm">
                {pwError}
              </div>
            )}
            
            <button
              type="button"
              onClick={sendPasswordResetEmail}
              disabled={pwLoading || !user?.email}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 border border-gray-600 active:scale-95"
            >
              {pwLoading ? 'Sending Link...' : 'Send Password Reset Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
