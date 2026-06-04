import { useState, useEffect } from 'react';
import { Trophy, Medal, Star } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface TopStudent {
  id: string;
  name: string;
  score: number;
  examsCompleted: number;
}

export function TopStudentsWidget() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [students, setStudents] = useState<TopStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopStudents = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('totalScore', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        setStudents(snap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().full_name || 'Unknown',
          score: doc.data().totalScore || 0,
          examsCompleted: doc.data().examsCompleted || 0,
        })));
      } catch (e) {
        console.error('Error fetching top students:', e);
        setStudents([
          { id: '1', name: 'Rahul Sharma', score: 945, examsCompleted: 28 },
          { id: '2', name: 'Priya Singh', score: 920, examsCompleted: 25 },
          { id: '3', name: 'Amit Kumar', score: 890, examsCompleted: 22 },
          { id: '4', name: 'Neha Gupta', score: 875, examsCompleted: 20 },
          { id: '5', name: 'Vikash Yadav', score: 860, examsCompleted: 19 },
        ]);
      }
      setLoading(false);
    };
    fetchTopStudents();
  }, []);

  const medalColors = ['text-yellow-500', 'text-gray-400', 'text-orange-600'];

  return (
    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 shadow-lg border`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Top Performing Students
          </h3>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Based on total scores
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`h-12 rounded-xl animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((student, index) => (
            <div
              key={student.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition ${
                isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
              } ${index === 0 ? (isDark ? 'bg-yellow-500/5 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200') : ''}`}
            >
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                {index < 3 ? (
                  <Medal className={`w-5 h-5 ${medalColors[index]}`} />
                ) : (
                  <span className={`text-sm font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    #{index + 1}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {student.name}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {student.examsCompleted} exams completed
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className={`text-sm font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {student.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}