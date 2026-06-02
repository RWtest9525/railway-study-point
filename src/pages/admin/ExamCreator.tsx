import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { getExams, getCategories, createExam, updateExam, deleteExam, Exam, Category, getQuestions, createQuestionsBatch } from '../../lib/firestore';
import { Plus, Edit, Trash2, RotateCcw } from 'lucide-react';

export function ExamCreator() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [retakeSourceExamId, setRetakeSourceExamId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    duration_minutes: 60,
    total_marks: 100,
    is_premium: false,
    schedule_date: '',
    schedule_time: '',
  });

  const resetFormData = () => {
    setFormData({
      category_id: '',
      title: '',
      duration_minutes: 60,
      total_marks: 100,
      is_premium: false,
      schedule_date: '',
      schedule_time: '',
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [examsData, categoriesData] = await Promise.all([
        getExams(),
        getCategories()
      ]);
      setExams(examsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const examData = {
        category_id: formData.category_id,
        title: formData.title,
        duration_minutes: formData.duration_minutes,
        total_marks: formData.total_marks,
        is_premium: formData.is_premium,
        schedule_date: formData.schedule_date,
        schedule_time: formData.schedule_time,
        is_active: true,
      } as any;

      if (retakeSourceExamId) {
        const newExamId = await createExam(examData);
        const oldQuestions = await getQuestions(retakeSourceExamId);
        if (oldQuestions.length > 0) {
          await createQuestionsBatch(oldQuestions.map((question) => {
            const { id, created_at, ...rest } = question as any;
            return { ...rest, exam_id: newExamId };
          }));
        }
      } else if (editingId) {
        await updateExam(editingId, examData);
      } else {
        await createExam(examData);
      }
      
      setShowForm(false);
      setEditingId(null);
      setRetakeSourceExamId(null);
      resetFormData();
      loadData();
    } catch (error) {
      console.error('Error saving exam:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      await deleteExam(id);
      loadData();
    } catch (error) {
      console.error('Error deleting exam:', error);
    }
  };

  const handleRetake = (exam: Exam) => {
    setEditingId(null);
    setRetakeSourceExamId(exam.id);
    setFormData({
      category_id: exam.category_id,
      title: exam.title,
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks,
      is_premium: exam.is_premium,
      schedule_date: '',
      schedule_time: '',
    });
    setShowForm(true);
  };

  const handleEdit = (exam: Exam) => {
    setRetakeSourceExamId(null);
    setEditingId(exam.id);
    setFormData({
      category_id: exam.category_id,
      title: exam.title,
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks,
      is_premium: exam.is_premium,
      schedule_date: (exam as any).schedule_date || '',
      schedule_time: (exam as any).schedule_time || '',
    });
    setShowForm(true);
  };

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Exam Creator</h1>
          <p className="text-gray-400">Create and manage exams</p>
        </div>
        <button
          onClick={() => {
            resetFormData();
            setEditingId(null);
            setRetakeSourceExamId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          <Plus className="w-5 h-5" />
          Create Exam
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">
              {retakeSourceExamId ? 'Retake Exam' : editingId ? 'Edit Exam' : 'Create New Exam'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (mins)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Marks</label>
                  <input
                    type="number"
                    value={formData.total_marks}
                    onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Schedule Date</label>
                  <input
                    type="date"
                    value={formData.schedule_date}
                    onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Schedule Time</label>
                  <input
                    type="time"
                    value={formData.schedule_time}
                    onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_premium"
                  checked={formData.is_premium}
                  onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-300">Premium Only</label>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold">
                  {retakeSourceExamId ? 'Schedule Retake' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); setRetakeSourceExamId(null); resetFormData(); }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Title</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Duration</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Marks</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {exams.map((exam) => (
              <tr key={exam.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 text-gray-300">{exam.title}</td>
                <td className="px-6 py-4 text-gray-300">{exam.duration_minutes} mins</td>
                <td className="px-6 py-4 text-gray-300">{exam.total_marks}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(exam)} className="text-blue-400 hover:text-blue-300 p-2">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleRetake(exam)} className="text-indigo-400 hover:text-indigo-300 p-2" aria-label="Retake exam">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(exam.id)} className="text-red-400 hover:text-red-300 p-2">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
