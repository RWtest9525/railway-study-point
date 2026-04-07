import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MessageSquare, Check, Clock, X } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<SupportQuery | null>(null);

  useEffect(() => {
    loadQueries();
  }, []);

  const loadQueries = async () => {
    try {
      const queriesRef = collection(db, 'support_queries');
      const q = query(queriesRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      const supportQueries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportQuery));
      setQueries(supportQueries);
    } catch (error) {
      console.error('Error loading support queries:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (queryId: string, status: 'pending' | 'resolved' | 'closed') => {
    try {
      const queryRef = doc(db, 'support_queries', queryId);
      await updateDoc(queryRef, {
        status,
        updated_at: new Date().toISOString(),
      });
      loadQueries();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-yellow-400">
            <Clock className="w-4 h-4" /> Pending
          </span>
        );
      case 'resolved':
        return (
          <span className="flex items-center gap-1 text-green-400">
            <Check className="w-4 h-4" /> Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="flex items-center gap-1 text-gray-400">
            <X className="w-4 h-4" /> Closed
          </span>
        );
      default:
        return <span className="text-gray-400">{status}</span>;
    }
  };

  if (loading) {
    return <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>;
  }

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Support Inbox</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage user support queries</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-yellow-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {queries.filter(q => q.status === 'pending').length}
          </p>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <Check className="w-6 h-6 text-green-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Resolved</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {queries.filter(q => q.status === 'resolved').length}
          </p>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <X className="w-6 h-6 text-gray-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Closed</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {queries.filter(q => q.status === 'closed').length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border overflow-hidden`}>
            <div className="px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}">
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>All Queries</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {queries.map((query) => (
                <div
                  key={query.id}
                  onClick={() => setSelectedQuery(query)}
                  className={`p-4 border-b cursor-pointer transition ${
                    isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                  } ${selectedQuery?.id === query.id ? (isDark ? 'bg-gray-700' : 'bg-blue-50') : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {query.subject}
                    </span>
                    {getStatusBadge(query.status)}
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {query.message.substring(0, 50)}...
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {new Date(query.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedQuery ? (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedQuery.subject}
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    User ID: {selectedQuery.user_id.substring(0, 16)}...
                  </p>
                </div>
                {getStatusBadge(selectedQuery.status)}
              </div>

              <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {selectedQuery.message}
                </p>
              </div>

              <div className="flex gap-4">
                {selectedQuery.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus(selectedQuery.id, 'resolved')}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                    >
                      <Check className="w-4 h-4" />
                      Mark Resolved
                    </button>
                    <button
                      onClick={() => updateStatus(selectedQuery.id, 'closed')}
                      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition"
                    >
                      <X className="w-4 h-4" />
                      Close
                    </button>
                  </>
                )}
                {selectedQuery.status === 'resolved' && (
                  <button
                    onClick={() => updateStatus(selectedQuery.id, 'closed')}
                    className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    <X className="w-4 h-4" />
                    Close Ticket
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-8 text-center`}>
              <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Select a query to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}