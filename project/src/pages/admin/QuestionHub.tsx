import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, Import, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Category,
  CategoryNode,
  Exam,
  createCategory,
  createCategoryNode,
  deleteCategory,
  deleteCategoryNode,
  getCategories,
  getCategoryNodes,
  getExam,
  updateCategory,
  updateCategoryNode,
} from '../../lib/firestore';
import { AddQuestionModal } from '../../components/AddQuestionModal';

type LevelEntity = 'category' | 'node';
type QuestionMode = 'manual' | 'screenshot' | 'bulk';

export function QuestionHub() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [categories, setCategories] = useState<Category[]>([]);
  const [path, setPath] = useState<Array<{ entity: LevelEntity; id: string; name: string; categoryId: string }>>([]);
  const [currentItems, setCurrentItems] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingNode, setEditingNode] = useState<CategoryNode | null>(null);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionMode, setQuestionMode] = useState<QuestionMode>('manual');
  const [linkedExam, setLinkedExam] = useState<Exam | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#2563eb', iconUrl: '', is_active: true });
  const [nodeName, setNodeName] = useState('');

  const selectedCategoryId = path.find((item) => item.entity === 'category')?.id || '';
  const selectedNode = path.length > 0 ? path[path.length - 1] : null;
  const currentLevel = Math.max(0, path.length - 1);
  const canAddQuestions = path.length >= 2;

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    void loadExamContext();
  }, []);

  useEffect(() => {
    void loadCurrentItems();
  }, [path.length, selectedCategoryId, selectedNode?.id]);

  useEffect(() => {
    if (!linkedExam || categories.length === 0 || path.length > 0) return;

    const examCategory = categories.find((category) => category.id === linkedExam.category_id);
    if (!examCategory) return;

    setPath([{ entity: 'category', id: examCategory.id, name: examCategory.name, categoryId: examCategory.id }]);
  }, [linkedExam, categories, path.length]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentItems = async () => {
    if (!selectedCategoryId || path.length === 0) {
      setCurrentItems([]);
      return;
    }

    const parentNode = path[path.length - 1].entity === 'node' ? path[path.length - 1].id : null;
    const nodes = await getCategoryNodes(selectedCategoryId, parentNode);
    setCurrentItems(nodes);
  };

  const loadExamContext = async () => {
    const examId = new URLSearchParams(window.location.search).get('examId');
    if (!examId) return;

    try {
      const exam = await getExam(examId);
      setLinkedExam(exam);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load exam link');
    }
  };

  const sectionTitle = useMemo(() => {
    if (path.length === 0) return 'Choose category';
    if (path.length === 1) return 'Choose subcategory';
    if (path.length === 2) return 'Choose next folder';
    if (path.length === 3) return 'Choose test paper';
    return 'Choose next folder';
  }, [path.length]);

  const openAddCategory = (category?: Category) => {
    setEditingCategory(category || null);
    setCategoryForm({
      name: category?.name || '',
      description: category?.description || '',
      color: category?.color || '#2563eb',
      iconUrl: category?.iconUrl || '',
      is_active: category?.is_active ?? true,
    });
    setCategoryModalOpen(true);
  };

  const openAddNode = (node?: CategoryNode) => {
    setEditingNode(node || null);
    setNodeName(node?.name || '');
    setNodeModalOpen(true);
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!categoryForm.name.trim()) {
        toast.error('Enter category name');
        return;
      }

      const duplicateCategory = categories.find(
        (category) =>
          category.id !== editingCategory?.id &&
          category.name.trim().toLowerCase() === categoryForm.name.trim().toLowerCase()
      );
      if (duplicateCategory) {
        toast.error('Category name already exists');
        return;
      }

      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        toast.success('Category updated');
      } else {
        await createCategory({ ...categoryForm, order: categories.length + 1 });
        toast.success('Category created');
      }
      setCategoryModalOpen(false);
      await loadCategories();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save category');
    }
  };

  const saveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      toast.error('Choose category first');
      return;
    }
    try {
      if (!nodeName.trim()) {
        toast.error('Enter folder name');
        return;
      }

      const duplicateNode = currentItems.find(
        (node) =>
          node.id !== editingNode?.id &&
          node.name.trim().toLowerCase() === nodeName.trim().toLowerCase()
      );

      if (duplicateNode) {
        toast.error('This name already exists in the selected level');
        return;
      }

      if (editingNode) {
        await updateCategoryNode(editingNode.id, { name: nodeName });
        toast.success('Folder updated');
      } else {
        await createCategoryNode({
          category_id: selectedCategoryId,
          parent_id: selectedNode?.entity === 'node' ? selectedNode.id : null,
          name: nodeName,
          level: currentLevel + 1,
          order: currentItems.length + 1,
          is_active: true,
        });
        toast.success('Folder created');
      }
      setNodeModalOpen(false);
      setNodeName('');
      await loadCurrentItems();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save folder');
    }
  };

  const removeCategory = async (category: Category) => {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    await deleteCategory(category.id);
    if (selectedCategoryId === category.id) setPath([]);
    await loadCategories();
  };

  const removeNode = async (node: CategoryNode) => {
    if (!confirm(`Delete "${node.name}"?`)) return;
    await deleteCategoryNode(node.id);
    await loadCurrentItems();
  };

  const exportPlaceholder = () => toast('Export hook is ready here.');
  const importPlaceholder = () => toast('Import hook is ready here.');

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Question Categories</h1>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Simple flow: category, subcategory, next folder, test paper. Question actions appear only after a real folder is selected.</p>
        </div>
        <button onClick={() => openAddCategory()} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />
          Add category
        </button>
      </div>

      {linkedExam && (
        <div className={`${isDark ? 'border-blue-500/30 bg-blue-500/10 text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-700'} mb-5 rounded-3xl border px-5 py-4`}>
          <div className="text-sm font-semibold">Questions will link to exam: {linkedExam.title}</div>
          <div className={`mt-1 text-xs ${isDark ? 'text-blue-200/80' : 'text-blue-600'}`}>
            Choose the correct category path first, then add questions into the selected folder for this exam.
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <button onClick={() => setPath([])} className={`rounded-xl px-3 py-2 font-semibold ${path.length === 0 ? 'bg-blue-600 text-white' : isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'}`}>
          Categories
        </button>
        {path.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <button
              onClick={() => setPath(path.slice(0, index + 1))}
              className={`rounded-xl px-3 py-2 font-semibold ${index === path.length - 1 ? 'bg-blue-600 text-white' : isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'}`}
            >
              {item.name}
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border p-5 shadow-sm`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{sectionTitle}</h2>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Only one clean tree flow, no extra clutter.</p>
            </div>
            {path.length > 0 && (
              <button onClick={() => openAddNode()} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
                Add {path.length === 1 ? 'subcategory' : 'folder'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {path.length === 0
              ? categories.map((category) => (
                  <div key={category.id} className={`rounded-2xl border p-3 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                    <button
                      onClick={() => setPath([{ entity: 'category', id: category.id, name: category.name, categoryId: category.id }])}
                      className={`w-full text-left text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      {category.name}
                    </button>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => openAddCategory(category)} className="rounded-xl border border-slate-300 px-3 py-1 text-xs text-slate-600">Edit</button>
                      <button onClick={() => void removeCategory(category)} className="rounded-xl border border-red-300 px-3 py-1 text-xs text-red-600">Delete</button>
                    </div>
                  </div>
                ))
              : currentItems.map((node) => (
                  <div key={node.id} className={`rounded-2xl border p-3 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                    <button
                      onClick={() =>
                        setPath([
                          ...path,
                          {
                            entity: 'node',
                            id: node.id,
                            name: node.name,
                            categoryId: selectedCategoryId,
                          },
                        ])
                      }
                      className={`w-full text-left text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      {node.name}
                    </button>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => openAddNode(node)} className="rounded-xl border border-slate-300 px-3 py-1 text-xs text-slate-600">Edit</button>
                      <button onClick={() => void removeNode(node)} className="rounded-xl border border-red-300 px-3 py-1 text-xs text-red-600">Delete</button>
                    </div>
                  </div>
                ))}

            {path.length > 0 && currentItems.length === 0 && (
              <div className={`rounded-2xl border p-5 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                No folder here yet. Use the add button above.
              </div>
            )}
          </div>
        </aside>

        <main className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border p-6 shadow-sm`}>
          <div className="space-y-5">
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {canAddQuestions ? 'Question Management' : 'Select Question Folder'}
              </h2>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {canAddQuestions
                  ? 'This is the final selected folder. Use one button to open the add-question page, then choose manual or screenshot inside that page.'
                  : 'Choose category, then subcategory, then folder. Question add button will appear only after final selection.'}
              </p>
            </div>

            <div className={`grid gap-4 ${canAddQuestions ? 'md:grid-cols-[1fr_auto]' : ''}`}>
              <div className={`rounded-3xl border p-5 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Selected path</div>
                <div className={`mt-3 text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {path.length === 0 ? 'No category selected yet' : path.map((item) => item.name).join(' / ')}
                </div>
                <div className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {canAddQuestions ? 'This folder will receive new questions directly.' : 'Go deeper until the final test paper folder is selected.'}
                </div>
              </div>

              {canAddQuestions && (
                <div className="flex flex-wrap gap-3 md:w-[240px] md:flex-col">
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to add question in "${selectedNode?.name}"?`)) {
                        setQuestionMode('manual');
                        setQuestionModalOpen(true);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add question
                  </button>
                  <button onClick={importPlaceholder} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                    <Import className="h-4 w-4" />
                    Import
                  </button>
                  <button onClick={exportPlaceholder} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              )}
            </div>

            <div className={`rounded-3xl border p-5 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
              <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>How this page works</div>
              <div className={`mt-3 grid gap-3 md:grid-cols-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className={`rounded-2xl px-4 py-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  1. Choose category
                </div>
                <div className={`rounded-2xl px-4 py-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  2. Choose subcategory and test folder
                </div>
                <div className={`rounded-2xl px-4 py-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  3. Click add question and choose method inside
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <AddQuestionModal
        isOpen={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        onSuccess={() => toast.success('Question saved')}
        examId={linkedExam?.id}
        examTitle={linkedExam?.title}
        categoryNodeId={selectedNode?.entity === 'node' ? selectedNode.id : undefined}
        linkedLabel={selectedNode ? `${selectedNode.name} selected` : undefined}
        initialMode={questionMode}
      />

      {categoryModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4">
          <div className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} w-full max-w-lg rounded-3xl border p-6 shadow-2xl`}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{editingCategory ? 'Edit category' : 'Add category'}</h3>
              <button onClick={() => setCategoryModalOpen(false)} className="rounded-xl p-2 text-slate-500"><Trash2 className="h-4 w-4" /></button>
            </div>
            <form onSubmit={saveCategory} className="space-y-4">
              <input value={categoryForm.name} onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Category name" className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
              <textarea value={categoryForm.description} onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" rows={3} className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setCategoryModalOpen(false)} className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>
                <button type="submit" className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {nodeModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4">
          <div className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} w-full max-w-lg rounded-3xl border p-6 shadow-2xl`}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{editingNode ? 'Edit folder' : path.length === 1 ? 'Add subcategory' : 'Add folder'}</h3>
              <button onClick={() => setNodeModalOpen(false)} className="rounded-xl p-2 text-slate-500"><Pencil className="h-4 w-4" /></button>
            </div>
            <form onSubmit={saveNode} className="space-y-4">
              <input value={nodeName} onChange={(e) => setNodeName(e.target.value)} placeholder="Folder name" className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setNodeModalOpen(false)} className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>
                <button type="submit" className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
