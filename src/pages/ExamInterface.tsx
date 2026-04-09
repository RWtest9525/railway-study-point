import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const ExamInterface = () => {
  const { examId } = useParams();
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has premium
    if (!userData?.isPremium) {
      alert("Upgrade to Premium to access this exam!");
      navigate('/membership');
      return;
    }

    const fetchQuestions = async () => {
      const q = query(collection(db, 'questions'), where('examId', '==', examId));
      const snap = await getDocs(q);
      setQuestions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchQuestions();
  }, [examId, userData]);

  const handleSubmit = async () => {
    try {
      await addDoc(collection(db, 'submissions'), {
        userId: user.uid,
        userEmail: user.email,
        examId,
        answers,
        submittedAt: new Date(),
        score: 'Pending Analysis'
      });
      alert("Mock Test Submitted Successfully! Result will be updated soon.");
      navigate('/dashboard');
    } catch (e) {
      alert("Submission Error. Please try again.");
    }
  };

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Loading Exam Questions...</div>;
  if (questions.length === 0) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white text-xl">No questions found for this exam. Contact Admin.</div>;

  const q = questions[currentIdx];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700">
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <h2 className="text-indigo-400 font-bold text-lg">Question {currentIdx + 1} / {questions.length}</h2>
          <div className="bg-red-500/20 text-red-400 px-4 py-1 rounded-full text-sm font-bold">LIVE EXAM</div>
        </div>

        <p className="text-xl mb-10 leading-relaxed font-medium">{q.text}</p>

        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4].map(num => (
            <button 
              key={num}
              onClick={() => setAnswers({...answers, [q.id]: num.toString()})}
              className={`w-full p-5 text-left rounded-2xl border-2 transition-all duration-200 ${answers[q.id] === num.toString() ? 'border-indigo-500 bg-indigo-600/20' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'}`}
            >
              <span className="inline-block w-8 h-8 rounded-full bg-slate-700 text-center leading-8 mr-4 text-sm font-bold">{num}</span>
              {q[`opt${num}`]}
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-12 pt-6 border-t border-slate-700">
          <button 
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(currentIdx - 1)}
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold disabled:opacity-30 transition"
          >
            Previous
          </button>
          
          {currentIdx === questions.length - 1 ? (
            <button onClick={handleSubmit} className="px-10 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold shadow-lg shadow-green-900/20 transition">Finish & Submit</button>
          ) : (
            <button onClick={() => setCurrentIdx(currentIdx + 1)} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition">Save & Next</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamInterface;