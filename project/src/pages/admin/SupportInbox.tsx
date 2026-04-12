import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { collection, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Check, Clock, MessageSquare, Search, X, LucideIcon, ArrowUpDown } from 'lucide-react';
import { getUsers, UserProfile } from '../../lib/firestore';
import { formatDate } from '../../lib/dateUtils';

interface SupportQuery {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved' | 'closed';
  created_at: any;
  updated_at: any;
}

export function SupportInbox() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<SupportQuery | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'chat' | 'call'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    void fetchUsersOnce();
  }, []);

  const fetchUsersOnce = async () => {
    try {
      const users = await getUsers();
      setProfiles(users);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'support_queries'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const supportQueries = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as SupportQuery));
      setQueries(supportQueries);
      setLoading(false);
      
      // Auto-select if nothing is selected yet
      setSelectedQuery(current => {
        if (!current && supportQueries.length > 0) return supportQueries[0];
        // If currently selected query was updated, update its content
        if (current) {
          const updated = supportQueries.find(q => q.id === current.id);
          if (updated) return updated;
        }
        return current;
      });
    }, (error) => {
      console.error('Error loading support queries:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const filteredQueries = useMemo(() => {
    let result = queries;
    if (statusFilter !== 'all') {
      if (statusFilter === 'resolved') {
        result = result.filter(q => q.status === 'resolved' || q.status === 'closed');
      } else {
        result = result.filter(q => q.status === statusFilter);
      }
    }
    
    // Type Filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'call') {
        result = result.filter((q) => {
          const s = q.subject?.toLowerCase() || '';
          const m = q.message?.toUpperCase() || '';
          return s === 'call request' || m.includes('[CALL REQUEST]') || m.startsWith('[CALL');
        });
      } else if (typeFilter === 'chat') {
        result = result.filter((q) => {
          const s = q.subject?.toLowerCase() || '';
          const m = q.message?.toUpperCase() || '';
          return s !== 'call request' && !m.includes('[CALL REQUEST]') && !m.startsWith('[CALL');
        });
      }
    }

    const value = search.toLowerCase().trim();
    
    // Search
    if (value) {
      result = result.filter((query) => {
        const user = profileById.get(query.user_id);
        return `${query.subject} ${query.message} ${user?.full_name || ''} ${user?.email || ''}`.toLowerCase().includes(value);
      });
    }

    // Sort
    result.sort((a, b) => {
      const timeA = a.created_at?.seconds ? a.created_at.seconds : new Date(a.created_at).getTime();
      const timeB = b.created_at?.seconds ? b.created_at.seconds : new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [queries, search, profileById, statusFilter, sortOrder]);


  const updateStatus = async (queryId: string, status: 'pending' | 'resolved' | 'closed') => {
    try {
      await updateDoc(doc(db, 'support_queries', queryId), {
        status,
        updated_at: new Date().toISOString(),
      });
      // onSnapshot overrides it so we don't need loadQueries()
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const effectiveStatus = status === 'closed' ? 'resolved' : status;
    switch (effectiveStatus) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"><Clock className="h-3.5 w-3.5" /> Pending</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"><Check className="h-3.5 w-3.5" /> Resolved</span>;
      default:
        return <span className="text-gray-400">{status}</span>;
    }
  };

  if (loading) {
    return <div className={`py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>;
  }

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6">
        <h1 className={`mb-2 text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Support Inbox</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage user support queries with faster search and cleaner ticket handling.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        {([
          { label: 'All', value: queries.length, icon: MessageSquare, id: 'all' },
          { label: 'Pending', value: queries.filter((q) => q.status === 'pending').length, icon: Clock, id: 'pending' },
          { label: 'Resolved', value: queries.filter((q) => q.status === 'resolved' || q.status === 'closed').length, icon: Check, id: 'resolved' },
        ] as Array<{ label: string; value: number; icon: LucideIcon; id: any }>).map(({ label, value, icon: Icon, id }) => {
          const isActive = statusFilter === id;
          return (
            <button 
              key={label} 
              onClick={() => setStatusFilter(id)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all duration-200 active:scale-95 shadow-sm ${
                isActive 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-blue-500/20 shadow-lg' 
                  : isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
              <span className="font-bold text-sm">{label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                isActive ? 'bg-white/20 text-white' : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}>
                {value}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border overflow-hidden shadow-sm`}>
          <div className={`border-b px-6 py-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>All Tickets</h2>
              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border focus:outline-none transition ${isDark ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  <option value="all">All Types</option>
                  <option value="chat">Chat Requests</option>
                  <option value="call">Call Requests</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition hover:bg-opacity-50 ${isDark ? 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                </button>
              </div>
            </div>
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user or message"
                className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'}`}
              />
            </label>
          </div>
          <div className="max-h-[580px] overflow-y-auto">
            {filteredQueries.map((item) => {
              const user = profileById.get(item.user_id);
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedQuery(item)}
                  className={`w-full border-b p-5 text-left transition ${
                    isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                  } ${selectedQuery?.id === item.id ? (isDark ? 'bg-gray-700' : 'bg-blue-50') : ''}`}
                >
                  <div className="flex gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0 border mt-1">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-100">
                          {user?.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.subject}</span>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user?.full_name || 'Unknown user'} • {formatDate(item.created_at)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {selectedQuery ? (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border p-6 shadow-sm`}>
              {(() => {
                const user = profileById.get(selectedQuery.user_id);
                return (
                  <>
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 border-2 shadow-sm border-white shrink-0 hidden sm:block">
                          {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-500 bg-gray-100">
                              {user?.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div>
                          <h2 className={`mb-1 text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {selectedQuery.subject}
                          </h2>
                          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user?.full_name || 'Unknown user'} • {user?.email || selectedQuery.user_id}
                            {user?.phone ? ` • ${user.phone}` : ''}
                          </div>
                          <div className={`mt-1.5 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Submitted: {formatDate(selectedQuery.created_at)}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(selectedQuery.status)}
                    </div>

                    {(() => {
                      const m = selectedQuery.message || '';
                      const s = selectedQuery.subject || '';
                      const isCallRequest = s.toLowerCase() === 'call request' || m.toUpperCase().includes('[CALL REQUEST]') || m.toUpperCase().startsWith('[CALL');

                      if (isCallRequest) {
                        return (
                      <div className={`mb-6 rounded-2xl p-6 ${isDark ? 'bg-amber-900/10 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'} shadow-sm`}>
                        <h3 className={`font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                          <Clock className="w-5 h-5" /> Phone Callback Requested
                        </h3>
                        {(() => {
                           const parts = selectedQuery.message.split('|');
                           let phonePart = 'N/A';
                           let timePart = 'N/A';
                           if (parts.length > 1) {
                             phonePart = parts[0]?.replace(/\[CALL REQUEST\]\s*Phone:/i, '').trim() || 'N/A';
                             timePart = parts[1]?.replace(/Preferred Time:/i, '').trim() || 'N/A';
                           } else {
                             // Fallback if there is no pipe character
                             const match = selectedQuery.message.match(/Phone:\s*(.*?)(?:\s*\|\s*Preferred Time:\s*(.*))?$/i);
                             if (match) {
                               phonePart = match[1]?.trim() || 'N/A';
                               timePart = match[2]?.trim() || 'N/A';
                             } else {
                               phonePart = selectedQuery.message.replace(/\[CALL REQUEST\]/i, '').trim();
                             }
                           }
                           
                           return (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                                 <span className={`block text-xs uppercase font-extrabold tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'} mb-1`}>Callback Number</span>
                                 <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{phonePart}</span>
                               </div>
                               <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                                 <span className={`block text-xs uppercase font-extrabold tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'} mb-1`}>Preferred Window</span>
                                 <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{timePart}</span>
                               </div>
                             </div>
                           )
                        })()}
                      </div>
                        );
                      } else {
                        return (
                      <div className={`mb-6 rounded-2xl p-5 sm:p-6 ${isDark ? 'bg-gray-900/80 border border-gray-800' : 'bg-gray-50 border border-gray-100'}`}>
                        <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} leading-relaxed whitespace-pre-wrap`}>
                          {selectedQuery.message.replace(`[Topic: ${selectedQuery.subject}]`, '').trim()}
                        </p>
                      </div>
                        );
                      }
                    })()}

                    <div className="flex flex-wrap gap-3">
                      {selectedQuery.status !== 'resolved' && selectedQuery.status !== 'closed' && (
                        <button
                          onClick={() => void updateStatus(selectedQuery.id, 'resolved')}
                          className="rounded-2xl bg-green-600 hover:bg-green-700 transition px-6 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/20"
                        >
                          Mark as Resolved
                        </button>
                      )}
                      {selectedQuery.status !== 'pending' && (
                        <button
                          onClick={() => void updateStatus(selectedQuery.id, 'pending')}
                          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-50 text-amber-700'}`}
                        >
                          Mark Pending
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border p-8 text-center shadow-sm`}>
              <MessageSquare className={`mx-auto mb-4 h-12 w-12 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
