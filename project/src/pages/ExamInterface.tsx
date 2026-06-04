import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { getExam, getQuestions, getQuestionsByCategoryNode, createAttempt, getAttempts, Question, Exam, getCategoryNode } from '../lib/firestore';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
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
  const [activeSubject, setActiveSubject] = useState<string>('All');
  
  // New States
  const [hasStarted, setHasStarted] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
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
    if (!canAccessTests) {
      navigate('/upgrade');
      return;
    }
    examLoadedRef.current = examId;
    loadExamData();
  }, [examId, canAccessTests, authLoading, navigate]);

  // Warn students before closing/reloading the running exam. Do not submit here:
  // React cleanup also runs during ordinary re-renders and route changes.
  useEffect(() => {
    if (!hasStarted || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, timeRemaining]);

  useEffect(() => {
    if (!draftKey || !hasStarted || submitSuccessAttemptId) return;
    const draft = {
      answers,
      currentQuestionIndex,
      timeRemaining,
      startTime,
      activeSubject,
      markedForReview: Array.from(markedForReview),
      savedAt: Date.now(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [activeSubject, answers, currentQuestionIndex, draftKey, hasStarted, startTime, submitSuccessAttemptId, timeRemaining, markedForReview]);

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
          duration_minutes: 0, // 0 handles infinite or just fallback
          total_marks: totalMarks || 100,
          category_id: nodeData?.category_id || '',
          is_premium: false,
          is_active: true,
          created_at: '',
          updated_at: ''
        });
        
        setTimeRemaining(0); // infinite
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
          setActiveSubject(draft.activeSubject || 'All');
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
    
    // Calculate score and subject-wise analysis
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
      
      // Case insensitive normalization for subject
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

      // Update exam attempt count (optional - for analytics)
      // Note: This would require adding 'attempts' field to Exam interface

      // Instead of navigate, show success modal
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
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-lg`}>Loading exam...</p>
        </div>
      </div>
    );
  }

  if (existingAttemptId) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-slate-900'} flex flex-col items-center justify-center px-4`}>
        <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl text-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Exam Already Submitted</h2>
          <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>You can take this test only one time.</p>
          <button
            onClick={() => navigate(`/results/${existingAttemptId}`)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition"
          >
            See Result
          </button>
        </div>
      </div>
    );
  }

  if (submitSuccessAttemptId) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-slate-900'} flex flex-col items-center justify-center`}>
        <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl text-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Exam Submitted!</h2>
          <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>You have successfully completed this examination.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/results/${submitSuccessAttemptId}`)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition"
            >
              See Result
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className={`w-full py-3.5 font-bold rounded-xl transition ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
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
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-slate-900'} flex flex-col`}>
        <header className={`sticky top-0 z-50 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} px-6 py-4 flex items-center gap-4`}>
          <button onClick={() => navigate('/dashboard')} className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-slate-600'}`}>
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
    return `${hrs.toString().padStart(2, '0')} : ${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  };

  const subjects = Array.from(new Set(questions.map(q => q.subject)));

  const filteredQuestions = activeSubject === 'All' 
    ? questions 
    : questions.filter(q => q.subject === activeSubject);

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
    const amount = Math.max(180, scroller.clientWidth * 0.7);
    scroller.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>

      {/* Header */}
      <header className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b flex-shrink-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setLeaveConfirmOpen(true)}
                className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>
              <div>
                <h1 className={`text-lg md:text-xl font-bold truncate max-w-[200px] sm:max-w-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>{exam?.title}</h1>
                <div className={`text-xs md:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-2`}>
                  <span>{questions.length} Qs</span>
                  <span className="opacity-50">•</span>
                  <span>{exam?.total_marks} Marks</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setReportModalOpen(true)}
                className={`p-2 rounded-full transition ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                title="Report Issue"
              >
                <Flag className="w-5 h-5" />
              </button>
              
              <div className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'} rounded-lg font-mono font-bold`}>
                <Clock className="w-5 h-5" />
                {timeRemaining > 0 ? formatTime(timeRemaining) : '--:--'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Subject Tabs */}
      {subjects.length > 1 && (
        <div className={`${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-3">
              <button
                onClick={() => setActiveSubject('All')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  activeSubject === 'All'
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({questions.length})
              </button>
              {subjects.map(subject => (
                <button
                  key={subject}
                  onClick={() => setActiveSubject(subject)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                    activeSubject === subject
                      ? 'bg-blue-600 text-white'
                      : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {subject} ({questions.filter(q => q.subject === subject).length})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 border mb-6 shadow-lg`}>
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
                  currentQuestion?.subject === 'Maths' ? 'bg-purple-500/20 text-purple-400' :
                  currentQuestion?.subject === 'Reasoning' ? 'bg-blue-500/20 text-blue-400' :
                  currentQuestion?.subject === 'GK' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {currentQuestion?.subject}
                </span>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {currentQuestion?.marks || 1} mark{currentQuestion?.marks !== 1 ? 's' : ''}
                </span>
              </div>

              <h2 className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'} mb-6 leading-relaxed`}>
                {currentQuestion?.question_text}
              </h2>

              {currentQuestion?.image_url && (
                <div className={`mb-6 p-2 rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-950/50' : 'bg-gray-100/50'}`}>
                  <img
                    src={currentQuestion.image_url}
                    alt="Question visual context"
                    className="max-h-[30vh] w-auto max-w-full rounded shadow-sm object-contain"
                  />
                </div>
              )}
              <div className="space-y-3.5">
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
                      className={`w-full text-left p-4.5 rounded-2xl border-2 transition-all duration-200 transform ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/10 text-blue-650 dark:text-blue-400 shadow-md shadow-blue-500/5'
                          : isDark
                          ? 'border-slate-800/85 bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40 hover:-translate-y-0.5'
                          : 'border-slate-200/80 bg-white text-slate-750 hover:border-slate-350 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className={`flex-shrink-0 w-8.5 h-8.5 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                            : isDark
                            ? 'border-slate-800 bg-slate-900 text-slate-400'
                            : 'border-slate-250 bg-slate-100 text-slate-500'
                        }`}>
                          {getOptionLabel(currentQuestion, index)}
                        </span>
                        <div className="flex-1 pt-1 text-base font-medium leading-relaxed">
                          <div>{getOptionText(currentQuestion, option, index)}</div>
                          {currentQuestion.option_images?.[index] && (
                            <img
                              src={currentQuestion.option_images[index]}
                              alt={`Option ${index + 1}`}
                              className="mt-3.5 max-h-44 rounded-2xl border border-slate-700/25 object-contain shadow-sm"
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-between items-center mt-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  aria-label="Previous question"
                  className={`flex items-center justify-center w-14 h-14 rounded-2xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-750 shadow-sm'
                  }`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    const newAnswers = { ...answers };
                    delete newAnswers[currentQuestion.id];
                    setAnswers(newAnswers);
                  }}
                  disabled={answers[currentQuestion.id] === undefined}
                  className={`px-4 h-14 rounded-2xl font-semibold text-xs transition border flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-750'
                  }`}
                >
                  Clear Answer
                </button>
              </div>

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
                className={`px-5 h-14 rounded-2xl font-semibold text-xs transition border flex items-center gap-1.5 ${
                  markedForReview.has(currentQuestion.id)
                    ? 'bg-amber-500/25 border-amber-500 text-amber-500 dark:text-amber-400 font-bold'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-750'
                }`}
              >
                <Flag className="w-4 h-4" />
                {markedForReview.has(currentQuestion.id) ? 'Bookmarked' : 'Bookmark'}
              </button>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    goToQuestion(currentQuestionIndex + 1)
                  }
                  aria-label="Next question"
                  className="flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold transition shadow-lg shadow-blue-500/20"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubmitConfirmOpen(true)}
                  disabled={isSubmitting}
                  className="flex items-center justify-center px-6 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-extrabold tracking-wide uppercase text-sm transition shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-5 border sticky top-24 shadow-lg`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Navigator</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => scrollQuestionBubbles('left')}
                    aria-label="Scroll question numbers left"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg font-bold transition ${isDark ? 'border-gray-600 bg-gray-900 text-gray-200 hover:bg-gray-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    {'<'}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollQuestionBubbles('right')}
                    aria-label="Scroll question numbers right"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg font-bold transition ${isDark ? 'border-gray-600 bg-gray-900 text-gray-200 hover:bg-gray-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    {'>'}
                  </button>
                </div>
              </div>
              
              <div
                ref={questionScrollerRef}
                className="flex max-w-full snap-x gap-2 overflow-x-auto pb-2.5 scrollbar-thin"
              >
                {filteredQuestions.map((question) => {
                  const realIndex = questions.findIndex(q => q.id === question.id);
                  const isCurrent = realIndex === currentQuestionIndex;
                  const isAnswered = answers[question.id] !== undefined;
                  const isBookmarked = markedForReview.has(question.id);
                  
                  let bubbleStyle = '';
                  if (isCurrent) {
                    bubbleStyle = 'bg-blue-600 text-white ring-4 ring-blue-500/30';
                  } else if (isAnswered && isBookmarked) {
                    bubbleStyle = 'bg-purple-600 text-white hover:bg-purple-500';
                  } else if (isAnswered) {
                    bubbleStyle = 'bg-emerald-600 text-white hover:bg-emerald-500';
                  } else if (isBookmarked) {
                    bubbleStyle = 'bg-amber-500 text-white hover:bg-amber-400';
                  } else {
                    bubbleStyle = isDark
                      ? 'bg-slate-850 border border-slate-700 text-slate-350 hover:bg-slate-800'
                      : 'bg-slate-100 border border-slate-200 text-slate-650 hover:bg-slate-200';
                  }
                  
                  return (
                    <button
                      key={question.id}
                      ref={(node) => {
                        questionButtonRefs.current[question.id] = node;
                      }}
                      onClick={() => goToQuestion(realIndex)}
                      className={`h-10 w-10 flex-none snap-center rounded-xl font-bold text-xs transition duration-200 ${bubbleStyle}`}
                    >
                      {realIndex + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-2.5 text-xs font-semibold">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 bg-emerald-600 rounded-md"></div>
                  <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    Answered ({Object.keys(answers).length})
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 bg-amber-500 rounded-md"></div>
                  <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    Bookmarked ({markedForReview.size})
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 bg-purple-600 rounded-md"></div>
                  <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    Answered & Bookmarked ({
                      Object.keys(answers).filter(id => markedForReview.has(id)).length
                    })
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-md border ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                  }`}></div>
                  <span className={isDark ? 'text-slate-300' : 'text-slate-655'}>
                    Unanswered ({questions.length - Object.keys(answers).length})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Report Issue Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className={`${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'} w-full max-w-sm rounded-[24px] p-6 shadow-2xl`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Report Issue</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>We will review this question shortly.</p>
            
            <div className="space-y-2 mb-6">
              {['Image not visible', 'Hard question', 'Wrong question', 'Wrong option'].map(reason => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition ${
                    reportReason === reason 
                      ? 'border-blue-500 bg-blue-500/10 text-blue-500' 
                      : isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setReportModalOpen(false);
                  setReportReason("");
                }}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (reportReason) {
                    toast.success('Report successfully sent to Admin for review');
                    setReportModalOpen(false);
                    setReportReason("");
                  }
                }}
                disabled={!reportReason}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Submit Confirmation Modal */}
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
