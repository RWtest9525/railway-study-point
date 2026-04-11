import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Check, Clock, MessageSquare, Search, X, LucideIcon } from 'lucide-react';
import { getUsers, UserProfile } from '../../lib/firestore';

interface SupportQuery {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

export function SupportInbox() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<SupportQuery | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'closed'>('all');

  useEffect(() => {
    void loadQueries();
  }, []);

  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const filteredQueries = useMemo(() => {
    let result = queries;
    if (statusFilter !== 'all') {
      result = result.filter(q => q.status === statusFilter);
    }
    const value = search.toLowerCase().trim();
    if (!value) return result;
    return result.filter((query) => {
      const user = profileById.get(query.user_id);
      return `${query.subject} ${query.message} ${user?.full_name || ''} ${user?.email || ''}`.toLowerCase().includes(value);
    });
  }, [queries, search, profileById, statusFilter]);

  const loadQueries = async () => {
    try {
      const [snapshot, users] = await Promise.all([
        getDocs(query(collection(db, 'support_queries'), orderBy('created_at', 'desc'))),
        getUsers(),
      ]);
      const supportQueries = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as SupportQuery));
      setQueries(supportQueries);
      setProfiles(users);
      if (!selectedQuery && supportQueries[0]) setSelectedQuery(supportQueries[0]);
    } catch (error) {
      console.error('Error loading support queries:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (queryId: string, status: 'pending' | 'resolved' | 'closed') => {
    try {
      await updateDoc(doc(db, 'support_queries', queryId), {
        status,
        updated_at: new Date().toISOString(),
      });
      await loadQueries();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"><Clock className="h-3.5 w-3.5" /> Pending</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"><Check className="h-3.5 w-3.5" /> Resolved</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"><X className="h-3.5 w-3.5" /> Closed</span>;
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

      <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-4">
        {([
          { label: 'All', value: queries.length, icon: MessageSquare, tone: 'text-blue-500', id: 'all' },
          { label: 'Pending', value: queries.filter((q) => q.status === 'pending').length, icon: Clock, tone: 'text-yellow-500', id: 'pending' },
          { label: 'Resolved', value: queries.filter((q) => q.status === 'resolved').length, icon: Check, tone: 'text-green-500', id: 'resolved' },
          { label: 'Closed', value: queries.filter((q) => q.status === 'closed').length, icon: X, tone: 'text-slate-500', id: 'closed' },
        ] as Array<{ label: string; value: number; icon: LucideIcon; tone: string; id: any }>).map(({ label, value, icon: Icon, tone, id }) => (
          <button 
            key={label} 
            onClick={() => setStatusFilter(id)}
            className={`text-left text-inherit transition-all ${isDark ? 'bg-gray-800' : 'bg-white'} ${statusFilter === id ? `border-2 ${isDark ? 'border-teal-500' : 'border-teal-600'} shadow-md` : `border ${isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'}`} rounded-3xl p-6`}
          >
            <div className="mb-2 flex items-center gap-3">
              <Icon className={`h-6 w-6 ${tone}`} />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border overflow-hidden shadow-sm`}>
          <div className={`border-b px-6 py-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>All Tickets</h2>
            <label className="relative mt-3 block">
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
                  className={`w-full border-b p-4 text-left transition ${
                    isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                  } ${selectedQuery?.id === item.id ? (isDark ? 'bg-gray-700' : 'bg-blue-50') : ''}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.subject}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user?.full_name || 'Unknown user'} • {user?.email || item.user_id}
                  </div>
                  <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.message.substring(0, 80)}...
                  </p>
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
                      <div>
                        <h2 className={`mb-1 text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {selectedQuery.subject}
                        </h2>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user?.full_name || 'Unknown user'} • {user?.email || selectedQuery.user_id}
                          {user?.phone ? ` • ${user.phone}` : ''}
                        </div>
                        <div className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(selectedQuery.created_at).toLocaleString()}
                        </div>
                      </div>
                      {getStatusBadge(selectedQuery.status)}
                    </div>

                    <div className={`mb-6 rounded-2xl p-5 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                      <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} leading-7`}>
                        {selectedQuery.message}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {selectedQuery.status !== 'resolved' && (
                        <button
                          onClick={() => void updateStatus(selectedQuery.id, 'resolved')}
                          className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {selectedQuery.status !== 'closed' && (
                        <button
                          onClick={() => void updateStatus(selectedQuery.id, 'closed')}
                          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                        >
                          Close Ticket
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
