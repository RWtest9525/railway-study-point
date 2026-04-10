import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Import, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from '../../contexts/RouterContext';
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

type QuestionMode = 'manual' | 'screenshot' | 'bulk';
type StepItem = { entity: 'category' | 'node'; id: string; name: string; categoryId: string };

export function QuestionHub() {
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<CategoryNode[]>([]);
  const [path, setPath] = useState<StepItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepLoading, setStepLoading] = useState(false);
  const [linkedExam, setLinkedExam] = useState<Exam | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionMode, setQuestionMode] = useState<QuestionMode>('manual');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingNode, setEditingNode] = useState<CategoryNode | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#0f766e', iconUrl: '', is_active: true });
  const [nodeName, setNodeName] = useState('');

  const selectedCategoryId = path.find((item) => item.entity === 'category')?.id || '';
  const selectedNode = path.length > 0 ? path[path.length - 1] : null;
  const currentNodeParent = path[path.length - 1]?.entity === 'node' ? path[path.length - 1].id : null;
  const canCreateExamHere = path.length >= 1;
  const canAddQuestionHere = path.length >= 2;

  useEffect(() => {
    void loadCategories();
    void loadExamContext();
  }, []);

  useEffect(() => {
    void loadStepItems();
  }, [selectedCategoryId, currentNodeParent, path.length]);

  const pageTitle = useMemo(() => {
    if (path.length === 0) return 'Category';
    if (path.length === 1) return path[0].name;
    return path[path.length - 1].name;
  }, [path]);

  const pageBadge = useMemo(() => {
    if (path.length === 0) return 'Category Page';
    if (path.length === 1) return 'Sub Category Page';
    if (path.length === 2) return 'Folder Page';
    return 'Next Folder Page';
  }, [path.length]);

  const addButtonLabel = useMemo(() => {
    if (path.length === 0) return 'Add Category';
    if (path.length === 1) return 'Add Sub Category';
    return 'Add Next Folder';
  }, [path.length]);

  const helperText = useMemo(() => {
    if (path.length === 0) return 'Select a category first.';
    if (path.length === 1) return 'Add sub category here or create exam for this category.';
    return 'Add folders here or open the question page linked to this folder.';
  }, [path.length]);

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

  const loadExamContext = async () => {
    const examId = new URLSearchParams(window.location.search).get('examId');
    if (!examId) return;
    try {
      const exam = await getExam(examId);
      setLinkedExam(exam);
    } catch (error) {
      console.error(error);
    }
  };

  const loadStepItems = async () => {
    if (path.length === 0) {
      setItems([]);
      return;
    }
    setStepLoading(true);
    try {
      const nodes = await getCategoryNodes(selectedCategoryId, currentNodeParent);
      setItems(nodes);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load items');
    } finally {
      setStepLoading(false);
    }
  };

  const openAddCategory = (category?: Category) => {
    setEditingCategory(category || null);
    setCategoryForm({
      name: category?.name || '',
      description: category?.description || '',
      color: category?.color || '#0f766e',
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
      toast.error('Category already exists');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        toast.success('Category updated');
      } else {
        await createCategory({ ...categoryForm, order: categories.length + 1 });
        toast.success('Category created');
      }

      setCategoryModalOpen(false);
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      console.error(error);
      toast.error('Could not save category');
    }
  };

  const saveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      toast.error('Choose category first');
      return;
    }
    if (!nodeName.trim()) {
      toast.error('Enter name');
      return;
    }

    const duplicateNode = items.find(
      (node) =>
        node.id !== editingNode?.id &&
        node.name.trim().toLowerCase() === nodeName.trim().toLowerCase()
    );
    if (duplicateNode) {
      toast.error('This name already exists here');
      return;
    }

    try {
      if (editingNode) {
        await updateCategoryNode(editingNode.id, { name: nodeName.trim() });
        setItems((prev) => prev.map((node) => (node.id === editingNode.id ? { ...node, name: nodeName.trim() } : node)));
        toast.success('Updated');
      } else {
        const createdId = await createCategoryNode({
          category_id: selectedCategoryId,
          parent_id: currentNodeParent,
          name: nodeName.trim(),
          level: path.length,
          order: items.length + 1,
          is_active: true,
        });
        setItems((prev) => [
          ...prev,
          {
            id: createdId,
            category_id: selectedCategoryId,
            parent_id: currentNodeParent,
            name: nodeName.trim(),
            level: path.length,
            order: items.length + 1,
            is_active: true,
            created_at: '',
            updated_at: '',
          },
        ]);
        toast.success('Created');
      }

      setNodeModalOpen(false);
      setNodeName('');
      setEditingNode(null);
      await loadStepItems();
    } catch (error) {
      console.error(error);
      toast.error('Could not save this item');
    }
  };

  const removeCategory = async (category: Category) => {
    if (!confirm(`Delete "${category.name}"?`)) return;
    try {
      await deleteCategory(category.id);
      setPath([]);
      setItems([]);
      await loadCategories();
      toast.success('Category deleted');
    } catch (error) {
      console.error(error);
      toast.error('Could not delete category');
    }
  };

  const removeNode = async (node: CategoryNode) => {
    if (!confirm(`Delete "${node.name}"?`)) return;
    try {
      await deleteCategoryNode(node.id);
      setItems((prev) => prev.filter((item) => item.id !== node.id));
      await loadStepItems();
      toast.success('Item deleted');
    } catch (error) {
      console.error(error);
      toast.error('Could not delete item');
    }
  };

  const renderCards = () => {
    if (path.length === 0) {
      return categories.map((category) => (
        <ItemCard
          key={category.id}
          title={category.name}
          subtitle={category.description || 'Open category'}
          isDark={isDark}
          onOpen={() => {
            setPath([{ entity: 'category', id: category.id, name: category.name, categoryId: category.id }]);
            setItems([]);
          }}
          onEdit={() => openAddCategory(category)}
          onDelete={() => void removeCategory(category)}
        />
      ));
    }

    return items.map((node) => (
      <ItemCard
        key={node.id}
        title={node.name}
        subtitle="Open next page"
        isDark={isDark}
        onOpen={() =>
          setPath((prev) => [
            ...prev,
            { entity: 'node', id: node.id, name: node.name, categoryId: selectedCategoryId },
          ])
        }
        onEdit={() => openAddNode(node)}
        onDelete={() => void removeNode(node)}
      />
    ));
  };

  return (
    <div className={`${isDark ? 'bg-[#081018]' : 'bg-[#f7fafc]'} min-h-screen p-6`}>
      <div className="mx-auto max-w-5xl">
        {linkedExam && (
          <div className={`${isDark ? 'border-teal-500/30 bg-teal-500/10 text-teal-100' : 'border-teal-200 bg-teal-50 text-teal-700'} mb-5 rounded-3xl border px-5 py-4`}>
            Linked exam: <span className="font-semibold">{linkedExam.title}</span>
          </div>
        )}

        <div className={`${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'} rounded-[32px] border shadow-sm`}>
          <div className="flex flex-col gap-4 border-b border-inherit px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (path.length === 0) return;
                  setPath((prev) => prev.slice(0, -1));
                  setItems([]);
                }}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${isDark ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'}`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {pageBadge}
                </div>
                <h1 className={`mt-1 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{pageTitle}</h1>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{helperText}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (path.length === 0) {
                    openAddCategory();
                  } else {
                    openAddNode();
                  }
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                {addButtonLabel}
              </button>
            </div>
          </div>

          <div className="px-6 py-5">
            {path.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {path.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setPath(path.slice(0, index + 1));
                      setItems([]);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${index === path.length - 1 ? 'bg-teal-600 text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-4">
              {loading || stepLoading ? (
                <div className={`rounded-3xl border px-5 py-10 text-center text-sm ${isDark ? 'border-slate-700 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  Loading...
                </div>
              ) : (
                renderCards()
              )}
            </div>

            {path.length > 0 && items.length === 0 && !loading && !stepLoading && (
              <div className={`rounded-3xl border px-5 py-10 text-center text-sm ${isDark ? 'border-slate-700 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                No child folders here yet. You can add a new one from the top button.
              </div>
            )}

            {path.length > 0 && (
              <div className="mt-5 space-y-5">
                <div className={`rounded-3xl border p-5 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                  <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Current Selection</div>
                  <div className={`mt-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedNode?.name}</div>
                  <div className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Use the buttons below for this selected field only.
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {canCreateExamHere && (
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/exams?categoryId=${selectedCategoryId}`)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Create Exam Here
                    </button>
                  )}
                  {canAddQuestionHere && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Add question inside "${selectedNode?.name}"?`)) {
                        setQuestionMode('manual');
                        setQuestionModalOpen(true);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add Question
                  </button>
                  )}
                  <button type="button" onClick={() => toast('Import hook is ready here.')} className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                    <Import className="h-4 w-4" />
                    Import
                  </button>
                  <button type="button" onClick={() => toast('Export hook is ready here.')} className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddQuestionModal
        isOpen={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        onSuccess={() => toast.success('Question saved')}
        examId={linkedExam?.id}
        examTitle={linkedExam?.title}
        categoryNodeId={selectedNode?.entity === 'node' ? selectedNode.id : undefined}
        linkedLabel={selectedNode?.name}
        initialMode={questionMode}
      />

      {categoryModalOpen && (
        <ModalShell isDark={isDark} title={editingCategory ? 'Edit Category' : 'Add Category'} onClose={() => setCategoryModalOpen(false)}>
          <form onSubmit={saveCategory} className="space-y-4">
            <input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter title"
              className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
            />
            <button type="submit" className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white">Submit</button>
          </form>
        </ModalShell>
      )}

      {nodeModalOpen && (
        <ModalShell isDark={isDark} title={editingNode ? 'Edit Item' : addButtonLabel} onClose={() => setNodeModalOpen(false)}>
          <form onSubmit={saveNode} className="space-y-4">
            <input
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              placeholder="Enter title"
              className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
            />
            <button type="submit" className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white">Submit</button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

function ItemCard({
  title,
  subtitle,
  isDark,
  onOpen,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  isDark: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`rounded-[28px] border p-4 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'}`}>
      <button
        type="button"
        onClick={onOpen}
        className={`w-full rounded-[24px] border-2 px-5 py-6 text-left transition ${
          isDark
            ? 'border-slate-700 bg-slate-900 hover:border-teal-500'
            : 'border-slate-300 bg-white hover:border-teal-500'
        }`}
      >
        <div className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</div>
        <div className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</div>
      </button>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs ${
            isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-700'
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs ${
            isDark ? 'border-red-500/40 text-red-300' : 'border-red-300 text-red-600'
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

function ModalShell({
  isDark,
  title,
  onClose,
  children,
}: {
  isDark: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4">
      <div className={`${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'} w-full max-w-lg rounded-[28px] border p-6 shadow-2xl`}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
