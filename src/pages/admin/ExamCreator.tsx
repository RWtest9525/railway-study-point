import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { Plus, Trash2, Clock, FileText, Upload, BookOpen } from 'lucide-react';
import { PDFUploader } from '../../components/PDFUploader';

type Exam = Database['public']['Tables']['exams']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];

export function ExamCreator() {
  const { profile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const loadExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error loading exams:', error);
      setError('Failed to load exams.');
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
    // Parse the extracted text to create questions
    parseQuestionsFromText(text);
  };

  const parseQuestionsFromText = (text: string) => {
    // Simple parsing logic - this would need to be more sophisticated for real use
    const lines = text.split('\n');
    const questions = [];
    let currentQuestion: any = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match question pattern (e.g., "1. Question text")
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
      
      // Match options pattern (e.g., "A) Option text")
      const optionMatch = trimmedLine.match(/^[A-D]\)\s+(.+)$/);
      if (optionMatch && currentQuestion) {
        currentQuestion.options.push(optionMatch[1]);
        continue;
      }
      
      // Match correct answer pattern
      const answerMatch = trimmedLine.match(/Correct Answer:\s*([A-D])/i);
      if (answerMatch && currentQuestion) {
        const answerIndex = answerMatch[1].charCodeAt(0) - 65; // Convert A-D to 0-3
        currentQuestion.correct_answer = answerIndex;
        continue;
      }
      
      // If we have a complete question and encounter a new question or end
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
    
    // Add the last question if it exists
    if (currentQuestion && currentQuestion.options.length === 4) {
      questions.push(currentQuestion);
    }
    
    // Create questions in database
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
        // Add new questions to selected questions
        const newQuestionIds = createdQuestions.map(q => q.id);
        setFormData(prev => ({
          ...prev,
          selected_questions: [...prev.selected_questions, ...newQuestionIds]
        }));
        
        // Reload questions to show the new ones
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

    if (formData.selected_questions.length === 0) {
      setError('Please select at least one question.');
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Exam Creator</h1>
          <p className="text-gray-400">Create and manage exams</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          <Plus className="w-5 h-5" />
          Create Exam
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 border border-gray-700 my-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  {editingId ? 'Edit Exam' : 'Create New Exam'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPDFUpload(!showPDFUpload)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload PDF
                </button>
              </div>

            {error && (
              <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-2 rounded-lg mb-4 text-sm">
                {success}
              </div>
            )}

            {/* PDF Upload Section */}
            {showPDFUpload && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Upload Questions from PDF</h3>
                <PDFUploader
                  onFileSelect={handlePDFSelect}
                  onExtractedText={handleTextExtraction}
                />
                {extractedText && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Extracted Text Preview:</h4>
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {extractedText.substring(0, 500)}...
                    </pre>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Exam Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ALP Mock Test 1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value,
                        selected_questions: [],
                      })
                    }
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subject: e.target.value,
                        selected_questions: [],
                      })
                    }
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Math">Math</option>
                    <option value="Reasoning">Reasoning</option>
                    <option value="Science">Science</option>
                    <option value="General Awareness">General Awareness</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
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
                        className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addTopic}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Premium Exam
                  </label>
                  <label className="flex items-center gap-3 bg-gray-700 px-4 py-3 rounded-lg border border-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_premium}
                      onChange={(e) =>
                        setFormData({ ...formData, is_premium: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-white">Mark as Premium</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-300">
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
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      {formData.selected_questions.length === questions.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  )}
                </div>

                <div className="bg-gray-700 rounded-lg border border-gray-600 max-h-96 overflow-y-auto">
                  {questions.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      No questions available for this category. Add some questions first.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-600">
                      {questions.map((question) => (
                        <label
                          key={question.id}
                          className="flex items-start gap-3 p-4 hover:bg-gray-600/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.selected_questions.includes(question.id)}
                            onChange={() => toggleQuestion(question.id)}
                            className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="flex-1 text-gray-300 text-sm">
                            {question.question_text}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={formData.selected_questions.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Exam
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center text-gray-400 py-8">
            Loading exams...
          </div>
        ) : exams.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-8">
            No exams created yet. Create your first exam!
          </div>
        ) : (
          exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-white">{exam.title}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(exam)}
                    className="text-blue-400 hover:text-blue-300 p-1"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <FileText className="w-4 h-4" />
                  {exam.category}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  {exam.duration_minutes} minutes
                </div>
                <div className="text-sm text-gray-400">
                  {(exam.question_ids as string[]).length} questions
                </div>
              </div>

              {exam.is_premium && (
                <span className="inline-block bg-yellow-900 text-yellow-300 px-3 py-1 rounded-full text-xs font-semibold">
                  Premium
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
