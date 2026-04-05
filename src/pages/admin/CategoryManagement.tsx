import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Folder, Tag } from 'lucide-react';

// Define types locally since tables don't exist in database yet
type Category = {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type SubCategory = {
  id: string;
  category_id: string;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubCategoryForm, setShowSubCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [useLocalStorage, setUseLocalStorage] = useState(true); // Fallback mode

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    display_name: '',
    description: '',
    icon: 'Folder',
    is_active: true,
    sort_order: 0
  });

  const [subCategoryForm, setSubCategoryForm] = useState({
    category_id: '',
    name: '',
    display_name: '',
    description: '',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Use localStorage fallback since database tables don't exist yet
      const storedCategories = localStorage.getItem('exam_categories');
      const storedSubCategories = localStorage.getItem('exam_subcategories');
      
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      } else {
        // Default categories
        const defaultCategories = [
          { id: '1', name: 'Group-D', display_name: 'Group D', description: 'Group D Railway Exams', icon: 'Users', is_active: true, sort_order: 1, created_at: new Date().toISOString() },
          { id: '2', name: 'ALP', display_name: 'ALP', description: 'Assistant Loco Pilot', icon: 'Train', is_active: true, sort_order: 2, created_at: new Date().toISOString() },
          { id: '3', name: 'Technician', display_name: 'Technician', description: 'Technical Posts', icon: 'Wrench', is_active: true, sort_order: 3, created_at: new Date().toISOString() },
          { id: '4', name: 'BSED', display_name: 'BSED', description: 'BSED Exams', icon: 'Book', is_active: true, sort_order: 4, created_at: new Date().toISOString() },
          { id: '5', name: 'NTPC', display_name: 'NTPC', description: 'Non-Technical Popular Categories', icon: 'Clock', is_active: true, sort_order: 5, created_at: new Date().toISOString() },
          { id: '6', name: 'Technical', display_name: 'Technical (Electrician/Fitter/Welder)', description: 'Technical Trades', icon: 'Zap', is_active: true, sort_order: 6, created_at: new Date().toISOString() }
        ];
        setCategories(defaultCategories);
        localStorage.setItem('exam_categories', JSON.stringify(defaultCategories));
      }

      if (storedSubCategories) {
        setSubCategories(JSON.parse(storedSubCategories));
      } else {
        // Default subcategories
        const defaultSubCategories = [
          { id: '1', category_id: '1', name: 'Math', display_name: 'Math Question', description: 'Mathematics Questions', is_active: true, sort_order: 1, created_at: new Date().toISOString() },
          { id: '2', category_id: '1', name: 'Reasoning', display_name: 'Reasoning Question', description: 'Reasoning Questions', is_active: true, sort_order: 2, created_at: new Date().toISOString() },
          { id: '3', category_id: '1', name: 'Science', display_name: 'Science Question', description: 'Science Questions', is_active: true, sort_order: 3, created_at: new Date().toISOString() },
          { id: '4', category_id: '1', name: 'GK', display_name: 'General Knowledge', description: 'General Knowledge', is_active: true, sort_order: 4, created_at: new Date().toISOString() }
        ];
        setSubCategories(defaultSubCategories);
        localStorage.setItem('exam_subcategories', JSON.stringify(defaultSubCategories));
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const saveCategory = async () => {
    try {
      let updatedCategories;
      if (editingCategory) {
        updatedCategories = categories.map(cat => 
          cat.id === editingCategory.id ? { ...categoryForm, id: editingCategory.id } : cat
        );
        setMessage('Category updated successfully');
      } else {
        const newCategory = {
          ...categoryForm,
          id: Date.now().toString(),
          created_at: new Date().toISOString()
        };
        updatedCategories = [...categories, newCategory];
        setMessage('Category added successfully');
      }
      
      setCategories(updatedCategories);
      localStorage.setItem('exam_categories', JSON.stringify(updatedCategories));
      resetCategoryForm();
    } catch (err: any) {
      console.error(err);
      setError('Failed to save category');
    }
  };

  const saveSubCategory = async () => {
    try {
      let updatedSubCategories;
      if (editingSubCategory) {
        updatedSubCategories = subCategories.map(sub => 
          sub.id === editingSubCategory.id ? { ...subCategoryForm, id: editingSubCategory.id } : sub
        );
        setMessage('Subcategory updated successfully');
      } else {
        const newSubCategory = {
          ...subCategoryForm,
          id: Date.now().toString(),
          created_at: new Date().toISOString()
        };
        updatedSubCategories = [...subCategories, newSubCategory];
        setMessage('Subcategory added successfully');
      }
      
      setSubCategories(updatedSubCategories);
      localStorage.setItem('exam_subcategories', JSON.stringify(updatedSubCategories));
      resetSubCategoryForm();
    } catch (err: any) {
      console.error(err);
      setError('Failed to save subcategory');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const updatedCategories = categories.filter(cat => cat.id !== id);
      setCategories(updatedCategories);
      localStorage.setItem('exam_categories', JSON.stringify(updatedCategories));
      setMessage('Category deleted successfully');
    } catch (err) {
      console.error(err);
      setError('Failed to delete category');
    }
  };

  const deleteSubCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    try {
      const updatedSubCategories = subCategories.filter(sub => sub.id !== id);
      setSubCategories(updatedSubCategories);
      localStorage.setItem('exam_subcategories', JSON.stringify(updatedSubCategories));
      setMessage('Subcategory deleted successfully');
    } catch (err) {
      console.error(err);
      setError('Failed to delete subcategory');
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      display_name: '',
      description: '',
      icon: 'Folder',
      is_active: true,
      sort_order: 0
    });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const resetSubCategoryForm = () => {
    setSubCategoryForm({
      category_id: '',
      name: '',
      display_name: '',
      description: '',
      is_active: true,
      sort_order: 0
    });
    setEditingSubCategory(null);
    setShowSubCategoryForm(false);
  };

  const editCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      display_name: category.display_name,
      description: category.description || '',
      icon: category.icon || 'Folder',
      is_active: category.is_active,
      sort_order: category.sort_order
    });
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const editSubCategory = (subCategory: SubCategory) => {
    setSubCategoryForm({
      category_id: subCategory.category_id,
      name: subCategory.name,
      display_name: subCategory.display_name,
      description: subCategory.description || '',
      is_active: subCategory.is_active,
      sort_order: subCategory.sort_order
    });
    setEditingSubCategory(subCategory);
    setShowSubCategoryForm(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Folder className="w-8 h-8 text-blue-400" />
            Category Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">Manage exam categories and subcategories</p>
          <div className="mt-2">
            <span className="text-xs text-amber-400 bg-amber-600/20 px-2 py-1 rounded">
              Using local storage (Database tables not created yet)
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
          <button
            onClick={() => setShowSubCategoryForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Tag className="w-4 h-4" /> Add Subcategory
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-3 rounded-xl">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Categories Section */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Exam Categories</h3>
        
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading categories...</div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.is_active ? 'bg-blue-600/20' : 'bg-gray-600/20'}`}>
                    <Folder className={`w-5 h-5 ${category.is_active ? 'text-blue-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">{category.display_name}</h4>
                    <p className="text-gray-400 text-sm">{category.description}</p>
                    <p className="text-gray-500 text-xs">Code: {category.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${category.is_active ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'}`}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => editCategory(category)}
                    className="p-2 text-blue-400 hover:bg-blue-600/10 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="p-2 text-red-400 hover:bg-red-600/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subcategories Section */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Subcategories</h3>
        
        <div className="space-y-3">
          {subCategories.map((subCategory) => {
            const category = categories.find(c => c.id === subCategory.category_id);
            return (
              <div key={subCategory.id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${subCategory.is_active ? 'bg-green-600/20' : 'bg-gray-600/20'}`}>
                    <Tag className={`w-5 h-5 ${subCategory.is_active ? 'text-green-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">{subCategory.display_name}</h4>
                    <p className="text-gray-400 text-sm">{subCategory.description}</p>
                    <p className="text-gray-500 text-xs">Category: {category?.display_name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${subCategory.is_active ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'}`}>
                    {subCategory.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => editSubCategory(subCategory)}
                    className="p-2 text-blue-400 hover:bg-blue-600/10 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteSubCategory(subCategory.id)}
                    className="p-2 text-red-400 hover:bg-red-600/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={categoryForm.display_name}
                  onChange={(e) => setCategoryForm({...categoryForm, display_name: e.target.value})}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
                  placeholder="e.g., Group D"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Code Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
                  placeholder="e.g., Group-D"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
                  rows={3}
                  placeholder="Category description..."
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={categoryForm.is_active}
                  onChange={(e) => setCategoryForm({...categoryForm, is_active: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label className="text-sm text-gray-300">Active</label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveCategory}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
              >
                {editingCategory ? 'Update' : 'Create'}
              </button>
              <button
                onClick={resetCategoryForm}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Form Modal */}
      {showSubCategoryForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingSubCategory ? 'Edit Subcategory' : 'Add New Subcategory'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Parent Category</label>
                <select
                  value={subCategoryForm.category_id}
                  onChange={(e) => setSubCategoryForm({...subCategoryForm, category_id: e.target.value})}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={subCategoryForm.display_name}
                  onChange={(e) => setSubCategoryForm({...subCategoryForm, display_name: e.target.value})}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
                  placeholder="e.g., Math Question"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Code Name</label>
                <input
                  type="text"
                  value={subCategoryForm.name}
                  onChange={(e) => setSubCategoryForm({...subCategoryForm, name: e.target.value})}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
                  placeholder="e.g., Math"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={subCategoryForm.description}
                  onChange={(e) => setSubCategoryForm({...subCategoryForm, description: e.target.value})}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
                  rows={3}
                  placeholder="Subcategory description..."
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={subCategoryForm.is_active}
                  onChange={(e) => setSubCategoryForm({...subCategoryForm, is_active: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label className="text-sm text-gray-300">Active</label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveSubCategory}
                disabled={!subCategoryForm.category_id}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition disabled:opacity-50"
              >
                {editingSubCategory ? 'Update' : 'Create'}
              </button>
              <button
                onClick={resetSubCategoryForm}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
