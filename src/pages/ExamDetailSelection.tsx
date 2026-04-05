import { 
  ArrowLeft, 
  FileText, 
  BookOpen, 
  History,
  ChevronRight
} from 'lucide-react';
import { useRouter } from '../contexts/RouterContext';

export function ExamDetailSelection({ categoryId }: { categoryId: string }) {
  const { navigate } = useRouter();


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
          <h1 className="font-bold text-lg">{categoryId} Exams</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* Section Buttons - Navigate to separate pages */}
        <button
          onClick={() => navigate(`/mock-tests/${categoryId}`)}
          className="w-full flex items-center justify-between p-5 rounded-xl border-2 border-blue-500/50 bg-gradient-to-r from-blue-600/20 to-blue-800/20 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg text-white">Full Mock Tests</h3>
              <p className="text-gray-400 text-sm">Complete syllabus tests</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-blue-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate(`/subject-quizzes/${categoryId}`)}
          className="w-full flex items-center justify-between p-5 rounded-xl border-2 border-green-500/50 bg-gradient-to-r from-green-600/20 to-green-800/20 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg text-white">Subject Quizzes</h3>
              <p className="text-gray-400 text-sm">Topic-wise practice</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-green-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate(`/previous-year-papers/${categoryId}`)}
          className="w-full flex items-center justify-between p-5 rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-600/20 to-amber-800/20 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center">
              <History className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg text-white">Previous Year Papers</h3>
              <p className="text-gray-400 text-sm">Past exam papers</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-amber-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </main>
    </div>
  );
}
