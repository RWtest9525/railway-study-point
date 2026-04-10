import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, Clock3, Crown, FileText, PlayCircle, Sparkles, Target, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { getExams, subscribeToCategories, Category, Exam } from '../lib/firestore';
import { trialWholeDaysLeft } from '../lib/authUtils';
import { BrandLogo } from '../components/BrandLogo';
import { BottomNav } from '../components/BottomNav';
import { UserPanel } from '../components/UserPanel';

export function ExamSelection() {
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const { profile, isPremium, effectiveRole, canAccessTests, trialExpiredNeedsPremium } = useAuth();
  const isDark = theme === 'dark';
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredExams, setFeaturedExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const daysLeftTrial = useMemo(() => trialWholeDaysLeft(profile as any), [profile]);

  useEffect(() => {
    const unsubscribe = subscribeToCategories((cats) => {
      setCategories(cats);
      setLoading(false);
    });

    void getExams().then((exams) => setFeaturedExams(exams.slice(0, 6)));
    return () => unsubscribe();
  }, []);

  const getCategoryIcon = (category: Category) => {
    const label = category.name?.toLowerCase() || '';
    if (label.includes('mock')) return <Target className="w-6 h-6" />;
    if (label.includes('paper')) return <FileText className="w-6 h-6" />;
    return <Trophy className="w-6 h-6" />;
  };

  const handleStartExam = (exam: Exam) => {
    if (!canAccessTests || (exam.is_premium && !isPremium)) {
      navigate('/upgrade');
      return;
    }
    const ok = confirm(`Start "${exam.title}" now?`);
    if (ok) navigate(`/exam/${exam.id}`);
  };

  const heroCards = [
    { label: 'Categories', value: categories.length, tone: 'from-sky-500 to-cyan-500' },
    { label: 'Live exams', value: featuredExams.length, tone: 'from-amber-500 to-orange-500' },
    { label: 'Mode', value: 'Mobile', tone: 'from-slate-800 to-slate-600' },
  ];

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-slate-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`${isDark ? 'text-white' : 'text-slate-900'} text-lg`}>Loading home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-[#f5f7fb]'}`}>
      <UserPanel isOpen={userPanelOpen} onClose={() => setUserPanelOpen(false)} />

      <header className={`${isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-slate-200'} sticky top-0 z-50 border-b backdrop-blur-md`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo variant="nav" className={`${isDark ? 'ring-white/10' : 'ring-slate-200'} ring-1`} />
            <div className="min-w-0">
              <div className={`truncate text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Railway Study Point</div>
              <div className={`truncate text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Study dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notifications')}
              className={`rounded-2xl p-2.5 ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-slate-100 text-slate-700'}`}
            >
              <Bell className="h-5 w-5" />
            </button>
            <button onClick={() => setUserPanelOpen(true)} className={`rounded-2xl px-3 py-2 text-xs font-semibold ${isDark ? 'bg-gray-800 text-white' : 'bg-slate-900 text-white'}`}>Account</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <section className={`overflow-hidden rounded-[30px] border p-5 ${
          isDark
            ? 'border-blue-500/20 bg-gradient-to-br from-blue-900/30 via-gray-900 to-amber-900/20'
            : 'border-sky-100 bg-gradient-to-br from-sky-50 via-white to-orange-50 shadow-sm'
        }`}>
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {effectiveRole === 'admin' && (
                <button onClick={() => navigate('/admin-portal')} className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200">
                  Admin Panel
                </button>
              )}
              {isPremium ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">Premium Active</span>
              ) : daysLeftTrial !== null ? (
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                  {daysLeftTrial} trial day(s) left
                </span>
              ) : trialExpiredNeedsPremium ? (
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                  Upgrade to continue
                </span>
              ) : null}
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Railway exam practice
                </div>
                <h1 className={`mt-3 text-2xl font-bold leading-tight sm:text-4xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Practice smarter with clean categories and quick exam entry.
                </h1>
                <p className={`mt-2 max-w-2xl text-sm leading-6 sm:text-base ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                  Select NTPC or any category, open the subcategory, then enter the test in a few taps.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                {heroCards.map((card) => (
                  <div key={card.label} className={`rounded-[24px] bg-gradient-to-br p-[1px] ${card.tone}`}>
                    <div className="rounded-[23px] bg-white px-4 py-4 text-left">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{card.label}</div>
                      <div className="mt-2 text-xl font-bold text-slate-900">{card.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Categories</h2>
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Tap to open subcategory/tests</span>
          </div>

          {categories.length === 0 ? (
            <div className={`rounded-3xl border p-5 text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-slate-200 bg-white text-slate-500'}`}>
              Categories unavailable
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => navigate(`/exams/${category.id}`)}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    isDark ? 'border-gray-700 bg-gray-800 hover:border-blue-500' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                        {category.iconUrl ? <img src={category.iconUrl} alt={category.name} className="h-6 w-6" /> : getCategoryIcon(category)}
                      </div>
                      <div>
                        <div className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{category.name}</div>
                        <div className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          {category.description || 'Subcategories and tests available inside'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`mt-1 h-5 w-5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Direct Join Exams</h2>
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Students can enter directly from here</span>
          </div>

          {featuredExams.length === 0 ? (
            <div className={`rounded-3xl border p-5 text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-slate-200 bg-white text-slate-500'}`}>
              Exams unavailable
            </div>
          ) : (
            <div className="space-y-3">
              {featuredExams.map((exam) => (
                <div
                  key={exam.id}
                  className={`rounded-[24px] border p-4 ${
                    isDark ? 'border-gray-700 bg-gray-800' : 'border-slate-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`truncate text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{exam.title}</h3>
                        {exam.is_premium && <Crown className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className={`mt-2 flex flex-wrap gap-2 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        <span className={`rounded-full px-3 py-1 ${isDark ? 'bg-gray-700' : 'bg-sky-50 text-sky-700'}`}>{exam.category_id}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${isDark ? 'bg-gray-700' : 'bg-slate-100'}`}>
                          <Clock3 className="h-3.5 w-3.5" />
                          {exam.duration_minutes} min
                        </span>
                        <span className={`rounded-full px-3 py-1 ${isDark ? 'bg-gray-700' : 'bg-slate-100'}`}>{exam.total_marks} marks</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartExam(exam)}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
                        !canAccessTests || (exam.is_premium && !isPremium)
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      <PlayCircle className="h-4 w-4" />
                      {!canAccessTests || (exam.is_premium && !isPremium) ? 'Unlock & Join' : 'Join Exam'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
