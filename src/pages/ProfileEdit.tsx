import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { User as UserIcon, Mail, Phone, KeyRound, ArrowLeft } from 'lucide-react';
import { getAuthRedirectOrigin } from '../lib/authRedirect';
import { BottomNav } from '../components/BottomNav';

export function ProfileEdit() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { profile, user, refreshProfile } = useAuth();
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
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      // 1. Update profiles table with proper error handling
      const { data: profileData, error: pErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (pErr) {
        console.error('Profile update error:', pErr);
        throw new Error(pErr.message || 'Failed to update profile');
      }

      // 2. Update auth metadata (important for things like Google login or initial setup)
      const { error: aErr } = await supabase.auth.updateUser({
        data: { 
          full_name: fullName.trim(),
          phone: phone.trim()
        },
      });
      
      if (aErr) {
        console.error('Auth update error:', aErr);
        // Don't throw - profile was updated, auth metadata is secondary
      }

      // 3. Force refresh the global state immediately
      if (profileData) {
        // Refresh the profile data in global state
        await refreshProfile();
      }
      
      setMessage('Profile updated successfully!');
      
      // Auto-clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Profile save error:', err);
      setError(err.message || 'Could not save. Please check your connection and try again.');
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
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header with back arrow */}
      <header className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white/95 border-gray-200'} sticky top-0 z-50 backdrop-blur-md border-b`}>
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-5 sm:p-8 ${isDark ? 'shadow-xl' : 'shadow-lg'}`}>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
              <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Profile & Security</h1>
              <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-xs sm:text-sm`}>Manage your personal information</p>
            </div>
          </div>

          {message && (
            <div className={`${isDark ? 'bg-green-900/40 border-green-600 text-green-200' : 'bg-green-50 border-green-200 text-green-700'} px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-green-500' : 'bg-green-600'}`} />
              {message}
            </div>
          )}
          {error && (
            <div className={`${isDark ? 'bg-red-900/40 border-red-600 text-red-200' : 'bg-red-50 border-red-200 text-red-700'} px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border`}>
              <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-red-500' : 'bg-red-600'}`} />
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} group-focus-within:text-blue-500 transition`} />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isDark ? 'bg-gray-700/50 text-white border-gray-600 focus:bg-gray-700' : 'bg-white text-gray-900 border-gray-300 focus:bg-gray-50'}`}
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Phone Number</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} group-focus-within:text-blue-500 transition`} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isDark ? 'bg-gray-700/50 text-white border-gray-600 focus:bg-gray-700' : 'bg-white text-gray-900 border-gray-300 focus:bg-gray-50'}`}
                  placeholder="+91 …"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Email Address</label>
              <div className="relative group opacity-60">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <input
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  readOnly
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border cursor-not-allowed ${isDark ? 'bg-gray-800/80 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                />
              </div>
              <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-[10px] ml-1 italic`}>
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

          <div className={`mt-12 pt-8 border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Security</h2>
            </div>
            
            <div className={`${isDark ? 'bg-amber-600/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'} rounded-2xl p-4 sm:p-5 mb-6 border`}>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed`}>
                Need to change your password? Click below and we'll send a secure reset link to your registered email.
              </p>
            </div>

            {pwMessage && (
              <div className={`${isDark ? 'bg-green-900/40 border-green-600 text-green-200' : 'bg-green-50 border-green-200 text-green-700'} px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2 border`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-green-500' : 'bg-green-600'}`} />
                {pwMessage}
              </div>
            )}
            {pwError && (
              <div className={`${isDark ? 'bg-red-900/40 border-red-600 text-red-200' : 'bg-red-50 border-red-200 text-red-700'} px-4 py-3 rounded-xl mb-4 text-sm border`}>
                {pwError}
              </div>
            )}
            
            <button
              type="button"
              onClick={sendPasswordResetEmail}
              disabled={pwLoading || !user?.email}
              className={`w-full font-bold py-4 rounded-xl transition disabled:opacity-50 active:scale-95 border ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300'}`}
            >
              {pwLoading ? 'Sending Link...' : 'Send Password Reset Link'}
            </button>
          </div>
        </div>
        </main>
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
