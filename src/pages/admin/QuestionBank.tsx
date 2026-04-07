import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { Plus, CreditCard as Edit, Trash2 } from 'lucide-react';

type Question = Database['public']['Tables']['questions']['Row'];

export function QuestionBank() {
  const { profile } = useAuth();
  const categories = ['Group-D', 'ALP', 'Technician', 'BSED', 'NTPC', 'Technical'];
  const subjects = ['Math', 'Reasoning', 'Science', 'General Awareness'];

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALP');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    category: selectedCategory,
    subject: 'Math',
    question_text: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_answer: 0,
    explanation: '',
  });

  useEffect(() => {
    loadQuestions();
  }, [selectedCategory]);

  const loadQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      // First try with created_at ordering
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('category', selectedCategory)
        .order('created_at', { ascending: false });

      if (error) {
        // If created_at doesn't exist, try without ordering
        if (error.message?.includes('created_at') || error.message?.includes('does not exist')) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('questions')
            .select('*')
            .eq('category', selectedCategory)
            .limit(100);
          
          if (fallbackError) throw fallbackError;
          setQuestions(fallbackData || []);
        } else {
          throw error;
        }
      } else {
        setQuestions(data || []);
      }
    } catch (error: any) {
      console.error('Error loading questions:', error);
      setError('Failed to load questions. Please check your database connection and try again.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const questionData = {
      category: formData.category,
      subject: formData.subject,
      question_text: formData.question_text.trim(),
      options: [formData.option1.trim(), formData.option2.trim(), formData.option3.trim(), formData.option4.trim()],
      correct_answer: formData.correct_answer,
      explanation: formData.explanation.trim(),
      created_by: profile!.id,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingId);

        if (error) throw error;
        setSuccess('Question updated successfully!');
      } else {
        const { error } = await supabase.from('questions').insert(questionData);

        if (error) throw error;
        setSuccess('Question added successfully!');
      }

      setTimeout(() => {
        resetForm();
        loadQuestions();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving question:', error);
      setError(error.message || 'Error saving question.');
    }
  };

  const handleEdit = (question: Question) => {
    const options = question.options as string[];
    setFormData({
      category: question.category,
      subject: question.subject || 'Math',
      question_text: question.question_text,
      option1: options[0] || '',
      option2: options[1] || '',
      option3: options[2] || '',
      option4: options[3] || '',
      correct_answer: question.correct_answer,
      explanation: question.explanation,
    });
    setEditingId(question.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);

      if (error) throw error;
      loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      category: selectedCategory,
      subject: 'Math',
      question_text: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correct_answer: 0,
      explanation: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Question Bank</h1>
          <p className="text-gray-400">Manage exam questions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          <Plus className="w-5 h-5" />
          Add Question
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              selectedCategory === category
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Edit Question' : 'Add New Question'}
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
              <div className="grid grid-cols-2 gap-4">
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
                      })
                    }
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                      })
                    }
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Question Text
                </label>
                <textarea
                  value={formData.question_text}
                  onChange={(e) =>
                    setFormData({ ...formData, question_text: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Option {num}
                    </label>
                    <input
                      type="text"
                      value={formData[`option${num}` as keyof typeof formData]}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [`option${num}`]: e.target.value,
                        })
                      }
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Correct Answer
                </label>
                <select
                  value={formData.correct_answer}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      correct_answer: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Option 1</option>
                  <option value={1}>Option 2</option>
                  <option value={2}>Option 3</option>
                  <option value={3}>Option 4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Explanation
                </label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) =>
                    setFormData({ ...formData, explanation: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
                >
                  {editingId ? 'Update Question' : 'Add Question'}
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

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No questions found. Add your first question!
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Question
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Subject
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {questions.map((question) => (
                <tr key={question.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-gray-300">
                    {question.question_text.substring(0, 100)}
                    {question.question_text.length > 100 ? '...' : ''}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-900/50 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {question.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-purple-900/50 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {question.subject || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(question)}
                        className="text-blue-400 hover:text-blue-300 p-2"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
