import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { deleteQuestion, getAllQuestions, getQuestions, Question, updateQuestion } from '../../lib/firestore';
import { 
  Search, Filter, Plus, Folder, FileText, Tag, 
  Clock, Eye, Edit, Trash2, ChevronRight, ChevronDown,
  ChevronUp, CheckCircle, XCircle, AlertTriangle,
  Download, Upload, RefreshCw, LayoutList, LayoutGrid,
  Check, X, Calendar, Users, TrendingUp, DollarSign
} from 'lucide-react';
import { AddQuestionModal } from '../../components/AddQuestionModal';
import toast from 'react-hot-toast';

interface EnhancedQuestion extends Question {
  topic?: string;
  subtopic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  image_url?: string;
  option_images?: string[];
  video_explanation_url?: string;
  is_draft?: boolean;
  version?: number;
}

interface Category {
  id: string;
  name: string;
  subjects: Subject[];
}

interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

interface Topic {
  id: string;
  name: string;
}

export function QuestionHub() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [questions, setQuestions] = useState<EnhancedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Get examId from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('examId');
  
  // Navigation State
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  
  // View State
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'created_at' | 'subject' | 'difficulty' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tagsFilter, setTagsFilter] = useState<string>('');
  
  // Selection State
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Categories Structure
  const categories: Category[] = [
    {
      id: 'rrb',
      name: 'RRB Exams',
      subjects: [
        {
          id: 'maths',
          name: 'Mathematics',
          topics: [
            { id: 'algebra', name: 'Algebra' },
            { id: 'geometry', name: 'Geometry' },
            { id: 'trigonometry', name: 'Trigonometry' },
            { id: 'calculus', name: 'Calculus' }
          ]
        },
        {
          id: 'reasoning',
          name: 'Reasoning',
          topics: [
            { id: 'verbal', name: 'Verbal Reasoning' },
            { id: 'non-verbal', name: 'Non-Verbal Reasoning' },
            { id: 'logical', name: 'Logical Reasoning' }
          ]
        },
        {
          id: 'science',
          name: 'General Science',
          topics: [
            { id: 'physics', name: 'Physics' },
            { id: 'chemistry', name: 'Chemistry' },
            { id: 'biology', name: 'Biology' }
          ]
        },
        {
          id: 'gk',
          name: 'General Knowledge',
          topics: [
            { id: 'current-affairs', name: 'Current Affairs' },
            { id: 'history', name: 'History' },
            { id: 'geography', name: 'Geography' },
            { id: 'polity', name: 'Polity' }
          ]
        }
      ]
    },
    {
      id: 'ssc',
      name: 'SSC Exams',
      subjects: [
        {
          id: 'english',
          name: 'English',
          topics: [
            { id: 'grammar', name: 'Grammar' },
            { id: 'vocabulary', name: 'Vocabulary' },
            { id: 'comprehension', name: 'Comprehension' }
          ]
        },
        {
          id: 'quantitative',
          name: 'Quantitative Aptitude',
          topics: [
            { id: 'arithmetic', name: 'Arithmetic' },
            { id: 'data-interpretation', name: 'Data Interpretation' }
          ]
        }
      ]
    }
  ];

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const allQuestions = examId ? await getQuestions(examId) : await getAllQuestions();
      setQuestions(allQuestions as EnhancedQuestion[]);
    } catch (error: any) {
      console.error('Error loading questions:', error);
      setError('Failed to load questions. Please check your database connection and try again.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter questions based on current selection
  const filteredQuestions = questions.filter(q => {
    if (selectedCategory && q.subject) {
      const category = categories.find(c => c.subjects.some(s => s.id === q.subject));
      if (!category || category.id !== selectedCategory) return false;
    }
    if (selectedSubject && q.subject !== selectedSubject) return false;
    if (selectedTopic && q.topic !== selectedTopic) return false;
    if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (difficultyFilter && q.difficulty !== difficultyFilter) return false;
    if (statusFilter) {
      if (statusFilter === 'live' && q.is_draft) return false;
      if (statusFilter === 'draft' && !q.is_draft) return false;
    }
    if (tagsFilter && q.tags && !q.tags.some(tag => tag.toLowerCase().includes(tagsFilter.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => {
    let aVal: any = '';
    let bVal: any = '';
    switch (sortBy) {
      case 'created_at':
        aVal = a.created_at || new Date(0);
        bVal = b.created_at || new Date(0);
        break;
      case 'subject':
        aVal = a.subject || '';
        bVal = b.subject || '';
        break;
      case 'difficulty':
        aVal = a.difficulty || '';
        bVal = b.difficulty || '';
        break;
      case 'status':
        aVal = a.is_draft ? 'Draft' : 'Live';
        bVal = b.is_draft ? 'Draft' : 'Live';
        break;
    }
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getCurrentPath = () => {
    const path = [];
    if (selectedCategory) {
      const category = categories.find(c => c.id === selectedCategory);
      if (category) path.push(category.name);
      if (selectedSubject) {
        const subject = category?.subjects.find(s => s.id === selectedSubject);
        if (subject) path.push(subject.name);
        if (selectedTopic) {
          const topic = subject?.topics.find(t => t.id === selectedTopic);
          if (topic) path.push(topic.name);
        }
      }
    }
    return path;
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
    setSelectAll(!selectAll);
  };

  const handleQuestionSelect = (questionId: string) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const getDifficultyBadgeColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return isDark ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return isDark ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return isDark ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-red-100 text-red-800 border-red-200';
      default: return isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (isDraftQ?: boolean) => {
    return isDraftQ 
      ? isDark ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' : 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : isDark ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-green-100 text-green-800 border-green-200';
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question from the bank?')) return;
    await deleteQuestion(questionId);
    await loadQuestions();
  };

  const toggleDraftState = async (question: EnhancedQuestion) => {
    await updateQuestion(question.id, { is_draft: !question.is_draft, updated_at: new Date().toISOString() });
    await loadQuestions();
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Top Navigation Bar */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedSubject('');
                  setSelectedTopic('');
                }}
                className={`${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
              >
                <Folder className="w-5 h-5" />
              </button>
              {getCurrentPath().map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item}</span>
                </div>
              ))}
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className={`block w-full pl-10 pr-3 py-2 border rounded-lg leading-5 ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutList className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Category Navigation */}
          <div className="col-span-3">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border`}>
              <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Categories</h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Navigate through exam categories</p>
              </div>
              
              <div className="p-4 space-y-4">
                {categories.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setSelectedSubject('');
                        setSelectedTopic('');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? isDark ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <Folder className="w-4 h-4" />
                          <span>{category.name}</span>
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                    
                    {selectedCategory === category.id && (
                      <div className="ml-6 space-y-1">
                        {category.subjects.map((subject) => (
                          <div key={subject.id}>
                            <button
                              onClick={() => {
                                setSelectedSubject(subject.id);
                                setSelectedTopic('');
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedSubject === subject.id
                                  ? isDark ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4" />
                                  <span>{subject.name}</span>
                                </span>
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </button>
                            
                            {selectedSubject === subject.id && (
                              <div className="ml-6 space-y-1">
                                {subject.topics.map((topic) => (
                                  <button
                                    key={topic.id}
                                    onClick={() => setSelectedTopic(topic.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                      selectedTopic === topic.id
                                        ? isDark ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-medium' : 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
                                        : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <Tag className="w-3 h-3" />
                                      <span>{topic.name}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedQuestions.length > 0 && (
              <div className={`mt-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
                <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Bulk Actions</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Selected</span>
                  </button>
                  <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                    <Folder className="w-4 h-4" />
                    <span>Move to Category</span>
                  </button>
                  <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-green-400 hover:bg-green-400/10 rounded-lg transition-colors">
                    <CheckCircle className="w-4 h-4" />
                    <span>Publish Selected</span>
                  </button>
                </div>
                <div className={`mt-4 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Selected: {selectedQuestions.length} questions
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {/* Filters and Actions Bar */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {examId ? 'Exam Question Hub' : 'Question Hub'}
                  </h2>
                  <span className={`text-sm ${isDark ? 'text-gray-400 bg-gray-700' : 'text-gray-500 bg-gray-100'} px-3 py-1 rounded-full`}>
                    {filteredQuestions.length} questions
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{examId ? 'Add Question to Exam' : 'Add Question'}</span>
                  </button>
                  <button className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                    isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    <Upload className="w-4 h-4" />
                    <span>Bulk Import</span>
                  </button>
                  <button className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                    isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Difficulty</label>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Status</option>
                    <option value="live">Live</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="created_at">Date Created</option>
                    <option value="subject">Subject</option>
                    <option value="difficulty">Difficulty</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Questions List/Grid */}
            {loading ? (
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-8`}>
                <div className="animate-pulse">
                  <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/4 mb-4`}></div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`h-16 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-8 text-center`}>
                <div>
                  <FileText className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>No questions found</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Try adjusting your filters or add new questions</p>
                </div>
              </div>
            ) : viewMode === 'list' ? (
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Question Preview
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Subject
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Topic
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Difficulty
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Status
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Tags
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
                      {filteredQuestions.map((question) => (
                        <tr key={question.id} className={isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedQuestions.includes(question.id)}
                              onChange={() => handleQuestionSelect(question.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {question.image_url && (
                                <img src={question.image_url} alt="Question" className="w-12 h-12 object-cover rounded" />
                              )}
                              <div>
                                <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} max-w-md truncate`}>
                                  {question.question_text.substring(0, 100)}
                                  {question.question_text.length > 100 ? '...' : ''}
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  {question.video_explanation_url && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-700">
                                      <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                                      Video
                                    </span>
                                  )}
                                  {question.option_images && question.option_images.length > 0 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-700">
                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                                      Images
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-900/30 text-purple-400 border border-purple-700">
                              {question.subject || 'Unknown'}
                            </span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                            {question.topic || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {question.difficulty && (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyBadgeColor(question.difficulty)}`}>
                                {question.difficulty.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(question.is_draft)}`}>
                              {question.is_draft ? 'Draft' : 'Live'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {question.tags?.slice(0, 2).map((tag, i) => (
                                <span key={i} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-200'} border`}>
                                  {tag}
                                </span>
                              ))}
                              {question.tags && question.tags.length > 2 && (
                                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>+{question.tags.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button className="text-blue-400 hover:text-blue-300">
                              <Eye className="w-4 h-4" />
                            </button>
                    <button
                      onClick={() => void toggleDraftState(question)}
                      className="text-green-400 hover:text-green-300"
                      title={question.is_draft ? 'Publish question' : 'Move to draft'}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => void handleDeleteQuestion(question.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredQuestions.map((question) => (
                  <div key={question.id} className={`${isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:shadow-md'} rounded-xl shadow-sm border p-6 transition-shadow`}>
                    <div className="flex items-start justify-between mb-4">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(question.id)}
                        onChange={() => handleQuestionSelect(question.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                      />
                      <div className="flex space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(question.is_draft)}`}>
                          {question.is_draft ? 'Draft' : 'Live'}
                        </span>
                        {question.difficulty && (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyBadgeColor(question.difficulty)}`}>
                            {question.difficulty.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      {question.image_url && (
                        <img src={question.image_url} alt="Question" className="w-full h-32 object-cover rounded-lg mb-3" />
                      )}
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'} line-clamp-3`}>
                        {question.question_text}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-400 border border-purple-700">
                          {question.subject || 'Unknown'}
                        </span>
                        {question.topic && (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-200'} border`}>
                            {question.topic}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button className={`p-2 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className={`p-2 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className={`p-2 ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-gray-600'}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Question Modal */}
      <AddQuestionModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadQuestions();
          toast.success('Question added successfully!');
        }}
        examId={examId || undefined}
      />
    </div>
  );
}
