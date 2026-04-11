import { useState, useEffect } from 'react';
import { Search, X, Check, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface SearchResult {
  id: string;
  type: 'question' | 'exam' | 'user';
  title: string;
  subtitle: string;
  icon: JSX.Element;
}

export function SearchAutocomplete({ onSearch }: { onSearch: (result: SearchResult) => void }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setShowResults(true);
    setLoading(true);
    searchDatabase();
  }, [searchTerm]);

  const searchDatabase = async () => {
    try {
      const [questions, exams, users] = await Promise.all([
        searchQuestions(),
        searchExams(),
        searchUsers(),
      ]);
      const combined = [...questions, ...exams, ...users].slice(0, 8);
      setResults(combined);
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const searchQuestions = async () => {
    const q = query(
      collection(db, 'questions'),
      orderBy('questionText'),
      limit(4)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data() as { questionText?: string };
      return {
        id: doc.id,
        type: 'question' as const,
        title: (data.questionText || '').toString().substring(0, 50) || 'Question',
        subtitle: `Question ID: ${doc.id}`,
        icon: <Search className="w-4 h-4 text-blue-500" />,
      };
    });
  };

  const searchExams = async () => {
    const q = query(
      collection(db, 'exams'),
      orderBy('examName'),
      limit(2)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data() as { examName?: string; category?: string };
      return {
        id: doc.id,
        type: 'exam' as const,
        title: (data.examName || '').toString() || 'Exam',
        subtitle: `Category: ${data.category || 'General'}`,
        icon: <Check className="w-4 h-4 text-green-500" />,
      };
    });
  };

  const searchUsers = async () => {
    const q = query(
      collection(db, 'users'),
      orderBy('full_name'),
      limit(2)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data() as { full_name?: string; email?: string };
      return {
        id: doc.id,
        type: 'user' as const,
        title: data.full_name || 'User',
        subtitle: `Email: ${data.email || 'N/A'}`,
        icon: <AlertCircle className="w-4 h-4 text-purple-500" />,
      };
    });
  };

  const handleSelect = (result: SearchResult) => {
    onSearch(result);
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className={`relative ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border shadow-lg`}>
          <div className="flex items-center gap-3 p-3">
            <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions, exams, users..."
              className={`flex-1 px-3 py-2 text-sm ${isDark ? 'bg-transparent text-white placeholder-gray-500' : 'bg-transparent text-gray-900 placeholder-gray-400'}`}
              onFocus={() => setShowResults(true)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`p-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showResults && (
        <div className={`absolute top-full w-full mt-1 z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border shadow-lg max-h-96 overflow-y-auto`}>
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-10 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center">
              <Search className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No results found
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Try searching with at least 2 characters
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                    index === results.length - 1 ? '' : 'border-b border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="w-6 h-6 flex-shrink-0">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {result.title}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {result.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
