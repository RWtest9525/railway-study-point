import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { MessageSquare } from 'lucide-react';
import type { Database } from '../lib/database.types';

type QueryRow = Database['public']['Tables']['support_queries']['Row'];

export function ContactSupport() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [items, setItems] = useState<QueryRow[]>([]);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!profile?.id) {
      setListLoading(false);
      return;
    }
    const { data, error: qErr } = await supabase
      .from('support_queries')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    if (!qErr && data) setItems(data);
    setListLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !message.trim()) return;
    setLoading(true);
    setError('');
    setFeedback('');
    const { error: insErr } = await supabase.from('support_queries').insert({
      user_id: profile.id,
      message: message.trim(),
    });
    setLoading(false);
    if (insErr) {
      setError(
        insErr.message.includes('support_queries')
          ? 'Support is not set up yet. Ask your admin to run the latest database migration.'
          : insErr.message
      );
      return;
    }
    setMessage('');
    setFeedback('Your message was sent. An admin will reply here when they respond.');
    load();
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 mb-6 transition"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Contact support</h1>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            Describe your problem. An administrator will reply in this thread when they can.
          </p>

          {feedback && (
            <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-2 rounded-lg mb-4 text-sm">
              {feedback}
            </div>
          )}
          {error && (
            <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your question or issue…"
              required
              minLength={10}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>

        <h2 className="text-lg font-semibold text-white mb-3">Your past requests</h2>
        {listLoading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((q) => (
              <li
                key={q.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm"
              >
                <p className="text-gray-500 text-xs mb-1">
                  {new Date(q.created_at).toLocaleString()} · {q.status}
                </p>
                <p className="text-gray-200 whitespace-pre-wrap mb-3">{q.message}</p>
                {q.admin_reply ? (
                  <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
                    <p className="text-blue-300 text-xs font-semibold mb-1">Admin reply</p>
                    <p className="text-gray-200 whitespace-pre-wrap">{q.admin_reply}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs italic">Waiting for a reply…</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
