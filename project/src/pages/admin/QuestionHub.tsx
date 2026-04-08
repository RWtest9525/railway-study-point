import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getQuestions, Question } from '../../lib/firestore';
import { 
  Search, Filter, Plus, Folder, FileText, Tag, 
  Clock, Eye, Edit, Trash2, ChevronRight, ChevronDown,
  ChevronUp, CheckCircle, XCircle, AlertTriangle,
  Download, Upload, RefreshCw, LayoutList, LayoutGrid,
  Check, X, Calendar, Users, TrendingUp, DollarSign
} from 'lucide-react';

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
  const [questions, setQuestions] = useState<EnhancedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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

  // Filter questions based on current selection
  const filteredQuestions = questions.filter(q => {
    // Category filter
    if (selectedCategory && q.subject) {
      const category = categories.find(c => c.subjects.some(s => s.id === q.subject));
      if (!category || category.id !== selectedCategory) return false;
    }
    
    // Subject filter
    if (selectedSubject && q.subject !== selectedSubject) return false;
    
    // Topic filter
    if (selectedTopic && q.topic !== selectedTopic) return false;
    
    // Search filter
    if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // Difficulty filter
    if (difficultyFilter && q.difficulty !== difficultyFilter) return false;
    
    // Status filter
    if (statusFilter) {
      if (statusFilter === 'live' && q.is_draft) return false;
      if (statusFilter === 'draft' && !q.is_draft) return false;
    }
    
    // Tags filter
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

  // Get current navigation path
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
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (isDraft?: boolean) => {
    return isDraft 
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
      : 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
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
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Folder className="w-5 h-5" />
              </button>
              {getCurrentPath().map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{item}</span>
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
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutList className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
                <p className="text-sm text-gray-600 mt-1">Navigate through exam categories</p>
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
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
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
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'text-gray-600 hover:bg-gray-50'
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
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
                                        : 'text-gray-500 hover:bg-gray-50'
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
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Bulk Actions</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Selected</span>
                  </button>
                  <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Folder className="w-4 h-4" />
                    <span>Move to Category</span>
                  </button>
                  <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    <CheckCircle className="w-4 h-4" />
                    <span>Publish Selected</span>
                  </button>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Selected: {selectedQuestions.length} questions
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {/* Filters and Actions Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Question Hub
                  </h2>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {filteredQuestions.length} questions
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>Add Question</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Bulk Import</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Difficulty</label>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="live">Live</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="created_at">Date Created</option>
                    <option value="subject">Subject</option>
                    <option value="difficulty">Difficulty</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Questions List/Grid */}
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No questions found</p>
                  <p className="text-sm text-gray-600">Try adjusting your filters or add new questions</p>
                </div>
              </div>
            ) : viewMode === 'list' ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Question Preview
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Topic
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Difficulty
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tags
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredQuestions.map((question) => (
                        <tr key={question.id} className="hover:bg-gray-50">
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
                                <div className="text-sm font-medium text-gray-900 max-w-md truncate">
                                  {question.question_text.substring(0, 100)}
                                  {question.question_text.length > 100 ? '...' : ''}
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  {question.video_explanation_url && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                      <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                                      Video
                                    </span>
                                  )}
                                  {question.option_images && question.option_images.length > 0 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                                      Images
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              {question.subject || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                                <span key={i} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                  {tag}
                                </span>
                              ))}
                              {question.tags && question.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{question.tags.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
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
                  <div key={question.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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
                      <p className="text-sm text-gray-900 line-clamp-3">
                        {question.question_text}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          {question.subject || 'Unknown'}
                        </span>
                        {question.topic && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {question.topic}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600">
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
    </div>
  );
}