import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { Plus, Trash2, Edit2, Folder, Tag } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export function CategoryManagement() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '📁',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;
      
      if (data && data.length > 0) {
        setCategories(data);
      } else {
        // No categories exist, create defaults
        const defaultCategories = [
          { name: 'Group-D', description: 'Group D Railway Exams', icon: '📚', is_active: true, sort_order: 1 },
          { name: 'ALP', description: 'Assistant Loco Pilot', icon: '🚂', is_active: true, sort_order: 2 },
          { name: 'Technician', description: 'Technical Posts', icon: '🔧', is_active: true, sort_order: 3 },
          { name: 'BSED', description: 'BSED Exams', icon: '📖', is_active: true, sort_order: 4 },
          { name: 'NTPC', description: 'Non-Technical Popular Categories', icon: '💼', is_active: true, sort_order: 5 },
          { name: 'Technical', description: 'Technical Trades', icon: '⚙️', is_active: true, sort_order: 6 }
        ];

        const { data: inserted, error: insertError } = await supabase
          .from('categories')
          .insert(defaultCategories)
          .select();

        if (insertError) throw insertError;
        if (inserted) setCategories(inserted);
      }
    } catch (err: any) {
      console.error('Error loading categories:', err);
      setError('Failed to load categories: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const { error: updateError } = await supabase
          .from('categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description || null,
            icon: categoryForm.icon,
            is_active: categoryForm.is_active,
            sort_order: categoryForm.sort_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id);

        if (updateError) throw updateError;
        setMessage('Category updated successfully');
      } else {
        // Create new category
        const { data: newCategory, error: insertError } = await supabase
          .from('categories')
          .insert({
            name: categoryForm.name,
            description: categoryForm.description || null,
            icon: categoryForm.icon,
            is_active: categoryForm.is_active,
            sort_order: categoryForm.sort_order
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newCategory) {
          setCategories([...categories, newCategory]);
          setMessage('Category added successfully');
        }
      }
      
      resetCategoryForm();
      loadCategories();
    } catch (err: any) {
      console.error('Error saving category:', err);
      setError('Failed to save category: ' + (err.message || 'Unknown error'));
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setMessage('Category deleted successfully');
      loadCategories();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category: ' + (err.message || 'Unknown error'));
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      icon: '📁',
      is_active: true,
      sort_order: categories.length + 1
    });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const editCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '📁',
      is_active: category.is_active,
      sort_order: category.sort_order
    });
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
            <Folder className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            Category Management
          </h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1`}>Manage exam categories</p>
        </div>
        <button
          onClick={() => setShowCategoryForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-semibold"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {message && (
        <div className={`${isDark ? 'bg-green-900/40 border-green-600 text-green-200' : 'bg-green-50 border-green-200 text-green-700'} px-4 py-3 rounded-xl border`}>
          {message}
        </div>
      )}
      {error && (
        <div className={`${isDark ? 'bg-red-900/40 border-red-600 text-red-200' : 'bg-red-50 border-red-200 text-red-700'} px-4 py-3 rounded-xl border`}>
          {error}
        </div>
      )}

      {/* Categories Section */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-6 ${isDark ? '' : 'shadow-lg'}`}>
        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Exam Categories</h3>
        
        {loading ? (
          <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'} py-8`}>Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'} py-8`}>No categories found. Add your first category!</div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div 
                key={category.id} 
                className={`${isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg p-4 flex items-center justify-between transition`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${category.is_active ? (isDark ? 'bg-blue-600/20' : 'bg-blue-100') : (isDark ? 'bg-gray-600/20' : 'bg-gray-200')}`}>
                    {category.icon || '📁'}
                  </div>
                  <div>
                    <h4 className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold`}>{category.name}</h4>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>{category.description || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    category.is_active 
                      ? (isDark ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-700')
                      : (isDark ? 'bg-gray-600/20 text-gray-400' : 'bg-gray-200 text-gray-600')
                  }`}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => editCategory(category)}
                    className={`p-2 ${isDark ? 'text-blue-400 hover:bg-blue-600/10' : 'text-blue-600 hover:bg-blue-100'} rounded-lg transition`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className={`p-2 ${isDark ? 'text-red-400 hover:bg-red-600/10' : 'text-red-600 hover:bg-red-100'} rounded-lg transition`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl max-w-md w-full p-6 border`}>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Category Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  }`}
                  placeholder="e.g., Group-D"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  }`}
                  rows={3}
                  placeholder="Category description..."
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Icon (Emoji)</label>
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  }`}
                  placeholder="e.g., 📚"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={categoryForm.is_active}
                  onChange={(e) => setCategoryForm({...categoryForm, is_active: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Active</label>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Sort Order</label>
                <input
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm({...categoryForm, sort_order: parseInt(e.target.value) || 0})}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  }`}
                  min="0"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveCategory}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-semibold"
              >
                {editingCategory ? 'Update' : 'Create'}
              </button>
              <button
                onClick={resetCategoryForm}
                className={`flex-1 py-2 rounded-lg transition font-semibold ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
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