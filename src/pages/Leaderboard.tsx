import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from '../contexts/RouterContext';
import { useAuth } from '../contexts/AuthContext';
import { Trophy } from 'lucide-react';

type Row = {
  user_id: string;
  full_name: string;
  total_score: number;
  exams_taken: number;
};

export function Leaderboard() {
  const { navigate } = useRouter();
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_leaderboard', { limit_n: 100 });
        if (rpcError) throw rpcError;
        const normalized = (data ?? []).map((r) => ({
          user_id: r.user_id,
          full_name: r.full_name || 'Student',
          total_score: Number(r.total_score),
          exams_taken: Number(r.exams_taken),
        }));
        setRows(normalized);
      } catch (e) {
        console.error(e);
        setError(
          'Could not load leaderboard. Run the latest database migration in Supabase (includes get_leaderboard).'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 mb-6 transition"
        >
          ← Back to Dashboard
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-amber-600 rounded-xl flex items-center justify-center">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
            <p className="text-gray-400 text-sm">Total score across all completed exams</p>
          </div>
        </div>

        {loading && (
          <p className="text-gray-400">Loading…</p>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <p className="text-gray-400">No results yet. Complete an exam to appear here.</p>
        )}

        {!loading && rows.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-700/80">
                <tr>
                  <th className="px-4 py-3 text-gray-300 text-sm font-semibold">#</th>
                  <th className="px-4 py-3 text-gray-300 text-sm font-semibold">Student</th>
                  <th className="px-4 py-3 text-gray-300 text-sm font-semibold">Exams</th>
                  <th className="px-4 py-3 text-gray-300 text-sm font-semibold">Total score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {rows.map((r, i) => (
                  <tr
                    key={r.user_id}
                    className={`hover:bg-gray-700/40 ${
                      profile?.id === r.user_id ? 'bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-white font-medium">
                      {r.full_name}
                      {profile?.id === r.user_id && (
                        <span className="ml-2 text-xs text-blue-400">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{r.exams_taken}</td>
                    <td className="px-4 py-3 text-amber-400 font-semibold">{r.total_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
