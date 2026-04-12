import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User as UserIcon, Mail, Phone, KeyRound, ArrowLeft, Camera, X } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { DEFAULT_AVATARS } from '../lib/avatars';

export function ProfileEdit() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setAvatarUrl(profile?.avatar_url ?? '');
  }, [profile?.full_name, profile?.phone, profile?.avatar_url, profile?.id]);
  
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
      // 1. Update Firebase Auth profile
      await updateProfile(user, {
        displayName: fullName.trim()
      });

      // 2. Update Firestore profile
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });

      // 3. Force refresh the global state immediately
      await refreshProfile();
      
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

  const handlePasswordReset = async () => {
    const email = user?.email?.trim();
    if (!email || !user) return;
    setPwLoading(true);
    setPwError('');
    setPwMessage('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      setPwMessage('Check your inbox for a link to set a new password.');
    } catch (err: any) {
      setPwError(err.message);
    }
    setPwLoading(false);
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
            <button 
              type="button" 
              onClick={() => setShowAvatarModal(true)} 
              className="relative group transition-transform active:scale-95"
            >
              {avatarUrl ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] overflow-hidden bg-blue-50 ring-4 ring-offset-2 ring-transparent transition group-hover:ring-blue-500/30">
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[28px] flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
                  <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-1.5 rounded-full shadow-lg border border-gray-100 dark:border-gray-700">
                <Camera className="w-4 h-4" />
              </div>
            </button>
            <div>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Profile & Identity</h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs sm:text-sm font-medium mt-0.5`}>Tap photo to customize avatar</p>
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
              onClick={handlePasswordReset}
              disabled={pwLoading || !user?.email}
              className={`w-full font-bold py-4 rounded-xl transition disabled:opacity-50 active:scale-95 border ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300'}`}
            >
              {pwLoading ? 'Sending Link...' : 'Send Password Reset Link'}
            </button>
          </div>
        </div>
      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity">
          <div className={`w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-[32px] border ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} shadow-2xl animate-in fade-in zoom-in-95 duration-200`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-gray-800 bg-gray-900/80' : 'border-gray-100 bg-gray-50/80'} backdrop-blur-md`}>
              <div>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Choose Avatar</h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pick a new look for your profile</p>
              </div>
              <button 
                onClick={() => setShowAvatarModal(false)}
                className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {DEFAULT_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(url);
                      setShowAvatarModal(false);
                    }}
                    className={`relative group aspect-square rounded-3xl overflow-hidden shadow-sm transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/50 ${
                      avatarUrl === url ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-105' : 'border border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                    {avatarUrl === url && (
                      <div className="absolute inset-x-0 bottom-0 py-1 bg-blue-500 text-[10px] text-white font-bold tracking-wider uppercase backdrop-blur-md z-10">
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className={`p-4 border-t ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'} flex justify-end`}>
               <p className={`text-[11px] font-medium tracking-wide uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                 Tap an avatar to set immediately
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
