import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useRouter } from '../contexts/RouterContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, BarChart3, Target, CheckCircle, XCircle, Clock } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

type AttemptHistoryInfo = {
  id: string;
  exam_id: string;
  exam_title: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  submitted_at: string;
  answers: any[];
};

export function History() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { goBack, navigate } = useRouter();
  const isDark = theme === 'dark';
  
  const [history, setHistory] = useState<AttemptHistoryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Overall stats
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [totalUnattempted, setTotalUnattempted] = useState(0);

  useEffect(() => {
    async function loadHistory() {
      if (!user?.uid) return;
      
      try {
        const attemptsRef = collection(db, 'attempts');
        const q = query(attemptsRef, where('user_id', '==', user.uid), orderBy('submitted_at', 'desc'));
        const snap = await getDocs(q);
        
        const loadedHistory: AttemptHistoryInfo[] = [];
        let rCorrect = 0;
        let rWrong = 0;
        let rUnattempted = 0;
        
        for (const doc of snap.docs) {
          const data = doc.data();
          
          // Get exam details to show title if not cached in attempt
          // Usually we can just rely on the fact that if they have attempt, they have answers
          const correct = data.correct_answers || 0;
          const totalQ = data.total_questions || 0;
          const skippedCount = (data.answers || []).filter((a: any) => a.skipped || a.selectedOption < 0).length;
          const wrong = totalQ - correct - skippedCount;
          
          rCorrect += correct;
          rWrong += wrong;
          rUnattempted += skippedCount;
          
          // Try to get exam title from exams col
          let examTitle = 'Unknown Exam';
          try {
            const examRef = collection(db, 'exams');
            const eq = query(examRef, where('__name__', '==', data.exam_id));
            const esnap = await getDocs(eq);
            if (!esnap.empty) {
              examTitle = esnap.docs[0].data().title;
            }
          } catch(e) {}
          
          loadedHistory.push({
            id: doc.id,
            exam_id: data.exam_id,
            exam_title: examTitle,
            score: data.score,
            total_questions: totalQ,
            correct_answers: correct,
            time_taken_seconds: data.time_taken_seconds,
            submitted_at: data.submitted_at,
            answers: data.answers || [],
          });
        }
        
        setTotalCorrect(rCorrect);
        setTotalWrong(rWrong);
        setTotalUnattempted(rUnattempted);
        setHistory(loadedHistory);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadHistory();
  }, [user?.uid]);

  const totalQuestionsAll = totalCorrect + totalWrong + totalUnattempted;
  
  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} sticky top-0 z-50 backdrop-blur-md border-b`}>
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => goBack()}
            className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>My Test History</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-12 text-center`}>
            <BarChart3 className={`w-12 h-12 mx-auto mb-4 opacity-20 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`${isDark ? 'text-gray-500' : 'text-gray-600'} text-sm`}>No test history yet. Give an exam to see analytics!</p>
          </div>
        ) : (
          <>
            {/* Analytics Chart Summary */}
            <div className={`mb-8 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border shadow-lg`}>
              <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Overall Performance</h2>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 flex gap-2 h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  <div 
                    className="bg-green-500 h-full" 
                    style={{ width: `${(totalCorrect / totalQuestionsAll) * 100}%` }} 
                  />
                  <div 
                    className="bg-red-500 h-full" 
                    style={{ width: `${(totalWrong / totalQuestionsAll) * 100}%` }} 
                  />
                  <div 
                    className="bg-gray-400 dark:bg-gray-500 h-full" 
                    style={{ width: `${(totalUnattempted / totalQuestionsAll) * 100}%` }} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="text-xl font-bold text-green-500 mb-1">{totalCorrect}</div>
                  <div className={`text-xs flex items-center justify-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <CheckCircle className="w-3 h-3" /> Correct
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="text-xl font-bold text-red-500 mb-1">{totalWrong}</div>
                  <div className={`text-xs flex items-center justify-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <XCircle className="w-3 h-3" /> Wrong
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className={`text-xl font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{totalUnattempted}</div>
                  <div className={`text-xs flex items-center justify-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Target className="w-3 h-3" /> Skipped
                  </div>
                </div>
              </div>
            </div>

            {/* List of Previous Attempts */}
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Exam Logs</h3>
            <div className="space-y-4">
              {history.map((record) => {
                const date = new Date(record.submitted_at);
                const isPassed = (record.score / record.total_questions) >= 0.6; // Assuming 60% is pass for demo
                
                return (
                  <button
                    key={record.id}
                    onClick={() => navigate(`/results/${record.id}`)}
                    className={`w-full text-left p-5 rounded-2xl border transition shadow-sm hover:-translate-y-1 ${
                      isDark 
                        ? 'bg-gray-800 border-gray-700 hover:border-blue-500' 
                        : 'bg-white border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {record.exam_title}
                        </h4>
                        <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {date.toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isPassed 
                          ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                          : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                      }`}>
                        {record.score} Pts
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {record.correct_answers} correct
                      </div>
                      <div className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Clock className="w-4 h-4 text-blue-500" />
                        {Math.floor(record.time_taken_seconds / 60)}m {record.time_taken_seconds % 60}s
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
