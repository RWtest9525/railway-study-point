import { useEffect, useState } from 'react';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { getExams, getCategory, Exam, Category } from '../lib/firestore';
import { Clock, ArrowLeft, Award, Layers3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BottomNav } from '../components/BottomNav';

interface ExamDetailSelectionProps {
  categoryId: string;
}

export function ExamDetailSelection({ categoryId }: ExamDetailSelectionProps) {
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const { canAccessTests, isPremium } = useAuth();
  const isDark = theme === 'dark';
  const [exams, setExams] = useState<Exam[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategoryAndExams();
  }, [categoryId]);

  const loadCategoryAndExams = async () => {
    try {
      const categoryData = await getCategory(categoryId);
      if (categoryData) {
        setCategory(categoryData);
      }

      const examsData = await getExams();
      const filteredExams = examsData.filter(exam => exam.category_id === categoryId);
      setExams(filteredExams);
    } catch (error) {
      console.error('Error loading exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const startExam = (exam: Exam) => {
    if (!canAccessTests || (exam.is_premium && !isPremium)) {
      navigate('/upgrade');
      return;
    }
    const ok = confirm(`Start "${exam.title}" now?`);
    if (ok) navigate(`/exam/${exam.id}`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-lg`}>Loading...</p>
        </div>
      </div>
    );
  }

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
          <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {category?.name || 'Available Tests'}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {category && (
          <div className={`mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-[28px] border p-5`}>
            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {category.name}
            </h2>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {category.description || 'Select a test to begin'}
            </p>
          </div>
        )}

        {exams.length === 0 ? (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-8 text-center`}>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No tests available in this category yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className={`${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 hover:border-blue-500' 
                    : 'bg-white border-gray-200 hover:border-blue-400'
                } rounded-[26px] border p-5 transition`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {exam.title}
                      </h3>
                      {exam.is_premium && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Premium</span>}
                    </div>
                    <p className={`mb-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {exam.description || 'Tap below to begin this test.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Clock className="w-4 h-4" />
                        {exam.duration_minutes} mins
                      </span>
                      <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Award className="w-4 h-4" />
                        {exam.total_marks} marks
                      </span>
                      <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Layers3 className="w-4 h-4" />
                        {exam.category_id}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => startExam(exam)}
                  className={`mt-5 w-full rounded-2xl py-3 text-sm font-semibold ${
                    !canAccessTests || (exam.is_premium && !isPremium)
                      ? 'bg-amber-500 text-white'
                      : isDark
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {!canAccessTests || (exam.is_premium && !isPremium) ? 'Unlock to Start' : 'Start This Exam'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
