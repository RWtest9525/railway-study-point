import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { getExam, getQuestions, getQuestionsByCategoryNode, createAttempt, Question, Exam, getCategoryNode } from '../lib/firestore';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

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
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFocused, setIsFocused] = useState(true);
  const [proctoringViolations, setProctoringViolations] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>('All');
  
  // New States
  const [hasStarted, setHasStarted] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessTests) {
      navigate('/upgrade');
      return;
    }
    loadExamData();
  }, [examId, canAccessTests, authLoading, navigate]);

  // Proctoring & Auto Submit
  useEffect(() => {
    if (!hasStarted) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setIsFocused(false);
      } else {
        setIsFocused(true);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Auto Submit if they unmount without submitting and timer had started
      if (timeRemaining > 0 && !isSubmitting && hasStarted) {
        // Warning: React strict mode might trigger this twice in dev. Handled by isSubmitting state locking.
        handleSubmit();
      }
    };
  }, [hasStarted, timeRemaining, isSubmitting, exam]);

  useEffect(() => {
    if (hasStarted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [hasStarted, timeRemaining]);

  const loadExamData = async () => {
    try {
      if (examId.startsWith('node_')) {
        const nodeId = examId.replace('node_', '');
        const nodeData = await getCategoryNode(nodeId).catch(() => null);
        const questionsData = await getQuestionsByCategoryNode(nodeId);
        
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
        setQuestions(questionsData as QuestionWithSubject[]);
      } else {
        const examData = await getExam(examId);
        if (!examData) throw new Error('Exam not found');

        setExam(examData);
        setTimeRemaining(examData.duration_minutes * 60);

        const questionsData = await getQuestions(examId);
        setQuestions(questionsData as QuestionWithSubject[]);
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

    // Check for proctoring violations
    if (tabSwitchCount > 0 && exam.proctoring_enabled) { 
      const violationMessage = `Warning: You switched tabs ${tabSwitchCount} time(s) during the exam.`;
      proctoringViolations.push(violationMessage);
      setProctoringViolations([...proctoringViolations]);
    }
    
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
            questionId: question.id,
            selectedOption: selectedOption ?? -1,
            correctOption: question.correct_index,
            is_correct: selectedOption === question.correct_index,
            skipped: selectedOption === undefined,
            question_text: question.question_text,
            question_image_url: question.image_url,
            option_text: question.options,
            option_images: question.option_images,
            option_label_style: question.option_label_style,
            subject: question.subject,
            marks: question.marks,
            negative_marks: question.negative_marks ?? exam.negative_marking ?? 0,
          };
        }),
        score,
        total_questions: questions.length,
        correct_answers: correctAnswers,
        time_taken_seconds: timeTaken,
        started_at: new Date(startTime).toISOString(),
        tab_switches: tabSwitchCount,
        device_info: {
          type: /Mobi|Android|iPhone|iPad/i.test(window.navigator.userAgent) ? 'mobile' : 'desktop',
          browser: window.navigator.userAgent,
          os: window.navigator.platform,
        },
        subject_wise_scores: subjectWiseScores,
      });

      // Update exam attempt count (optional - for analytics)
      // Note: This would require adding 'attempts' field to Exam interface

      navigate(`/results/${attemptId}`);
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      alert('Failed to submit exam: ' + error.message);
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

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
            <p className={`text-sm mt-4 p-4 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <strong>Note:</strong> Navigating away from this page via device back buttons will automatically submit your exam.
            </p>
          </div>

          <button
            onClick={() => {
              setStartTime(Date.now());
              setHasStarted(true);
            }}
            className="w-full sm:w-auto px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-transform active:scale-95"
          >
            Start Assessment
          </button>
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

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Proctoring Warning */}
      {tabSwitchCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Proctoring Alert: You have switched tabs {tabSwitchCount} time(s) during this exam.</span>
            <span className="text-sm text-yellow-600">This may be considered a violation of exam rules.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b flex-shrink-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to exit? Your exam will be submitted and you cannot resume.')) {
                    handleSubmit();
                  }
                }}
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

              <div className="space-y-3">
                {currentQuestion?.options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        [currentQuestion.id]: index,
                      })
                    }
                    className={`w-full text-left p-4 rounded-xl border-2 transition ${
                      answers[currentQuestion.id] === index
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : isDark
                        ? 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold ${
                        answers[currentQuestion.id] === index
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : isDark
                          ? 'border-gray-500 text-gray-400'
                          : 'border-gray-400 text-gray-500'
                      }`}>
                        {getOptionLabel(currentQuestion, index)}
                      </span>
                      <div className="flex-1 pt-1">
                        <div>{getOptionText(currentQuestion, option, index)}</div>
                        {currentQuestion.option_images?.[index] && (
                          <img
                            src={currentQuestion.option_images[index]}
                            alt={`Option ${index + 1}`}
                            className="mt-3 max-h-44 rounded-xl object-contain"
                          />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center justify-center w-14 h-14 rounded-2xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                  ? 'bg-gray-800 hover:bg-gray-700 shadow-sm border border-gray-700 text-white'
                  : 'bg-white hover:bg-gray-50 shadow-sm border border-gray-200 text-gray-700'
                }`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Spacing to keep < and > ends balanced */}
              <div className="flex-1"></div>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={() =>
                    setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))
                  }
                  className="flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold transition shadow-lg shadow-blue-600/20"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to submit your exam now? You will not be able to change your answers.')) {
                      void handleSubmit();
                    }
                  }}
                  className="flex items-center justify-center px-6 h-14 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-extrabold tracking-wide uppercase text-sm transition shadow-lg shadow-green-600/20"
                >
                  Submit
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-5 border sticky top-24 shadow-lg`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Navigator</h3>
              
              <div className="grid grid-cols-5 gap-2 max-h-[35vh] lg:max-h-full overflow-y-auto pr-2 scrollbar-thin">
                {filteredQuestions.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(questions.findIndex(q => q.id === question.id))}
                    className={`w-10 h-10 rounded-lg font-semibold text-sm transition ${
                      questions.findIndex(q => q.id === question.id) === currentQuestionIndex
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : answers[question.id] !== undefined
                        ? 'bg-green-600 text-white'
                        : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Answered ({Object.keys(answers).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Not Answered ({questions.length - Object.keys(answers).length})</span>
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
                    alert('Report successfully sent to Admin for review');
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
    </div>
  );
}
