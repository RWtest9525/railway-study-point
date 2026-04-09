import { useState, useEffect } from 'react';
import { Plus, X, Upload, Image, Video, Tag, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  examId?: string; // Optional exam ID for direct question addition
}

interface Option {
  id: string;
  text: string;
  is_correct: boolean;
  image_url?: string;
}

export function AddQuestionModal({ isOpen, onClose, onSuccess, examId }: AddQuestionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    question_text: '',
    subject: '',
    topic: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    marks: 1,
    negative_marks: 0,
    explanation: '',
    tags: '',
    is_draft: false,
    image_url: '',
    video_explanation_url: '',
    options: [
      { id: '1', text: '', is_correct: false, image_url: '' },
      { id: '2', text: '', is_correct: false, image_url: '' },
      { id: '3', text: '', is_correct: false, image_url: '' },
      { id: '4', text: '', is_correct: false, image_url: '' },
    ] as Option[],
  });

  const subjects = [
    { id: 'maths', name: 'Mathematics', topics: ['algebra', 'geometry', 'trigonometry', 'calculus'] },
    { id: 'reasoning', name: 'Reasoning', topics: ['verbal', 'non-verbal', 'logical'] },
    { id: 'science', name: 'General Science', topics: ['physics', 'chemistry', 'biology'] },
    { id: 'gk', name: 'General Knowledge', topics: ['current-affairs', 'history', 'geography', 'polity'] },
    { id: 'english', name: 'English', topics: ['grammar', 'vocabulary', 'comprehension'] },
    { id: 'quantitative', name: 'Quantitative Aptitude', topics: ['arithmetic', 'data-interpretation'] }
  ];

  const getTopicsForSubject = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.topics || [];
  };

  const handleOptionChange = (id: string, field: keyof Option, value: any) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map(opt => 
        opt.id === id ? { ...opt, [field]: value } : opt
      )
    }));
  };

  const addOption = () => {
    const newId = (parseInt(formData.options[formData.options.length - 1].id) + 1).toString();
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { id: newId, text: '', is_correct: false, image_url: '' }]
    }));
  };

  const removeOption = (id: string) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter(opt => opt.id !== id)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!formData.question_text.trim()) {
        throw new Error('Question text is required');
      }
      if (!formData.subject) {
        throw new Error('Subject is required');
      }
      if (!formData.topic) {
        throw new Error('Topic is required');
      }
      if (formData.options.filter(opt => opt.text.trim()).length < 2) {
        throw new Error('At least 2 options are required');
      }
      if (!formData.options.some(opt => opt.is_correct)) {
        throw new Error('At least one option must be marked as correct');
      }

      // Prepare question data
      const questionData = {
        question_text: formData.question_text,
        subject: formData.subject,
        topic: formData.topic,
        difficulty: formData.difficulty,
        marks: formData.marks,
        negative_marks: formData.negative_marks,
        explanation: formData.explanation,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        is_draft: formData.is_draft,
        image_url: formData.image_url,
        video_explanation_url: formData.video_explanation_url,
        options: formData.options.filter(opt => opt.text.trim()),
        exam_id: examId, // Include exam_id if provided
        created_at: new Date().toISOString(),
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Question created successfully!');
      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      subject: '',
      topic: '',
      difficulty: 'medium',
      marks: 1,
      negative_marks: 0,
      explanation: '',
      tags: '',
      is_draft: false,
      image_url: '',
      video_explanation_url: '',
      options: [
        { id: '1', text: '', is_correct: false, image_url: '' },
        { id: '2', text: '', is_correct: false, image_url: '' },
        { id: '3', text: '', is_correct: false, image_url: '' },
        { id: '4', text: '', is_correct: false, image_url: '' },
      ],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Add New Question
              </h2>
              <p className="text-sm text-gray-600">
                {examId ? 'Adding question directly to exam' : 'Create a new question for the question bank'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text *
            </label>
            <textarea
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the question text..."
            />
          </div>

          {/* Subject and Topic */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value, topic: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic *
              </label>
              <select
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                disabled={!formData.subject}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Topic</option>
                {getTopicsForSubject(formData.subject).map(topic => (
                  <option key={topic} value={topic}>{topic.replace('-', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty and Marks */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty *
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marks *
              </label>
              <input
                type="number"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Negative Marks
              </label>
              <input
                type="number"
                value={formData.negative_marks}
                onChange={(e) => setFormData({ ...formData, negative_marks: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.25"
              />
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Options *
            </label>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={option.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionChange(option.id, 'text', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Option ${index + 1}...`}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={option.is_correct}
                        onChange={(e) => handleOptionChange(option.id, 'is_correct', e.target.checked)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Correct</span>
                    </label>
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(option.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="mt-2 flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Option</span>
            </button>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed explanation..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          {/* Media URLs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Image className="w-4 h-4 inline mr-1" />
                Question Image URL
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Video className="w-4 h-4 inline mr-1" />
                Video Explanation URL
              </label>
              <input
                type="url"
                value={formData.video_explanation_url}
                onChange={(e) => setFormData({ ...formData, video_explanation_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_draft}
                onChange={(e) => setFormData({ ...formData, is_draft: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Save as Draft</span>
            </label>
            {examId && (
              <span className="text-sm text-green-600 font-medium">
                Question will be added to exam: {examId}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Creating...' : 'Create Question'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}