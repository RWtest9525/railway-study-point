import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Search, Target, UserRound, XCircle, Trophy, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouter } from '../../contexts/RouterContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getAllAttempts, getExams, getQuestions, getQuestionsByCategoryNode, getCategoryNode, getUsers, Exam, Question, QuizAttempt } from '../../lib/firestore';
import { formatDateTime, formatDuration } from '../../lib/dateUtils';

type ProfileRow = {
  id: string;
  full_name?: string;
  email?: string;
};

type AttemptRow = QuizAttempt & {
  examTitle: string;
  userName: string;
  userEmail: string;
  percentage: number;
  wrongAnswers: number;
  skippedAnswers: number;
};

const COLORS = ['#10B981', '#F43F5E', '#64748B']; // Correct, Wrong, Skipped

export function StudentAnalytics() {
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptRow | null>(null);
  const [attemptQuestions, setAttemptQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);

  useEffect(() => {
    const examIdFromUrl = new URLSearchParams(window.location.search).get('examId') || '';
    setSelectedExam(examIdFromUrl);
    void loadData(examIdFromUrl);
  }, []);

  const loadData = async (presetExamId?: string) => {
    setLoading(true);
    try {
      const [profiles, examsData, attemptsData] = await Promise.all([
        getUsers() as Promise<ProfileRow[]>,
        getExams(undefined, true),
        getAllAttempts(),
      ]);

      const examMap = new Map(examsData.map((exam) => [exam.id, exam.title]));
      const profileMap = new Map(
        profiles.map((profile) => [profile.id, { name: profile.full_name || 'Student', email: profile.email || 'No email' }])
      );

      const nodeIdsWithAttempts = new Set<string>();
      attemptsData.forEach(attempt => {
        if (attempt.exam_id.startsWith('node_')) {
          nodeIdsWithAttempts.add(attempt.exam_id.replace('node_', ''));
        }
      });

      await Promise.all(
        Array.from(nodeIdsWithAttempts).map(async (nodeId) => {
          try {
            const node = await getCategoryNode(nodeId);
            if (node) examMap.set(`node_${nodeId}`, node.name);
          } catch (e) {
            console.error('Failed to load node', nodeId);
          }
        })
      );

      const enrichedAttempts = attemptsData.map((attempt) => {
        const profile = profileMap.get(attempt.user_id);
        const skippedAnswers = attempt.answers.filter((answer) => answer.skipped || answer.selectedOption < 0).length;
        const wrongAnswers = Math.max(0, attempt.total_questions - attempt.correct_answers - skippedAnswers);
        return {
          ...attempt,
          examTitle: examMap.get(attempt.exam_id) || 'Unknown Assessment',
          userName: profile?.name || 'Student',
          userEmail: profile?.email || 'No email',
          percentage: attempt.total_questions > 0 ? (attempt.score / attempt.total_questions) * 100 : 0,
          wrongAnswers,
          skippedAnswers,
        };
      });

      setExams(examsData);
      setAttempts(enrichedAttempts);

      const combinedDropdown: {id: string, title: string}[] = [
        ...examsData.map(e => ({ id: e.id, title: e.title }))
      ];
      examMap.forEach((title, id) => {
        if (id.startsWith('node_')) {
          combinedDropdown.push({ id, title: `Test Folder: ${title}` });
        }
      });
      const uniqueDropdown = Array.from(new Map(combinedDropdown.map(item => [item.id, item])).values());
      (window as any).__examsDropdownList = uniqueDropdown;

      if (presetExamId) {
        const latest = enrichedAttempts.find((attempt) => attempt.exam_id === presetExamId);
        if (latest) {
          setSelectedAttempt(latest);
          if (latest.exam_id.startsWith('node_')) {
            const questions = await getQuestionsByCategoryNode(latest.exam_id.replace('node_', ''));
            setAttemptQuestions(questions);
          } else {
            const questions = await getQuestions(latest.exam_id);
            setAttemptQuestions(questions);
          }
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttempts = useMemo(() => {
    return attempts.filter((attempt) => {
      if (selectedExam && attempt.exam_id !== selectedExam) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        attempt.userName.toLowerCase().includes(query) ||
        attempt.userEmail.toLowerCase().includes(query) ||
        attempt.examTitle.toLowerCase().includes(query)
      );
    });
  }, [attempts, searchQuery, selectedExam]);

  const summary = useMemo(() => {
    const totalAttempts = filteredAttempts.length;
    const avgScore = totalAttempts
      ? filteredAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / totalAttempts
      : 0;
    const best = totalAttempts
      ? filteredAttempts.reduce((top, attempt) => (attempt.score > top.score ? attempt : top), filteredAttempts[0])
      : null;
    return { totalAttempts, avgScore, best };
  }, [filteredAttempts]);

  const viewAttempt = async (attempt: AttemptRow) => {
    setSelectedAttempt(attempt);
    if (attempt.exam_id.startsWith('node_')) {
      const questions = await getQuestionsByCategoryNode(attempt.exam_id.replace('node_', ''));
      setAttemptQuestions(questions);
    } else {
      const questions = await getQuestions(attempt.exam_id);
      setAttemptQuestions(questions);
    }
  };

  const getAnswerLabel = (style: 'alphabet' | 'numeric' | undefined, index: number) =>
    style === 'numeric' ? String(index + 1) : String.fromCharCode(65 + index);

  const selectedChartData = selectedAttempt ? [
    { name: 'Correct', value: selectedAttempt.correct_answers },
    { name: 'Wrong', value: selectedAttempt.wrongAnswers },
    { name: 'Skipped', value: selectedAttempt.skippedAnswers },
  ] : [];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080B12] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${isDark ? 'border-white/5 bg-[#0A0D14]/80' : 'border-slate-200 bg-white/80'}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <button onClick={() => navigate('/admin-portal')} className={`inline-flex items-center gap-2 rounded-full p-2 transition ${isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Student Analytics</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className={`relative overflow-hidden rounded-3xl border p-6 shadow-2xl ${isDark ? 'border-white/10 bg-gradient-to-br from-blue-900/40 to-slate-900/40' : 'border-slate-200 bg-white'}`}>
            <div className="mb-2 flex items-center justify-between">
              <div className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-blue-300/70' : 'text-slate-500'}`}>Total Attempts</div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{summary.totalAttempts}</div>
          </div>
          
          <div className={`relative overflow-hidden rounded-3xl border p-6 shadow-2xl ${isDark ? 'border-white/10 bg-gradient-to-br from-emerald-900/40 to-slate-900/40' : 'border-slate-200 bg-white'}`}>
            <div className="mb-2 flex items-center justify-between">
              <div className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-emerald-300/70' : 'text-slate-500'}`}>Avg Score</div>
              <Target className="h-5 w-5 text-emerald-500" />
            </div>
            <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{summary.avgScore.toFixed(1)}%</div>
          </div>

          <div className={`relative overflow-hidden rounded-3xl border p-6 shadow-2xl ${isDark ? 'border-amber-500/20 bg-gradient-to-br from-amber-900/40 to-slate-900/40' : 'border-slate-200 bg-white'}`}>
            <div className="mb-2 flex items-center justify-between">
              <div className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-amber-300/70' : 'text-slate-500'}`}>Top Scorer</div>
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div className={`truncate text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{summary.best?.userName || '-'}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="flex flex-col gap-4">
            <div className={`rounded-3xl border p-4 shadow-xl ${isDark ? 'border-white/10 bg-[#0F141F]' : 'border-slate-200 bg-white'}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="relative block">
                  <Search className={`pointer-events-none absolute left-4 top-3.5 h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student..."
                    className={`w-full rounded-2xl border px-11 py-3 text-sm focus:outline-none focus:ring-1 focus:border-blue-500/50 focus:ring-blue-500/50 ${isDark ? 'border-white/10 bg-[#0A0D14] text-white placeholder-slate-500' : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400'}`}
                  />
                </label>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:border-blue-500/50 focus:ring-blue-500/50 ${isDark ? 'border-white/10 bg-[#0A0D14] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                >
                  <option value="">All Assessments</option>
                  {((window as any).__examsDropdownList || exams).map((exam: any) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`flex-1 overflow-hidden rounded-3xl border shadow-xl ${isDark ? 'border-white/10 bg-[#0F141F]' : 'border-slate-200 bg-white'}`}>
              <div className={`border-b px-6 py-5 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Student Submissions</h2>
              </div>
              <div className="h-[600px] overflow-y-auto">
                {loading ? (
                  <div className={`p-8 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading analytics...</div>
                ) : filteredAttempts.length === 0 ? (
                  <div className={`p-8 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No matching attempts found.</div>
                ) : (
                  <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                    {filteredAttempts.map((attempt) => (
                      <button
                        key={attempt.id}
                        onClick={() => void viewAttempt(attempt)}
                        className={`w-full px-6 py-5 text-left transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} ${
                          selectedAttempt?.id === attempt.id ? (isDark ? 'bg-blue-500/10 shadow-[inset_4px_0_0_0_#3b82f6]' : 'bg-blue-50 shadow-[inset_4px_0_0_0_#2563eb]') : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`truncate font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{attempt.userName}</span>
                            </div>
                            <div className={`mt-1 truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{attempt.examTitle}</div>
                            <div className={`mt-2 text-[11px] font-medium tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{formatDateTime(attempt.submitted_at)}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{attempt.score}</div>
                            <div className={`mt-1 text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Marks</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className={`flex-1 overflow-hidden rounded-3xl border shadow-xl flex flex-col ${isDark ? 'border-white/10 bg-[#0F141F]' : 'border-slate-200 bg-white'}`}>
              <div className={`border-b px-6 py-5 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Detailed Breakdown</h2>
              </div>
              
              {!selectedAttempt ? (
                 <div className="flex flex-1 items-center justify-center p-8 text-center">
                   <div className="max-w-xs">
                      <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <Search className={`h-6 w-6 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                      </div>
                      <h3 className={`text-base font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No Attempt Selected</h3>
                      <p className={`mt-2 text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Select an attempt from the list to see question-by-question analysis.</p>
                   </div>
                 </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {/* Top Stats Overview */}
                  <div className="mb-6 grid gap-4 grid-cols-2 sm:grid-cols-4">
                     <div className={`rounded-2xl border p-4 text-center ${isDark ? 'border-white/5 bg-[#0A0D14]' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="text-2xl font-black text-emerald-500">{selectedAttempt.correct_answers}</div>
                        <div className={`mt-1 text-[11px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Correct</div>
                     </div>
                     <div className={`rounded-2xl border p-4 text-center ${isDark ? 'border-white/5 bg-[#0A0D14]' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="text-2xl font-black text-rose-500">{selectedAttempt.wrongAnswers}</div>
                        <div className={`mt-1 text-[11px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Wrong</div>
                     </div>
                     <div className={`rounded-2xl border p-4 text-center ${isDark ? 'border-white/5 bg-[#0A0D14]' : 'border-slate-100 bg-slate-50'}`}>
                        <div className={`text-2xl font-black ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{selectedAttempt.skippedAnswers}</div>
                        <div className={`mt-1 text-[11px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Skipped</div>
                     </div>
                     <div className={`rounded-2xl border p-4 text-center ${isDark ? 'border-white/5 bg-[#0A0D14]' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="text-2xl font-black text-amber-500">{formatDuration(selectedAttempt.time_taken_seconds)}</div>
                        <div className={`mt-1 text-[11px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Time</div>
                     </div>
                  </div>

                  {/* Chart section */}
                  <div className={`mb-8 rounded-2xl border p-6 flex flex-col sm:flex-row items-center gap-8 ${isDark ? 'border-white/5 bg-[#0A0D14]' : 'border-slate-100 bg-slate-50'}`}>
                     <div className="h-48 w-48 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={selectedChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {selectedChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: isDark ? '#0F141F' : '#ffffff', 
                                borderColor: isDark ? '#1E293B' : '#e2e8f0', 
                                color: isDark ? '#fff' : '#0f172a', 
                                borderRadius: '12px' 
                              }} 
                              itemStyle={{ color: isDark ? '#fff' : '#0f172a' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="flex-1 space-y-4">
                       <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedAttempt.userName}</h3>
                       <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedAttempt.examTitle}</div>
                       <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                             <div className="h-3 w-3 rounded-full bg-emerald-500" />
                             <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Correct ({selectedAttempt.correct_answers})</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="h-3 w-3 rounded-full bg-rose-500" />
                             <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Wrong ({selectedAttempt.wrongAnswers})</span>
                          </div>
                       </div>
                     </div>
                  </div>

                  {/* Questions Details */}
                  <div className="space-y-4">
                    <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Question Breakdown</h3>
                    {selectedAttempt.answers.map((answer, index) => {
                      const question = attemptQuestions.find((entry) => entry.id === answer.questionId);
                      const isSkipped = answer.skipped || answer.selectedOption < 0;
                      const isCorrect = !!answer.is_correct;
                      return (
                        <div
                          key={`${answer.questionId}-${index}`}
                          className={`rounded-2xl border p-5 transition hover:shadow-lg ${
                            isSkipped
                              ? (isDark ? 'border-slate-800 bg-[#0A0D14]' : 'border-slate-200 bg-slate-50')
                              : isCorrect
                              ? (isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/50')
                              : (isDark ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-200 bg-rose-50/50')
                          }`}
                        >
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shadow-inner ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'}`}>
                              Q{index + 1}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                              {isSkipped ? (
                                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Skipped</span>
                              ) : isCorrect ? (
                                <span className={`inline-flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  <CheckCircle2 className="h-4 w-4" />
                                  Correct
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                                  <XCircle className="h-4 w-4" />
                                  Incorrect
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`text-[15px] leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{answer.question_text || question?.question_text || 'Question text unavailable'}</div>
                          {(answer.question_image_url || question?.image_url) && (
                            <img
                              src={answer.question_image_url || question?.image_url}
                              alt={`Question ${index + 1}`}
                              className={`mt-4 max-h-52 rounded-xl object-contain ring-1 ${isDark ? 'ring-white/10' : 'ring-slate-200'}`}
                            />
                          )}
                          <div className="mt-5 space-y-2">
                            {(answer.option_text || question?.options || []).map((option, optionIndex) => {
                              const isChosen = answer.selectedOption === optionIndex;
                              const isCorrectOption = (answer.correctOption ?? question?.correct_index) === optionIndex;
                              const label = getAnswerLabel(answer.option_label_style || question?.option_label_style, optionIndex);
                              const optionImage = answer.option_images?.[optionIndex] || question?.option_images?.[optionIndex];
                              return (
                                <div
                                  key={`${answer.questionId}-${optionIndex}`}
                                  className={`rounded-xl border px-4 py-3 text-sm transition ${
                                    isCorrectOption
                                      ? (isDark ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-emerald-300 bg-emerald-50 text-emerald-800')
                                      : isChosen
                                      ? (isDark ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-rose-300 bg-rose-50 text-rose-800')
                                      : (isDark ? 'border-white/5 bg-slate-900/50 text-slate-400' : 'border-slate-200 bg-white text-slate-600')
                                  }`}
                                >
                                  <div className="flex items-start gap-4">
                                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                                      isCorrectOption ? (isDark ? 'border-emerald-500 bg-emerald-500 text-slate-900' : 'border-emerald-500 bg-emerald-500 text-white') : isChosen ? (isDark ? 'border-rose-500 bg-rose-500 text-white' : 'border-rose-500 bg-rose-500 text-white') : (isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-100')
                                    }`}>
                                      {label}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className={isCorrectOption ? 'font-medium' : ''}>{option}</div>
                                      {optionImage && <img src={optionImage} alt={`Option ${label}`} className={`mt-3 max-h-32 rounded-xl object-contain ring-1 ${isDark ? 'ring-white/10' : 'ring-slate-200'}`} />}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

