import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Link as LinkIcon, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Category,
  CategoryNode,
  CategoryLink,
  deleteCategoryLink,
  getCategories,
  getCategoryLinks,
  upsertCategoryLink,
} from '../../lib/firestore';

export function ManageLinks() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [links, setLinks] = useState<CategoryLink[]>([]);
  const [formData, setFormData] = useState({
    title: 'WhatsApp Channel',
    url: '',
  });

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;
    void loadLinks();
  }, [selectedCategoryId]);

  const levelLabel = useMemo(() => {
    if (!selectedCategoryId) return 'Choose category';
    return categories.find(c => c.id === selectedCategoryId)?.name || 'Category';
  }, [selectedCategoryId, categories]);

  const loadCategories = async () => {
    const data = await getCategories();
    setCategories(data);
    if (data[0]) setSelectedCategoryId(data[0].id);
  };


  const loadLinks = async () => {
    const data = await getCategoryLinks(selectedCategoryId, null);
    setLinks(data);
    setFormData((prev) => ({
      ...prev,
      url: data[0]?.url || '',
      title: data[0]?.title || 'WhatsApp Channel',
    }));
  };

  const handleSave = async () => {
    if (!selectedCategoryId || !formData.url.trim()) {
      toast.error('Choose category and enter a valid link');
      return;
    }

    await upsertCategoryLink({
      category_id: selectedCategoryId,
      category_node_id: null,
      type: 'whatsapp_channel',
      title: formData.title.trim() || 'WhatsApp Channel',
      url: formData.url.trim(),
      is_active: true,
    });

    toast.success('Link saved');
    await loadLinks();
  };

  const handleDelete = async (link: CategoryLink) => {
    if (!confirm('Delete this saved link?')) return;
    await deleteCategoryLink(link.id);
    toast.success('Link removed');
    await loadLinks();
  };

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6">
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Manage Links</h1>
        <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Save WhatsApp or channel links for each category or folder. Premium users will see the correct link in that section.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border p-5 shadow-sm`}>
          <div className="mb-4">
            <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </aside>

        <main className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border p-6 shadow-sm`}>
          <div className="mb-5">
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{levelLabel}</h2>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              The link saved here will appear to premium users only.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <label className="block">
                <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Link title</span>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                />
              </label>
              <label className="block">
                <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>WhatsApp / channel link</span>
                <input
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://chat.whatsapp.com/... or channel link"
                  className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                />
              </label>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => void handleSave()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
                <Save className="h-4 w-4" />
                Save link
              </button>
              {formData.url && (
                <a href={formData.url} target="_blank" rel="noreferrer" className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                  <ExternalLink className="h-4 w-4" />
                  Test link
                </a>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h3 className={`mb-3 text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Saved links</h3>
            {links.length === 0 ? (
              <div className={`rounded-2xl border px-4 py-8 text-center text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                No link saved yet for this level.
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => (
                  <div key={link.id} className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="min-w-0">
                      <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <LinkIcon className="h-4 w-4 text-green-500" />
                        {link.title}
                      </div>
                      <div className={`mt-1 truncate text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{link.url}</div>
                    </div>
                    <div className="flex gap-2">
                      <a href={link.url} target="_blank" rel="noreferrer" className={`rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'}`}>
                        Open
                      </a>
                      <button onClick={() => void handleDelete(link)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
