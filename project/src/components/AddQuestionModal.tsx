import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Image as ImageIcon, Loader2, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { createQuestion, getExams, getQuestions, Exam } from '../lib/firestore';
import { uploadImage, validateImage } from '../lib/imageUtils';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  examId?: string;
}

interface OptionDraft {
  id: string;
  text: string;
  image_url: string;
}

const SUBJECTS = ['Maths', 'Reasoning', 'GK', 'Science', 'English', 'Quantitative'];
const TOPIC_MAP: Record<string, string[]> = {
  Maths: ['Arithmetic', 'Algebra', 'Geometry', 'Trigonometry'],
  Reasoning: ['Verbal', 'Non-Verbal', 'Logical'],
  GK: ['Current Affairs', 'History', 'Geography', 'Polity'],
  Science: ['Physics', 'Chemistry', 'Biology'],
  English: ['Grammar', 'Vocabulary', 'Comprehension'],
  Quantitative: ['Arithmetic', 'DI'],
};

const defaultOptions = (): OptionDraft[] => [
  { id: '1', text: '', image_url: '' },
  { id: '2', text: '', image_url: '' },
  { id: '3', text: '', image_url: '' },
  { id: '4', text: '', image_url: '' },
];

export function AddQuestionModal({ isOpen, onClose, onSuccess, examId }: AddQuestionModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [options, setOptions] = useState<OptionDraft[]>(defaultOptions());
  const [formData, setFormData] = useState({
    exam_id: examId || '',
    question_text: '',
    subject: 'Maths',
    topic: '',
    subtopic: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    marks: 1,
    negative_marks: 0,
    explanation: '',
    tags: '',
    is_draft: false,
    image_url: '',
    video_explanation_url: '',
    option_label_style: 'alphabet' as 'alphabet' | 'numeric',
  });

  useEffect(() => {
    if (!isOpen) return;
    void loadExams();
  }, [isOpen]);

  const loadExams = async () => {
    const exams = await getExams(undefined, true);
    setAvailableExams(exams);
    setFormData((prev) => ({
      ...prev,
      exam_id: examId || prev.exam_id || exams[0]?.id || '',
    }));
  };

  const topics = useMemo(() => TOPIC_MAP[formData.subject] || [], [formData.subject]);

  const resetForm = () => {
    setError('');
    setCorrectIndex(0);
    setOptions(defaultOptions());
    setFormData({
      exam_id: examId || availableExams[0]?.id || '',
      question_text: '',
      subject: 'Maths',
      topic: '',
      subtopic: '',
      difficulty: 'medium',
      marks: 1,
      negative_marks: 0,
      explanation: '',
      tags: '',
      is_draft: false,
      image_url: '',
      video_explanation_url: '',
      option_label_style: 'alphabet',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const updateOption = (id: string, patch: Partial<OptionDraft>) => {
    setOptions((prev) => prev.map((option) => (option.id === id ? { ...option, ...patch } : option)));
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { id: String(prev.length + 1), text: '', image_url: '' }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    const next = options.filter((option) => option.id !== id).map((option, index) => ({ ...option, id: String(index + 1) }));
    setOptions(next);
    setCorrectIndex((current) => Math.min(current, next.length - 1));
  };

  const uploadQuestionImage = async (file: File) => {
    const validation = validateImage(file, true);
    if (!validation.valid) {
      const message = validation.errors.join(', ');
      setError(message);
      toast.error(message);
      return;
    }

    setUploadingQuestionImage(true);
    try {
      const uploaded = await uploadImage(file, `questions/${Date.now()}-${file.name}`);
      setFormData((prev) => ({ ...prev, image_url: uploaded.url }));
      toast.success('Question image uploaded');
    } catch (uploadError: any) {
      const message = uploadError?.message || 'Failed to upload question image';
      setError(message);
      toast.error(message);
    } finally {
      setUploadingQuestionImage(false);
    }
  };

  const uploadOptionImage = async (optionId: string, file: File) => {
    const validation = validateImage(file);
    if (!validation.valid) {
      const message = validation.errors.join(', ');
      setError(message);
      toast.error(message);
      return;
    }

    try {
      const uploaded = await uploadImage(file, `questions/options/${Date.now()}-${optionId}-${file.name}`);
      updateOption(optionId, { image_url: uploaded.url });
      toast.success('Option image uploaded');
    } catch (uploadError: any) {
      const message = uploadError?.message || 'Failed to upload option image';
      setError(message);
      toast.error(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!profile?.id) throw new Error('Please sign in again.');
      if (!formData.exam_id) throw new Error('Please select an exam.');
      if (!formData.topic) throw new Error('Please select a topic.');
      if (!formData.question_text.trim() && !formData.image_url.trim()) {
        throw new Error('Add question text or upload a question image.');
      }

      const preparedOptions = options
        .map((option) => ({ ...option, text: option.text.trim(), image_url: option.image_url.trim() }))
        .filter((option) => option.text || option.image_url);

      if (preparedOptions.length < 2) throw new Error('At least 2 options are required.');
      if (correctIndex >= preparedOptions.length) throw new Error('Please choose a correct answer.');

      const existingQuestions = await getQuestions(formData.exam_id);

      await createQuestion({
        exam_id: formData.exam_id,
        subject: formData.subject,
        topic: formData.topic,
        subtopic: formData.subtopic || undefined,
        question_text: formData.question_text.trim(),
        options: preparedOptions.map((option) => option.text || 'Image option'),
        option_images: preparedOptions.some((option) => option.image_url)
          ? preparedOptions.map((option) => option.image_url || '')
          : undefined,
        option_label_style: formData.option_label_style,
        correct_index: correctIndex,
        explanation: formData.explanation.trim() || undefined,
        video_explanation_url: formData.video_explanation_url.trim() || undefined,
        difficulty: formData.difficulty,
        tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        image_url: formData.image_url.trim() || undefined,
        marks: Number(formData.marks) || 1,
        negative_marks: Number(formData.negative_marks) || 0,
        order: existingQuestions.length + 1,
        is_draft: formData.is_draft,
        version: 1,
        created_by: profile.id,
        updated_at: new Date().toISOString(),
      });

      toast.success('Question created successfully');
      onSuccess();
      handleClose();
    } catch (submitError: any) {
      const message = submitError?.message || 'Failed to create question';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 p-3 sm:p-6">
      <div className="mx-auto max-h-[92vh] max-w-5xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Create Photo Question</h2>
            <p className="text-sm text-slate-400">Real Firestore save with image upload and answer-style control.</p>
          </div>
          <button onClick={handleClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 p-4 sm:grid-cols-[1.35fr_0.9fr] sm:p-6">
          <div className="space-y-5">
            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Exam</span>
                <select
                  value={formData.exam_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, exam_id: e.target.value }))}
                  disabled={!!examId}
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                >
                  <option value="">Select exam</option>
                  {availableExams.map((exam) => (
                    <option key={exam.id} value={exam.id}>{exam.title}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Subject</span>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value, topic: '' }))}
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                >
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Topic</span>
                <select
                  value={formData.topic}
                  onChange={(e) => setFormData((prev) => ({ ...prev, topic: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                >
                  <option value="">Select topic</option>
                  {topics.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Subtopic</span>
                <input
                  value={formData.subtopic}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subtopic: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                  placeholder="Optional subtopic"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Question text</span>
              <textarea
                value={formData.question_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, question_text: e.target.value }))}
                rows={4}
                className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                placeholder="Type the question, or upload a question image below."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Difficulty</span>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData((prev) => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Marks</span>
                <input type="number" min="1" value={formData.marks} onChange={(e) => setFormData((prev) => ({ ...prev, marks: Number(e.target.value) }))} className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Negative</span>
                <input type="number" min="0" step="0.25" value={formData.negative_marks} onChange={(e) => setFormData((prev) => ({ ...prev, negative_marks: Number(e.target.value) }))} className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Option style</span>
                <select
                  value={formData.option_label_style}
                  onChange={(e) => setFormData((prev) => ({ ...prev, option_label_style: e.target.value as 'alphabet' | 'numeric' }))}
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                >
                  <option value="alphabet">A B C D</option>
                  <option value="numeric">1 2 3 4</option>
                </select>
              </label>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">Question image</span>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100">
                  {uploadingQuestionImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadQuestionImage(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                placeholder="https://question-image-url"
              />
              {formData.image_url && <img src={formData.image_url} alt="Question" className="mt-4 max-h-64 w-full rounded-2xl object-contain" />}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Options</h3>
                <button type="button" onClick={addOption} className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100">
                  <Plus className="mr-1 inline h-3.5 w-3.5" />
                  Add option
                </button>
              </div>
              {options.map((option, index) => (
                <div key={option.id} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(index)}
                      className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                        correctIndex === index ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-600 text-slate-300'
                      }`}
                    >
                      {formData.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
                    </button>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100">
                        <Upload className="h-3.5 w-3.5" />
                        Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadOptionImage(option.id, file);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                      {options.length > 2 && (
                        <button type="button" onClick={() => removeOption(option.id)} className="rounded-xl p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={option.text}
                    onChange={(e) => updateOption(option.id, { text: e.target.value })}
                    rows={2}
                    className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                    placeholder="Option text"
                  />
                  {option.image_url ? (
                    <img src={option.image_url} alt={`Option ${index + 1}`} className="mt-3 h-28 rounded-2xl object-cover" />
                  ) : (
                    <div className="mt-3 flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-slate-500">
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Option image preview
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Explanation</span>
                <textarea value={formData.explanation} onChange={(e) => setFormData((prev) => ({ ...prev, explanation: e.target.value }))} rows={4} className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white" />
              </label>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Video explanation URL</span>
                  <input type="url" value={formData.video_explanation_url} onChange={(e) => setFormData((prev) => ({ ...prev, video_explanation_url: e.target.value }))} className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Tags</span>
                  <input type="text" value={formData.tags} onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))} className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white" placeholder="rrb, image, mock" />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200">
                  <input type="checkbox" checked={formData.is_draft} onChange={(e) => setFormData((prev) => ({ ...prev, is_draft: e.target.checked }))} />
                  Save as draft
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Student preview</h3>
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <div className="mb-2 text-xs text-slate-400">{formData.subject} • {formData.marks} mark(s)</div>
                  <div className="text-sm text-white">{formData.question_text || 'Question preview'}</div>
                  {formData.image_url && <img src={formData.image_url} alt="Preview" className="mt-3 max-h-48 w-full rounded-2xl object-contain" />}
                </div>
                {options.map((option, index) => (
                  <div key={option.id} className={`rounded-2xl border p-3 ${index === correctIndex ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-slate-700 bg-slate-900'}`}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-xs font-semibold text-slate-200">
                        {formData.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-100">{option.text || 'Option text'}</div>
                        {option.image_url && <img src={option.image_url} alt={`Option ${index + 1}`} className="mt-2 max-h-28 rounded-xl object-cover" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
              <div className="mb-3 font-semibold text-white">Checklist</div>
              <div className="space-y-2">
                <div>{formData.exam_id ? '✓' : '•'} Exam selected</div>
                <div>{formData.topic ? '✓' : '•'} Topic chosen</div>
                <div>{formData.question_text.trim() || formData.image_url ? '✓' : '•'} Question content added</div>
                <div>{options.filter((option) => option.text || option.image_url).length >= 2 ? '✓' : '•'} Enough options added</div>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-3 border-t border-slate-700 pt-2">
            <button type="button" onClick={handleClose} className="rounded-2xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? 'Saving...' : 'Save question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
