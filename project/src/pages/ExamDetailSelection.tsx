import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { getCategory, getCategoryLinks, getCategoryNodes, getExams, getAttempts, Exam, Category, CategoryNode, CategoryLink } from '../lib/firestore';
import { ArrowLeft, ChevronRight, Clock, Crown, ExternalLink, Layers3, Lock, PlayCircle, Sparkles, X, FileText, Award, HelpCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BottomNav } from '../components/BottomNav';
import toast from 'react-hot-toast';

interface ExamDetailSelectionProps {
  categoryId: string;
}

function getExamState(exam: Exam) {
  if (!exam.schedule_date || !exam.schedule_time) return 'open' as const;

  const start = new Date(`${exam.schedule_date}T${exam.schedule_time}`);
  if (Number.isNaN(start.getTime())) return 'open' as const;

  const end = new Date(start.getTime() + exam.duration_minutes * 60 * 1000);
  const now = new Date();

  if (now < start) return 'upcoming' as const;
  if (now >= start && now <= end) return 'live' as const;
  return 'expired' as const;
}

export function ExamDetailSelection({ categoryId }: ExamDetailSelectionProps) {
  const { navigate, goBack } = useRouter();
  const { theme } = useTheme();
  const { canAccessTests, isPremium, trialExpiredNeedsPremium, profile } = useAuth();
  const isDark = theme === 'dark';
  const [exams, setExams] = useState<Exam[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState<CategoryNode[]>([]);
  const [currentNodes, setCurrentNodes] = useState<CategoryNode[]>([]);
  const [currentLink, setCurrentLink] = useState<CategoryLink | null>(null);
  const currentNodeId = path.length > 0 ? path[path.length - 1].id : null;
  const [examToStart, setExamToStart] = useState<Exam | null>(null);
  const [attemptedExamIds, setAttemptedExamIds] = useState<Set<string>>(new Set());
  const [userAttempts, setUserAttempts] = useState<Record<string, any>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    void loadCategoryAndExams();
  }, [categoryId]);

  useEffect(() => {
    void loadCurrentNodes();
  }, [categoryId, path.length]);

  useEffect(() => {
    void loadCurrentLink();
  }, [categoryId, path.length]);

  const loadCategoryAndExams = async () => {
    setLoading(true);
    try {
      const [categoryData, examsData] = await Promise.all([getCategory(categoryId), getExams(categoryId)]);
      if (categoryData) setCategory(categoryData);
      setExams(examsData.filter((exam) => getExamState(exam) !== 'expired'));
      setPath([]);
      // Load attempted exam IDs and detail for the current user
      if (profile?.id) {
        const attempts = await getAttempts(profile.id);
        const attemptsMap: Record<string, any> = {};
        attempts.forEach(a => {
          if (!attemptsMap[a.exam_id] || new Date(a.submitted_at) > new Date(attemptsMap[a.exam_id].submitted_at)) {
            attemptsMap[a.exam_id] = a;
          }
        });
        setUserAttempts(attemptsMap);
        setAttemptedExamIds(new Set(attempts.map(a => a.exam_id)));
      }
    } catch (error) {
      console.error('Error loading exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentNodes = async () => {
    setIsTransitioning(true);
    try {
      const parentId = path.length > 0 ? path[path.length - 1].id : null;
      const nodes = await getCategoryNodes(categoryId, parentId);
      setCurrentNodes(nodes);
    } catch (error) {
      console.error('Error loading nodes:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  const loadCurrentLink = async () => {
    try {
      let links = await getCategoryLinks(categoryId, currentNodeId);
      if (links.length === 0 && currentNodeId) {
        links = await getCategoryLinks(categoryId, null); // Fallback to root category link
      }
      setCurrentLink(links[0] || null);
    } catch (error) {
      console.error('Error loading current link:', error);
    }
  };

  const startExam = (exam: Exam) => {
    if (!canAccessTests || (exam.is_premium && !isPremium)) {
      toast.error('Take premium. Your free trial has ended.');
      navigate('/upgrade');
      return;
    }

    const state = getExamState(exam);
    if (state === 'upcoming') {
      toast('This exam is scheduled. Use Notify Me for now.');
      return;
    }

    setExamToStart(exam);
  };

  const handleConfirmStart = () => {
    if (examToStart) {
      navigate(`/exam/${examToStart.id}`);
    }
  };

  const canShowExams = currentNodes.length === 0 || path.length > 0;
  const isLocked = !canAccessTests || trialExpiredNeedsPremium;

  // "New" badge: exam updated in last 7 days, OR user hasn't attempted it yet
  const isNewExam = (exam: Exam) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const updatedAt = exam.updated_at ? new Date(exam.updated_at).getTime() : 0;
    const recentlyUpdated = updatedAt > sevenDaysAgo;
    const neverAttempted = !attemptedExamIds.has(exam.id);
    return recentlyUpdated || neverAttempted;
  };

  const visibleExams = useMemo(() => {
    if (canShowExams) {
      if (path.length > 0) {
        return exams.filter(e => e.category_node_id === currentNodeId);
      } else {
        return exams.filter(e => !e.category_node_id);
      }
    }
    return [];
  }, [canShowExams, exams, path.length, currentNodeId]);

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

  const renderContent = () => {
    if (isTransitioning) {
      return (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <>
        {currentNodes.length > 0 && (
          <section className="mb-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {currentNodes.map((node) => {
                const parentNode = path.length > 0 ? path[path.length - 1] : null;
                const isTestContainerChild = parentNode?.is_test_container === true || node.is_test_container === false;
                
                return (
                  <button
                    key={node.id}
                    onClick={() => {
                      if (isLocked) {
                        toast.error('Take premium. Your free trial has ended.');
                        navigate('/upgrade');
                        return;
                      }
                      if (isTestContainerChild) {
                        navigate(`/exam/node_${node.id}`);
                        return;
                      }
                      setPath((prev) => [...prev, node]);
                    }}
                    className={`relative rounded-[24px] border p-5 text-left transition duration-300 ${
                      isDark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200/60 bg-white text-gray-900 hover:shadow-md shadow-sm'
                    }`}
                  >
                    {isLocked && <div className="absolute inset-0 rounded-[24px] bg-slate-950/20 backdrop-blur-[1px]" />}
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center font-bold text-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                          {node.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{node.name}</div>
                          <div className={`mt-1 text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {isTestContainerChild ? 'Start Test' : 'Open Folder'}
                          </div>
                        </div>
                      </div>
                      {isLocked ? <Lock className="h-5 w-5 text-red-500" /> : isTestContainerChild ? <PlayCircle className={`h-5 w-5 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`} /> : <ChevronRight className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {canShowExams && (
          <section>
            {visibleExams.length === 0 && currentNodes.length === 0 ? (
              <div className={`${isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-white border-slate-200/60 text-gray-500'} rounded-[24px] border border-dashed p-8 text-center`}>
                This folder has no tests available.
              </div>
            ) : (
              <div className="space-y-4">
                {visibleExams.map((exam) => {
                  const state = getExamState(exam);
                  const locked = isLocked || (exam.is_premium && !isPremium);

                  return (
                    <div
                      key={exam.id}
                      className={`${
                        isDark
                          ? 'bg-white/5 border-white/10 hover:bg-white/10'
                          : 'bg-white border-slate-200/60 hover:shadow-md'
                      } rounded-[24px] border p-5 transition duration-300`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {exam.title}
                            </h3>
                            {exam.is_premium && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Premium</span>}
                            {state === 'live' && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white animate-pulse">Live</span>}
                            {attemptedExamIds.has(exam.id) && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                Attempted
                              </span>
                            )}
                            {isNewExam(exam) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                                <Sparkles className="h-2.5 w-2.5" />
                                New
                              </span>
                            )}
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
                              <Layers3 className="w-4 h-4" />
                              {path.length > 0 ? path[path.length - 1].name : category?.name || 'Category'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => startExam(exam)}
                        className={`mt-6 w-full rounded-xl py-3.5 text-sm font-semibold transition ${
                          locked
                            ? isDark ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200'
                            : state === 'upcoming'
                            ? isDark
                              ? 'bg-white/10 text-white hover:bg-white/20'
                              : 'bg-slate-100 text-slate-700'
                            : attemptedExamIds.has(exam.id)
                            ? isDark
                              ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : isDark
                            ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'
                            : 'bg-slate-900 text-white shadow-md hover:bg-slate-800'
                        }`}
                      >
                        {locked ? (
                          <span className="inline-flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Take Premium
                          </span>
                        ) : state === 'upcoming' ? (
                          'Notify Me'
                        ) : attemptedExamIds.has(exam.id) ? (
                          <span className="inline-flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            View Result
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <PlayCircle className="h-4 w-4" />
                            Start This Exam
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </>
    );
  };

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-[#0B0F19]' : 'bg-[#F8FAFC]'}`}>
      <header className={`${isDark ? 'border-white/5 bg-[#0B0F19]/80' : 'border-slate-200/60 bg-white/80'} sticky top-0 z-50 border-b backdrop-blur-xl`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => {
              if (path.length > 0) {
                setPath((prev) => prev.slice(0, -1));
              } else {
                goBack();
              }
            }}
            className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
            <h1 className={`truncate font-extrabold text-xl flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {path.length > 0 ? path[path.length - 1].name : category?.name || 'Available Tests'}
            </h1>
            {(isPremium || profile?.role === 'admin') && currentLink && (
              <a
                href={currentLink.url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-200"
              >
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <ExternalLink className="h-3 w-3" />
                </div>
                WhatsApp
              </a>
            )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLocked && (
          <div className={`mb-5 rounded-[24px] border px-4 py-4 text-sm ${isDark ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
            Free trial ended. Take premium to unlock category boxes and exams.
          </div>
        )}



        {renderContent()}
      </main>
      
      {/* Modern Join Exam Popup Modal */}
      {examToStart && (() => {
        const hasCompleted = attemptedExamIds.has(examToStart.id);
        const attempt = userAttempts[examToStart.id];
        
        // Check if there is a draft in localStorage
        const draftKey = profile?.id ? `exam-draft:${profile.id}:${examToStart.id}` : '';
        const hasDraft = !!(draftKey && localStorage.getItem(draftKey));
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className={`relative w-full max-w-md overflow-hidden rounded-3xl border p-6 md:p-8 shadow-2xl transition-all ${
              isDark 
                ? 'bg-slate-900/95 border-slate-800/80 text-white shadow-indigo-950/20' 
                : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/40'
            }`}>
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                    hasCompleted 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : hasDraft 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {hasCompleted ? 'Completed' : hasDraft ? 'In Progress' : 'Ready to Start'}
                  </span>
                  <h3 className="text-xl md:text-2xl font-extrabold tracking-tight leading-snug">
                    {examToStart.title}
                  </h3>
                </div>
                <button
                  onClick={() => setExamToStart(null)}
                  className={`p-1.5 rounded-full transition ${
                    isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                  }`}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              {examToStart.description && (
                <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {examToStart.description}
                </p>
              )}

              {/* Stats Grid */}
              <div className={`grid grid-cols-2 gap-4 mb-6 p-4 rounded-2xl ${
                isDark ? 'bg-slate-800/50' : 'bg-slate-50'
              }`}>
                <div className="text-center border-r border-slate-700/20 dark:border-slate-800">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1.5 ${
                    isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Duration</span>
                  <span className="text-sm font-bold">{examToStart.duration_minutes} mins</span>
                </div>
                <div className="text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1.5 ${
                    isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Total Marks</span>
                  <span className="text-sm font-bold">{examToStart.total_marks} Marks</span>
                </div>
              </div>

              {/* Conditional Warning/Result Footer */}
              {hasCompleted ? (
                <div className={`mb-6 p-4 rounded-2xl border ${
                  isDark ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                }`}>
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
                    <div>
                      <h4 className="text-sm font-bold mb-1">Attempt Completed</h4>
                      <p className="text-xs opacity-90 leading-relaxed mb-3">
                        You have already completed this assessment. To maintain integrity, only one attempt is permitted.
                      </p>
                      {attempt && (
                        <div className="flex items-center gap-4 text-xs font-semibold">
                          <span>Score: <strong className="text-sm">{attempt.score}</strong>/{examToStart.total_marks}</span>
                          <span>Accuracy: <strong className="text-sm">{attempt.total_questions > 0 ? Math.round((attempt.correct_answers / attempt.total_questions) * 100) : 0}%</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : hasDraft ? (
                <div className={`mb-6 p-4 rounded-2xl border ${
                  isDark ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-100 text-amber-800'
                }`}>
                  <div className="flex gap-3">
                    <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <h4 className="text-sm font-bold mb-1">Unfinished Attempt Found</h4>
                      <p className="text-xs opacity-90 leading-relaxed">
                        You closed this exam mid-test. You will resume from the exact question where you left off. The timer will continue.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`mb-6 p-4 rounded-2xl border ${
                  isDark ? 'bg-blue-500/5 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-800'
                }`}>
                  <div className="flex gap-3">
                    <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" />
                    <div>
                      <h4 className="text-sm font-bold mb-1">Ready to Begin?</h4>
                      <p className="text-xs opacity-90 leading-relaxed">
                        Clicking start will load the test. Ensure you have a stable connection. No automatic submissions are enabled.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setExamToStart(null)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition text-sm ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                {hasCompleted ? (
                  <button
                    onClick={() => {
                      setExamToStart(null);
                      if (attempt) {
                        navigate(`/results/${attempt.id}`);
                      }
                    }}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition text-sm text-center shadow-lg shadow-emerald-600/20"
                  >
                    View Result
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmStart}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition text-sm text-center shadow-lg shadow-blue-500/30"
                  >
                    {hasDraft ? 'Resume Exam' : 'Start Exam'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      
      <BottomNav />
    </div>
  );
}
