import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  BookOpen,
  Clock,
  Crown,
  Lock,
  Calculator,
  Brain,
  FlaskConical,
  Globe
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

const subjectIcons = {
  'Math': Calculator,
  'Maths': Calculator,
  'Reasoning': Brain,
  'Science': FlaskConical,
  'GK': Globe,
  'General Knowledge': Globe,
  'General Awareness': Globe
};

const subjectColors = {
  'Math': 'bg-blue-600/10 text-blue-400 border-blue-500/50',
  'Maths': 'bg-blue-600/10 text-blue-400 border-blue-500/50',
  'Reasoning': 'bg-purple-600/10 text-purple-400 border-purple-500/50',
  'Science': 'bg-green-600/10 text-green-400 border-green-500/50',
  'GK': 'bg-amber-600/10 text-amber-400 border-amber-500/50',
  'General Knowledge': 'bg-amber-600/10 text-amber-400 border-amber-500/50',
  'General Awareness': 'bg-amber-600/10 text-amber-400 border-amber-500/50'
};

export default function SubjectQuizzes() {
  const { isPremium, canAccessTests } = useAuth();
  const { navigate, currentPath } = useRouter();
  const [subjectGroups, setSubjectGroups] = useState<Record<string, Exam[]>>({});
  const [loading, setLoading] = useState(true);

  // Extract categoryId from URL: /subject-quizzes/GROUP_D
  const categoryId = currentPath.split('/subject-quizzes/')[1] || '';

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
      
      // Filter only subject quizzes (not mock tests, not previous year papers)
      const subjectExams = (data || []).filter(exam => 
        !exam.title.toLowerCase().includes('mock') && 
        !exam.title.toLowerCase().includes('full test') &&
        !exam.title.toLowerCase().includes('previous') &&
        !exam.title.toLowerCase().includes('year') &&
        !exam.title.toLowerCase().includes('paper')
      );

      // Group by subject
      const groups = subjectExams.reduce((acc, exam) => {
        let subject = 'General';
        const subjects = ['Math', 'Maths', 'Reasoning', 'Science', 'GK', 'General Knowledge', 'General Awareness'];
        
        for (const subj of subjects) {
          if (exam.title.toLowerCase().includes(subj.toLowerCase())) {
            subject = subj;
            break;
          }
        }
        
        if (!acc[subject]) {
          acc[subject] = [];
        }
        acc[subject].push(exam);
        return acc;
      }, {} as Record<string, Exam[]>);

      setSubjectGroups(groups);
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
            <h1 className="font-bold text-lg">Subject Quizzes</h1>
            <p className="text-xs text-gray-400">{categoryId}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto" />
            <p className="text-gray-400 mt-4">Loading quizzes...</p>
          </div>
        ) : Object.keys(subjectGroups).length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No subject quizzes available for this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(subjectGroups).map(([subject, examList]) => {
              const IconComponent = subjectIcons[subject as keyof typeof subjectIcons] || BookOpen;
              const colorClass = subjectColors[subject as keyof typeof subjectColors] || 'bg-gray-600/10 text-gray-400 border-gray-500/50';
              const hasPremium = examList.some(exam => exam.is_premium);

              return (
                <div
                  key={subject}
                  className="bg-gray-800 border border-gray-700 hover:border-green-500/50 rounded-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${colorClass}`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{subject}</h3>
                      <p className="text-gray-400 text-sm">{examList.length} Test{examList.length !== 1 ? 's' : ''}</p>
                    </div>
                    {hasPremium && (
                      <div className="ml-auto flex items-center gap-1 text-yellow-500">
                        <Crown className="w-4 h-4" />
                        {!isPremium && <Lock className="w-3 h-3" />}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {examList.map((exam) => (
                      <div
                        key={exam.id}
                        onClick={() => handleExamClick(exam)}
                        className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300 line-clamp-1">{exam.title}</span>
                          {exam.is_premium && !isPremium && <Lock className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>{exam.duration_minutes}m</span>
                          <span>{exam.question_ids.length} Qs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}