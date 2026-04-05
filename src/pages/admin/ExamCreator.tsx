import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { Plus, Trash2, Clock, FileText } from 'lucide-react';

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

  const [formData, setFormData] = useState({
    title: '',
    category: 'ALP' as 'ALP' | 'NTPC' | 'Group-D',
    duration_minutes: 60,
    is_premium: false,
    selected_questions: [] as string[],
  });

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (showForm) {
      loadQuestions(formData.category);
    }
  }, [showForm, formData.category]);

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

  const loadQuestions = async (category: 'ALP' | 'NTPC' | 'Group-D') => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
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
      duration_minutes: 60,
      is_premium: false,
      selected_questions: [],
    });
    setEditingId(null);
    setError('');
    setSuccess('');
    setShowForm(false);
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
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Edit Exam' : 'Create New Exam'}
            </h2>

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
                        category: e.target.value as 'ALP' | 'NTPC' | 'Group-D',
                        selected_questions: [],
                      })
                    }
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALP">ALP</option>
                    <option value="NTPC">NTPC</option>
                    <option value="Group-D">Group-D</option>
                  </select>
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
