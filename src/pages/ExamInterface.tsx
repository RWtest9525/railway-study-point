import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle } from 'lucide-react';

type Question = Database['public']['Tables']['questions']['Row'];
type Exam = Database['public']['Tables']['exams']['Row'];

interface ExamInterfaceProps {
  examId: string;
}

export function ExamInterface({ examId }: ExamInterfaceProps) {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    loadExamData();
  }, [examId]);

  useEffect(() => {
    if (timeRemaining > 0) {
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
  }, [timeRemaining]);

  const loadExamData = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle();

      if (examError) throw examError;
      if (!examData) throw new Error('Exam not found');

      setExam(examData);
      setTimeRemaining(examData.duration_minutes * 60);

      const questionIds = examData.question_ids as string[];
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (questionsError) throw questionsError;

      const orderedQuestions = questionIds
        .map((id) => questionsData?.find((q) => q.id === id))
        .filter((q): q is Question => q !== undefined);

      setQuestions(orderedQuestions);
    } catch (error) {
      console.error('Error loading exam:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const score = Object.entries(answers).reduce((acc, [qId, answer]) => {
      const question = questions.find((q) => q.id === qId);
      return acc + (question?.correct_answer === answer ? 1 : 0);
    }, 0);

    try {
      const { data, error } = await supabase
        .from('results')
        .insert({
          user_id: profile!.id,
          exam_id: examId,
          score,
          total_questions: questions.length,
          time_taken_seconds: timeTaken,
          answers,
        })
        .select()
        .single();

      if (error) throw error;
      navigate(`/results/${data.id}`);
    } catch (error) {
      console.error('Error submitting exam:', error);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading exam...</div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white">{exam?.title}</h1>
              <p className="text-sm text-gray-400">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className={`flex items-center gap-2 text-lg font-bold ${
              timeRemaining < 300 ? 'text-red-400' : 'text-white'
            }`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 mb-6">
              <h2 className="text-2xl text-white mb-6 leading-relaxed">
                {currentQuestion?.question_text}
              </h2>

              <div className="space-y-4">
                {(currentQuestion?.options as string[])?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        [currentQuestion.id]: index,
                      })
                    }
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      answers[currentQuestion.id] === index
                        ? 'border-blue-500 bg-blue-900/30 text-white'
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1 pt-1">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              <button
                onClick={() => {
                  const newMarked = new Set(markedForReview);
                  if (newMarked.has(currentQuestion.id)) {
                    newMarked.delete(currentQuestion.id);
                  } else {
                    newMarked.add(currentQuestion.id);
                  }
                  setMarkedForReview(newMarked);
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                  markedForReview.has(currentQuestion.id)
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                <Flag className="w-5 h-5" />
                {markedForReview.has(currentQuestion.id) ? 'Unmark' : 'Mark for Review'}
              </button>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={() =>
                    setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))
                  }
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                >
                  <CheckCircle className="w-5 h-5" />
                  Submit Exam
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 sticky top-24">
              <h3 className="text-lg font-bold text-white mb-4">Question Navigator</h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-10 h-10 rounded-lg font-semibold text-sm transition ${
                      index === currentQuestionIndex
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : answers[question.id] !== undefined
                        ? 'bg-green-600 text-white'
                        : markedForReview.has(question.id)
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span>Answered ({Object.keys(answers).length})</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                  <span>Marked ({markedForReview.size})</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <div className="w-4 h-4 bg-gray-700 rounded"></div>
                  <span>Not Answered ({questions.length - Object.keys(answers).length})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
