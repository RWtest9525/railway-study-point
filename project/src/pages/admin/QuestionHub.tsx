import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Plus, Settings, Trash2, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from '../../contexts/RouterContext';
import {
  Category,
  CategoryNode,
  createCategory,
  createCategoryNode,
  deleteCategory,
  deleteCategoryNode,
  getCategories,
  getCategoryNodes,
  updateCategory,
  updateCategoryNode,
  Question,
  getQuestionsByCategoryNode,
  deleteQuestion,
} from '../../lib/firestore';
import { AddQuestionModal } from '../../components/AddQuestionModal';
import { ConfirmModal } from '../../components/ConfirmModal';

type QuestionMode = 'manual' | 'screenshot' | 'bulk';
type StepItem = { entity: 'category' | 'node'; id: string; name: string; categoryId: string; is_test_container?: boolean };

export function QuestionHub() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const isDark = theme === 'dark';
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<CategoryNode[]>([]);
  const [path, setPath] = useState<StepItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('admin_questionhub_path');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    sessionStorage.setItem('admin_questionhub_path', JSON.stringify(path));
  }, [path]);
  const [loading, setLoading] = useState(true);
  const [stepLoading, setStepLoading] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionMode, setQuestionMode] = useState<QuestionMode>('manual');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingNode, setEditingNode] = useState<CategoryNode | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#0f766e', iconUrl: '', is_active: true });
  const [nodeName, setNodeName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, isDestructive?: boolean}>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });
  const [viewImageFull, setViewImageFull] = useState<string | null>(null);

  const selectedCategoryId = path.find((item) => item.entity === 'category')?.id || '';
  const selectedNode = path.length > 0 ? path[path.length - 1] : null;
  const parentNode = path.length > 1 ? path[path.length - 2] : null;
  const currentNodeParent = path[path.length - 1]?.entity === 'node' ? path[path.length - 1].id : null;
  
  // A node is a test container if its own is_test_container is true
  const isCurrentPageTestContainer = selectedNode?.is_test_container === true;
  // A node is an actual Test if its parent was a test container
  const isCurrentPageTest = parentNode?.is_test_container === true;

  // We can add questions only if we are inside a test.
  const canAddQuestionHere = isCurrentPageTest;
  const canAddFolderHere = !isCurrentPageTest;

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    void loadStepItems();
    if (selectedNode?.entity === 'node' && isCurrentPageTest) {
      void loadQuestions();
    } else {
      setQuestions([]);
    }
  }, [selectedCategoryId, currentNodeParent, path.length, isCurrentPageTest]);

  const loadQuestions = async () => {
    if (selectedNode?.entity !== 'node') return;
    try {
      const qs = await getQuestionsByCategoryNode(selectedNode.id);
      setQuestions(qs);
    } catch (e) {
      console.error(e);
    }
  };

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
    if (isCurrentPageTestContainer) return 'Add New Test';
    return 'Add Next Folder';
  }, [path.length, isCurrentPageTestContainer]);

  const helperText = useMemo(() => {
    if (path.length === 0) return 'Select a category first.';
    if (path.length === 1) return 'Add sub category here.';
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
        setPath((prev) => prev.map((item) => (item.id === editingNode.id ? { ...item, name: nodeName.trim() } : item)));
        setItems((prev) => prev.map((node) => (node.id === editingNode.id ? { ...node, name: nodeName.trim() } : node)));
        toast.success('Updated');
      } else {
        const duplicateAncestor = path.some((item) => item.name.trim().toLowerCase() === nodeName.trim().toLowerCase());
        if (duplicateAncestor) {
          toast.error('This folder name is already used in the current path');
          return;
        }
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
    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Delete "${category.name}"? This action cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
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
      }
    });
  };

  const removeNode = async (node: CategoryNode) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Folder',
      message: `Delete "${node.name}"? This action cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteCategoryNode(node.id);
          setItems((prev) => prev.filter((item) => item.id !== node.id));
          await loadStepItems();
          toast.success('Folder deleted');
        } catch (error) {
          console.error(error);
          toast.error('Could not delete folder');
        }
      }
    });
  };

  const executeRemoveQuestion = async (q: Question) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Question',
      message: 'Are you sure you want to delete this question forever?',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteQuestion(q.id);
          setQuestions((prev) => prev.filter((item) => item.id !== q.id));
          toast.success('Question deleted');
        } catch (error) {
          console.error(error);
          toast.error('Could not delete question');
        }
      }
    });
  };

  const renderCards = () => {
    if (path.length === 0) {
      return (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
          {categories.map((category) => (
            <ItemCard
              key={category.id}
              title={category.name}
              subtitle={category.description || 'Open category'}
              isDark={isDark}
              onOpen={() => {
                setPath([{ entity: 'category', id: category.id, name: category.name, categoryId: category.id, is_test_container: category.is_test_container }]);
                setItems([]);
              }}
              onEdit={() => openAddCategory(category)}
              onDelete={() => void removeCategory(category)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {/* Child Folders - Only show if we are NOT inside a test */}
        {!isCurrentPageTest && (
          <div className="mb-2">
            {items.length > 0 && <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Folders</h3>}
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
              {items.map((node) => (
                <ItemCard
                  key={node.id}
                  title={node.name}
                  subtitle="Open next page"
                  isDark={isDark}
                  onOpen={() =>
                    setPath((prev) => [
                      ...prev,
                      { entity: 'node', id: node.id, name: node.name, categoryId: selectedCategoryId, is_test_container: node.is_test_container },
                    ])
                  }
                  onEdit={() => openAddNode(node)}
                  onDelete={() => void removeNode(node)}
                  onResult={selectedNode?.is_test_container ? () => {
                    navigate(`/admin/student-analytics?examId=node_${node.id}`);
                  } : undefined}
                  onAddQuestion={selectedNode?.is_test_container ? () => {
                    setPath((prev) => [
                      ...prev,
                      { entity: 'node', id: node.id, name: node.name, categoryId: selectedCategoryId, is_test_container: node.is_test_container },
                    ]);
                    setQuestionMode('manual');
                    setQuestionModalOpen(true);
                  } : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Questions in Folder - Only show if we ARE inside a test */}
        {isCurrentPageTest && (
          <div className="mt-4">
            <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Questions ({questions.length})</h3>
            <div className="grid gap-4">
              {questions.map((q, idx) => (
                <div key={q.id} className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border p-4 gap-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex flex-1 items-center gap-3 overflow-hidden">
                    <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-xl font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      Q{q.order || idx + 1}
                    </div>
                    {q.image_url && (
                      <div className="h-10 w-16 shrink-0 rounded border border-slate-200 overflow-hidden cursor-pointer bg-white" onClick={() => setViewImageFull(q.image_url!)}>
                        <img src={q.image_url} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className={`line-clamp-2 text-sm flex-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {q.image_url ? 'Screenshot Question' : q.question_text}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {q.image_url && (
                      <button
                        onClick={() => setViewImageFull(q.image_url!)}
                        className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition ${isDark ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        View Screenshot
                      </button>
                    )}
                    <button
                      onClick={() => executeRemoveQuestion(q)}
                      className={`rounded-xl p-2 transition flex items-center justify-center ${isDark ? 'bg-red-400/10 text-red-400 hover:bg-red-400/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                      title="Delete Question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <div className={`rounded-xl border border-dashed p-6 text-center text-sm ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                  No questions here yet. Add a question to get started.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${isDark ? 'bg-[#081018]' : 'bg-[#f7fafc]'} min-h-screen p-6`}>
      <div className="mx-auto max-w-5xl">
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
                <h1 className={`mt-1 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{pageTitle === 'Category' ? 'Category / Folders Setup' : pageTitle}</h1>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{helperText}</p>
                {path.length > 0 && !isCurrentPageTest && (
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                    <input
                      type="checkbox"
                      checked={selectedNode?.is_test_container || false}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        try {
                           if (selectedNode?.entity === 'node') {
                             await updateCategoryNode(selectedNode.id, { is_test_container: checked });
                           } else if (selectedNode?.entity === 'category') {
                             await updateCategory(selectedNode.id, { is_test_container: checked });
                           }
                           
                           setPath(prev => {
                             const newPath = [...prev];
                             if (newPath.length > 0) {
                               newPath[newPath.length - 1].is_test_container = checked;
                             }
                             return newPath;
                           });
                           toast.success(checked ? 'Page marked as Test Collection' : 'Page unmarked');
                        } catch (err) { toast.error('Failed to update page settings') }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    This page directly contains test folders
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {canAddQuestionHere && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionMode('manual');
                      setQuestionModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add Question
                  </button>
                </>
              )}
              {canAddFolderHere && (
                <button
                  type="button"
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
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid gap-4">
                {loading || stepLoading ? (
                  <div className={`rounded-3xl border px-5 py-10 text-center text-sm ${isDark ? 'border-slate-700 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    Loading...
                </div>
              ) : (
                renderCards()
              )}
            </div>
          </div>
        </div>
      </div>

      <AddQuestionModal
        isOpen={questionModalOpen}
        onClose={() => {
          setQuestionModalOpen(false);
          if (selectedNode?.entity === 'node') loadQuestions(); // reload questions when closing
        }}
        onSuccess={() => {
          toast.success('Question saved');
          if (selectedNode?.entity === 'node') loadQuestions();
        }}
        categoryId={selectedCategoryId}
        categoryNodeId={selectedNode?.entity === 'node' ? selectedNode.id : undefined}
        linkedLabel={selectedNode?.name}
        initialMode={questionMode}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
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

      {/* Screen Shot Popup Modal */}
      {viewImageFull && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4" onClick={() => setViewImageFull(null)}>
          <button className="absolute top-6 right-6 p-2 text-white/50 hover:text-white rounded-xl bg-black/50 transition-colors" onClick={() => setViewImageFull(null)}>
            <X className="w-6 h-6" />
          </button>
          <img 
            src={viewImageFull} 
            alt="Full Screenshot" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
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
  onAddQuestion,
  onResult,
}: {
  title: string;
  subtitle: string;
  isDark: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddQuestion?: () => void;
  onResult?: () => void;
}) {
  return (
    <div className={`group flex flex-col justify-between overflow-hidden rounded-2xl border transition-all hover:shadow-md ${isDark ? 'border-slate-700 bg-slate-900 hover:border-slate-600' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 p-4 text-left"
      >
        <div className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</div>
        <div className={`mt-1 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</div>
      </button>
      <div className={`flex items-center gap-1 border-t px-2 py-1.5 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'} justify-end`}>
        <button onClick={onEdit} className={`rounded-lg p-1.5 transition ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={onDelete} className={`rounded-lg p-1.5 transition ${isDark ? 'text-red-400 hover:bg-red-500/10 hover:text-red-400' : 'text-red-500 hover:bg-red-50 hover:text-red-600'}`} title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
        {onResult && (
          <button onClick={onResult} className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${isDark ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-600 hover:bg-amber-50'}`}>Result</button>
        )}
      </div>
      {onAddQuestion && (
        <button onClick={onAddQuestion} className="w-full bg-blue-600 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700">Add Question</button>
      )}
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
