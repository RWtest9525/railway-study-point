import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Send } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type QueryRow = Database['public']['Tables']['support_queries']['Row'];

export function SupportInbox() {
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('support_queries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows(data ?? []);
    
    // Fetch all profiles for these users in one go instead of a loop
    const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      
      const map: Record<string, string> = {};
      profiles?.forEach(p => {
        map[p.id] = `${p.full_name || 'User'} <${p.email}>`;
      });
      setEmails(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const sendReply = async (row: QueryRow) => {
    const text = (replyDraft[row.id] ?? '').trim();
    if (!text) return;
    setSavingId(row.id);
    const { error } = await supabase
      .from('support_queries')
      .update({
        admin_reply: text,
        status: 'replied',
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    setSavingId(null);
    if (!error) {
      setReplyDraft((d) => ({ ...d, [row.id]: '' }));
      load();
    }
  };

  if (loading) {
    return <p className="text-gray-400">Loading support inbox…</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-6 h-6 text-cyan-400" />
        <h2 className="text-2xl font-bold text-white">Support queries</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-gray-500">No support messages yet.</p>
      ) : (
        <div className="space-y-6">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-gray-800/80 border border-gray-700 rounded-xl p-5"
            >
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <span className="text-gray-400 text-sm">
                  {emails[row.user_id] || row.user_id}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(row.created_at).toLocaleString()} · {row.status}
                </span>
              </div>
              <p className="text-gray-200 whitespace-pre-wrap mb-4">{row.message}</p>
              {row.admin_reply && (
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 mb-4 text-sm">
                  <span className="text-blue-400 text-xs font-semibold">Previous reply</span>
                  <p className="text-gray-300 whitespace-pre-wrap mt-1">{row.admin_reply}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <textarea
                  value={replyDraft[row.id] ?? ''}
                  onChange={(e) =>
                    setReplyDraft((d) => ({ ...d, [row.id]: e.target.value }))
                  }
                  rows={3}
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 text-sm"
                  placeholder="Type your reply to the student…"
                />
                <button
                  type="button"
                  onClick={() => sendReply(row)}
                  disabled={savingId === row.id || !(replyDraft[row.id] ?? '').trim()}
                  className="self-end sm:self-stretch flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 text-sm shrink-0"
                >
                  <Send className="w-4 h-4" />
                  {savingId === row.id ? 'Saving…' : 'Send reply'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
