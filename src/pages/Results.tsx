import { useEffect, useState } from 'react';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Trophy, Clock, Target, CheckCircle, XCircle, ArrowLeft, Home } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

type Result = Database['public']['Tables']['results']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];
type Exam = Database['public']['Tables']['exams']['Row'];

interface ResultsProps {
  resultId: string;
}

export function Results({ resultId }: ResultsProps) {
  const { navigate } = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResultData();
  }, [resultId]);

  const loadResultData = async () => {
    try {
      const { data: resultData, error: resultError } = await supabase
        .from('results')
        .select('*')
        .eq('id', resultId)
        .maybeSingle();

      if (resultError) throw resultError;
      if (!resultData) throw new Error('Result not found');

      setResult(resultData);

      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', resultData.exam_id)
        .maybeSingle();

      if (examError) throw examError;
      setExam(examData);

      const questionIds = examData?.question_ids as string[];
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
      console.error('Error loading result:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading results...</div>
      </div>
    );
  }

  const percentage = ((result!.score / result!.total_questions) * 100).toFixed(1);
  const correctCount = result!.score;
  const wrongCount = result!.total_questions - result!.score;
  const userAnswers = result!.answers as Record<string, number>;

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header with back arrow */}
      <header className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <h1 className="font-bold text-lg text-white">Results</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 mb-8">
          <div className="text-center mb-8">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${
              parseFloat(percentage) >= 60 ? 'bg-green-600' : 'bg-red-600'
            }`}>
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {parseFloat(percentage) >= 60 ? 'Great Job!' : 'Keep Practicing!'}
            </h1>
            <p className="text-gray-400">{exam?.title}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-gray-700/50 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {percentage}%
              </div>
              <div className="text-gray-400 flex items-center justify-center gap-1">
                <Target className="w-4 h-4" />
                Score
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {correctCount}
              </div>
              <div className="text-gray-400 flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Correct
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">
                {wrongCount}
              </div>
              <div className="text-gray-400 flex items-center justify-center gap-1">
                <XCircle className="w-4 h-4" />
                Wrong
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {Math.floor(result!.time_taken_seconds / 60)}m
              </div>
              <div className="text-gray-400 flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" />
                Time Taken
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  parseFloat(percentage) >= 60 ? 'bg-green-600' : 'bg-red-600'
                }`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Detailed Analysis</h2>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => {
            const userAnswer = userAnswers[question.id];
            const isCorrect = userAnswer === question.correct_answer;
            const options = question.options as string[];

            return (
              <div
                key={question.id}
                className={`bg-gray-800 rounded-xl p-6 border-2 ${
                  isCorrect ? 'border-green-600' : 'border-red-600'
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isCorrect ? 'bg-green-600' : 'bg-red-600'
                    } text-white`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg text-white mb-4 leading-relaxed">
                      {question.question_text}
                    </h3>

                    <div className="space-y-2 mb-4">
                      {options.map((option, optIndex) => {
                        const isUserAnswer = userAnswer === optIndex;
                        const isCorrectAnswer = question.correct_answer === optIndex;

                        return (
                          <div
                            key={optIndex}
                            className={`p-3 rounded-lg border-2 ${
                              isCorrectAnswer
                                ? 'border-green-500 bg-green-900/30'
                                : isUserAnswer
                                ? 'border-red-500 bg-red-900/30'
                                : 'border-gray-600 bg-gray-700/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-semibold text-white">
                                {String.fromCharCode(65 + optIndex)}
                              </span>
                              <span className={`flex-1 ${
                                isCorrectAnswer || isUserAnswer ? 'text-white' : 'text-gray-400'
                              }`}>
                                {option}
                              </span>
                              {isCorrectAnswer && (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              )}
                              {isUserAnswer && !isCorrect && (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded">
                      <div className="text-sm font-semibold text-blue-300 mb-2">
                        Explanation:
                      </div>
                      <div className="text-gray-300 leading-relaxed">
                        {question.explanation}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        </main>
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
