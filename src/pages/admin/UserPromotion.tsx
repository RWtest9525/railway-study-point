import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus } from 'lucide-react';
import { normalizeEmail } from '../../lib/authUtils';

export function UserPromotion() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const promote = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeEmail(email);
    if (!normalized || !normalized.includes('@')) {
      setError('Enter a valid email.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data: rows, error: qErr } = await supabase
        .from('profiles')
        .select('id, email, role')
        .ilike('email', normalized);

      if (qErr) throw qErr;
      const target = (rows ?? []).find(
        (r) => normalizeEmail(r.email) === normalized
      );
      if (!target) {
        setError('No account found with that email. The user must sign up first.');
        setLoading(false);
        return;
      }
      if (target.role === 'admin') {
        setMessage('That user is already an admin.');
        setLoading(false);
        return;
      }
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', target.id);
      if (uErr) throw uErr;
      setMessage(`Admin access granted to ${target.email}. They should refresh or sign in again.`);
      setEmail('');
    } catch (err) {
      console.error(err);
      setError('Could not update role. Check Supabase policies and migration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="w-6 h-6 text-green-400" />
        <h2 className="text-2xl font-bold text-white">Promote admin</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Enter the email of a user who has already registered. They will gain admin access in the
        database (same powers as role-based admins).
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

      <form onSubmit={promote} className="space-y-4 bg-gray-800/80 rounded-xl p-6 border border-gray-700">
        <div>
          <label className="block text-sm text-gray-300 mb-2">User email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Updating…' : 'Make admin'}
        </button>
      </form>
    </div>
  );
}
