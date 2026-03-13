import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, Loader2, Image, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { tutorialService } from '../../services/tutorial.service';
import { Tutorial } from '../../types';
import RichTextEditor from '../blog/RichTextEditor';
import { sanitizeHtml } from '../../utils/sanitize';

interface TutorialManagementProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

type ViewMode = 'list' | 'create' | 'edit';

const CATEGORY_SUGGESTIONS = ['Getting Started', 'Dashboard', 'Attendance', 'Leave', 'Employees', 'Organization', 'Performance', 'Reports', 'Settings', 'Subscription', 'General'];

// Preferred category order for auto-assign
const CATEGORY_ORDER = [
  'Getting Started', 'Dashboard', 'Attendance', 'Leave', 'Employees',
  'Organization', 'Performance', 'Reports', 'Settings', 'Subscription', 'General',
];

const generateSlug = (title: string): string => {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/(^-|-$)/g, '');
};

const TutorialManagement: React.FC<TutorialManagementProps> = ({ onMessage }) => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
    authorName: '',
    coverImage: null as File | null,
    displayOrder: 0,
    parentId: '',
    category: '',
  });

  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    loadTutorials();
  }, []);

  const loadTutorials = async () => {
    setIsLoading(true);
    const data = await tutorialService.getAllTutorials();
    setTutorials(data);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      status: 'DRAFT',
      authorName: '',
      coverImage: null,
      displayOrder: 0,
      parentId: '',
      category: '',
    });
    setCoverPreview(null);
    setEditingTutorial(null);
    setShowPreview(false);
  };

  const openCreateMode = () => {
    resetForm();
    setViewMode('create');
  };

  const openEditMode = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setFormData({
      title: tutorial.title,
      slug: tutorial.slug,
      excerpt: tutorial.excerpt,
      content: tutorial.content,
      status: tutorial.status,
      authorName: tutorial.authorName,
      coverImage: null,
      displayOrder: tutorial.displayOrder,
      parentId: tutorial.parentId,
      category: tutorial.category,
    });
    setCoverPreview(tutorial.coverImage || null);
    setViewMode('edit');
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: viewMode === 'create' ? generateSlug(title) : prev.slug,
    }));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, coverImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      onMessage({ type: 'error', text: 'Title is required' });
      return;
    }
    if (!formData.slug.trim()) {
      onMessage({ type: 'error', text: 'Slug is required' });
      return;
    }

    setIsSaving(true);

    if (viewMode === 'create') {
      const result = await tutorialService.createTutorial({
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        excerpt: formData.excerpt,
        coverImage: formData.coverImage,
        status: formData.status,
        authorName: formData.authorName,
        displayOrder: formData.displayOrder,
        parentId: formData.parentId,
        category: formData.category,
      });
      if (result.success) {
        onMessage({ type: 'success', text: result.message });
        resetForm();
        setViewMode('list');
        await loadTutorials();
      } else {
        onMessage({ type: 'error', text: result.message });
      }
    } else if (viewMode === 'edit' && editingTutorial) {
      const result = await tutorialService.updateTutorial(editingTutorial.id, {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        excerpt: formData.excerpt,
        coverImage: formData.coverImage,
        status: formData.status,
        authorName: formData.authorName,
        displayOrder: formData.displayOrder,
        parentId: formData.parentId,
        category: formData.category,
      });
      if (result.success) {
        onMessage({ type: 'success', text: result.message });
        resetForm();
        setViewMode('list');
        await loadTutorials();
      } else {
        onMessage({ type: 'error', text: result.message });
      }
    }

    setIsSaving(false);
  };

  const handleDelete = async (tutorial: Tutorial) => {
    if (!window.confirm(`Are you sure you want to delete "${tutorial.title}"? This action cannot be undone.`)) {
      return;
    }
    const result = await tutorialService.deleteTutorial(tutorial.id);
    if (result.success) {
      onMessage({ type: 'success', text: result.message });
      await loadTutorials();
    } else {
      onMessage({ type: 'error', text: result.message });
    }
  };

  const handleTogglePublish = async (tutorial: Tutorial) => {
    const newStatus = tutorial.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const result = await tutorialService.updateTutorial(tutorial.id, {
      status: newStatus,
      publishedAt: newStatus === 'PUBLISHED' ? new Date().toISOString() : '',
    });
    if (result.success) {
      onMessage({ type: 'success', text: `Tutorial ${newStatus === 'PUBLISHED' ? 'published' : 'unpublished'} successfully` });
      await loadTutorials();
    } else {
      onMessage({ type: 'error', text: result.message });
    }
  };

  const handleAutoAssignOrder = async () => {
    if (!window.confirm('This will auto-assign display_order values to all tutorials based on category order. Continue?')) return;
    setIsLoading(true);
    try {
      // Sort tutorials by category order, then alphabetically within each category
      const sorted = [...tutorials].sort((a, b) => {
        const catA = a.category || 'General';
        const catB = b.category || 'General';
        const idxA = CATEGORY_ORDER.indexOf(catA);
        const idxB = CATEGORY_ORDER.indexOf(catB);
        const orderA = idxA === -1 ? 999 : idxA;
        const orderB = idxB === -1 ? 999 : idxB;
        if (orderA !== orderB) return orderA - orderB;
        // Within same category: parents first, then children
        if (!a.parentId && b.parentId) return -1;
        if (a.parentId && !b.parentId) return 1;
        // Same level: by current displayOrder, then alphabetically
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return a.title.localeCompare(b.title);
      });

      // Assign order values with gaps of 10 between categories
      let currentCat = '';
      let catBase = 0;
      let withinCat = 0;
      for (const tutorial of sorted) {
        const cat = tutorial.category || 'General';
        if (cat !== currentCat) {
          currentCat = cat;
          catBase += 10;
          withinCat = 0;
        }
        withinCat++;
        const newOrder = catBase + withinCat;
        if (tutorial.displayOrder !== newOrder) {
          await tutorialService.updateTutorial(tutorial.id, { displayOrder: newOrder });
        }
      }
      onMessage({ type: 'success', text: 'Display order auto-assigned successfully!' });
      await loadTutorials();
    } catch (e: any) {
      onMessage({ type: 'error', text: e?.message || 'Failed to auto-assign order' });
    }
    setIsLoading(false);
  };

  // Get top-level tutorials for parent dropdown (exclude self when editing)
  const topLevelTutorials = tutorials.filter(t => !t.parentId && t.id !== editingTutorial?.id);

  // Get parent title helper
  const getParentTitle = (parentId: string) => {
    const parent = tutorials.find(t => t.id === parentId);
    return parent ? parent.title : '-';
  };

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Tutorials</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoAssignOrder}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-all"
              title="Auto-assign display order based on category"
            >
              <ArrowUpDown size={16} /> Auto-Order
            </button>
            <button
              onClick={openCreateMode}
              className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary-hover transition-all shadow-lg"
            >
              <Plus size={18} /> New Tutorial
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">
            <Loader2 className="animate-spin mx-auto mb-2" size={32} />
            Loading tutorials...
          </div>
        ) : tutorials.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <Edit size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">No tutorials yet</p>
            <p className="text-slate-400 text-sm mt-1">Create your first tutorial to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Title</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Parent</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order</th>
                    <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tutorials.map(tutorial => (
                    <tr key={tutorial.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {tutorial.coverImage ? (
                            <img src={tutorial.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Image size={20} className="text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{tutorial.title}</p>
                            <p className="text-xs text-slate-400">/{tutorial.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-600">{tutorial.category || '-'}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-600">
                          {tutorial.parentId ? getParentTitle(tutorial.parentId) : '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          tutorial.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {tutorial.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-500">{tutorial.displayOrder}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTogglePublish(tutorial)}
                            className={`p-2 rounded-xl transition-all ${
                              tutorial.status === 'PUBLISHED'
                                ? 'hover:bg-amber-100'
                                : 'hover:bg-emerald-100'
                            }`}
                            title={tutorial.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                          >
                            {tutorial.status === 'PUBLISHED' ? (
                              <EyeOff size={18} className="text-amber-600" />
                            ) : (
                              <Eye size={18} className="text-emerald-600" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditMode(tutorial)}
                            className="p-2 hover:bg-blue-100 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit size={18} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(tutorial)}
                            className="p-2 hover:bg-red-100 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // CREATE / EDIT VIEW
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => { resetForm(); setViewMode('list'); }}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft size={20} /> Back to Tutorials
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-all"
          >
            <Eye size={16} /> {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary-hover transition-all shadow-lg disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {viewMode === 'create' ? 'Create Tutorial' : 'Update Tutorial'}
          </button>
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-900">
        {viewMode === 'create' ? 'Create New Tutorial' : `Edit: ${editingTutorial?.title}`}
      </h3>

      {showPreview ? (
        // PREVIEW MODE
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          {coverPreview && (
            <img src={coverPreview} alt="Cover" className="w-full h-64 object-cover rounded-2xl mb-6" />
          )}
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">{formData.title || 'Untitled'}</h1>
          <p className="text-slate-500 mb-6">{formData.authorName && `By ${formData.authorName}`}</p>
          {formData.excerpt && (
            <p className="text-lg text-slate-600 italic mb-6 border-l-4 border-primary pl-4">{formData.excerpt}</p>
          )}
          <div
            className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-primary prose-a:underline prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.content) }}
          />
        </div>
      ) : (
        // EDIT MODE
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
              placeholder="Enter tutorial title..."
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Slug *</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">/guides/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                placeholder="url-friendly-slug"
              />
            </div>
          </div>

          {/* Category & Parent row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
              <input
                type="text"
                list="category-suggestions"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                placeholder="e.g. Attendance, Leave..."
              />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            {/* Parent Tutorial */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Parent Tutorial</label>
              <select
                value={formData.parentId}
                onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
              >
                <option value="">None (Top-level)</option>
                {topLevelTutorials.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Display Order & Author row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Display Order */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Display Order</label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                placeholder="0"
              />
            </div>

            {/* Author Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Author Name</label>
              <input
                type="text"
                value={formData.authorName}
                onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                placeholder="Author name..."
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Excerpt</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 resize-vertical"
              rows={3}
              placeholder="Brief summary of the tutorial..."
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Content</label>
            <RichTextEditor
              value={formData.content}
              onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
              placeholder="Start writing your tutorial..."
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Cover Image</label>
            <div className="flex items-center gap-4">
              {coverPreview && (
                <img src={coverPreview} alt="Cover preview" className="w-24 h-24 rounded-xl object-cover" />
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-all"
                >
                  <Image size={16} /> {coverPreview ? 'Change Image' : 'Upload Image'}
                </button>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormData(prev => ({ ...prev, status: 'DRAFT' }))}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  formData.status === 'DRAFT'
                    ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setFormData(prev => ({ ...prev, status: 'PUBLISHED' }))}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  formData.status === 'PUBLISHED'
                    ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Published
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorialManagement;
