import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getExams, createExam, updateExam, deleteExam, Exam } from '../../lib/firestore';
import { Plus, Edit, Trash2, Calendar, Clock, Settings, Shield, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDate, formatDateTime } from '../../lib/dateUtils';

export function ExamCreator() {
  const { profile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    category_id: 'ALP',
    title: '',
    description: '',
    duration_minutes: 90,
    total_marks: 100,
    passing_marks: 40,
    negative_marking: 0.25,
    schedule_date: '',
    schedule_time: '',
    auto_submit: true,
    proctoring_enabled: false,
    instructions: '',
    attempt_limits: 1,
    partial_marking: false,
    is_premium: false,
    is_active: true,
    is_private: false,
    pause_resume_enabled: false,
  });

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    setLoading(true);
    try {
      const data = await getExams();
      setExams(data);
    } catch (error: any) {
      console.error('Error loading exams:', error);
      setError('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const examData = {
        ...formData,
        negative_marking: parseFloat(formData.negative_marking as any),
        duration_minutes: parseInt(formData.duration_minutes as any),
        total_marks: parseInt(formData.total_marks as any),
        passing_marks: parseInt(formData.passing_marks as any),
        attempt_limits: parseInt(formData.attempt_limits as any),
        created_by: (profile as any)?.uid,
      };

      if (editingId) {
        await updateExam(editingId, examData);
        setSuccess('Exam updated successfully!');
      } else {
        await createExam(examData);
        setSuccess('Exam created successfully!');
      }

      setTimeout(() => {
        resetForm();
        loadExams();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving exam:', error);
      setError(error.message || 'Error saving exam');
    }
  };

  const handleEdit = (exam: Exam) => {
    setFormData({
      category_id: exam.category_id,
      title: exam.title,
      description: exam.description || '',
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks,
      passing_marks: exam.passing_marks || 40,
      negative_marking: exam.negative_marking || 0.25,
      schedule_date: exam.schedule_date || '',
      schedule_time: exam.schedule_time || '',
      auto_submit: exam.auto_submit ?? true,
      proctoring_enabled: exam.proctoring_enabled ?? false,
      instructions: exam.instructions || '',
      attempt_limits: exam.attempt_limits || 1,
      partial_marking: exam.partial_marking ?? false,
      is_premium: exam.is_premium,
      is_active: exam.is_active,
      is_private: exam.is_private ?? false,
      pause_resume_enabled: exam.pause_resume_enabled ?? false,
    });
    setEditingId(exam.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      await deleteExam(id);
      loadExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      category_id: 'ALP',
      title: '',
      description: '',
      duration_minutes: 90,
      total_marks: 100,
      passing_marks: 40,
      negative_marking: 0.25,
      schedule_date: '',
      schedule_time: '',
      auto_submit: true,
      proctoring_enabled: false,
      instructions: '',
      attempt_limits: 1,
      partial_marking: false,
      is_premium: false,
      is_active: true,
      is_private: false,
      pause_resume_enabled: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const generatePDF = (exam: Exam) => {
    alert(`Generating PDF for: ${exam.title}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Exam Creator</h1>
          <p className="text-gray-400">Create and manage exams with advanced settings</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          <Plus className="w-5 h-5" />
          Create Exam
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Total Exams</div>
          <div className="text-2xl font-bold text-white">{exams.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Active</div>
          <div className="text-2xl font-bold text-green-400">{exams.filter(e => e.is_active).length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Scheduled</div>
          <div className="text-2xl font-bold text-blue-400">{exams.filter(e => e.schedule_date).length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Premium</div>
          <div className="text-2xl font-bold text-purple-400">{exams.filter(e => e.is_premium).length}</div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center text-gray-400 py-12">Loading exams...</div>
        ) : exams.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-12">
            No exams found. Create your first exam!
          </div>
        ) : (
          exams.map((exam) => (
            <div key={exam.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{exam.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">{exam.category_id}</p>
                </div>
                <div className="flex gap-2">
                  {exam.is_premium && (
                    <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs font-bold">PREMIUM</span>
                  )}
                  {exam.is_private && (
                    <span className="bg-orange-900/50 text-orange-300 px-2 py-1 rounded text-xs font-bold">PRIVATE</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{exam.duration_minutes} minutes</span>
                  <span className="mx-1">•</span>
                  <span>{exam.total_marks} marks</span>
                </div>
                {exam.schedule_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(exam.schedule_date)}</span>
                    {exam.schedule_time && <span>at {exam.schedule_time}</span>}
                  </div>
                )}
                {exam.negative_marking && (
                  <div className="text-sm text-yellow-400">
                    Negative marking: -{exam.negative_marking} per wrong answer
                  </div>
                )}
                {exam.proctoring_enabled && (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <Shield className="w-4 h-4" />
                    <span>Proctoring enabled</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(exam)}
                  className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => generatePDF(exam)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => handleDelete(exam.id)}
                  className="px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Exam Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 border border-gray-700 my-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Edit Exam' : 'Create New Exam'}
            </h2>
            {error && (
              <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  >
                    <option value="ALP">ALP</option>
                    <option value="Group-D">Group-D</option>
                    <option value="Technician">Technician</option>
                    <option value="NTPC">NTPC</option>
                    <option value="Technical">Technical</option>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Marks</label>
                  <input
                    type="number"
                    value={formData.total_marks}
                    onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Passing Marks</label>
                  <input
                    type="number"
                    value={formData.passing_marks}
                    onChange={(e) => setFormData({ ...formData, passing_marks: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Negative Marking</label>
                  <select
                    value={formData.negative_marking}
                    onChange={(e) => setFormData({ ...formData, negative_marking: parseFloat(e.target.value) })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  >
                    <option value={0}>No negative marking</option>
                    <option value={0.25}>-0.25 per wrong answer</option>
                    <option value={0.33}>-0.33 per wrong answer</option>
                    <option value={0.5}>-0.5 per wrong answer</option>
                    <option value={1}>-1 per wrong answer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Attempt Limits</label>
                  <select
                    value={formData.attempt_limits}
                    onChange={(e) => setFormData({ ...formData, attempt_limits: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  >
                    <option value={1}>1 attempt only</option>
                    <option value={2}>2 attempts</option>
                    <option value={3}>3 attempts</option>
                    <option value={-1}>Unlimited attempts</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exam Instructions</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
                  rows={3}
                  placeholder="Enter instructions to be shown before the exam starts..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Exam Settings
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.auto_submit}
                        onChange={(e) => setFormData({ ...formData, auto_submit: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Auto-submit on time expiry
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.pause_resume_enabled}
                        onChange={(e) => setFormData({ ...formData, pause_resume_enabled: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Allow pause/resume
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.partial_marking}
                        onChange={(e) => setFormData({ ...formData, partial_marking: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Enable partial marking
                    </label>
                  </div>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Security & Access
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.proctoring_enabled}
                        onChange={(e) => setFormData({ ...formData, proctoring_enabled: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Enable proctoring (tab switch detection)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.is_private}
                        onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Private exam (link-only access)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.is_premium}
                        onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Premium exam
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Active (visible to students)
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
                >
                  {editingId ? 'Update Exam' : 'Create Exam'}
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
    </div>
  );
}