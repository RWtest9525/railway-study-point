import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { User } from 'lucide-react';

export function ProfileEdit() {
  const { profile, user, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
  }, [profile?.full_name, profile?.id]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (pErr) throw pErr;

      const { error: aErr } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
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

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Edit profile</h1>
          </div>

          <p className="text-gray-400 text-sm mb-6">
            Signed in as <span className="text-gray-200">{user?.email}</span>
          </p>

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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
