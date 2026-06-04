import { useEffect, useState, useRef } from 'react';
import { useRouter } from '../contexts/RouterContext';
import { getAttempt, getExam, getQuestions, QuizAttempt, Exam, Question } from '../lib/firestore';
import { Trophy, Clock, Target, CheckCircle, XCircle, ArrowLeft, BarChart3 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { BottomNav } from '../components/BottomNav';

interface ResultsProps {
  resultId: string;
}

interface QuestionWithSubject extends Omit<Question, 'subject'> {
  subject: string;
}

export function Results({ resultId }: ResultsProps) {
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<QuestionWithSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis'>('overview');
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  useEffect(() => {
    if (!resultId) {
      setError('No result ID provided');
      setLoading(false);
      return;
    }

    let cancelled = false;
    retryCountRef.current = 0;

    const loadResultData = async () => {
      try {
        const attemptData = await getAttempt(resultId);
        
        if (!attemptData) {
          // The attempt document might not be available yet due to Firestore propagation
          // Retry a few times before giving up
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            console.log(`Attempt not found, retrying (${retryCountRef.current}/${maxRetries})...`);
            if (!cancelled) {
              setTimeout(() => {
                if (!cancelled) loadResultData();
              }, 1000 * retryCountRef.current); // Exponential-ish backoff: 1s, 2s, 3s, 4s, 5s
            }
            return;
          }
          throw new Error('Result not found after multiple retries');
        }
        
        if (cancelled) return;
        setAttempt(attemptData);

        // Fetch exam data - don't fail if this doesn't work
        try {
          const examData = await getExam(attemptData.exam_id);
          if (!cancelled && examData) setExam(examData);
        } catch (examErr) {
          console.warn('Could not load exam details:', examErr);
          // Set a fallback exam so the page still renders
          if (!cancelled) {
            setExam({
              id: attemptData.exam_id,
              category_id: '',
              title: 'Exam',
              duration_minutes: 0,
              total_marks: attemptData.total_questions,
              is_premium: false,
              is_active: true,
              created_at: '',
              updated_at: '',
            });
          }
        }

        // Fetch questions - don't fail if this doesn't work
        try {
          const questionsData = await getQuestions(attemptData.exam_id);
          if (!cancelled) setQuestions(questionsData as QuestionWithSubject[]);
        } catch (qErr) {
          console.warn('Could not load question details:', qErr);
        }
      } catch (err) {
        console.error('Error loading result:', err);
        if (!cancelled) {
          setError('Could not load your results. Please try again.');
        }
      } finally {
        if (!cancelled) {
          // Only stop loading if we're not waiting for a retry
          if (retryCountRef.current >= maxRetries || attempt !== null) {
            setLoading(false);
          }
        }
      }
    };

    loadResultData();

    return () => {
      cancelled = true;
    };
  }, [resultId]);

  // Once attempt is set, stop loading
  useEffect(() => {
    if (attempt) {
      setLoading(false);
    }
  }, [attempt]);

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-lg`}>Loading results...</p>
          {retryCountRef.current > 0 && (
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mt-2`}>
              Please wait, fetching your results...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg mb-2`}>{error}</p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                retryCountRef.current = 0;
                // Re-trigger the effect by setting state
                setAttempt(null);
                window.location.reload();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className={`${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'} px-6 py-2 rounded-lg font-medium`}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg mb-4`}>Result not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Helper: convert Firestore Timestamp or string to a readable date
  const toDateString = (val: any): string => {
    if (!val) return 'N/A';
    if (typeof val === 'string') return new Date(val).toLocaleDateString();
    if (val?.toDate) return val.toDate().toLocaleDateString(); // Firestore Timestamp
    if (val?.seconds) return new Date(val.seconds * 1000).toLocaleDateString(); // Timestamp object
    return new Date(val).toLocaleDateString();
  };

  const percentage = attempt.total_questions > 0
    ? ((attempt.score / attempt.total_questions) * 100).toFixed(1)
    : '0.0';
  const correctCount = attempt.correct_answers ?? attempt.score ?? 0;
  const userAnswers: { questionId: string; selectedOption: number }[] = attempt.answers || [];
  const answeredCount = userAnswers.filter((a) => a.selectedOption !== -1).length;
  const wrongCount = answeredCount - correctCount;
  const unansweredCount = attempt.total_questions - answeredCount;

  // Build a map of questionId -> question for quick lookup
  const questionMap = new Map(questions.map(q => [q.id, q]));

  // Subject-wise analysis
  const subjectAnalysis: { [subject: string]: { correct: number; total: number; percentage: number } } = {};
  
  // If we have questions loaded, compute subject-wise from actual questions
  if (questions.length > 0) {
    questions.forEach(q => {
      const subject = q.subject || 'General';
      if (!subjectAnalysis[subject]) {
        subjectAnalysis[subject] = { correct: 0, total: 0, percentage: 0 };
      }
      subjectAnalysis[subject].total++;
      const userAnswer = userAnswers.find(a => a.questionId === q.id);
      if (userAnswer && userAnswer.selectedOption === q.correct_index) {
        subjectAnalysis[subject].correct++;
      }
    });
  } else if (attempt.subject_wise_scores) {
    // Fallback: use the subject_wise_scores stored in the attempt
    Object.entries(attempt.subject_wise_scores).forEach(([subject, stats]) => {
      subjectAnalysis[subject] = {
        correct: stats.correct,
        total: stats.total,
        percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      };
    });
  }
  
  Object.values(subjectAnalysis).forEach(s => {
    s.percentage = s.total > 0 ? (s.correct / s.total) * 100 : 0;
  });

  // Fallback exam title
  const examTitle = exam?.title || 'Exam';

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header with back arrow */}
      <header className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} sticky top-0 z-50 backdrop-blur-md border-b`}>
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Results</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Score Card */}
        <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 sm:p-8 border shadow-xl mb-8`}>
          <div className="text-center mb-8">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${
              parseFloat(percentage) >= 60 ? 'bg-green-600' : 'bg-red-600'
            } shadow-lg`}>
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {parseFloat(percentage) >= 60 ? 'Great Job!' : 'Keep Practicing!'}
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{examTitle}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl p-4 text-center`}>
              <div className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {percentage}%
              </div>
              <div className={`flex items-center justify-center gap-1 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Target className="w-4 h-4" />
                Score
              </div>
            </div>

            <div className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl p-4 text-center`}>
              <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-1">
                {correctCount}
              </div>
              <div className={`flex items-center justify-center gap-1 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <CheckCircle className="w-4 h-4" />
                Correct
              </div>
            </div>

            <div className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl p-4 text-center`}>
              <div className="text-2xl sm:text-3xl font-bold text-red-400 mb-1">
                {wrongCount < 0 ? 0 : wrongCount}
              </div>
              <div className={`flex items-center justify-center gap-1 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <XCircle className="w-4 h-4" />
                Wrong
              </div>
            </div>

            <div className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl p-4 text-center`}>
              <div className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {Math.floor((attempt.time_taken_seconds || 0) / 60)}m {(attempt.time_taken_seconds || 0) % 60}s
              </div>
              <div className={`flex items-center justify-center gap-1 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Clock className="w-4 h-4" />
                Time Taken
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className={`h-full transition-all duration-1000 ${
                  parseFloat(percentage) >= 60 ? 'bg-green-600' : 'bg-red-600'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : isDark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-1" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'analysis'
                ? 'bg-blue-600 text-white'
                : isDark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Detailed Analysis
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border shadow-lg`}>
            <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Subject-wise Analysis</h2>
            {Object.keys(subjectAnalysis).length === 0 ? (
              <div className="text-center py-8">
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Score: {correctCount}/{attempt.total_questions} ({percentage}%)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(subjectAnalysis).map(([subject, stats]) => (
                  <div key={subject}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{subject}</span>
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {stats.correct}/{stats.total} ({stats.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full transition-all ${
                          stats.percentage >= 60 ? 'bg-green-500' : stats.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {questions.length === 0 ? (
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-8 border text-center`}>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Detailed question analysis is not available for this attempt.
                </p>
                <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm mt-2`}>
                  Your score: {correctCount}/{attempt.total_questions}
                </p>
              </div>
            ) : (
              questions.map((question, index) => {
                const userAnswer = userAnswers.find(a => a.questionId === question.id);
                const isCorrect = userAnswer?.selectedOption === question.correct_index;
                const options = question.options || [];

                return (
                  <div
                    key={question.id}
                    className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 border-2 ${
                      isCorrect ? 'border-green-500/50' : 'border-red-500/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                          isCorrect ? 'bg-green-600' : 'bg-red-600'
                        } text-white`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                            question.subject === 'Maths' ? 'bg-purple-500/20 text-purple-400' :
                            question.subject === 'Reasoning' ? 'bg-blue-500/20 text-blue-400' :
                            question.subject === 'GK' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {question.subject}
                          </span>
                        </div>
                        <h3 className={`text-lg mb-4 leading-relaxed ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {question.question_text}
                        </h3>

                        <div className="space-y-2 mb-4">
                          {options.map((option: string, optIndex: number) => {
                            const isUserAnswer = userAnswer?.selectedOption === optIndex;
                            const isCorrectAnswer = question.correct_index === optIndex;

                            return (
                              <div
                                key={optIndex}
                                className={`p-3 rounded-lg border-2 ${
                                  isCorrectAnswer
                                    ? 'border-green-500 bg-green-500/10'
                                    : isUserAnswer
                                    ? 'border-red-500 bg-red-500/10'
                                    : isDark
                                    ? 'border-gray-600 bg-gray-700/30'
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${
                                    isCorrectAnswer
                                      ? 'border-green-500 bg-green-500 text-white'
                                      : isUserAnswer
                                      ? 'border-red-500 bg-red-500 text-white'
                                      : isDark
                                      ? 'border-gray-500 text-gray-400'
                                      : 'border-gray-400 text-gray-500'
                                  }`}>
                                    {String.fromCharCode(65 + optIndex)}
                                  </span>
                                  <span className={`flex-1 ${
                                    isCorrectAnswer || isUserAnswer
                                      ? isDark ? 'text-white' : 'text-gray-900'
                                      : isDark ? 'text-gray-400' : 'text-gray-500'
                                  }`}>
                                    {option}
                                  </span>
                                  {isCorrectAnswer && (
                                    <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                                  )}
                                  {isUserAnswer && !isCorrect && (
                                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {question.explanation && (
                          <div className={`${isDark ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'} border-l-4 p-4 rounded`}>
                            <div className={`text-sm font-semibold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                              Explanation:
                            </div>
                            <div className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {question.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}