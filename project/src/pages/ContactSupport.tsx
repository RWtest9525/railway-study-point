import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MessageSquare, PhoneCall, Clock, User as UserIcon, ArrowLeft } from 'lucide-react';
import { getDocs, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createSupportQuery } from '../lib/firestore';
import { formatDate } from '../lib/dateUtils';
import { BottomNav } from '../components/BottomNav';

interface SupportQuery {
  id: string;
  user_id: string;
  message: string;
  status: string;
  admin_reply?: string;
  created_at: string;
}

export function ContactSupport() {
  const { profile, effectiveRole } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [method, setMethod] = useState<'chat' | 'call' | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const [items, setItems] = useState<SupportQuery[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  const TOPICS = [
    ...(effectiveRole === 'banned' ? ['Unban Request'] : []),
    'Account issue',
    'Premium related issue',
    'Test related',
    'Another issue'
  ];
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [method, setMethod] = useState<'chat' | 'call' | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [items, setItems] = useState<SupportQuery[]>([]);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.id) load();
  }, [profile?.id]);

  const load = async () => {
    if (!profile?.id) {
      setListLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, 'support_queries'),
        where('user_id', '==', profile.id),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      const queries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportQuery));
      setItems(queries);
    } catch (err) {
      console.error('Error loading support queries:', err);
    }
    setListLoading(false);
  };

  const submitChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !message.trim() || !topic) return;
    setLoading(true);
    setError('');
    setFeedback('');
    
    const fullMessage = `[Topic: ${topic}]\n${message.trim()}`;
    
    try {
      await createSupportQuery({
        user_id: profile.id,
        subject: topic,
        message: fullMessage,
      });
      setMessage('');
      setTopic('');
      setMethod(null);
      setFeedback('Your support request has been sent. An admin will reply below shortly.');
      load();
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const submitCallRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !phone.trim() || !preferredTime) return;
    setLoading(true);
    setError('');
    setFeedback('');

    const callMessage = `[CALL REQUEST] Phone: ${phone.trim()} | Preferred Time: ${preferredTime}`;
    
    try {
      await createSupportQuery({
        user_id: profile.id,
        subject: 'Call Request',
        message: callMessage,
      });
      setMethod(null);
      setFeedback('Call request scheduled! An admin will call you on your provided number.');
      load();
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Header with back arrow */}
      <header className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white/95 border-gray-200'} sticky top-0 z-50 backdrop-blur-md border-b`}>
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Help & Support</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className={`text-2xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>How can we help?</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Select a preferred method to reach our team immediately.</p>
        </div>
          
          {effectiveRole === 'banned' && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-semibold border ${isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200'} flex items-start gap-3`}>
              <div className="mt-0.5">⚠️</div>
              <div>
                Your account is currently suspended. You can use this form to submit an unban request or explanation. Our administration will review it.
              </div>
            </div>
          )}



          {feedback && (
            <div className={`${isDark ? 'bg-green-900/40 border-green-600 text-green-200' : 'bg-green-100 border-green-300 text-green-700'} px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 border`}>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {feedback}
            </div>
          )}
          {error && (
            <div className={`${isDark ? 'bg-red-900/40 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'} px-4 py-3 rounded-xl mb-6 text-sm border`}>
              {error}
            </div>
          )}

          {!method ? (
            <div className="grid gap-3 mb-8">
              <button
                onClick={() => setMethod('chat')}
                className={`flex items-center gap-4 p-4 lg:p-5 rounded-2xl border transition-all text-left shadow-sm ${isDark ? 'bg-gray-800 border-gray-700 hover:border-blue-500/50' : 'bg-white border-gray-200 hover:border-blue-400/50 hover:bg-gray-50'}`}
              >
                <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <MessageSquare className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Chat Support</h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Send a direct message</p>
                </div>
              </button>

              <button
                onClick={() => setMethod('call')}
                className={`flex items-center gap-4 p-4 lg:p-5 rounded-2xl border transition-all text-left shadow-sm ${isDark ? 'bg-gray-800 border-gray-700 hover:border-amber-500/50' : 'bg-white border-gray-200 hover:border-amber-400/50 hover:bg-gray-50'}`}
              >
                <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                  <PhoneCall className={`w-6 h-6 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
                <div>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Schedule a Call</h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>We will call you back</p>
                </div>
              </button>
            </div>
          ) : method === 'chat' ? (
            <form onSubmit={submitChat} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-2">
                <button 
                  type="button" 
                  onClick={() => setMethod(null)}
                  className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  ← Change Method
                </button>
                <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Chat Support</span>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Select Topic</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={`w-full px-4 py-3.5 rounded-xl border appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold transition ${
                    isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  }`}
                  required
                >
                  <option value="" disabled>Select a topic...</option>
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Describe Problem</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
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
                  className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  ← Change Method
                </button>
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Call Scheduling</span>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <PhoneCall className="w-3 h-3" />
                  Your Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm sm:text-base appearance-none ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                  placeholder="+91 …"
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Clock className="w-3 h-3" />
                  Preferred Call Time
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm sm:text-base appearance-none ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
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
              <p className={`text-[10px] text-center italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Note: Our team usually calls back within 4-6 hours.
              </p>
            </form>
          )}

        {!method && (
          <div className="animate-in fade-in py-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Requests History</h2>
              <div className={`h-px flex-1 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} mx-4 hidden sm:block`} />
              {items.length > 5 && !showAllHistory && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory(true)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  See All
                </button>
              )}
            </div>

        {listLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className={`${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-8 text-center`}>
            <p className={`${isDark ? 'text-gray-500' : 'text-gray-600'} text-sm`}>No support requests found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(showAllHistory ? items : items.slice(0, 5)).map((q) => (
              <div
                key={q.id}
                className={`${isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'} rounded-2xl border p-5 transition`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-[10px] uppercase tracking-widest font-bold`}>
                      {formatDate(q.created_at)}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                      q.status === 'pending' ? 'text-amber-400' : 
                      q.status === 'resolved' ? 'text-green-400' : (isDark ? 'text-gray-400' : 'text-gray-500')
                    }`}>
                      Status: {q.status}
                    </span>
                  </div>
                  {q.message.startsWith('[CALL') ? (
                    <PhoneCall className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  ) : (
                    <MessageSquare className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  )}
                </div>
                
                <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} text-sm whitespace-pre-wrap line-clamp-3 mb-4`}>{q.message}</p>
                
                {q.admin_reply ? (
                  <div className={`${isDark ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'} rounded-xl border p-4 mt-2`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-3 h-3 text-white" />
                      </div>
                      <span className={`${isDark ? 'text-blue-300' : 'text-blue-600'} text-xs font-bold`}>Admin Response</span>
                    </div>
                    <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} text-sm whitespace-pre-wrap`}>{q.admin_reply}</p>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 text-[10px] italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Clock className="w-3 h-3" />
                    Waiting for an administrator to review your request...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
          </div>
        )}
        </main>
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}