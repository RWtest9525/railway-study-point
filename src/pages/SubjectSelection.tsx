import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { 
  ArrowLeft, 
  BookOpen, 
  ChevronRight, 
  Brain, 
  FlaskConical, 
  Calculator,
  Crown,
  Clock,
  Users
} from 'lucide-react';

type Exam = Database['public']['Tables']['exams']['Row'];

export function SubjectSelection({ categoryId }: { categoryId: string }) {
  const { isPremium, canAccessTests } = useAuth();
  const { navigate } = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      setExams(data || []);
    } catch (err) {
      console.error('Error loading exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const subjects = [
    { id: 'math', name: 'Math Question', icon: Calculator, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'reasoning', name: 'Reasoning Question', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { id: 'science', name: 'Science Question', icon: FlaskConical, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

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
          <h1 className="font-bold text-lg">{categoryId} Subjects</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Subject List */}
        <div className="grid grid-cols-1 gap-4">
          {subjects.map((sub) => (
            <div key={sub.id} className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className={`p-2 rounded-lg ${sub.bg}`}>
                  <sub.icon className={`w-5 h-5 ${sub.color}`} />
                </div>
                <h2 className="font-bold text-lg">{sub.name}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  [1, 2].map(i => (
                    <div key={i} className="h-32 bg-gray-900 animate-pulse rounded-2xl border border-gray-800" />
                  ))
                ) : exams.length === 0 ? (
                  <p className="text-gray-500 text-sm px-2">No exams found for this subject yet.</p>
                ) : (
                  exams
                    .filter(e => e.title.toLowerCase().includes(sub.id) || sub.id === 'math' || true) // Simplified filtering
                    .map((exam) => (
                    <button
                      key={exam.id}
                      onClick={() => {
                        if (!canAccessTests) {
                          navigate('/upgrade');
                          return;
                        }
                        if (exam.is_premium && !isPremium) {
                          navigate('/upgrade');
                          return;
                        }
                        navigate(`/exam/${exam.id}`);
                      }}
                      className="bg-gray-900 border border-gray-800 hover:border-blue-500/50 rounded-2xl p-5 flex flex-col text-left transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-gray-200 group-hover:text-white transition">{exam.title}</h3>
                        {exam.is_premium && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-auto">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration_minutes}m</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {(exam.question_ids as string[]).length} Qs</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
