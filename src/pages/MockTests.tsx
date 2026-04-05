import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  FileText,
  Clock,
  Crown,
  Lock
} from 'lucide-react';

type Exam = {
  id: string;
  title: string;
  category: string;
  question_ids: string[];
  duration_minutes: number;
  is_premium: boolean;
  created_at: string;
};

export default function MockTests() {
  const { isPremium, canAccessTests } = useAuth();
  const { navigate, currentPath } = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // Extract categoryId from URL: /mock-tests/GROUP_D
  const categoryId = currentPath.split('/mock-tests/')[1] || '';

  useEffect(() => {
    window.scrollTo(0, 0);
    loadExams();
  }, [categoryId]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('category', categoryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter only mock tests
      const mockTests = (data || []).filter(exam => 
        exam.title.toLowerCase().includes('mock') || 
        exam.title.toLowerCase().includes('full test')
      );
      
      setExams(mockTests);
    } catch (err) {
      console.error('Error loading exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExamClick = (exam: Exam) => {
    if (!canAccessTests) {
      navigate('/upgrade');
      return;
    }
    if (exam.is_premium && !isPremium) {
      navigate('/upgrade');
      return;
    }
    navigate(`/exam/${exam.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      <header className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-lg">Full Mock Tests</h1>
            <p className="text-xs text-gray-400">{categoryId}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
            <p className="text-gray-400 mt-4">Loading tests...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No mock tests available for this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                onClick={() => handleExamClick(exam)}
                className="bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-gray-200 group-hover:text-white transition line-clamp-2">
                    {exam.title}
                  </h3>
                  {exam.is_premium && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Crown className="w-4 h-4" />
                      {!isPremium && <Lock className="w-3 h-3" />}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {exam.duration_minutes}m
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {exam.question_ids.length} Qs
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}