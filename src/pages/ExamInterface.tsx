import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { getExam, getQuestions, getQuestionsByCategoryNode, createAttempt, getAttempts, Question, Exam, getCategoryNode } from '../lib/firestore';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, ArrowLeft, AlertTriangle, Award, FileText, X, RotateCcw } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

interface ExamInterfaceProps {
  examId: string;
}

interface QuestionWithSubject extends Omit<Question, 'subject'> {
  subject: 'Maths' | 'Reasoning' | 'GK' | 'Science' | string;
}

export function ExamInterface({ examId }: ExamInterfaceProps) {
  const { profile, canAccessTests, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<QuestionWithSubject[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(Date.now());
  
  // Dialog States
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [submitSuccessAttemptId, setSubmitSuccessAttemptId] = useState<string | null>(null);
  const [existingAttemptId, setExistingAttemptId] = useState<string | null>(null);
  const questionScrollerRef = useRef<HTMLDivElement | null>(null);
  const questionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const startedAtRef = useRef<number>(Date.now());
  const examLoadedRef = useRef<string | null>(null);
  const draftKey = profile?.id ? `exam-draft:${profile.id}:${examId}` : '';

  const getInitialTimeRemaining = (examData: Exam | null) =>
    Math.max(0, Math.round((Number(examData?.duration_minutes) || 0) * 60));

  useEffect(() => {
    if (authLoading) return;
    if (examLoadedRef.current === examId) return;
    examLoadedRef.current = examId;
    loadExamData();
  }, [examId, authLoading, navigate]);

  // Timer Tick
  useEffect(() => {
    if (!hasStarted || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, timeRemaining]);

  // Save Progress draft
  useEffect(() => {
    if (!draftKey || !hasStarted || submitSuccessAttemptId) return;
    const draft = {
      answers,
      currentQuestionIndex,
      timeRemaining,
      startTime,
      markedForReview: Array.from(markedForReview),
      savedAt: Date.now(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [answers, currentQuestionIndex, draftKey, hasStarted, startTime, submitSuccessAttemptId, timeRemaining, markedForReview]);

  const loadExamData = async () => {
    try {
      let loadedQuestions: QuestionWithSubject[] = [];
      if (examId.startsWith('node_')) {
        const nodeId = examId.replace('node_', '');
        const nodeData = await getCategoryNode(nodeId).catch(() => null);
        const questionsData = await getQuestionsByCategoryNode(nodeId);
        loadedQuestions = questionsData as QuestionWithSubject[];
        
        let totalMarks = 0;
        questionsData.forEach((q: any) => totalMarks += (q.marks || 1));

        setExam({
          id: nodeId,
          title: nodeData?.name || 'Practice Test',
          description: 'Practice test for ' + (nodeData?.name || ''),
          duration_minutes: 0, 
          total_marks: totalMarks || 100,
          category_id: nodeData?.category_id || '',
          is_premium: false,
          is_active: true,
          created_at: '',
          updated_at: ''
        });
        
        setTimeRemaining(0); 
        setQuestions(loadedQuestions);
      } else {
        const examData = await getExam(examId);
        if (!examData) throw new Error('Exam not found');

        setExam(examData);
        setTimeRemaining(getInitialTimeRemaining(examData));

        const questionsData = await getQuestions(examId);
        loadedQuestions = questionsData as QuestionWithSubject[];
        setQuestions(loadedQuestions);
      }

      if (profile?.id) {
        const existingAttempts = await getAttempts(profile.id, examId);
        const completedAttempt = existingAttempts.find((attempt: any) => attempt.status === 'completed');
        if (completedAttempt) {
          setExistingAttemptId(completedAttempt.id);
          return;
        }
      }

      if (draftKey) {
        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          const safeIndex = Math.max(0, Math.min(loadedQuestions.length - 1, Number(draft.currentQuestionIndex) || 0));
          setAnswers(draft.answers || {});
          setCurrentQuestionIndex(safeIndex);
          setTimeRemaining(Math.max(0, Number(draft.timeRemaining) || 0));
          setStartTime(Number(draft.startTime) || Date.now());
          startedAtRef.current = Number(draft.startTime) || Date.now();
          if (draft.markedForReview && Array.isArray(draft.markedForReview)) {
            setMarkedForReview(new Set(draft.markedForReview));
          } else {
            setMarkedForReview(new Set());
          }
          setHasStarted(true);
          toast.success('Previous exam progress restored');
        }
      }
    } catch (error) {
      console.error('Error loading exam:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!profile?.id || !exam || isSubmitting) return;
    setIsSubmitting(true);
    
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    
    let score = 0;
    let correctAnswers = 0;
    const subjectWiseScores: { [subject: string]: { correct: number; total: number } } = {};
    
    questions.forEach((question) => {
      const userAnswer = answers[question.id];
      const answered = userAnswer !== undefined;
      const isCorrect = userAnswer === question.correct_index;

      if (answered && isCorrect) {
        score += question.marks || 1;
        correctAnswers += 1;
      } else if (answered && !isCorrect) {
        score -= question.negative_marks ?? exam.negative_marking ?? 0;
      }
      
      const subjectName = question.subject?.toLowerCase() || 'unspecified';
      if (!subjectWiseScores[subjectName]) {
        subjectWiseScores[subjectName] = { correct: 0, total: 0 };
      }
      subjectWiseScores[subjectName].total++;
      if (isCorrect) {
        subjectWiseScores[subjectName].correct++;
      }
    });

    try {
      const attemptId = await createAttempt({
        user_id: profile.id,
        exam_id: examId,
        answers: questions.map((question) => {
          const selectedOption = answers[question.id];
          return {
            questionId: question.id || '',
            selectedOption: selectedOption ?? -1,
            correctOption: question.correct_index ?? 0,
            is_correct: selectedOption === question.correct_index,
            skipped: selectedOption === undefined,
            question_text: question.question_text || '',
            question_image_url: question.image_url || null,
            option_text: question.options || [],
            option_images: question.option_images || null,
            option_label_style: question.option_label_style || 'alphabet',
            subject: question.subject || 'Unspecified',
            marks: question.marks || 1,
            negative_marks: question.negative_marks ?? exam.negative_marking ?? 0,
          };
        }),
        score,
        total_questions: questions.length,
        correct_answers: correctAnswers,
        time_taken_seconds: timeTaken,
        started_at: new Date(startTime).toISOString(),
        device_info: {
          type: /Mobi|Android|iPhone|iPad/i.test(window?.navigator?.userAgent || '') ? 'mobile' : 'desktop',
          browser: window?.navigator?.userAgent || 'unknown_browser',
          os: window?.navigator?.platform || 'unknown_os',
        },
        subject_wise_scores: subjectWiseScores,
        status: 'completed',
      });

      if (draftKey) localStorage.removeItem(draftKey);
      setSubmitSuccessAttemptId(attemptId);
      setSubmitConfirmOpen(false);
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      alert('Failed to submit exam: ' + error.message);
      setIsSubmitting(false);
      setSubmitConfirmOpen(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (!hasStarted || !currentQuestion?.id) return;
    questionButtonRefs.current[currentQuestion.id]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [currentQuestion?.id, hasStarted]);

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#090D16]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-lg`}>Loading exam...</p>
        </div>
      </div>
    );
  }

  if (existingAttemptId) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#090D16] text-white' : 'bg-gray-50 text-slate-900'} flex flex-col items-center justify-center px-4`}>
        <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl text-center ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Exam Already Submitted</h2>
          <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>You can take this test only one time.</p>
          <button
            onClick={() => navigate(`/results/${existingAttemptId}`)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20"
          >
            See Result
          </button>
        </div>
      </div>
    );
  }

  if (submitSuccessAttemptId) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#090D16] text-white' : 'bg-gray-50 text-slate-900'} flex flex-col items-center justify-center`}>
        <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl text-center ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
          <div className="w-20 h-20 bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Exam Submitted!</h2>
          <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>You have successfully completed this examination.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/results/${submitSuccessAttemptId}`)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20"
            >
              See Result
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className={`w-full py-3.5 font-bold rounded-xl transition ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#090D16] text-white' : 'bg-gray-50 text-slate-900'} flex flex-col`}>
        <header className={`sticky top-0 z-50 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm border-b px-6 py-4 flex items-center gap-4`}>
          <button onClick={() => navigate('/dashboard')} className={`p-2 rounded-full transition ${isDark ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-100 text-slate-600'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg md:text-xl truncate">{exam?.title}</h1>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12 flex flex-col justify-center items-center text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl ${isDark ? 'bg-blue-500/20 ring-4 ring-blue-500/10' : 'bg-blue-50 ring-4 ring-blue-100'}`}>
            <AlertTriangle className={`w-10 h-10 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <h2 className="text-3xl font-extrabold mb-4">Ready to Begin?</h2>
          <div className={`mb-8 space-y-4 max-w-md ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            <p>This assessment contains <strong className={isDark?'text-white':'text-black'}>{questions.length} questions</strong>.</p>
            <p>You have <strong className={isDark?'text-white':'text-black'}>{exam?.duration_minutes === 0 ? "unlimited time" : `${exam?.duration_minutes} minutes`}</strong> to complete it.</p>
            <p className={`text-sm mt-4 p-4 rounded-xl border ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
              Your progress is saved locally. Final result is saved only when you click Submit on the last question.
            </p>
          </div>

          {questions.length === 0 ? (
            <div className={`w-full max-w-md p-4 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              This folder has no tests available.
            </div>
          ) : (
            <button
              onClick={() => {
                const now = Date.now();
                startedAtRef.current = now;
                setStartTime(now);
                setTimeRemaining(getInitialTimeRemaining(exam));
                setIsSubmitting(false);
                setSubmitSuccessAttemptId(null);
                setSubmitConfirmOpen(false);
                setHasStarted(true);
              }}
              className="w-full sm:w-auto px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-transform active:scale-95"
            >
              Start Assessment
            </button>
          )}
        </main>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getOptionLabel = (question: QuestionWithSubject | undefined, index: number) => {
    const style = question?.option_label_style ?? 'alphabet';
    return style === 'numeric' ? String(index + 1) : String.fromCharCode(65 + index);
  };

  const getOptionText = (question: QuestionWithSubject | undefined, option: string | undefined, index: number) => {
    if (option?.trim()) return option;
    const label = getOptionLabel(question, index);
    return `Choose option ${label}`;
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(Math.max(0, Math.min(questions.length - 1, index)));
  };

  const scrollQuestionBubbles = (direction: 'left' | 'right') => {
    const scroller = questionScrollerRef.current;
    if (!scroller) return;
    const amount = 180;
    scroller.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = markedForReview.size;
  const unansweredCount = questions.length - answeredCount;
  const isFlagged = currentQuestion ? markedForReview.has(currentQuestion.id) : false;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${isDark ? 'bg-[#060A13] text-white' : 'bg-slate-100 text-slate-900'}`}>

      {/* ─── Compact Header ─── */}
      <header className={`flex-shrink-0 z-10 px-3 sm:px-5 py-2.5 ${isDark ? 'bg-[#0C1222]/95 border-[#1E293B]/60' : 'bg-white/95 border-slate-200/80'} border-b backdrop-blur-md`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          
          {/* Left: Back + Title */}
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={() => setLeaveConfirmOpen(true)}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className={`text-sm sm:text-base font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {exam?.title}
            </h1>
          </div>

          {/* Right: Timer + Q count + Marks in single row */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Timer - most prominent */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold ${
              isDark 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{timeRemaining > 0 ? formatTime(timeRemaining) : '∞'}</span>
            </div>
            {/* Compact Q/Marks */}
            <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
              isDark ? 'bg-white/5 text-slate-400 border border-white/5' : 'bg-slate-50 text-slate-500 border border-slate-200'
            }`}>
              <span>{questions.length}Q</span>
              <span className="opacity-30">|</span>
              <span>{exam?.total_marks}M</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Question Area (fills remaining space) ─── */}
      <main className="flex-1 overflow-hidden flex flex-col p-2.5 sm:p-4 md:p-5">
        
        {/* Question Card - takes all space */}
        <div className={`flex-1 rounded-2xl sm:rounded-3xl border overflow-hidden flex flex-col ${
          isDark 
            ? 'bg-gradient-to-b from-[#0F172A]/80 to-[#0C1222] border-[#1E293B]/50 shadow-2xl shadow-black/40' 
            : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
        }`}>
          
          {/* Question Header Bar - inside card */}
          <div className={`flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0 ${
            isDark ? 'border-b border-white/5' : 'border-b border-slate-100'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
              }`}>
                Q{currentQuestionIndex + 1}/{questions.length}
              </span>
              {currentQuestion?.subject && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  {currentQuestion.subject}
                </span>
              )}
            </div>

            {/* Flag Icon Button */}
            <button
              type="button"
              onClick={() => {
                const newMarked = new Set(markedForReview);
                if (newMarked.has(currentQuestion.id)) {
                  newMarked.delete(currentQuestion.id);
                } else {
                  newMarked.add(currentQuestion.id);
                }
                setMarkedForReview(newMarked);
              }}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isFlagged
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-110'
                  : isDark
                  ? 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-amber-400'
                  : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500'
              }`}
              title={isFlagged ? 'Remove flag' : 'Flag this question'}
            >
              <Flag className="w-4 h-4" fill={isFlagged ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Scrollable Question Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            {/* Question Text */}
            <h2 className={`text-base sm:text-lg md:text-xl font-bold leading-relaxed mb-5 ${isDark ? 'text-slate-50' : 'text-slate-800'}`}>
              {currentQuestion?.question_text}
            </h2>

            {/* Question Image */}
            {currentQuestion?.image_url && (
              <div className={`mb-6 p-2 rounded-2xl flex items-center justify-center max-w-lg mx-auto border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-150'}`}>
                <img
                  src={currentQuestion.image_url}
                  alt="Question contextual content"
                  className="max-h-[20vh] w-auto max-w-full rounded-lg object-contain"
                />
              </div>
            )}

            {/* Options - Bigger & More Premium */}
            <div className="grid gap-3 sm:gap-3.5 max-w-3xl mx-auto">
              {currentQuestion?.options?.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === index;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        [currentQuestion.id]: index,
                      })
                    }
                    className={`w-full text-left px-4 sm:px-5 py-4 sm:py-[18px] rounded-xl sm:rounded-2xl border-2 transition-all duration-200 ${
                      isSelected
                        ? isDark
                          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                          : 'border-blue-500 bg-blue-50 shadow-md shadow-blue-200/40'
                        : isDark
                        ? 'border-[#1E293B] bg-white/[0.02] hover:border-slate-600 hover:bg-white/[0.04] active:scale-[0.99]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4">
                      <span className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center font-black text-sm transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600 text-white'
                          : isDark
                          ? 'border-[#334155] bg-[#0F172A] text-slate-400'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}>
                        {getOptionLabel(currentQuestion, index)}
                      </span>
                      <div className="flex-1 text-sm sm:text-base font-semibold leading-relaxed">
                        <div className={isSelected ? (isDark ? 'text-blue-300' : 'text-blue-700') : (isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {getOptionText(currentQuestion, option, index)}
                        </div>
                        {currentQuestion.option_images?.[index] && (
                          <img
                            src={currentQuestion.option_images[index]}
                            alt={`Option ${index + 1}`}
                            className="mt-3 max-h-36 rounded-xl border border-slate-700/20 object-contain"
                          />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Controls Bar (Prev / Clear / Next / Submit) — inside card, below options ─── */}
          <div className={`flex-shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between gap-2 ${
            isDark ? 'border-t border-white/5 bg-black/20' : 'border-t border-slate-100 bg-slate-50/50'
          }`}>
            {/* Left: Prev + Clear */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => goToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center justify-center h-10 sm:h-11 px-3 sm:px-4 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'
                }`}
              >
                <ChevronLeft className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const newAnswers = { ...answers };
                  delete newAnswers[currentQuestion.id];
                  setAnswers(newAnswers);
                }}
                disabled={answers[currentQuestion.id] === undefined}
                className={`flex items-center justify-center h-10 sm:h-11 px-3 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'
                    : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 shadow-sm'
                }`}
                title="Clear answer"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs font-bold">Clear</span>
              </button>
            </div>

            {/* Right: Next or Submit */}
            {!isLastQuestion ? (
              <button
                type="button"
                onClick={() => goToQuestion(currentQuestionIndex + 1)}
                className={`flex items-center justify-center h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-bold text-sm transition-all ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSubmitConfirmOpen(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center h-10 sm:h-11 px-5 sm:px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* ─── Bottom Navigator ─── */}
      <div className={`flex-shrink-0 z-10 px-3 sm:px-5 py-2 ${
        isDark 
          ? 'bg-[#0C1222]/95 border-t border-[#1E293B]/60 backdrop-blur-md' 
          : 'bg-white/95 border-t border-slate-200/80 backdrop-blur-md'
      }`}>
        <div className="max-w-6xl mx-auto flex items-center gap-2 sm:gap-3">
          {/* Scroll Left */}
          <button
            type="button"
            onClick={() => scrollQuestionBubbles('left')}
            className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs font-bold transition ${
              isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {'<'}
          </button>
          
          {/* Question Bubbles */}
          <div
            ref={questionScrollerRef}
            className="flex-1 flex snap-x gap-1.5 sm:gap-2 overflow-x-auto py-1 scrollbar-none"
          >
            {questions.map((question, realIndex) => {
              const isCurrent = realIndex === currentQuestionIndex;
              const isAnswered = answers[question.id] !== undefined;
              const isBookmarked = markedForReview.has(question.id);
              
              let bubbleStyle = '';
              if (isCurrent) {
                bubbleStyle = isDark
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400/50 ring-offset-1 ring-offset-[#0C1222]'
                  : 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1 ring-offset-white';
              } else if (isBookmarked) {
                bubbleStyle = 'bg-amber-500 text-white';
              } else if (isAnswered) {
                bubbleStyle = isDark ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white';
              } else {
                bubbleStyle = isDark
                  ? 'bg-white/5 border border-white/10 text-slate-500 hover:bg-white/10'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200';
              }
              
              return (
                <button
                  key={realIndex}
                  ref={(node) => {
                    questionButtonRefs.current[question.id] = node;
                  }}
                  onClick={() => goToQuestion(realIndex)}
                  className={`h-8 w-8 sm:h-9 sm:w-9 flex-none snap-center rounded-full font-bold text-[11px] sm:text-xs transition-all duration-200 flex items-center justify-center ${bubbleStyle}`}
                >
                  {realIndex + 1}
                </button>
              );
            })}
          </div>

          {/* Scroll Right */}
          <button
            type="button"
            onClick={() => scrollQuestionBubbles('right')}
            className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs font-bold transition ${
              isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {'>'}
          </button>

          {/* Separator + Mini Stats */}
          <div className={`hidden sm:flex items-center gap-1.5 pl-2 border-l flex-shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              {answeredCount}✓
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
              {flaggedCount}⚑
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
              {unansweredCount}○
            </span>
          </div>
        </div>
      </div>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={submitConfirmOpen}
        onCancel={() => setSubmitConfirmOpen(false)}
        onConfirm={handleSubmit}
        title="Submit Exam"
        message="Are you sure you want to submit your exam now? You will not be able to return to change your answers."
        confirmText={isSubmitting ? "Submitting..." : "Yes, Submit"}
        cancelText="Review More"
        isDestructive={false}
      />

      <ConfirmModal
        isOpen={leaveConfirmOpen}
        onCancel={() => setLeaveConfirmOpen(false)}
        onConfirm={() => navigate('/dashboard')}
        title="Leave Exam"
        message="Leave this exam without submitting? Your current progress will stay saved locally so you can continue later."
        confirmText="Leave"
        cancelText="Stay"
        isDestructive={true}
      />
    </div>
  );
}

const timestampToString = (timestamp: any): string => {
  if (!timestamp) return '';
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  return '';
};
