import { useEffect, useState } from 'react';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { getExams, Exam } from '../lib/firestore';
import { FileText, Clock, ArrowLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

export function PreviousYearPapers() {
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const examsData = await getExams();
      setExams(examsData);
    } catch (error) {
      console.error('Error loading previous year papers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white/95 border-gray-200'} sticky top-0 z-50 backdrop-blur-md border-b`}>
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Previous Year Papers</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : exams.length === 0 ? (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-8 text-center`}>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No previous year papers available yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className={`${isDark ? 'bg-gray-800 border-gray-700 hover:border-amber-500' : 'bg-white border-gray-200 hover:border-amber-400'} rounded-2xl border p-5 transition cursor-pointer`}
                onClick={() => navigate(`/exam/${exam.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {exam.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Clock className="w-4 h-4" />
                        {exam.duration_minutes} mins
                      </span>
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-amber-600/20' : 'bg-amber-100'
                  }`}>
                    <FileText className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
