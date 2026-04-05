import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  BookOpen, 
  FileText, 
  Clock, 
  Users, 
  Trophy,
  History,
  Brain,
  Calculator,
  FlaskConical,
  Globe,
  Crown,
  Lock,
  ChevronRight
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

export function ExamDetailSelection({ categoryId }: { categoryId: string }) {
  const { isPremium, canAccessTests } = useAuth();
  const { navigate } = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<'mock' | 'subject' | 'previous'>('mock');

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

  // Categorize exams
  const mockTests = exams.filter(exam => 
    exam.title.toLowerCase().includes('mock') || 
    exam.title.toLowerCase().includes('full test')
  );

  const subjectExams = exams.filter(exam => 
    !exam.title.toLowerCase().includes('mock') && 
    !exam.title.toLowerCase().includes('full test') &&
    !exam.title.toLowerCase().includes('previous')
  );

  const previousYearPapers = exams.filter(exam => 
    exam.title.toLowerCase().includes('previous') || 
    exam.title.toLowerCase().includes('year') ||
    exam.title.toLowerCase().includes('paper')
  );

  // Group subject exams by subject
  const subjectGroups = subjectExams.reduce((groups, exam) => {
    let subject = 'General';
    const subjects = ['Math', 'Maths', 'Reasoning', 'Science', 'GK', 'General Knowledge', 'General Awareness'];
    
    for (const subj of subjects) {
      if (exam.title.toLowerCase().includes(subj.toLowerCase())) {
        subject = subj;
        break;
      }
    }
    
    if (!groups[subject]) {
      groups[subject] = [];
    }
    groups[subject].push(exam);
    return groups;
  }, {} as Record<string, Exam[]>);

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

  const renderExamCard = (exam: Exam) => (
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
          <FileText className="w-3 h-3" /> {(exam.question_ids as string[]).length} Qs
        </span>
      </div>
    </div>
  );

  const renderSubjectCard = (subject: string, examList: Exam[]) => {
    const IconComponent = subjectIcons[subject as keyof typeof subjectIcons] || BookOpen;
    const colorClass = subjectColors[subject as keyof typeof subjectColors] || 'bg-gray-600/10 text-gray-400 border-gray-500/50';
    const hasPremium = examList.some(exam => exam.is_premium);
    
    return (
      <div
        key={subject}
        className="bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-xl p-6 cursor-pointer transition-all group"
        onClick={() => {
          // Navigate to subject detail view or show exam list
          setSelectedSection('subject');
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${colorClass}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{subject}</h3>
              <p className="text-gray-400 text-sm">{examList.length} Test{examList.length !== 1 ? 's' : ''} Available</p>
            </div>
          </div>
          {hasPremium && (
            <div className="flex items-center gap-1 text-yellow-500">
              <Crown className="w-4 h-4" />
              {!isPremium && <Lock className="w-3 h-3" />}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {examList.slice(0, 3).map(exam => (
            <div
              key={exam.id}
              onClick={(e) => {
                e.stopPropagation();
                handleExamClick(exam);
              }}
              className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-all text-left"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300 line-clamp-1">{exam.title}</span>
                {exam.is_premium && !isPremium && <Lock className="w-3 h-3 text-yellow-500" />}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                <span>{exam.duration_minutes}m</span>
                <span>{(exam.question_ids as string[]).length} Qs</span>
              </div>
            </div>
          ))}
          {examList.length > 3 && (
            <div className="text-center text-gray-500 text-xs py-2">
              +{examList.length - 3} more tests
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      <header className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">{categoryId} Exams</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Section Buttons - Column Layout */}
        <div className="space-y-4">
          <button
            onClick={() => setSelectedSection('mock')}
            className={`w-full flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-300 ${
              selectedSection === 'mock'
                ? 'bg-gradient-to-r from-blue-600/30 to-blue-800/30 border-blue-500 shadow-lg shadow-blue-500/20'
                : 'bg-gray-800 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/80'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedSection === 'mock' ? 'bg-blue-600' : 'bg-blue-600/20'
              }`}>
                <FileText className={`w-6 h-6 ${selectedSection === 'mock' ? 'text-white' : 'text-blue-400'}`} />
              </div>
              <div className="text-left">
                <h3 className={`font-bold text-lg ${selectedSection === 'mock' ? 'text-white' : 'text-gray-200'}`}>
                  Full Mock Tests
                </h3>
                <p className="text-gray-500 text-sm">Complete syllabus tests</p>
              </div>
            </div>
            <ChevronRight className={`w-6 h-6 ${selectedSection === 'mock' ? 'text-blue-400' : 'text-gray-600'}`} />
          </button>

          <button
            onClick={() => setSelectedSection('subject')}
            className={`w-full flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-300 ${
              selectedSection === 'subject'
                ? 'bg-gradient-to-r from-green-600/30 to-green-800/30 border-green-500 shadow-lg shadow-green-500/20'
                : 'bg-gray-800 border-gray-700 hover:border-green-500/50 hover:bg-gray-800/80'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedSection === 'subject' ? 'bg-green-600' : 'bg-green-600/20'
              }`}>
                <BookOpen className={`w-6 h-6 ${selectedSection === 'subject' ? 'text-white' : 'text-green-400'}`} />
              </div>
              <div className="text-left">
                <h3 className={`font-bold text-lg ${selectedSection === 'subject' ? 'text-white' : 'text-gray-200'}`}>
                  Subject Quizzes
                </h3>
                <p className="text-gray-500 text-sm">Topic-wise practice</p>
              </div>
            </div>
            <ChevronRight className={`w-6 h-6 ${selectedSection === 'subject' ? 'text-green-400' : 'text-gray-600'}`} />
          </button>

          <button
            onClick={() => setSelectedSection('previous')}
            className={`w-full flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-300 ${
              selectedSection === 'previous'
                ? 'bg-gradient-to-r from-amber-600/30 to-amber-800/30 border-amber-500 shadow-lg shadow-amber-500/20'
                : 'bg-gray-800 border-gray-700 hover:border-amber-500/50 hover:bg-gray-800/80'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedSection === 'previous' ? 'bg-amber-600' : 'bg-amber-600/20'
              }`}>
                <History className={`w-6 h-6 ${selectedSection === 'previous' ? 'text-white' : 'text-amber-400'}`} />
              </div>
              <div className="text-left">
                <h3 className={`font-bold text-lg ${selectedSection === 'previous' ? 'text-white' : 'text-gray-200'}`}>
                  Previous Year Papers
                </h3>
                <p className="text-gray-500 text-sm">Past exam papers</p>
              </div>
            </div>
            <ChevronRight className={`w-6 h-6 ${selectedSection === 'previous' ? 'text-amber-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
            <p className="text-gray-400 mt-4">Loading exams...</p>
          </div>
        ) : (
          <>
            {/* Full Mock Tests Section */}
            {selectedSection === 'mock' && (
              <div>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Full Mock Tests
                </h2>
                {mockTests.length === 0 ? (
                  <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No mock tests available for this category yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mockTests.map(renderExamCard)}
                  </div>
                )}
              </div>
            )}

            {/* Subject Quizzes Section */}
            {selectedSection === 'subject' && (
              <div>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-500" />
                  Subject Quizzes
                </h2>
                {Object.keys(subjectGroups).length === 0 ? (
                  <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
                    <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No subject quizzes available for this category yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(subjectGroups).map(([subject, examList]) => 
                      renderSubjectCard(subject, examList)
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Previous Year Papers Section */}
            {selectedSection === 'previous' && (
              <div>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-500" />
                  Previous Year Papers
                </h2>
                {previousYearPapers.length === 0 ? (
                  <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
                    <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No previous year papers available for this category yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {previousYearPapers.map(renderExamCard)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
