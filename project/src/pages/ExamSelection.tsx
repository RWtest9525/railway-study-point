import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, Clock3, Crown, Lock, PlayCircle, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUserNotifications, getExams, subscribeToCategories, Category, Exam, Notification, timestampToString } from '../lib/firestore';
import { BrandLogo } from '../components/BrandLogo';
import { BottomNav } from '../components/BottomNav';
import { UserPanel } from '../components/UserPanel';

function getExamState(exam: Exam) {
  if (!exam.schedule_date || !exam.schedule_time) {
    return 'open' as const;
  }

  const start = new Date(`${exam.schedule_date}T${exam.schedule_time}`);
  if (Number.isNaN(start.getTime())) return 'open' as const;

  const end = new Date(start.getTime() + exam.duration_minutes * 60 * 1000);
  const now = new Date();

  if (now < start) return 'upcoming' as const;
  if (now >= start && now <= end) return 'live' as const;
  return 'expired' as const;
}

export function ExamSelection() {
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const { user, isPremium, effectiveRole, canAccessTests, trialExpiredNeedsPremium } = useAuth();
  const isDark = theme === 'dark';
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredExams, setFeaturedExams] = useState<Exam[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
  const hasLockedAccess = !canAccessTests || trialExpiredNeedsPremium;

  useEffect(() => {
    const unsubscribe = subscribeToCategories((cats) => {
      setCategories(cats);
      setLoading(false);
    });

    void loadExams();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [user?.uid]);

  const loadExams = async () => {
    const exams = await getExams();
    setFeaturedExams(exams.filter((exam) => getExamState(exam) !== 'expired').slice(0, 10));
  };

  const loadNotifications = async () => {
    if (!user?.uid) return;
    const data = await getUserNotifications(user.uid);
    setNotifications(
      data.map((item) => ({
        ...item,
        created_at: timestampToString(item.created_at as any),
      }))
    );
  };

  const handleCategoryOpen = (category: Category) => {
    if (hasLockedAccess) {
      toast.error('Take premium. Your free trial has ended.');
      navigate('/upgrade');
      return;
    }
    navigate(`/exams/${category.id}`);
  };

  const handleExamAction = (exam: Exam) => {
    if (hasLockedAccess || (exam.is_premium && !isPremium)) {
      toast.error('Unlock premium to continue');
      navigate('/upgrade');
      return;
    }

    const state = getExamState(exam);
    if (state === 'upcoming') {
      toast('Exam is scheduled. We will notify you when it becomes live.');
      return;
    }

    if (confirm(`Start "${exam.title}" now?`)) {
      navigate(`/exam/${exam.id}`);
    }
  };

  const upcomingNotificationsPreview = notifications.slice(0, 2);
  const renderedCategories = categories.length > 0 ? categories : createPlaceholderCategories();
  const renderedExams = featuredExams.length > 0 ? featuredExams : createPlaceholderExams();

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className={`${isDark ? 'text-white' : 'text-slate-900'} text-lg`}>Loading home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-[#f4f7fb]'}`}>
      <UserPanel isOpen={userPanelOpen} onClose={() => setUserPanelOpen(false)} notificationCount={unreadCount} />

      <header className={`${isDark ? 'border-gray-800 bg-gray-900/95' : 'border-slate-200 bg-white/95'} sticky top-0 z-50 border-b backdrop-blur-md`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo variant="nav" className={`${isDark ? 'ring-white/10' : 'ring-slate-200'} ring-1`} />
            <div className="min-w-0">
              <div className={`truncate text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Railway Study Point</div>
              <div className={`truncate text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Choose category</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notifications')}
              className={`relative rounded-2xl p-2.5 ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-slate-100 text-slate-700'}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => setUserPanelOpen(true)} className={`rounded-2xl px-3 py-2 text-xs font-semibold ${isDark ? 'bg-gray-800 text-white' : 'bg-slate-900 text-white'}`}>
              Account
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {effectiveRole === 'admin' && (
          <section className="mb-5">
            <button
              onClick={() => navigate('/admin-portal')}
              className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200"
            >
              Open Admin Panel
            </button>
          </section>
        )}

        {upcomingNotificationsPreview.length > 0 && (
          <section className="mt-6 space-y-3">
            {upcomingNotificationsPreview.map((item, index) => (
              <button
                key={item.id}
                onClick={() => navigate('/notifications')}
                className={`w-full rounded-[24px] border px-4 py-4 text-left ${
                  isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-slate-200 bg-white text-slate-900 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.title}</span>
                      {index === 0 && !item.is_read && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className={`mt-1 line-clamp-1 text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{item.message}</div>
                  </div>
                  <ChevronRight className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                </div>
              </button>
            ))}
          </section>
        )}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Choose Category</h2>
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Tap a box to continue</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {renderedCategories.map((category, index) => {
              const isPlaceholder = category.id.startsWith('placeholder');
              const isLocked = hasLockedAccess && !isPlaceholder;
              return (
                <button
                  key={category.id}
                  onClick={() => (isPlaceholder ? undefined : handleCategoryOpen(category))}
                  className={`relative rounded-[26px] border p-4 text-left transition ${
                    isPlaceholder
                      ? isDark
                        ? 'border-gray-700 bg-gray-800/60 text-gray-500'
                        : 'border-slate-200 bg-white/70 text-slate-400'
                      : isDark
                      ? 'border-gray-700 bg-gray-800 text-white'
                      : 'border-slate-200 bg-white text-slate-900 shadow-sm'
                  }`}
                  disabled={isPlaceholder}
                >
                  {isLocked && (
                    <div className="absolute inset-0 rounded-[26px] bg-slate-950/25" />
                  )}
                  <div className="relative">
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${isPlaceholder ? 'bg-slate-200/50 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                      {isLocked ? <Lock className="h-5 w-5" /> : <span className="text-sm font-bold">{String(index + 1).padStart(2, '0')}</span>}
                    </div>
                    <div className="text-base font-bold">{category.name}</div>
                    <div className={`mt-1 text-xs leading-5 ${isPlaceholder ? 'text-inherit' : isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                      {isPlaceholder ? 'Not available yet' : category.description || 'Open subcategory and tests'}
                    </div>
                    {isLocked && (
                      <div className="mt-3 text-xs font-semibold text-red-600">Locked • Take premium</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-7">
          <button
            onClick={() => navigate('/leaderboard')}
            className={`w-full rounded-[28px] border px-5 py-5 text-left ${
              isDark
                ? 'border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-gray-800 text-white'
                : 'border-amber-100 bg-gradient-to-r from-amber-50 to-white text-slate-900 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                  <Trophy className="h-4 w-4" />
                  Leaderboard
                </div>
                <div className={`mt-2 text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Check weekly overall exam ranking
                </div>
                <div className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  Updates every Monday
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 ${isDark ? 'text-amber-300' : 'text-amber-500'}`} />
            </div>
          </button>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Exams</h2>
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Live exams appear here</span>
          </div>

          <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
            {renderedExams.map((exam) => {
              const isPlaceholder = exam.id.startsWith('placeholder');
              const state = isPlaceholder ? 'placeholder' : getExamState(exam);
              const locked = !isPlaceholder && (hasLockedAccess || (exam.is_premium && !isPremium));
              return (
                <div
                  key={exam.id}
                  className={`min-w-[260px] max-w-[260px] rounded-[26px] border p-4 ${
                    isPlaceholder
                      ? isDark
                        ? 'border-gray-700 bg-gray-800/60 text-gray-500'
                        : 'border-slate-200 bg-white/70 text-slate-400'
                      : isDark
                      ? 'border-gray-700 bg-gray-800 text-white'
                      : 'border-slate-200 bg-white text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="line-clamp-2 text-sm font-bold">{exam.title}</div>
                    {!isPlaceholder && state === 'live' && (
                      <span className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white animate-pulse">
                        LIVE
                      </span>
                    )}
                    {!isPlaceholder && state === 'upcoming' && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                        Soon
                      </span>
                    )}
                  </div>

                  <div className={`mt-3 flex items-center gap-2 text-xs ${isPlaceholder ? 'text-inherit' : isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    <Clock3 className="h-3.5 w-3.5" />
                    {isPlaceholder ? 'Not available yet' : `${exam.duration_minutes} min`}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {!isPlaceholder && exam.is_premium && <Crown className="h-4 w-4 text-amber-500" />}
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isPlaceholder ? 'bg-slate-200/70 text-slate-500' : isDark ? 'bg-gray-900 text-gray-300' : 'bg-slate-100 text-slate-600'}`}>
                      {isPlaceholder
                        ? 'Unavailable Yet'
                        : state === 'upcoming'
                        ? 'Scheduled'
                        : state === 'live'
                        ? 'Start Now'
                        : 'Open'}
                    </span>
                  </div>

                  <button
                    onClick={() => (isPlaceholder ? undefined : handleExamAction(exam))}
                    disabled={isPlaceholder}
                    className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
                      isPlaceholder
                        ? 'bg-slate-200 text-slate-400'
                        : locked
                        ? 'bg-amber-500 text-white'
                        : state === 'upcoming'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {locked ? <Lock className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    {locked ? 'Take Premium' : state === 'upcoming' ? 'Notify Me' : 'Start'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

function createPlaceholderCategories(): Category[] {
  return [
    { id: 'placeholder-ntpc', name: 'NTPC', description: 'Not available yet', is_active: false, created_at: '', updated_at: '' },
    { id: 'placeholder-groupd', name: 'Group D', description: 'Not available yet', is_active: false, created_at: '', updated_at: '' },
    { id: 'placeholder-je', name: 'JE', description: 'Not available yet', is_active: false, created_at: '', updated_at: '' },
    { id: 'placeholder-alp', name: 'ALP', description: 'Not available yet', is_active: false, created_at: '', updated_at: '' },
  ];
}

function createPlaceholderExams(): Exam[] {
  return [
    {
      id: 'placeholder-1',
      category_id: 'placeholder',
      title: 'Mock Test 1',
      duration_minutes: 90,
      total_marks: 100,
      is_premium: false,
      is_active: false,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'placeholder-2',
      category_id: 'placeholder',
      title: 'Practice Set 2',
      duration_minutes: 60,
      total_marks: 60,
      is_premium: false,
      is_active: false,
      created_at: '',
      updated_at: '',
    },
  ];
}
