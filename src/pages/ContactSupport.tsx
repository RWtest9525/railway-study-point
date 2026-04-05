import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { MessageSquare, PhoneCall, ChevronRight, Clock, User as UserIcon } from 'lucide-react';
import type { Database } from '../lib/database.types';

type QueryRow = Database['public']['Tables']['support_queries']['Row'];

const TOPICS = [
  'Account issue',
  'Premium related issue',
  'Test related',
  'Another issue'
];

export function ContactSupport() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [method, setMethod] = useState<'chat' | 'call' | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [preferredTime, setPreferredTime] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [items, setItems] = useState<QueryRow[]>([]);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile?.phone]);

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

  const submitChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !message.trim() || !topic) return;
    setLoading(true);
    setError('');
    setFeedback('');
    
    const fullMessage = `[Topic: ${topic}]\n${message.trim()}`;
    
    const { error: insErr } = await supabase.from('support_queries').insert({
      user_id: profile.id,
      message: fullMessage,
    });
    setLoading(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setMessage('');
    setTopic('');
    setMethod(null);
    setFeedback('Your support request has been sent. An admin will reply below shortly.');
    load();
  };

  const submitCallRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !phone.trim() || !preferredTime) return;
    setLoading(true);
    setError('');
    setFeedback('');

    const callMessage = `[CALL REQUEST] Phone: ${phone.trim()} | Preferred Time: ${preferredTime}`;
    
    const { error: insErr } = await supabase.from('support_queries').insert({
      user_id: profile.id,
      message: callMessage,
    });
    setLoading(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setMethod(null);
    setFeedback('Call request scheduled! An admin will call you on your provided number.');
    load();
  };

  return (
    <div className="min-h-screen bg-gray-900 py-6 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 mb-6 transition flex items-center gap-1 text-sm sm:text-base"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Help & Support</h1>
          </div>
          
          <p className="text-gray-400 text-sm mb-8">
            Choose how you'd like to get assistance from our team.
          </p>

          {feedback && (
            <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {feedback}
            </div>
          )}
          {error && (
            <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {!method ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMethod('chat')}
                className="flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-blue-500 rounded-2xl transition-all group"
              >
                <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-white font-bold mb-1">Help via Chat</span>
                <span className="text-gray-400 text-xs text-center">Instant support via messaging</span>
              </button>

              <button
                onClick={() => setMethod('call')}
                className="flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-amber-500 rounded-2xl transition-all group"
              >
                <div className="w-12 h-12 bg-amber-600/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <PhoneCall className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-white font-bold mb-1">Help via Call</span>
                <span className="text-gray-400 text-xs text-center">Schedule a call with admin</span>
              </button>
            </div>
          ) : method === 'chat' ? (
            <form onSubmit={submitChat} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-2">
                <button 
                  type="button" 
                  onClick={() => setMethod(null)}
                  className="text-gray-400 hover:text-white text-xs flex items-center gap-1"
                >
                  ← Change Method
                </button>
                <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Chat Support</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select Topic</label>
                <div className="grid grid-cols-2 gap-2">
                  {TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopic(t)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                        topic === t 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Describe Problem</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="Tell us what's wrong…"
                  required
                  minLength={5}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !topic}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 shadow-lg shadow-blue-900/20"
              >
                {loading ? 'Sending…' : 'Start Chat Support'}
              </button>
            </form>
          ) : (
            <form onSubmit={submitCallRequest} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-2">
                <button 
                  type="button" 
                  onClick={() => setMethod(null)}
                  className="text-gray-400 hover:text-white text-xs flex items-center gap-1"
                >
                  ← Change Method
                </button>
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Call Scheduling</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <PhoneCall className="w-3 h-3" />
                  Your Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm sm:text-base"
                  placeholder="+91 …"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Preferred Call Time
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm sm:text-base appearance-none"
                  required
                >
                  <option value="">Choose a time window…</option>
                  <option value="Morning (10 AM - 12 PM)">Morning (10 AM - 12 PM)</option>
                  <option value="Afternoon (1 PM - 4 PM)">Afternoon (1 PM - 4 PM)</option>
                  <option value="Evening (5 PM - 8 PM)">Evening (5 PM - 8 PM)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 shadow-lg shadow-amber-900/20"
              >
                {loading ? 'Scheduling…' : 'Schedule Callback'}
              </button>
              <p className="text-[10px] text-gray-500 text-center italic">
                Note: Our team usually calls back within 4-6 hours.
              </p>
            </form>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Your Requests History</h2>
          <div className="h-px flex-1 bg-gray-800 mx-4" />
        </div>

        {listLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8 text-center">
            <p className="text-gray-500 text-sm">No support requests found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((q) => (
              <div
                key={q.id}
                className="bg-gray-800 border border-gray-700 rounded-2xl p-5 hover:border-gray-600 transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                      {new Date(q.created_at).toLocaleDateString()} at {new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                      q.status === 'open' ? 'text-amber-400' : 
                      q.status === 'replied' ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      Status: {q.status}
                    </span>
                  </div>
                  {q.message.startsWith('[CALL') ? (
                    <PhoneCall className="w-4 h-4 text-amber-400" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                
                <p className="text-gray-200 text-sm whitespace-pre-wrap line-clamp-3 mb-4">{q.message}</p>
                
                {q.admin_reply ? (
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4 mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-blue-300 text-xs font-bold">Admin Response</span>
                    </div>
                    <p className="text-gray-200 text-sm whitespace-pre-wrap">{q.admin_reply}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 text-[10px] italic">
                    <Clock className="w-3 h-3" />
                    Waiting for an administrator to review your request...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
