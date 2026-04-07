import { 
  ArrowLeft, 
  FileText, 
  BookOpen, 
  History,
  ChevronRight
} from 'lucide-react';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';

export function ExamDetailSelection({ categoryId }: { categoryId: string }) {
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white/95 border-gray-200'} sticky top-0 z-50 backdrop-blur-md border-b`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-600'}`} />
          </button>
          <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{categoryId} Exams</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* Section Buttons - Navigate to separate pages */}
        <button
          onClick={() => navigate(`/mock-tests/${categoryId}`)}
          className={`w-full flex items-center justify-between p-5 rounded-xl border-2 ${isDark ? 'border-blue-500/50 bg-gradient-to-r from-blue-600/20 to-blue-800/20 hover:border-blue-500 hover:shadow-blue-500/20' : 'border-blue-500/30 bg-blue-50 hover:border-blue-500'} transition-all duration-300 group`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center`}>
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Full Mock Tests</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Complete syllabus tests</p>
            </div>
          </div>
          <ChevronRight className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'} group-hover:translate-x-1 transition-transform`} />
        </button>

        <button
          onClick={() => navigate(`/subject-quizzes/${categoryId}`)}
          className={`w-full flex items-center justify-between p-5 rounded-xl border-2 ${isDark ? 'border-green-500/50 bg-gradient-to-r from-green-600/20 to-green-800/20 hover:border-green-500 hover:shadow-green-500/20' : 'border-green-500/30 bg-green-50 hover:border-green-500'} transition-all duration-300 group`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-green-600' : 'bg-green-500'} flex items-center justify-center`}>
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Subject Quizzes</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Topic-wise practice</p>
            </div>
          </div>
          <ChevronRight className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'} group-hover:translate-x-1 transition-transform`} />
        </button>

        <button
          onClick={() => navigate(`/previous-year-papers/${categoryId}`)}
          className={`w-full flex items-center justify-between p-5 rounded-xl border-2 ${isDark ? 'border-amber-500/50 bg-gradient-to-r from-amber-600/20 to-amber-800/20 hover:border-amber-500 hover:shadow-amber-500/20' : 'border-amber-500/30 bg-amber-50 hover:border-amber-500'} transition-all duration-300 group`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-amber-600' : 'bg-amber-500'} flex items-center justify-center`}>
              <History className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Previous Year Papers</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Past exam papers</p>
            </div>
          </div>
          <ChevronRight className={`w-6 h-6 ${isDark ? 'text-amber-400' : 'text-amber-600'} group-hover:translate-x-1 transition-transform`} />
        </button>
      </main>
    </div>
  );
}
