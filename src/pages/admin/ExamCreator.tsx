import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { Plus, Trash2, Clock, FileText, Upload, BookOpen, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { PDFUploader } from '../../components/PDFUploader';

type Exam = Database['public']['Tables']['exams']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];

export function ExamCreator() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [exams, setExams] = useState<(Exam & { subject?: string | null })[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [selectedQuestionsPreview, setSelectedQuestionsPreview] = useState(0);

  const categories = ['Group-D', 'ALP', 'Technician', 'BSED', 'NTPC', 'Technical'];

  const [formData, setFormData] = useState({
    title: '',
    category: 'ALP',
    subject: 'Math',
    topics: [] as string[],
    duration_minutes: 60,
    is_premium: false,
    selected_questions: [] as string[],
  });

  const [newTopic, setNewTopic] = useState('');
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (showForm) {
      loadQuestions(formData.category, formData.subject);
    }
  }, [showForm, formData.category, formData.subject]);

  useEffect(() => {
    setSelectedQuestionsPreview(formData.selected_questions.length);
  }, [formData.selected_questions.length]);

  const loadExams = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, category, subject, question_ids, duration_minutes, is_premium, created_by, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading exams:', error);
        
        if (error.message?.includes('subject') || error.message?.includes('does not exist')) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('exams')
            .select('id, title, category, question_ids, duration_minutes, is_premium, created_by, created_at')
            .order('created_at', { ascending: false });
          
          if (fallbackError) {
            setError('Failed to load exams. Please run migration 20260405000000_fix_schema_issues.sql');
            setExams([]);
          } else {
            const examsWithSubject = (fallbackData || []).map(e => ({
              ...e,
              subject: 'General' as string | null
            }));
            setExams(examsWithSubject);
          }
        } else if (error.message?.includes('created_at')) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('exams')
            .select('id, title, category, subject, question_ids, duration_minutes, is_premium, created_by')
            .limit(100);
          
          if (!fallbackError && fallbackData) {
            const examsWithDate = fallbackData.map(e => ({
              ...e,
              created_at: new Date().toISOString()
            }));
            setExams(examsWithDate);
          }
        } else {
          setError(`Failed to load exams: ${error.message}`);
          setExams([]);
        }
      } else {
        setExams(data || []);
      }
    } catch (error: any) {
      console.error('Error loading exams:', error);
      setError(`Failed to load exams: ${error.message || 'Unknown error'}. Please run migration 20260405000000_fix_schema_issues.sql`);
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (category: string, subject: string) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .eq('subject', subject)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const addTopic = () => {
    if (newTopic.trim() && !formData.topics.includes(newTopic.trim())) {
      setFormData({
        ...formData,
        topics: [...formData.topics, newTopic.trim()]
      });
      setNewTopic('');
    }
  };

  const removeTopic = (topicToRemove: string) => {
    setFormData({
      ...formData,
      topics: formData.topics.filter(topic => topic !== topicToRemove)
    });
  };

  const handlePDFSelect = (file: File) => {
    setPdfFile(file);
  };

  const handleTextExtraction = (text: string) => {
    setExtractedText(text);
    parseQuestionsFromText(text);
  };

  const parseQuestionsFromText = (text: string) => {
    const lines = text.split('\n');
    const questions = [];
    let currentQuestion: any = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      const questionMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
      if (questionMatch && !currentQuestion) {
        currentQuestion = {
          question_text: questionMatch[1],
          options: [],
          correct_answer: 0,
          explanation: '',
          category: formData.category,
          subject: formData.subject
        };
        continue;
      }
      
      const optionMatch = trimmedLine.match(/^[A-D]\)\s+(.+)$/);
      if (optionMatch && currentQuestion) {
        currentQuestion.options.push(optionMatch[1]);
        continue;
      }
      
      const answerMatch = trimmedLine.match(/Correct Answer:\s*([A-D])/i);
      if (answerMatch && currentQuestion) {
        const answerIndex = answerMatch[1].charCodeAt(0) - 65;
        currentQuestion.correct_answer = answerIndex;
        continue;
      }
      
      if (currentQuestion && (questionMatch || trimmedLine === '')) {
        if (currentQuestion.options.length === 4) {
          questions.push(currentQuestion);
        }
        currentQuestion = questionMatch ? {
          question_text: questionMatch[1],
          options: [],
          correct_answer: 0,
          explanation: '',
          category: formData.category,
          subject: formData.subject
        } : null;
      }
    }
    
    if (currentQuestion && currentQuestion.options.length === 4) {
      questions.push(currentQuestion);
    }
    
    if (questions.length > 0) {
      createQuestionsFromPDF(questions);
    }
  };

  const createQuestionsFromPDF = async (questions: any[]) => {
    try {
      const questionsWithCreator = questions.map(q => ({
        ...q,
        created_by: profile!.id,
      }));

      const { data: createdQuestions, error } = await supabase
        .from('questions')
        .insert(questionsWithCreator)
        .select();

      if (error) throw error;
      
      if (createdQuestions) {
        const newQuestionIds = createdQuestions.map(q => q.id);
        setFormData(prev => ({
          ...prev,
          selected_questions: [...prev.selected_questions, ...newQuestionIds]
        }));
        
        loadQuestions(formData.category, formData.subject);
        
        setSuccess(`Successfully created ${createdQuestions.length} questions from PDF`);
      }
    } catch (error) {
      console.error('Error creating questions from PDF:', error);
      setError('Failed to create questions from PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.selected_questions.length === 0 && !pdfFile) {
      setError('Please upload a PDF file with questions or select questions manually.');
      return;
    }

    const examData = {
      title: formData.title.trim(),
      category: formData.category,
      subject: formData.subject,
      duration_minutes: formData.duration_minutes,
      is_premium: formData.is_premium,
      question_ids: formData.selected_questions,
      created_by: profile!.id,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('exams')
          .update(examData)
          .eq('id', editingId);

        if (error) throw error;
        setSuccess('Exam updated successfully!');
      } else {
        const { error } = await supabase.from('exams').insert(examData);

        if (error) throw error;
        setSuccess('Exam created successfully!');
      }

      setTimeout(() => {
        resetForm();
        loadExams();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving exam:', error);
      setError(error.message || 'Error saving exam.');
    }
  };

  const handleEdit = (exam: Exam) => {
    setFormData({
      title: exam.title,
      category: exam.category,
      subject: exam.subject || 'Math',
      topics: [],
      duration_minutes: exam.duration_minutes,
      is_premium: exam.is_premium,
      selected_questions: exam.question_ids as string[],
    });
    setEditingId(exam.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;

    try {
      const { error } = await supabase.from('exams').delete().eq('id', id);

      if (error) throw error;
      loadExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      selected_questions: prev.selected_questions.includes(questionId)
        ? prev.selected_questions.filter((id) => id !== questionId)
        : [...prev.selected_questions, questionId],
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'ALP',
      subject: 'Math',
      topics: [],
      duration_minutes: 60,
      is_premium: false,
      selected_questions: [],
    });
    setEditingId(null);
    setError('');
    setSuccess('');
    setShowForm(false);
    setPdfFile(null);
    setExtractedText('');
    setShowPDFUpload(false);
  };

  const toggleExamExpand = (examId: string) => {
    setExpandedExamId(expandedExamId === examId ? null : examId);
  };

  return (
    <div className={theme === 'dark' ? '' : 'text-gray-900'}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
            Exam Creator
          </h1>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Create and manage exams
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Create Exam
        </button>
      </div>

      {/* Create/Edit Exam Modal - Redesigned for Mobile */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className={`w-full max-w-4xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} sm:rounded-xl sm:max-h-[90vh] overflow-y-auto sm:my-8`}>
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingId ? 'Edit Exam' : 'Create New Exam'}
              </h2>
              <button
                onClick={resetForm}
                className={`p-2 rounded-lg transition ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* PDF Upload Section */}
              <div className={`p-4 rounded-xl border ${
                theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2 mb-4`}>
                  <Upload className="w-5 h-5 text-green-500" />
                  Upload Questions from PDF
                </h3>
                <PDFUploader
                  onFileSelect={handlePDFSelect}
                  onExtractedText={handleTextExtraction}
                />
                {extractedText && (
                  <div className={`mt-4 rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
                    <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Extracted Text Preview:
                    </h4>
                    <pre className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} whitespace-pre-wrap max-h-40 overflow-y-auto`}>
                      {extractedText.substring(0, 500)}...
                    </pre>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-900/40 dark:bg-red-900/40 bg-red-50 border border-red-600 dark:border-red-600 border-red-200 text-red-200 dark:text-red-800 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-900/40 dark:bg-green-900/40 bg-green-50 border border-green-600 dark:border-green-600 border-green-200 text-green-200 dark:text-green-800 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info - Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Exam Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark' 
                          ? 'bg-gray-700 text-white border-gray-600' 
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                      placeholder="e.g., ALP Mock Test 1"
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({
                        ...formData,
                        category: e.target.value,
                        selected_questions: [],
                      })}
                      className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark' 
                          ? 'bg-gray-700 text-white border-gray-600' 
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({
                        ...formData,
                        subject: e.target.value,
                        selected_questions: [],
                      })}
                      className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark' 
                          ? 'bg-gray-700 text-white border-gray-600' 
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    >
                      <option value="Math">Math</option>
                      <option value="Reasoning">Reasoning</option>
                      <option value="Science">Science</option>
                      <option value="General Awareness">General Awareness</option>
                    </select>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Topics
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                          placeholder="Add a topic..."
                          className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            theme === 'dark' 
                              ? 'bg-gray-700 text-white border-gray-600' 
                              : 'bg-white text-gray-900 border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={addTopic}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition whitespace-nowrap"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.topics.map((topic, index) => (
                          <span
                            key={index}
                            className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                          >
                            {topic}
                            <button
                              type="button"
                              onClick={() => removeTopic(topic)}
                              className="hover:text-blue-300"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({
                        ...formData,
                        duration_minutes: parseInt(e.target.value),
                      })}
                      className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark' 
                          ? 'bg-gray-700 text-white border-gray-600' 
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Premium Exam
                    </label>
                    <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600' 
                        : 'bg-white border-gray-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.is_premium}
                        onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        Mark as Premium
                      </span>
                    </label>
                  </div>
                </div>

                {/* Question Selection - Mobile Optimized */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Select Questions ({formData.selected_questions.length} selected)
                    </label>
                    {questions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.selected_questions.length === questions.length) {
                            setFormData({ ...formData, selected_questions: [] });
                          } else {
                            setFormData({
                              ...formData,
                              selected_questions: questions.map((q) => q.id),
                            });
                          }
                        }}
                        className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        {formData.selected_questions.length === questions.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    )}
                  </div>

                  <div className={`rounded-lg border max-h-80 overflow-y-auto ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    {questions.length === 0 ? (
                      <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        No questions available for this category. Add some questions first.
                      </div>
                    ) : (
                      <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {questions.map((question) => (
                          <label
                            key={question.id}
                            className={`flex items-start gap-3 p-4 cursor-pointer transition ${
                              theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.selected_questions.includes(question.id)}
                              onChange={() => toggleQuestion(question.id)}
                              className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 shrink-0"
                            />
                            <span className={`flex-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {question.question_text}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}">
                  <button
                    type="submit"
                    disabled={!pdfFile}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingId ? 'Update Exam' : 'Create Exam'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className={`flex-1 py-3 rounded-lg font-semibold transition ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Exams List - Redesigned for Mobile */}
      <div className="space-y-4">
        {loading ? (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading exams...
          </div>
        ) : exams.length === 0 ? (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No exams created yet. Create your first exam!
          </div>
        ) : (
          exams.map((exam) => (
            <div
              key={exam.id}
              className={`rounded-xl border transition-all ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              {/* Exam Card Header */}
              <div 
                className="p-4 sm:p-6 cursor-pointer"
                onClick={() => toggleExamExpand(exam.id)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}>
                        {exam.title}
                      </h3>
                      {exam.is_premium && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-400 whitespace-nowrap">
                          Premium
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}">
                        <FileText className="w-4 h-4" />
                        <span>{exam.category}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}">
                        <Clock className="w-4 h-4" />
                        <span>{exam.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}">
                        <BookOpen className="w-4 h-4" />
                        <span>{(exam.question_ids as string[]).length} questions</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {expandedExamId === exam.id ? (
                      <ChevronUp className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    ) : (
                      <ChevronDown className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedExamId === exam.id && (
                <div className={`px-4 sm:px-6 pb-4 sm:pb-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleEdit(exam)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                    >
                      <FileText className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this exam?')) {
                          handleDelete(exam.id);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg text-sm font-medium transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}