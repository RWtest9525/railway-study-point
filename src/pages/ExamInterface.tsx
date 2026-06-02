import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface ExamInterfaceProps {
  examId?: string;
}

const ExamInterface = ({ examId: examIdProp }: ExamInterfaceProps = {}) => {
  const { examId: routeExamId } = useParams();
  const examId = examIdProp || routeExamId;
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const questionScrollerRef = useRef<HTMLDivElement | null>(null);
  const questionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const draftKey = user?.uid && examId ? `exam-draft:${user.uid}:${examId}` : '';

  useEffect(() => {
    // Check if user has premium
    if (!userData?.isPremium) {
      alert("Upgrade to Premium to access this exam!");
      navigate('/membership');
      return;
    }

    const fetchQuestions = async () => {
      if (user?.uid && examId) {
        const submissionQuery = query(
          collection(db, 'submissions'),
          where('userId', '==', user.uid),
          where('examId', '==', examId)
        );
        const submissionSnap = await getDocs(submissionQuery);
        if (!submissionSnap.empty) {
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }
      }

      const q = query(collection(db, 'questions'), where('exam_id', '==', examId));
      const snap = await getDocs(q);
      const loadedQuestions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuestions(loadedQuestions);
      if (draftKey) {
        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          setAnswers(draft.answers || {});
          const safeIndex = Math.max(0, Math.min(loadedQuestions.length - 1, Number(draft.currentIdx) || 0));
          setCurrentIdx(safeIndex);
        }
      }
      setLoading(false);
    };
    fetchQuestions();
  }, [draftKey, examId, userData]);

  useEffect(() => {
    if (!draftKey || loading || questions.length === 0) return;
    localStorage.setItem(draftKey, JSON.stringify({
      answers,
      currentIdx,
      savedAt: Date.now(),
    }));
  }, [answers, currentIdx, draftKey, loading, questions.length]);

  useEffect(() => {
    const activeQuestion = questions[currentIdx];
    if (!activeQuestion?.id) return;
    questionButtonRefs.current[activeQuestion.id]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [currentIdx, questions]);

  const handleSubmit = async (source: 'manual' = 'manual') => {
    if (source !== 'manual' || submitting) return;
    const confirmed = window.confirm('Submit exam now? You cannot change answers after final submit.');
    if (!confirmed) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'submissions'), {
        userId: user?.uid,
        userEmail: user?.email,
        examId,
        answers,
        submittedAt: new Date(),
        score: 'Pending Analysis'
      });
      if (draftKey) localStorage.removeItem(draftKey);
      alert("Mock Test Submitted Successfully! Result will be updated soon.");
      navigate('/dashboard');
    } catch (e) {
      alert("Submission Error. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Loading Exam Questions...</div>;
  if (alreadySubmitted) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col gap-4 items-center justify-center text-white text-xl">
        <div>This exam is already submitted.</div>
        <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-indigo-600 rounded-xl font-bold">Back to Dashboard</button>
      </div>
    );
  }
  if (questions.length === 0) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white text-xl">No questions found for this exam. Contact Admin.</div>;

  const q = questions[currentIdx];
  const optionList: string[] = Array.isArray(q.options) ? q.options : [q.opt1, q.opt2, q.opt3, q.opt4];
  const goToQuestion = (index: number) => setCurrentIdx(Math.max(0, Math.min(questions.length - 1, index)));
  const scrollQuestionBubbles = (direction: 'left' | 'right') => {
    const scroller = questionScrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      left: direction === 'left' ? -220 : 220,
      behavior: 'smooth',
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700">
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <h2 className="text-indigo-400 font-bold text-lg">Question {currentIdx + 1} / {questions.length}</h2>
          <div className="bg-red-500/20 text-red-400 px-4 py-1 rounded-full text-sm font-bold">LIVE EXAM</div>
        </div>

        <div className="mb-8 flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollQuestionBubbles('left')}
            className="h-10 w-10 rounded-lg border border-slate-600 bg-slate-700 text-lg font-bold hover:bg-slate-600"
            aria-label="Scroll question numbers left"
          >
            {'<'}
          </button>
          <div ref={questionScrollerRef} className="flex flex-1 gap-2 overflow-x-auto pb-2">
            {questions.map((question, index) => (
              <button
                key={question.id}
                ref={(node) => {
                  questionButtonRefs.current[question.id] = node;
                }}
                onClick={() => goToQuestion(index)}
                className={`h-10 w-10 flex-none rounded-lg text-sm font-bold transition ${index === currentIdx ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : answers[question.id] !== undefined ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollQuestionBubbles('right')}
            className="h-10 w-10 rounded-lg border border-slate-600 bg-slate-700 text-lg font-bold hover:bg-slate-600"
            aria-label="Scroll question numbers right"
          >
            {'>'}
          </button>
        </div>

        <p className="text-xl mb-10 leading-relaxed font-medium">{q.question_text || q.text}</p>

        <div className="grid grid-cols-1 gap-4">
          {optionList.map((option: string, index: number) => (
            <button 
              key={index}
              onClick={() => setAnswers({...answers, [q.id]: index})}
              className={`w-full p-5 text-left rounded-2xl border-2 transition-all duration-200 ${answers[q.id] === index ? 'border-indigo-500 bg-indigo-600/20' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'}`}
            >
              <span className="inline-block w-8 h-8 rounded-full bg-slate-700 text-center leading-8 mr-4 text-sm font-bold">{index + 1}</span>
              {option}
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-12 pt-6 border-t border-slate-700">
          <button 
            disabled={currentIdx === 0}
            onClick={() => goToQuestion(currentIdx - 1)}
            className="h-12 w-12 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold disabled:opacity-30 transition"
            aria-label="Previous question"
          >
            {'<'}
          </button>
          
          {currentIdx === questions.length - 1 ? (
            <button
              onClick={() => handleSubmit('manual')}
              disabled={submitting}
              className="px-10 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold shadow-lg shadow-green-900/20 transition disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Finish & Submit'}
            </button>
          ) : (
            <button
              onClick={() => goToQuestion(currentIdx + 1)}
              className="h-12 w-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition"
              aria-label="Next question"
            >
              {'>'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamInterface;
