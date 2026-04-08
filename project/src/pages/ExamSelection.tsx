import { useEffect, useState } from 'react';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToCategories, Category } from '../lib/firestore';
import { ArrowRight, BookOpen, Target, Trophy, FileText } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

export function ExamSelection() {
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCategories((cats) => {
      setCategories(cats);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getCategoryIcon = (category: Category) => {
    switch (category.name?.toLowerCase()) {
      case 'mock tests':
        return <Target className="w-6 h-6" />;
      case 'previous year papers':
        return <FileText className="w-6 h-6" />;
      case 'subject quizzes':
        return <BookOpen className="w-6 h-6" />;
      default:
        return <Trophy className="w-6 h-6" />;
    }
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
      <BottomNav />
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Railway Study Point
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Select a category to start your preparation
          </p>
        </div>

        {categories.length === 0 ? (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-8 text-center`}>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No categories available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => navigate(`/exams/${category.id}`)}
                className={`${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 hover:border-blue-500' 
                    : 'bg-white border-gray-200 hover:border-blue-400'
                } rounded-2xl border p-5 transition cursor-pointer group`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDark ? 'bg-blue-600/20' : 'bg-blue-100'
                    } group-hover:scale-110 transition`}>
                      {category.iconUrl ? (
                        <img src={category.iconUrl} alt={category.name} className="w-6 h-6" />
                      ) : (
                        <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {getCategoryIcon(category)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {category.name}
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {category.description || 'View available tests'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} group-hover:translate-x-1 transition`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}