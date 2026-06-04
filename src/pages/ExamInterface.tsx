import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { createAttempt } from '../lib/firestore';

interface ExamInterfaceProps {
  examId?: string;
}

const ExamInterface = ({ examId }: ExamInterfaceProps) => {
  const { user, userData, profile, isPremium } = useAuth();
  const { navigate } = useRouter();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const questionScrollerRef = useRef<HTMLDivElement | null>(null);
  const questionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Use refs to track submission state across renders and prevent double-submit
  const submittedRef = useRef(false);
  const submittingRef = useRef(false);
  // Keep latest answers in a ref so the submit handler always has current data
  const answersRef = useRef<Record<string, number>>({});
  const questionsRef = useRef<any[]>([]);

  // Sync state to refs
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // Draft key for localStorage
  const draftKey = user?.uid && examId ? `exam-draft:${user.uid}:${examId}` : '';

  // ────────────────────────────────────────────────────────
  // Fetch questions + restore draft
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!examId) return;

    // Prevent re-fetching if already submitted
    if (submittedRef.current) return;

    let cancelled = false;

    const fetchQuestions = async () => {
      setLoading(true);
      try {
        // Check if already submitted (in 'attempts' collection)
        if (user?.uid) {
          const submissionQuery = query(
            collection(db, 'attempts'),
            where('user_id', '==', user.uid),
            where('exam_id', '==', examId)
          );
          const submissionSnap = await getDocs(submissionQuery);
          if (!submissionSnap.empty) {
            if (!cancelled) {
              setAlreadySubmitted(true);
              setLoading(false);
            }
            return;
          }
        }

        // Fetch questions
        const q = query(collection(db, 'questions'), where('exam_id', '==', examId));
        const snap = await getDocs(q);
        const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort by order if available
        loaded.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

        if (cancelled) return;

        setQuestions(loaded);
        questionsRef.current = loaded;

        // Restore draft
        if (draftKey) {
          const rawDraft = localStorage.getItem(draftKey);
          if (rawDraft) {
            try {
              const draft = JSON.parse(rawDraft);
              if (draft.answers && typeof draft.answers === 'object') {
                setAnswers(draft.answers);
                answersRef.current = draft.answers;
              }
              const safeIndex = Math.max(0, Math.min(loaded.length - 1, Number(draft.currentIdx) || 0));
              setCurrentIdx(safeIndex);
            } catch {
              localStorage.removeItem(draftKey);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching exam questions:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchQuestions();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, user?.uid]);

  // ────────────────────────────────────────────────────────
  // Auto-save draft to localStorage on every answer change
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!draftKey || loading || questions.length === 0) return;
    localStorage.setItem(
      draftKey,
      JSON.stringify({ answers, currentIdx, savedAt: Date.now() })
    );
  }, [answers, currentIdx, draftKey, loading, questions.length]);

  // ────────────────────────────────────────────────────────
  // Warn user before leaving mid-exam
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (questions.length > 0 && !alreadySubmitted && !submittedRef.current) {
        e.preventDefault();
        e.returnValue = 'Your exam progress is saved. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [questions.length, alreadySubmitted]);

  // ────────────────────────────────────────────────────────
  // Auto-scroll question bubble into view
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    const activeQuestion = questions[currentIdx];
    if (!activeQuestion?.id) return;
    questionButtonRefs.current[activeQuestion.id]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [currentIdx, questions]);

  // ────────────────────────────────────────────────────────
  // Submit handler — saves to 'attempts' collection with proper format
  // Uses refs to prevent double-submit and get latest state
  // ────────────────────────────────────────────────────────
  const doSubmit = useCallback(async () => {
    // Guard: prevent double submission using ref (survives re-renders)
    if (submittingRef.current || submittedRef.current) {
      console.warn('Submission already in progress or completed, ignoring.');
      return;
    }
    if (!user?.uid || !examId) return;

    submittingRef.current = true;
    submittedRef.current = true;
    setSubmitting(true);

    try {
      const currentAnswers = answersRef.current;
      const currentQuestions = questionsRef.current;

      // Build answers array in the format Results.tsx expects
      const answersArray = currentQuestions.map((q) => ({
        questionId: q.id,
        selectedOption: currentAnswers[q.id] !== undefined ? currentAnswers[q.id] : -1,
      }));

      // Calculate score
      let correctCount = 0;
      currentQuestions.forEach((q) => {
        const userAnswer = currentAnswers[q.id];
        const correctIndex = q.correct_index !== undefined
          ? q.correct_index
          : q.correctIndex;
        if (userAnswer !== undefined && userAnswer === correctIndex) {
          correctCount++;
        }
      });

      // Subject-wise scores
      const subjectWise: Record<string, { correct: number; total: number }> = {};
      currentQuestions.forEach((q) => {
        const subject = q.subject || 'General';
        if (!subjectWise[subject]) subjectWise[subject] = { correct: 0, total: 0 };
        subjectWise[subject].total++;
        if (currentAnswers[q.id] !== undefined && currentAnswers[q.id] === (q.correct_index ?? q.correctIndex)) {
          subjectWise[subject].correct++;
        }
      });

      const timeTakenSeconds = Math.floor((Date.now() - startTime) / 1000);

      const attemptId = await createAttempt({
        user_id: user.uid,
        exam_id: examId,
        answers: answersArray,
        score: correctCount,
        total_questions: currentQuestions.length,
        correct_answers: correctCount,
        time_taken_seconds: timeTakenSeconds,
        started_at: new Date(startTime).toISOString(),
        subject_wise_scores: subjectWise,
      });

      // Clear draft
      if (draftKey) localStorage.removeItem(draftKey);

      // Small delay to ensure Firestore has propagated the document
      // This prevents the Results page from failing to find the attempt
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navigate to results page
      navigate(`/results/${attemptId}`);
    } catch (e) {
      console.error('Submission error:', e);
      alert('Submission Error. Please try again.');
      // Reset submission guards so user can retry
      submittingRef.current = false;
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [user?.uid, examId, startTime, draftKey, navigate]);

  // Handle the confirm dialog
  const handleSubmitClick = useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmSubmit = useCallback(() => {
    setShowConfirmDialog(false);
    doSubmit();
  }, [doSubmit]);

  const handleCancelSubmit = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // ────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────
  const goToQuestion = (index: number) =>
    setCurrentIdx(Math.max(0, Math.min(questions.length - 1, index)));

  const scrollQuestionBubbles = (direction: 'left' | 'right') => {
    const scroller = questionScrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  // ────────────────────────────────────────────────────────
  // Render states
  // ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center text-white text-xl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading Exam Questions...</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col gap-4 items-center justify-center text-white text-xl">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <div className="text-2xl font-bold mb-2">Exam Already Submitted</div>
          <p className="text-slate-400 mb-6">You have already completed this exam.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col gap-4 items-center justify-center text-white text-xl">
        <p>No questions found for this exam.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];
  // Support both options array and opt1/opt2/opt3/opt4 fields
  const optionList: string[] = Array.isArray(q.options)
    ? q.options
    : [q.opt1, q.opt2, q.opt3, q.opt4].filter(Boolean);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <div>
            <h2 className="text-indigo-400 font-bold text-lg">
              Question {currentIdx + 1} / {totalQuestions}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {answeredCount}/{totalQuestions} answered
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 text-red-400 px-4 py-1 rounded-full text-sm font-bold">
              LIVE EXAM
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white text-sm border border-slate-600 px-3 py-1 rounded-lg transition"
              title="Exit exam (progress saved)"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="mb-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollQuestionBubbles('left')}
            className="h-10 w-10 rounded-lg border border-slate-600 bg-slate-700 text-lg font-bold hover:bg-slate-600 flex-none"
            aria-label="Scroll question numbers left"
          >
            {'<'}
          </button>
          <div
            ref={questionScrollerRef}
            className="flex flex-1 gap-2 overflow-x-auto pb-2 scrollbar-hide"
            style={{ scrollbarWidth: 'none' }}
          >
            {questions.map((question, index) => (
              <button
                key={question.id}
                ref={(node) => { questionButtonRefs.current[question.id] = node; }}
                onClick={() => goToQuestion(index)}
                className={`h-10 w-10 flex-none rounded-lg text-sm font-bold transition ${
                  index === currentIdx
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                    : answers[question.id] !== undefined
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollQuestionBubbles('right')}
            className="h-10 w-10 rounded-lg border border-slate-600 bg-slate-700 text-lg font-bold hover:bg-slate-600 flex-none"
            aria-label="Scroll question numbers right"
          >
            {'>'}
          </button>
        </div>

        {/* Question Text */}
        <p className="text-xl mb-8 leading-relaxed font-medium">
          {q.question_text || q.text}
        </p>

        {/* Options */}
        <div className="grid grid-cols-1 gap-4">
          {optionList.map((option: string, index: number) => {
            const isSelected = answers[q.id] === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectOption(q.id, index)}
                className={`w-full p-5 text-left rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600/30 shadow-lg shadow-indigo-900/20'
                    : 'border-slate-700 hover:border-indigo-400 hover:bg-slate-700/50'
                }`}
              >
                <span
                  className={`inline-flex w-8 h-8 rounded-full items-center justify-center mr-4 text-sm font-bold ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-200'
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Navigation Footer */}
        <div className="flex justify-between mt-10 pt-6 border-t border-slate-700 items-center">
          <button
            disabled={currentIdx === 0}
            onClick={() => goToQuestion(currentIdx - 1)}
            className="h-12 px-5 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold disabled:opacity-30 transition"
            aria-label="Previous question"
          >
            ← Prev
          </button>

          {/* Mark for review / Skip */}
          <span className="text-slate-500 text-sm hidden sm:block">
            {answers[q.id] !== undefined ? '✅ Answered' : '○ Not answered'}
          </span>

          {currentIdx === questions.length - 1 ? (
            <button
              onClick={handleSubmitClick}
              disabled={submitting}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold shadow-lg shadow-green-900/20 transition disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : `Finish & Submit (${answeredCount}/${totalQuestions})`}
            </button>
          ) : (
            <button
              onClick={() => goToQuestion(currentIdx + 1)}
              className="h-12 px-5 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition"
              aria-label="Next question"
            >
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Custom Confirm Dialog - replaces window.confirm() which can cause timing issues */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="text-xl font-bold text-white mb-2">Submit Exam?</h3>
              <p className="text-slate-400 text-sm">
                You have answered <span className="text-indigo-400 font-bold">{answeredCount}</span> out of <span className="text-indigo-400 font-bold">{totalQuestions}</span> questions.
              </p>
              {answeredCount < totalQuestions && (
                <p className="text-amber-400 text-sm mt-2">
                  ⚠️ {totalQuestions - answeredCount} question{totalQuestions - answeredCount > 1 ? 's are' : ' is'} unanswered.
                </p>
              )}
              <p className="text-slate-500 text-xs mt-3">
                You cannot change your answers after submission.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelSubmit}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamInterface;
