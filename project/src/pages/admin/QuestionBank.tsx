import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion, Question } from '../../lib/firestore';
import { Plus, Edit, Trash2, Upload, Search, Filter, Download, RefreshCw, ChevronDown, ChevronUp, Eye, Video, Image, Tag, BookOpen, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { parseCSV, downloadCSVTemplate, readFileAsText, toFirestoreQuestion, ParsedQuestion } from '../../lib/csvParser';
import { uploadImage, validateImage, createPreviewUrl, revokePreviewUrl } from '../../lib/imageUtils';
import { renderLatex, containsLatex, useLatex } from '../../lib/katexUtils';
import { formatDate } from '../../lib/dateUtils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

type Difficulty = 'easy' | 'medium' | 'hard';

interface EnhancedQuestion extends Question {
  topic?: string;
  subtopic?: string;
  difficulty?: Difficulty;
  tags?: string[];
  image_url?: string;
  option_images?: string[];
  video_explanation_url?: string;
  is_draft?: boolean;
  version?: number;
}

export function QuestionBank() {
  const { profile } = useAuth();
  const categories = ['Group-D', 'ALP', 'Technician', 'BSED', 'NTPC', 'Technical'];
  const subjects = ['Maths', 'Reasoning', 'Science', 'GK'];
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  const [questions, setQuestions] = useState<EnhancedQuestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALP');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'subject' | 'difficulty'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bulk import states
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: number } | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    subject: 'Maths' as 'Maths' | 'Reasoning' | 'GK' | 'Science',
    topic: '',
    subtopic: '',
    question_text: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_answer: 0,
    explanation: '',
    video_explanation_url: '',
    difficulty: '' as Difficulty | '',
    tags: '',
    marks: 1,
    negative_marks: 0,
    is_draft: false,
  });

  // Image states
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string>('');
  const [optionImages, setOptionImages] = useState<(File | null)[]>([null, null, null, null]);
  const [optionImagePreviews, setOptionImagePreviews] = useState<string[]>(['', '', '', '']);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Duplicate check
  const [duplicateWarning, setDuplicateWarning] = useState('');

  useEffect(() => {
    loadQuestions();
  }, [selectedCategory]);

  const loadQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const allQuestions = await getQuestions('');
      setQuestions(allQuestions as EnhancedQuestion[]);
    } catch (error: any) {
      console.error('Error loading questions:', error);
      setError('Failed to load questions. Please check your database connection and try again.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort questions
  const filteredQuestions = questions
    .filter(q => {
      if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedSubject && q.subject !== selectedSubject) {
        return false;
      }
      if (selectedDifficulty && q.difficulty !== selectedDifficulty) {
        return false;
      }
      if (selectedTopic && q.topic && !q.topic.toLowerCase().includes(selectedTopic.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      return sortOrder === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDuplicateWarning('');

    // Check for duplicates
    const isDuplicate = questions.some(q => 
      q.question_text.trim().toLowerCase() === formData.question_text.trim().toLowerCase() && 
      q.id !== editingId
    );
    if (isDuplicate) {
      setDuplicateWarning('This question already exists. Are you sure you want to add a duplicate?');
      return;
    }

    try {
      // Upload images if any
      let imageUrl = '';
      let optionImageUrls: string[] = [];

      setUploadingImages(true);

      if (questionImage) {
        const path = `question-images/${Date.now()}_${questionImage.name}`;
        const result = await uploadImage(questionImage, path);
        imageUrl = result.url;
      }

      for (let i = 0; i < 4; i++) {
        if (optionImages[i]) {
          const path = `option-images/${Date.now()}_opt${i}_${optionImages[i]?.name}`;
          const result = await uploadImage(optionImages[i]!, path);
          optionImageUrls[i] = result.url;
        }
      }

      setUploadingImages(false);

      const questionData = {
        exam_id: 'general',
        subject: formData.subject,
        topic: formData.topic,
        subtopic: formData.subtopic,
        question_text: formData.question_text.trim(),
        options: [formData.option1.trim(), formData.option2.trim(), formData.option3.trim(), formData.option4.trim()],
        option_images: optionImageUrls.length > 0 ? optionImageUrls : undefined,
        image_url: imageUrl || undefined,
        correct_index: formData.correct_answer,
        explanation: formData.explanation.trim(),
        video_explanation_url: formData.video_explanation_url.trim() || undefined,
        difficulty: formData.difficulty || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
        marks: formData.marks,
        negative_marks: formData.negative_marks,
        order: 0,
        is_draft: formData.is_draft,
        version: 1,
        created_by: (profile as any)?.uid,
      };

      if (editingId) {
        await updateQuestion(editingId, questionData);
        setSuccess('Question updated successfully!');
      } else {
        await createQuestion(questionData);
        setSuccess('Question added successfully!');
      }

      setTimeout(() => {
        resetForm();
        loadQuestions();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving question:', error);
      setUploadingImages(false);
      setError(error.message || 'Error saving question.');
    }
  };

  const handleEdit = (question: EnhancedQuestion) => {
    const options = question.options as string[];
    setFormData({
      subject: question.subject as 'Maths' | 'Reasoning' | 'GK' | 'Science',
      topic: question.topic || '',
      subtopic: question.subtopic || '',
      question_text: question.question_text,
      option1: options[0] || '',
      option2: options[1] || '',
      option3: options[2] || '',
      option4: options[3] || '',
      correct_answer: question.correct_index,
      explanation: question.explanation || '',
      video_explanation_url: question.video_explanation_url || '',
      difficulty: question.difficulty || '',
      tags: question.tags?.join(', ') || '',
      marks: question.marks,
      negative_marks: question.negative_marks || 0,
      is_draft: question.is_draft || false,
    });
    setEditingId(question.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteQuestion(id);
      loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      subject: 'Maths',
      topic: '',
      subtopic: '',
      question_text: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correct_answer: 0,
      explanation: '',
      video_explanation_url: '',
      difficulty: '',
      tags: '',
      marks: 1,
      negative_marks: 0,
      is_draft: false,
    });
    setEditingId(null);
    setShowForm(false);
    setQuestionImage(null);
    setQuestionImagePreview('');
    setOptionImages([null, null, null, null]);
    setOptionImagePreviews(['', '', '', '']);
    setDuplicateWarning('');
  };

  // Bulk import handler
  const handleBulkImport = async (file: File) => {
    try {
      setImportProgress(10);
      const text = await readFileAsText(file);
      setImportProgress(30);
      
      const result = parseCSV(text);
      setImportProgress(50);

      if (result.errors.length > 0 && result.questions.length === 0) {
        setError(`Import failed: ${result.errors.map(e => e.message).join(', ')}`);
        setImportProgress(0);
        return;
      }

      // Upload questions
      let successCount = 0;
      for (const question of result.questions) {
        try {
          const questionData = toFirestoreQuestion(question, 'general');
          await createQuestion(questionData as any);
          successCount++;
        } catch (err) {
          console.error('Error importing question:', err);
        }
      }

      setImportResults({ success: successCount, errors: result.errors.length });
      setImportProgress(100);
      loadQuestions();
    } catch (error: any) {
      setError('Error reading file: ' + error.message);
      setImportProgress(0);
    }
  };

  const handleQuestionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImage(file, true);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    setQuestionImage(file);
    const preview = createPreviewUrl(file);
    setQuestionImagePreview(preview);
  };

  const handleOptionImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImage(file, true);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    const newImages = [...optionImages];
    newImages[index] = file;
    setOptionImages(newImages);

    const preview = createPreviewUrl(file);
    const newPreviews = [...optionImagePreviews];
    newPreviews[index] = preview;
    setOptionImagePreviews(newPreviews);
  };

  // Get unique topics for filter
  const uniqueTopics = [...new Set(questions.map(q => q.topic).filter(Boolean))];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Question Bank</h1>
          <p className="text-gray-400">Manage exam questions with advanced features</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Upload className="w-5 h-5" />
            Bulk Import
          </button>
          <button
            onClick={() => downloadCSVTemplate()}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Download className="w-5 h-5" />
            Template
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            Add Question
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              selectedCategory === category
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 hover:bg-gray-700 transition"
          >
            <Filter className="w-5 h-5" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700 grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
              >
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
              >
                <option value="">All Difficulties</option>
                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Topic</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
              >
                <option value="">All Topics</option>
                {uniqueTopics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
              >
                <option value="created_at">Date</option>
                <option value="subject">Subject</option>
                <option value="difficulty">Difficulty</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Total Questions</div>
          <div className="text-2xl font-bold text-white">{questions.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Easy</div>
          <div className="text-2xl font-bold text-green-400">{questions.filter(q => q.difficulty === 'easy').length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Medium</div>
          <div className="text-2xl font-bold text-yellow-400">{questions.filter(q => q.difficulty === 'medium').length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Hard</div>
          <div className="text-2xl font-bold text-red-400">{questions.filter(q => q.difficulty === 'hard').length}</div>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading questions...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No questions found. Add your first question or use bulk import!
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Question</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Subject</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Topic</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Difficulty</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Tags</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredQuestions.map((question) => (
                <tr key={question.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      {question.image_url && (
                        <img src={question.image_url} alt="Question" className="w-12 h-12 object-cover rounded" />
                      )}
                      <div>
                        <div className="text-gray-300 max-w-md truncate">
                          {question.question_text.substring(0, 80)}
                          {question.question_text.length > 80 ? '...' : ''}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {question.video_explanation_url && (
                            <Video className="w-4 h-4 text-red-400" />
                          )}
                          {question.option_images && question.option_images.length > 0 && (
                            <Image className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-purple-900/50 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {question.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {question.topic || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {question.difficulty && (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        question.difficulty === 'easy' ? 'bg-green-900/50 text-green-300 border border-green-500/30' :
                        question.difficulty === 'medium' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30' :
                        'bg-red-900/50 text-red-300 border border-red-500/30'
                      }`}>
                        {question.difficulty}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {question.tags?.slice(0, 2).map((tag, i) => (
                        <span key={i} className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-[10px]">
                          {tag}
                        </span>
                      ))}
                      {question.tags && question.tags.length > 2 && (
                        <span className="text-gray-500 text-[10px]">+{question.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(question)}
                        className="text-blue-400 hover:text-blue-300 p-2"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="text-red-400 hover:text-red-300 p-2"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Question Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 border border-gray-700 my-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Edit Question' : 'Add New Question'}
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
            {duplicateWarning && (
              <div className="bg-yellow-900/40 border border-yellow-600 text-yellow-200 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {duplicateWarning}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value as any })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Marks</label>
                  <input
                    type="number"
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Topic</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g., Algebra"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sub-topic</label>
                  <input
                    type="text"
                    value={formData.subtopic}
                    onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
                    placeholder="e.g., Linear Equations"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Question Image */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Question Image (Optional)</label>
                <div className="flex items-center gap-4">
                  {questionImagePreview && (
                    <img src={questionImagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      {questionImage ? 'Change Image' : 'Upload Image'}
                    </div>
                    <input type="file" accept="image/*" onChange={handleQuestionImageChange} className="hidden" />
                  </label>
                  {questionImagePreview && (
                    <button type="button" onClick={() => { setQuestionImage(null); setQuestionImagePreview(''); }} className="text-red-400 hover:text-red-300">
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Question Text</label>
                <textarea
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Use $...$ for math formulas, e.g., $x^2 + y^2 = z^2$"
                  required
                />
                {containsLatex(formData.question_text) && (
                  <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    LaTeX detected - will be rendered as math formula
                  </div>
                )}
              </div>

              {/* Options with images */}
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-300">Option {num}</label>
                      <label className="cursor-pointer">
                        <Image className="w-4 h-4 text-gray-400 hover:text-white" />
                        <input type="file" accept="image/*" onChange={(e) => handleOptionImageChange(num - 1, e)} className="hidden" />
                      </label>
                    </div>
                    {optionImagePreviews[num - 1] && (
                      <img src={optionImagePreviews[num - 1]} alt={`Option ${num}`} className="w-16 h-16 object-cover rounded mb-2" />
                    )}
                    <input
                      type="text"
                      value={formData[`option${num}` as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [`option${num}`]: e.target.value })}
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Correct Answer</label>
                <select
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({ ...formData, correct_answer: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Option 1</option>
                  <option value={1}>Option 2</option>
                  <option value={2}>Option 3</option>
                  <option value={3}>Option 4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Explanation</label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Video Explanation URL</label>
                  <input
                    type="url"
                    value={formData.video_explanation_url}
                    onChange={(e) => setFormData({ ...formData, video_explanation_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="RRB NTPC 2021, Previous Year"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_draft as boolean}
                    onChange={(e) => setFormData({ ...formData, is_draft: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-300">Save as Draft</span>
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={uploadingImages}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {uploadingImages ? 'Uploading...' : editingId ? 'Update Question' : 'Add Question'}
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

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Bulk Import Questions</h2>
            <div className="mb-6">
              <p className="text-gray-400 mb-4">Upload a CSV file with your questions. Download the template first to see the required format.</p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBulkImport(file);
                }}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600"
              />
              {importProgress > 0 && importProgress < 100 && (
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${importProgress}%` }}></div>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">Importing... {importProgress}%</p>
                </div>
              )}
              {importResults && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <p className="text-green-400">Successfully imported: {importResults.success} questions</p>
                  {importResults.errors > 0 && (
                    <p className="text-yellow-400">Errors: {importResults.errors}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => { setShowBulkImport(false); setImportProgress(0); setImportResults(null); }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}