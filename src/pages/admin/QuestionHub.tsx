import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from '../../contexts/RouterContext';
import { 
  Plus, 
  Save, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Clock,
  Award,
  Tag,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { createExam, createQuestion, getExams, getQuestions, createQuestionsBatch } from '../../lib/firestore';

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Exam {
  id: string;
  category_id: string;
  title: string;
  duration_minutes: number;
  total_marks: number;
  is_active: boolean;
}

interface Question {
  id: string;
  exam_id: string;
  subject: 'Maths' | 'Reasoning' | 'GK' | 'Science';
  question_text: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  marks: number;
}

interface QuestionDraft {
  subject: 'Maths' | 'Reasoning' | 'GK' | 'Science';
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  marks: number;
}

type Mode = 'create-test' | 'question-entry' | 'manage';

export default function QuestionHub() {
  const { profile, user } = useAuth();
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const isDark = theme === 'dark';
  
  const [mode, setMode] = useState<Mode>('create-test');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  
  // Create Test Form
  const [testTitle, setTestTitle] = useState('');
  const [testCategory, setTestCategory] = useState('');
  const [testDuration, setTestDuration] = useState(60);
  const [testMarks, setTestMarks] = useState(100);
  
  // Question Entry Form
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionDraft>({
    subject: 'Maths' as 'Maths' | 'Reasoning' | 'GK' | 'Science',
    question_text: '',
    options: ['', '', '', ''],
    correct_index: 0,
    explanation: '',
    marks: 1,
  });
  
  // Feedback
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), where('is_active', '==', true));
      const snapshot = await getDocs(q);
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchExams = async (categoryId: string) => {
    try {
      const q = query(
        collection(db, 'exams'),
        where('category_id', '==', categoryId),
        where('is_active', '==', true)
      );
      const snapshot = await getDocs(q);
      const examsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      setExams(examsList);
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle || !testCategory) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const examId = await createExam({
        category_id: testCategory,
        title: testTitle,
        duration_minutes: testDuration,
        total_marks: testMarks,
        is_premium: false,
        is_active: true,
      });
      
      setMessage('Test created successfully! You can now add questions.');
      setSelectedExam(examId);
      setMode('question-entry');
      
      // Reset form
      setTestTitle('');
      setTestDuration(60);
      setTestMarks(100);
    } catch (err: any) {
      setError('Failed to create test: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.question_text.trim() || currentQuestion.options.some(o => !o.trim())) {
      setError('Please fill in all question fields and options');
      return;
    }
    
    setQuestions([...questions, { ...currentQuestion }]);
    setCurrentQuestion({
      subject: 'Maths',
      question_text: '',
      options: ['', '', '', ''],
      correct_index: 0,
      explanation: '',
      marks: 1,
    });
    setError('');
    setMessage(`Question added! Total: ${questions.length + 1}`);
  };

  const handleSaveQuestions = async () => {
    if (questions.length === 0) {
      setError('No questions to save');
      return;
    }
    
    if (!selectedExam) {
      setError('Please select an exam first');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const questionsToSave = questions.map(q => ({
        exam_id: selectedExam,
        subject: q.subject,
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        marks: q.marks,
        order: questions.indexOf(q),
      }));
      
      await createQuestionsBatch(questionsToSave);
      setMessage(`Successfully saved ${questions.length} questions!`);
      setQuestions([]);
    } catch (err: any) {
      setError('Failed to save questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleOptionChange = (optionIndex: number, value: string) => {
    const newOptions = [...currentQuestion.options];
    newOptions[optionIndex] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white/95 border-gray-200'} sticky top-0 z-50 backdrop-blur-md border-b`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin-portal')}
            className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Question Hub</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Mode Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setMode('create-test')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
              mode === 'create-test'
                ? 'bg-blue-600 text-white'
                : isDark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Create Test
          </button>
          <button
            onClick={() => setMode('question-entry')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
              mode === 'question-entry'
                ? 'bg-blue-600 text-white'
                : isDark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            Question Entry
          </button>
          <button
            onClick={() => setMode('manage')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
              mode === 'manage'
                ? 'bg-blue-600 text-white'
                : isDark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-1" />
            Manage Questions
          </button>
        </div>

        {/* Feedback Messages */}
        {message && (
          <div className={`${isDark ? 'bg-green-900/40 border-green-600 text-green-200' : 'bg-green-50 border-green-200 text-green-700'} px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 border`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-green-500' : 'bg-green-600'}`} />
            {message}
          </div>
        )}
        {error && (
          <div className={`${isDark ? 'bg-red-900/40 border-red-600 text-red-200' : 'bg-red-50 border-red-200 text-red-700'} px-4 py-3 rounded-xl mb-6 text-sm border`}>
            {error}
          </div>
        )}

        {/* Create Test Mode */}
        {mode === 'create-test' && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-6`}>
            <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Test</h2>
            
            <form onSubmit={handleCreateTest} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Category
                  </label>
                  <select
                    value={testCategory}
                    onChange={(e) => setTestCategory(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Test Title
                  </label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="e.g., NTPC Mock Test 01"
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={testDuration}
                    onChange={(e) => setTestDuration(Number(e.target.value))}
                    min={1}
                    max={180}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Award className="w-3 h-3 inline mr-1" />
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={testMarks}
                    onChange={(e) => setTestMarks(Number(e.target.value))}
                    min={1}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-900/20"
              >
                {loading ? 'Creating...' : 'Create Test'}
              </button>
            </form>
          </div>
        )}

        {/* Question Entry Mode */}
        {mode === 'question-entry' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Question Form */}
            <div className="lg:col-span-2">
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-6`}>
                <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Question</h2>
                
                {/* Select Exam */}
                <div className="mb-6">
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Select Test
                  </label>
                  <select
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                    }`}
                  >
                    <option value="">Select Test</option>
                    {exams.map(exam => (
                      <option key={exam.id} value={exam.id}>{exam.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Tag className="w-3 h-3 inline mr-1" />
                      Subject
                    </label>
                    <select
                      value={currentQuestion.subject}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, subject: e.target.value as any })}
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    >
                      <option value="Maths">Maths</option>
                      <option value="Reasoning">Reasoning</option>
                      <option value="GK">GK</option>
                      <option value="Science">Science</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Question
                    </label>
                    <textarea
                      value={currentQuestion.question_text}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                      rows={3}
                      placeholder="Enter your question here..."
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Options
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentQuestion.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === currentQuestion.correct_index
                              ? 'bg-green-500 text-white'
                              : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            className={`flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Click on the letter to mark the correct answer
                    </p>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Correct Answer
                    </label>
                    <div className="flex gap-2">
                      {currentQuestion.options.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentQuestion({ ...currentQuestion, correct_index: idx })}
                          className={`w-10 h-10 rounded-lg font-bold transition ${
                            idx === currentQuestion.correct_index
                              ? 'bg-green-500 text-white'
                              : isDark
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Explanation (Optional)
                    </label>
                    <textarea
                      value={currentQuestion.explanation}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                      rows={2}
                      placeholder="Add an explanation for the correct answer..."
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Marks
                    </label>
                    <input
                      type="number"
                      value={currentQuestion.marks}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: Number(e.target.value) })}
                      min={1}
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-900/20"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Add Question
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuestions}
                    disabled={loading || questions.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 shadow-lg shadow-green-900/20"
                  >
                    <Save className="w-4 h-4 inline mr-1" />
                    Save All ({questions.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Questions Preview */}
            <div className="lg:col-span-1">
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-4 sticky top-24`}>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Questions Queue ({questions.length})
                </h3>
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {questions.length === 0 ? (
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'} text-center py-8`}>
                      No questions added yet
                    </p>
                  ) : (
                    questions.map((q, idx) => (
                      <div
                        key={idx}
                        className={`${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} rounded-lg border p-3`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                q.subject === 'Maths' ? 'bg-purple-500/20 text-purple-400' :
                                q.subject === 'Reasoning' ? 'bg-blue-500/20 text-blue-400' :
                                q.subject === 'GK' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {q.subject}
                              </span>
                              <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {q.marks} mark{q.marks > 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {q.question_text}
                            </p>
                          </div>
                          <button
                            onClick={() => removeQuestion(idx)}
                            className={`p-1 rounded transition ${
                              isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-100 text-red-500'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage Mode */}
        {mode === 'manage' && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-6`}>
            <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Manage Questions</h2>
            
            {/* Category and Exam Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Category
                </label>
                <select
                  value={testCategory}
                  onChange={(e) => {
                    setTestCategory(e.target.value);
                    setSelectedExam('');
                    if (e.target.value) fetchExams(e.target.value);
                  }}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  }`}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Test
                </label>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  }`}
                >
                  <option value="">Select Test</option>
                  {exams.map(exam => (
                    <option key={exam.id} value={exam.id}>{exam.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Questions List */}
            {selectedExam && (
              <div className="space-y-4">
                <h3 className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Questions
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Question management coming soon...
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}