import { useEffect, useState } from 'react';
import { BarChart3, Clock, Download, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Category, Exam, createExam, deleteExam, getCategories, getExams, updateExam, getQuestions, createQuestionsBatch } from '../../lib/firestore';
import { formatDate } from '../../lib/dateUtils';
import { AddQuestionModal } from '../../components/AddQuestionModal';

export function ExamCreator() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [categories, setCategories] = useState<Category[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingQuestionToExam, setAddingQuestionToExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    description: '',
    duration_minutes: 90,
    total_marks: 100,
    passing_marks: 40,
    negative_marking: 0,
    schedule_date: '',
    schedule_time: '',
    auto_submit: true,
    instructions: '',
    attempt_limits: 1,
    partial_marking: false,
    is_premium: true,
    is_active: true,
    is_private: false,
    pause_resume_enabled: false,
  });

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const categoryIdFromQuery = new URLSearchParams(window.location.search).get('categoryId');
    if (!categoryIdFromQuery) return;
    setFormData((prev) => ({ ...prev, category_id: categoryIdFromQuery, is_premium: true }));
    setShowForm(true);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allCategories, allExams] = await Promise.all([getCategories(), getExams(undefined, true)]);
      setCategories(allCategories);
      
      const now = new Date();
      const processedExams: Exam[] = [];
      const updates: Promise<void>[] = [];
      
      for (const exam of allExams) {
        let isOver = false;
        if (exam.schedule_date && exam.schedule_time && exam.is_active) {
          const end = new Date(`${exam.schedule_date}T${exam.schedule_time}`);
          end.setMinutes(end.getMinutes() + (exam.duration_minutes || 0));
          if (end < now) {
            isOver = true;
          }
        }
        
        if (isOver && exam.is_active) {
          updates.push(updateExam(exam.id, { is_active: false }));
          processedExams.push({ ...exam, is_active: false });
        } else {
          processedExams.push(exam);
        }
      }
      
      if (updates.length > 0) {
        await Promise.all(updates);
      }
      
      setExams(processedExams);
      setFormData((prev) => ({ ...prev, category_id: prev.category_id || allCategories[0]?.id || '' }));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category_id: categories[0]?.id || '',
      title: '',
      description: '',
      duration_minutes: 90,
      total_marks: 100,
      passing_marks: 40,
      negative_marking: 0,
      schedule_date: '',
      schedule_time: '',
      auto_submit: true,
      instructions: '',
      attempt_limits: 1,
      partial_marking: false,
      is_premium: true,
      is_active: true,
      is_private: false,
      pause_resume_enabled: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) {
      toast.error('Please login again');
      return;
    }

    try {
      const payload = {
        ...formData,
        created_by: profile.id,
      } as any;

      if (editingId) {
        const oldExam = exams.find(e => e.id === editingId);
        const scheduleChanged = oldExam && (
          oldExam.schedule_date !== formData.schedule_date || 
          oldExam.schedule_time !== formData.schedule_time
        );

        if (scheduleChanged) {
          const newExamId = await createExam(payload);
          const oldQuestions = await getQuestions(editingId);
          if (oldQuestions.length > 0) {
            const newQuestions = oldQuestions.map(q => {
              const { id, created_at, updated_at, ...rest } = q as any;
              return { ...rest, exam_id: newExamId };
            });
            await createQuestionsBatch(newQuestions);
          }
          toast.success('New exam scheduled with duplicated questions');
        } else {
          await updateExam(editingId, payload);
          toast.success('Exam updated');
        }
      } else {
        await createExam(payload);
        toast.success('Exam created');
      }

      await loadData();
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to save exam');
    }
  };

  const handleEdit = (exam: Exam) => {
    setEditingId(exam.id);
    setFormData({
      category_id: exam.category_id,
      title: exam.title,
      description: exam.description || '',
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks,
      passing_marks: exam.passing_marks || 40,
      negative_marking: exam.negative_marking || 0,
      schedule_date: exam.schedule_date || '',
      schedule_time: exam.schedule_time || '',
      auto_submit: exam.auto_submit ?? true,
      instructions: exam.instructions || '',
      attempt_limits: exam.attempt_limits || 1,
      partial_marking: exam.partial_marking ?? false,
      is_premium: exam.is_premium,
      is_active: exam.is_active,
      is_private: exam.is_private ?? false,
      pause_resume_enabled: exam.pause_resume_enabled ?? false,
    });
    setShowForm(true);
  };

  const handleDelete = async (exam: Exam) => {
    if (!confirm(`Delete "${exam.title}"?`)) return;
    await deleteExam(exam.id);
    await loadData();
    toast.success('Exam deleted');
  };

  const categoryName = (categoryId: string) => categories.find((category) => category.id === categoryId)?.name || categoryId;

  const generatePDF = (exam: Exam) => {
    toast(`PDF export for "${exam.title}" can be connected here next.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Mock Exam Creator</h1>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Create scheduled mock exams for the lower exam section in the user panel.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />
          Create exam
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total exams', value: exams.length },
          { label: 'Active', value: exams.filter((exam) => exam.is_active).length },
          { label: 'Scheduled', value: exams.filter((exam) => exam.schedule_date).length },
          { label: 'Premium', value: exams.filter((exam) => exam.is_premium).length },
        ].map((item) => (
          <div key={item.label} className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border p-5 shadow-sm`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</div>
            <div className={`mt-2 text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className={`col-span-full rounded-3xl border p-10 text-center text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-white text-gray-500'}`}>Loading exams...</div>
        ) : exams.length === 0 ? (
          <div className={`col-span-full rounded-3xl border p-10 text-center text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-white text-gray-500'}`}>No exams created yet.</div>
        ) : (
          exams.map((exam) => (
            <div key={exam.id} className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border p-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{exam.title}</h3>
                  <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{categoryName(exam.category_id)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exam.is_premium && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">Premium</span>}
                  {!exam.is_active && <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">Inactive</span>}
                </div>
              </div>

              <div className={`mt-4 space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {exam.duration_minutes} minutes • {exam.total_marks} marks</div>
                {exam.schedule_date && <div>Scheduled: {formatDate(exam.schedule_date)} {exam.schedule_time ? `at ${exam.schedule_time}` : ''}</div>}
                {exam.negative_marking ? <div>Negative marking: -{exam.negative_marking}</div> : <div>No negative marking</div>}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => handleEdit(exam)} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100">Edit</button>
                <button onClick={() => navigate(`/admin/student-analytics?examId=${exam.id}`)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-100">
                  <BarChart3 className="h-4 w-4" />
                  Results
                </button>
                <button onClick={() => setAddingQuestionToExam(exam)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                  <Plus className="h-4 w-4" />
                  Add Q
                </button>
                <button onClick={() => generatePDF(exam)} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold hover:opacity-80 transition ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-gray-100 text-gray-800'}`}>
                  <Download className="h-4 w-4" />
                  PDF
                </button>
                <button onClick={() => void handleDelete(exam)} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100">
                  <Trash2 className="h-4 w-4" />
                  Delete exam
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border p-6 shadow-2xl`}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{editingId ? 'Edit exam' : 'Create exam'}</h2>
                <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Create the timed exam details here.</p>
              </div>
              <button onClick={resetForm} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Close</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Category</span>
                  <select value={formData.category_id} onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Title</span>
                  <input value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} required className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
                </label>
              </div>

              <label className="block">
                <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</span>
                <textarea value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={3} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
              </label>

              <div className="grid gap-4 md:grid-cols-4">
                <label className="block">
                  <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Duration (HH:MM:SS)</span>
                  <input 
                    type="time" 
                    step="1"
                    value={(() => {
                      const totalMins = formData.duration_minutes || 0;
                      const h = Math.floor(totalMins / 60);
                      const m = Math.floor(totalMins % 60);
                      const s = Math.round((totalMins % 1) * 60);
                      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    })()} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setFormData((prev) => ({ ...prev, duration_minutes: 0 }));
                        return;
                      }
                      const [hours, minutes, seconds] = val.split(':').map(Number);
                      const totalMinutes = (hours || 0) * 60 + (minutes || 0) + ((seconds || 0) / 60);
                      setFormData((prev) => ({ ...prev, duration_minutes: totalMinutes }));
                    }} 
                    className={`w-full rounded-2xl border px-4 py-3 text-sm flex items-center justify-between ${isDark ? 'border-gray-700 bg-gray-900 text-white css-invert-time-icon' : 'border-gray-300 bg-white text-gray-900'}`} 
                  />
                </label>
                <label className="block">
                  <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Total marks</span>
                  <input type="number" value={formData.total_marks} onChange={(e) => setFormData((prev) => ({ ...prev, total_marks: Number(e.target.value) }))} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
                </label>
                <label className="block">
                  <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Passing marks</span>
                  <input type="number" value={formData.passing_marks} onChange={(e) => setFormData((prev) => ({ ...prev, passing_marks: Number(e.target.value) }))} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
                </label>
                <label className="block">
                  <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Negative marking</span>
                  <select value={formData.negative_marking} onChange={(e) => setFormData((prev) => ({ ...prev, negative_marking: Number(e.target.value) }))} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}>
                    <option value={0}>No negative marking</option>
                    <option value={0.25}>-0.25</option>
                    <option value={0.33}>-0.33</option>
                    <option value={0.5}>-0.5</option>
                    <option value={1}>-1</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Schedule date</span>
                  <input type="date" value={formData.schedule_date} onChange={(e) => setFormData((prev) => ({ ...prev, schedule_date: e.target.value }))} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
                </label>
                <label className="block">
                  <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Schedule time</span>
                  <input type="time" value={formData.schedule_time} onChange={(e) => setFormData((prev) => ({ ...prev, schedule_time: e.target.value }))} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
                </label>
              </div>

              <label className="block">
                <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Instructions</span>
                <textarea value={formData.instructions} onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))} rows={3} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-3xl border p-4`}>
                  <h4 className={`mb-3 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Exam settings</h4>
                  <div className="space-y-3 text-sm">
                    {[
                      ['auto_submit', 'Auto-submit on time expiry'],
                      ['pause_resume_enabled', 'Allow pause/resume'],
                      ['partial_marking', 'Enable partial marking'],
                    ].map(([key, label]) => (
                      <label key={key} className={`flex items-center gap-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <input type="checkbox" checked={(formData as any)[key]} onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.checked }))} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-3xl border p-4`}>
                  <h4 className={`mb-3 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Access</h4>
                  <div className="space-y-3 text-sm">
                    {[
                      ['is_private', 'Private exam'],
                      ['is_active', 'Visible to students'],
                    ].map(([key, label]) => (
                      <label key={key} className={`flex items-center gap-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <input type="checkbox" checked={(formData as any)[key]} onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.checked }))} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={resetForm} className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>
                <button type="submit" className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">{editingId ? 'Update exam' : 'Create exam'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {addingQuestionToExam && (
        <AddQuestionModal 
          isOpen={true} 
          onClose={() => setAddingQuestionToExam(null)} 
          onSuccess={() => setAddingQuestionToExam(null)} 
          examId={addingQuestionToExam.id} 
          examTitle={addingQuestionToExam.title}
          categoryNodeId={addingQuestionToExam.category_id}
          linkedLabel={categoryName(addingQuestionToExam.category_id)}
        />
      )}
    </div>
  );
}
