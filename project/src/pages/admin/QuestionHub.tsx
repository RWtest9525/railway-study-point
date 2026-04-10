import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Eye,
  FolderPlus,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Category,
  Exam,
  Question,
  createCategory,
  deleteCategory,
  getAllQuestions,
  getExams,
  getQuestions,
  subscribeToCategories,
  updateCategory,
  updateQuestion,
  deleteQuestion,
} from '../../lib/firestore';
import { AddQuestionModal } from '../../components/AddQuestionModal';

type ModalMode = 'manual' | 'screenshot' | 'bulk';

interface EnhancedQuestion extends Question {
  examTitle?: string;
  categoryName?: string;
}

export function QuestionHub() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [questions, setQuestions] = useState<EnhancedQuestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>('manual');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#2563eb',
    iconUrl: '',
    is_active: true,
  });

  const urlParams = new URLSearchParams(window.location.search);
  const examIdFromQuery = urlParams.get('examId') || '';

  useEffect(() => {
    const unsubscribe = subscribeToCategories((cats) => setCategories(cats));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSelectedExamId(examIdFromQuery);
    void loadData(examIdFromQuery);
  }, [examIdFromQuery]);

  const loadData = async (examId?: string) => {
    setLoading(true);
    try {
      const [allExams, allQuestions] = await Promise.all([
        getExams(undefined, true),
        examId ? getQuestions(examId) : getAllQuestions(),
      ]);

      const examMap = new Map(allExams.map((exam) => [exam.id, exam]));
      const categoryMap = new Map(categories.map((category) => [category.id, category]));

      setExams(allExams);
      setQuestions(
        (allQuestions as EnhancedQuestion[]).map((question) => {
          const exam = examMap.get(question.exam_id);
          return {
            ...question,
            examTitle: exam?.title,
            categoryName: categoryMap.get(exam?.category_id || '')?.name || exam?.category_id,
          };
        })
      );
    } catch (error) {
      console.error('Error loading question hub:', error);
      toast.error('Failed to load question hub data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (exams.length === 0) return;
    setQuestions((prev) =>
      prev.map((question) => {
        const exam = exams.find((item) => item.id === question.exam_id);
        return {
          ...question,
          examTitle: exam?.title,
          categoryName: categories.find((category) => category.id === exam?.category_id)?.name || exam?.category_id,
        };
      })
    );
  }, [categories, exams]);

  const visibleExams = useMemo(
    () => (selectedCategoryId ? exams.filter((exam) => exam.category_id === selectedCategoryId) : exams),
    [exams, selectedCategoryId]
  );

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(
          questions
            .filter((question) => !selectedExamId || question.exam_id === selectedExamId)
            .map((question) => question.subject)
            .filter(Boolean)
        )
      ),
    [questions, selectedExamId]
  );

  const topics = useMemo(
    () =>
      Array.from(
        new Set(
          questions
            .filter((question) => (!selectedExamId || question.exam_id === selectedExamId) && (!selectedSubject || question.subject === selectedSubject))
            .map((question) => question.topic)
            .filter(Boolean)
        )
      ) as string[],
    [questions, selectedExamId, selectedSubject]
  );

  const subtopics = useMemo(
    () =>
      Array.from(
        new Set(
          questions
            .filter(
              (question) =>
                (!selectedExamId || question.exam_id === selectedExamId) &&
                (!selectedSubject || question.subject === selectedSubject) &&
                (!selectedTopic || question.topic === selectedTopic)
            )
            .map((question) => question.subtopic)
            .filter(Boolean)
        )
      ) as string[],
    [questions, selectedExamId, selectedSubject, selectedTopic]
  );

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      const exam = exams.find((item) => item.id === question.exam_id);
      if (selectedCategoryId && exam?.category_id !== selectedCategoryId) return false;
      if (selectedExamId && question.exam_id !== selectedExamId) return false;
      if (selectedSubject && question.subject !== selectedSubject) return false;
      if (selectedTopic && question.topic !== selectedTopic) return false;
      if (selectedSubtopic && question.subtopic !== selectedSubtopic) return false;
      if (difficultyFilter && question.difficulty !== difficultyFilter) return false;
      if (statusFilter === 'live' && question.is_draft) return false;
      if (statusFilter === 'draft' && !question.is_draft) return false;
      if (
        searchQuery &&
        !`${question.question_text} ${question.examTitle || ''} ${question.topic || ''} ${question.subtopic || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [
    questions,
    exams,
    selectedCategoryId,
    selectedExamId,
    selectedSubject,
    selectedTopic,
    selectedSubtopic,
    difficultyFilter,
    statusFilter,
    searchQuery,
  ]);

  const openCreateCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      name: '',
      description: '',
      color: '#2563eb',
      iconUrl: '',
      is_active: true,
    });
    setCategoryFormOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color || '#2563eb',
      iconUrl: category.iconUrl || '',
      is_active: category.is_active,
    });
    setCategoryFormOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, categoryForm);
        toast.success('Category updated');
      } else {
        await createCategory({ ...categoryForm, order: categories.length + 1 });
        toast.success('Category created');
      }
      setCategoryFormOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category? Exams already linked to it may need reassignment.')) return;
    await deleteCategory(categoryId);
    if (selectedCategoryId === categoryId) setSelectedCategoryId('');
    toast.success('Category deleted');
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question from the question bank?')) return;
    await deleteQuestion(questionId);
    await loadData(selectedExamId || undefined);
    toast.success('Question deleted');
  };

  const toggleDraftState = async (question: EnhancedQuestion) => {
    await updateQuestion(question.id, {
      is_draft: !question.is_draft,
      updated_at: new Date().toISOString(),
    });
    await loadData(selectedExamId || undefined);
    toast.success(question.is_draft ? 'Question published' : 'Question moved to draft');
  };

  const exportCsv = () => {
    const headers = ['Exam', 'Category', 'Subject', 'Topic', 'Subtopic', 'Difficulty', 'Status', 'Question'];
    const rows = filteredQuestions.map((question) => [
      question.examTitle || '',
      question.categoryName || '',
      question.subject || '',
      question.topic || '',
      question.subtopic || '',
      question.difficulty || '',
      question.is_draft ? 'Draft' : 'Live',
      `"${(question.question_text || '').replace(/"/g, '""')}"`,
    ]);
    const blob = new Blob([[headers.join(','), ...rows.map((row) => row.join(','))].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `question-hub-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-6">
            <section className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border p-5 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Categories</h2>
                  <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Add and manage exam categories here.</p>
                </div>
                <button onClick={openCreateCategory} className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
                  Add
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <button
                  onClick={() => setSelectedCategoryId('')}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium ${
                    !selectedCategoryId
                      ? 'bg-blue-600 text-white'
                      : isDark
                      ? 'bg-gray-900 text-gray-300'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  All categories
                </button>
                {categories.map((category) => (
                  <div key={category.id} className={`rounded-2xl border p-3 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                    <button
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setSelectedExamId('');
                      }}
                      className={`w-full text-left text-sm font-semibold ${selectedCategoryId === category.id ? 'text-blue-500' : isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      {category.name}
                    </button>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => openEditCategory(category)} className="rounded-xl border border-slate-500/30 px-3 py-1 text-xs text-slate-300">Edit</button>
                      <button onClick={() => void handleDeleteCategory(category.id)} className="rounded-xl border border-red-500/30 px-3 py-1 text-xs text-red-300">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border p-5 shadow-sm`}>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Link questions fast</h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Create the exam first, then choose it here to add questions directly into that exam card flow.</p>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className={`mb-2 block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Exam</span>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    <option value="">All exams</option>
                    {visibleExams.map((exam) => (
                      <option key={exam.id} value={exam.id}>{exam.title}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={`mb-2 block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Subject</span>
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setSelectedTopic('');
                      setSelectedSubtopic('');
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    <option value="">All subjects</option>
                    {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className={`mb-2 block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Topic</span>
                  <select
                    value={selectedTopic}
                    onChange={(e) => {
                      setSelectedTopic(e.target.value);
                      setSelectedSubtopic('');
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    <option value="">All topics</option>
                    {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className={`mb-2 block text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Subtopic</span>
                  <select
                    value={selectedSubtopic}
                    onChange={(e) => setSelectedSubtopic(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    <option value="">All subtopics</option>
                    {subtopics.map((subtopic) => <option key={subtopic} value={subtopic}>{subtopic}</option>)}
                  </select>
                </label>
              </div>
            </section>
          </aside>

          <main className="space-y-6">
            <section className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border p-5 shadow-sm`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Question Hub</h1>
                  <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Add questions manually or from single/bulk screenshots, then manage draft/live status from one place.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => { setModalMode('manual'); setIsAddModalOpen(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
                    <Plus className="h-4 w-4" />
                    Manual
                  </button>
                  <button onClick={() => { setModalMode('screenshot'); setIsAddModalOpen(true); }} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                    <ImagePlus className="h-4 w-4" />
                    Upload SS
                  </button>
                  <button onClick={() => { setModalMode('bulk'); setIsAddModalOpen(true); }} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                    <Upload className="h-4 w-4" />
                    Bulk SS
                  </button>
                  <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]">
                <label className="relative block">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search question, exam, topic"
                    className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                </label>
                <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <option value="">All difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <option value="">All status</option>
                  <option value="live">Live</option>
                  <option value="draft">Draft</option>
                </select>
                <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}>
                  {filteredQuestions.length} question(s)
                </div>
              </div>
            </section>

            <section className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border shadow-sm overflow-hidden`}>
              {loading ? (
                <div className={`p-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading questions...</div>
              ) : filteredQuestions.length === 0 ? (
                <div className={`p-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No questions found for the current filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className={isDark ? 'bg-gray-900/70' : 'bg-gray-50'}>
                      <tr>
                        {['Question', 'Exam', 'Category', 'Subject', 'Topic', 'Status', 'Actions'].map((head) => (
                          <th key={head} className={`px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {filteredQuestions.map((question) => (
                        <tr key={question.id} className={isDark ? 'hover:bg-gray-900/50' : 'hover:bg-gray-50'}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {question.image_url ? (
                                <img src={question.image_url} alt="Question" className="h-12 w-12 rounded-xl object-cover" />
                              ) : (
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDark ? 'bg-gray-900 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                                  <Eye className="h-4 w-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className={`max-w-sm truncate text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{question.question_text || 'Screenshot question'}</div>
                                <div className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                  {question.difficulty || 'medium'} • {question.marks || 1} mark(s)
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{question.examTitle || '-'}</td>
                          <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{question.categoryName || '-'}</td>
                          <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{question.subject || '-'}</td>
                          <td className={`px-5 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{[question.topic, question.subtopic].filter(Boolean).join(' / ') || '-'}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${question.is_draft ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                              {question.is_draft ? 'Draft' : 'Live'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => void toggleDraftState(question)} className="rounded-xl border border-slate-300 p-2 text-slate-600">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => void handleDeleteQuestion(question.id)} className="rounded-xl border border-red-300 p-2 text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <AddQuestionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => void loadData(selectedExamId || undefined)}
        examId={selectedExamId || examIdFromQuery || undefined}
        initialMode={modalMode}
      />

      {categoryFormOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4">
          <div className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} w-full max-w-lg rounded-3xl border p-6 shadow-2xl`}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{editingCategoryId ? 'Edit category' : 'Add category'}</h3>
                <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Keep category management directly inside the question workflow.</p>
              </div>
              <button onClick={() => setCategoryFormOpen(false)} className="rounded-xl border border-slate-300 p-2 text-slate-500">
                <FolderPlus className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <input value={categoryForm.name} onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Category name" className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
              <textarea value={categoryForm.description} onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" rows={3} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
              <div className="grid grid-cols-2 gap-4">
                <input value={categoryForm.iconUrl} onChange={(e) => setCategoryForm((prev) => ({ ...prev, iconUrl: e.target.value }))} placeholder="Icon URL" className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
                <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm((prev) => ({ ...prev, color: e.target.value }))} className="h-12 w-full rounded-2xl" />
              </div>
              <label className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-gray-50 text-gray-700'}`}>
                <input type="checkbox" checked={categoryForm.is_active} onChange={(e) => setCategoryForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
                Active category
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setCategoryFormOpen(false)} className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>
                <button type="submit" className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Save category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
