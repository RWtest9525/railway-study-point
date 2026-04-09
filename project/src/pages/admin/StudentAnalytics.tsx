import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, Eye, Search, Target, UserRound, XCircle } from 'lucide-react';
import { useRouter } from '../../contexts/RouterContext';
import { getAllAttempts, getExams, getQuestions, getUsers, Exam, Question, QuizAttempt } from '../../lib/firestore';
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

export function StudentAnalytics() {
  const { navigate } = useRouter();
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

      const examMap = new Map(examsData.map((exam) => [exam.id, exam]));
      const profileMap = new Map(
        profiles.map((profile) => [profile.id, { name: profile.full_name || 'Student', email: profile.email || 'No email' }])
      );

      const enrichedAttempts = attemptsData.map((attempt) => {
        const profile = profileMap.get(attempt.user_id);
        const skippedAnswers = attempt.answers.filter((answer) => answer.skipped || answer.selectedOption < 0).length;
        const wrongAnswers = Math.max(0, attempt.total_questions - attempt.correct_answers - skippedAnswers);
        return {
          ...attempt,
          examTitle: examMap.get(attempt.exam_id)?.title || 'Unknown exam',
          userName: profile?.name || 'Student',
          userEmail: profile?.email || 'No email',
          percentage: attempt.total_questions > 0 ? (attempt.score / attempt.total_questions) * 100 : 0,
          wrongAnswers,
          skippedAnswers,
        };
      });

      setExams(examsData);
      setAttempts(enrichedAttempts);

      if (presetExamId) {
        const latest = enrichedAttempts.find((attempt) => attempt.exam_id === presetExamId);
        if (latest) {
          setSelectedAttempt(latest);
          const questions = await getQuestions(latest.exam_id);
          setAttemptQuestions(questions);
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
    const questions = await getQuestions(attempt.exam_id);
    setAttemptQuestions(questions);
  };

  const getAnswerLabel = (style: 'alphabet' | 'numeric' | undefined, index: number) =>
    style === 'numeric' ? String(index + 1) : String.fromCharCode(65 + index);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-gray-700 bg-gray-900/70 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <button onClick={() => navigate('/admin-portal')} className="mb-3 inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
            <ArrowLeft className="h-4 w-4" />
            Back to admin portal
          </button>
          <h1 className="text-3xl font-bold text-white">Exam Performance Analytics</h1>
          <p className="text-sm text-gray-400">Check who attempted each exam, what they scored, and the exact questions they missed.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Attempts</div>
            <div className="mt-2 text-2xl font-bold text-white">{summary.totalAttempts}</div>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Average</div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">{summary.avgScore.toFixed(1)}%</div>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Top scorer</div>
            <div className="mt-2 truncate text-lg font-bold text-white">{summary.best?.userName || '-'}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-3 rounded-3xl border border-gray-700 bg-gray-900/70 p-4 md:grid-cols-[1fr_220px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-gray-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student or exam..."
                className="w-full rounded-2xl border border-gray-700 bg-gray-800 px-11 py-3 text-sm text-white"
              />
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="rounded-2xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white"
            >
              <option value="">All exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-700 bg-gray-900/70">
            <div className="border-b border-gray-700 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">Attempts</h2>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-gray-400">Loading analytics...</div>
            ) : filteredAttempts.length === 0 ? (
              <div className="p-6 text-sm text-gray-400">No attempts found for the current filter.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {filteredAttempts.map((attempt) => (
                  <button
                    key={attempt.id}
                    onClick={() => void viewAttempt(attempt)}
                    className={`w-full px-5 py-4 text-left transition hover:bg-gray-800/60 ${
                      selectedAttempt?.id === attempt.id ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-blue-300" />
                          <span className="font-semibold text-white">{attempt.userName}</span>
                          <span className="text-xs text-gray-500">{attempt.userEmail}</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-400">{attempt.examTitle}</div>
                        <div className="mt-2 text-xs text-gray-500">{formatDateTime(attempt.submitted_at)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                        <div className="rounded-2xl border border-gray-700 bg-gray-950/60 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Score</div>
                          <div className="mt-1 font-bold text-white">{attempt.score}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-700 bg-gray-950/60 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Correct</div>
                          <div className="mt-1 font-bold text-emerald-400">{attempt.correct_answers}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-700 bg-gray-950/60 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Wrong</div>
                          <div className="mt-1 font-bold text-rose-400">{attempt.wrongAnswers}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-700 bg-gray-950/60 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Skipped</div>
                          <div className="mt-1 font-bold text-slate-300">{attempt.skippedAnswers}</div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-700 bg-gray-900/70">
          <div className="border-b border-gray-700 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Attempt Details</h2>
          </div>
          {!selectedAttempt ? (
            <div className="p-6 text-sm text-gray-400">Select an attempt to inspect the full question-by-question breakdown.</div>
          ) : (
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-gray-700 bg-gray-950/60 p-4">
                <div className="text-lg font-semibold text-white">{selectedAttempt.userName}</div>
                <div className="mt-1 text-sm text-gray-400">{selectedAttempt.examTitle}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-gray-700 bg-gray-800 px-3 py-2 text-white">
                    <Target className="mb-1 h-4 w-4 text-blue-300" />
                    {selectedAttempt.score} marks
                  </div>
                  <div className="rounded-2xl border border-gray-700 bg-gray-800 px-3 py-2 text-white">
                    <Clock3 className="mb-1 h-4 w-4 text-amber-300" />
                    {formatDuration(selectedAttempt.time_taken_seconds)}
                  </div>
                </div>
              </div>

              <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
                {selectedAttempt.answers.map((answer, index) => {
                  const question = attemptQuestions.find((entry) => entry.id === answer.questionId);
                  const isSkipped = answer.skipped || answer.selectedOption < 0;
                  const isCorrect = !!answer.is_correct;
                  return (
                    <div
                      key={`${answer.questionId}-${index}`}
                      className={`rounded-2xl border p-4 ${
                        isSkipped
                          ? 'border-slate-700 bg-slate-950/60'
                          : isCorrect
                          ? 'border-emerald-500/30 bg-emerald-500/10'
                          : 'border-rose-500/30 bg-rose-500/10'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white">Q{index + 1}</div>
                        <div className="flex items-center gap-2 text-xs">
                          {isSkipped ? (
                            <span className="rounded-full border border-slate-600 px-3 py-1 text-slate-300">Skipped</span>
                          ) : isCorrect ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 px-3 py-1 text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 px-3 py-1 text-rose-300">
                              <XCircle className="h-3.5 w-3.5" />
                              Wrong
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm leading-6 text-gray-200">{answer.question_text || question?.question_text || 'Question text unavailable'}</div>
                      {(answer.question_image_url || question?.image_url) && (
                        <img
                          src={answer.question_image_url || question?.image_url}
                          alt={`Question ${index + 1}`}
                          className="mt-3 max-h-52 rounded-xl object-contain"
                        />
                      )}
                      <div className="mt-3 space-y-2">
                        {(answer.option_text || question?.options || []).map((option, optionIndex) => {
                          const isChosen = answer.selectedOption === optionIndex;
                          const isCorrectOption = (answer.correctOption ?? question?.correct_index) === optionIndex;
                          const label = getAnswerLabel(answer.option_label_style || question?.option_label_style, optionIndex);
                          const optionImage = answer.option_images?.[optionIndex] || question?.option_images?.[optionIndex];
                          return (
                            <div
                              key={`${answer.questionId}-${optionIndex}`}
                              className={`rounded-xl border px-3 py-2 text-sm ${
                                isCorrectOption
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                                  : isChosen
                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-100'
                                  : 'border-gray-700 bg-gray-900 text-gray-300'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                                  {label}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div>{option}</div>
                                  {optionImage && <img src={optionImage} alt={`Option ${label}`} className="mt-2 max-h-32 rounded-xl object-contain" />}
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
  );
}
