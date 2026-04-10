import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Image as ImageIcon, Loader2, Save, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { createQuestion, createQuestionsBatch, getExams, getQuestions, Exam } from '../lib/firestore';
import { uploadImage, validateImage } from '../lib/imageUtils';

type QuestionMode = 'manual' | 'screenshot' | 'bulk';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  examId?: string;
  initialMode?: QuestionMode;
}

interface OptionDraft {
  id: string;
  text: string;
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
  { id: '1', text: '' },
  { id: '2', text: '' },
  { id: '3', text: '' },
  { id: '4', text: '' },
];

const buildFallbackOptions = (style: 'alphabet' | 'numeric') =>
  Array.from({ length: 4 }, (_, index) =>
    style === 'numeric' ? `Option ${index + 1}` : `Option ${String.fromCharCode(65 + index)}`
  );

export function AddQuestionModal({
  isOpen,
  onClose,
  onSuccess,
  examId,
  initialMode = 'manual',
}: AddQuestionModalProps) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<QuestionMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
  const [uploadingBulkImages, setUploadingBulkImages] = useState(false);
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [options, setOptions] = useState<OptionDraft[]>(defaultOptions());
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
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
    setMode(initialMode);
    void loadExams();
  }, [isOpen, initialMode]);

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
    setBulkFiles([]);
    setMode(initialMode);
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

  const updateOption = (id: string, text: string) => {
    setOptions((prev) => prev.map((option) => (option.id === id ? { ...option, text } : option)));
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
      toast.success('Question screenshot uploaded');
    } catch (uploadError: any) {
      const message = uploadError?.message || 'Failed to upload question screenshot';
      setError(message);
      toast.error(message);
    } finally {
      setUploadingQuestionImage(false);
    }
  };

  const buildFinalOptions = () => {
    const typedOptions = options.map((option) => option.text.trim());
    return typedOptions.some(Boolean)
      ? typedOptions.map((option, index) => option || buildFallbackOptions(formData.option_label_style)[index])
      : buildFallbackOptions(formData.option_label_style);
  };

  const saveSingleQuestion = async () => {
    if (!profile?.id) throw new Error('Please sign in again.');
    if (!formData.exam_id) throw new Error('Please select an exam.');
    if (!formData.topic) throw new Error('Please select a topic.');

    const existingQuestions = await getQuestions(formData.exam_id);
    const finalOptions = buildFinalOptions();

    if (mode === 'manual') {
      if (!formData.question_text.trim()) throw new Error('Please enter the question text.');
      if (!options.some((option) => option.text.trim())) throw new Error('Please enter the option text.');
    }

    if (mode === 'screenshot' && !formData.image_url.trim()) {
      throw new Error('Please upload the screenshot of the full question.');
    }

    await createQuestion({
      exam_id: formData.exam_id,
      subject: formData.subject,
      topic: formData.topic,
      subtopic: formData.subtopic || undefined,
      question_text: formData.question_text.trim() || (mode === 'screenshot' ? 'Screenshot question' : ''),
      options: finalOptions,
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
  };

  const saveBulkQuestions = async () => {
    if (!profile?.id) throw new Error('Please sign in again.');
    if (!formData.exam_id) throw new Error('Please select an exam.');
    if (!formData.topic) throw new Error('Please select a topic.');
    if (bulkFiles.length === 0) throw new Error('Please choose one or more screenshots.');

    setUploadingBulkImages(true);
    try {
      const existingQuestions = await getQuestions(formData.exam_id);
      const finalOptions = buildFallbackOptions(formData.option_label_style);
      const uploadedUrls: string[] = [];

      for (const file of bulkFiles) {
        const validation = validateImage(file, true);
        if (!validation.valid) {
          throw new Error(`${file.name}: ${validation.errors.join(', ')}`);
        }
        const uploaded = await uploadImage(file, `questions/bulk/${Date.now()}-${file.name}`);
        uploadedUrls.push(uploaded.url);
      }

      await createQuestionsBatch(
        uploadedUrls.map((url, index) => ({
          exam_id: formData.exam_id,
          subject: formData.subject,
          topic: formData.topic,
          subtopic: formData.subtopic || undefined,
          question_text: `${formData.question_text.trim() || 'Screenshot question'} ${existingQuestions.length + index + 1}`,
          options: finalOptions,
          option_label_style: formData.option_label_style,
          correct_index: correctIndex,
          explanation: formData.explanation.trim() || undefined,
          video_explanation_url: formData.video_explanation_url.trim() || undefined,
          difficulty: formData.difficulty,
          tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          image_url: url,
          marks: Number(formData.marks) || 1,
          negative_marks: Number(formData.negative_marks) || 0,
          order: existingQuestions.length + index + 1,
          is_draft: formData.is_draft,
          version: 1,
          created_by: profile.id,
          updated_at: new Date().toISOString(),
        }))
      );
    } finally {
      setUploadingBulkImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'bulk') {
        await saveBulkQuestions();
        toast.success(`${bulkFiles.length} screenshot question(s) created`);
      } else {
        await saveSingleQuestion();
        toast.success('Question created successfully');
      }
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

  const previewOptions = mode === 'manual' ? buildFinalOptions() : buildFallbackOptions(formData.option_label_style);

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 p-3 sm:p-6">
      <div className="mx-auto max-h-[92vh] max-w-5xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Add Questions</h2>
            <p className="text-sm text-slate-400">Use manual entry, one screenshot, or bulk screenshot upload from the same screen.</p>
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

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'manual' as QuestionMode, title: 'Manual', subtitle: 'Type question and options' },
                { id: 'screenshot' as QuestionMode, title: 'Single Screenshot', subtitle: 'Upload one full screenshot' },
                { id: 'bulk' as QuestionMode, title: 'Bulk Screenshots', subtitle: 'Upload many and auto-sequence' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    mode === item.id ? 'border-blue-400 bg-blue-500/10 text-white' : 'border-slate-700 bg-slate-950/70 text-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-400">{item.subtitle}</div>
                </button>
              ))}
            </div>

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

            <div className="grid gap-4 sm:grid-cols-3">
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
                  placeholder="Optional"
                />
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
                <span className="mb-2 block text-sm font-medium text-slate-200">Correct answer</span>
                <select
                  value={correctIndex}
                  onChange={(e) => setCorrectIndex(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                >
                  {buildFallbackOptions(formData.option_label_style).map((_, index) => (
                    <option key={index} value={index}>
                      {formData.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">{mode === 'manual' ? 'Question text' : 'Title / note'}</span>
              <textarea
                value={formData.question_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, question_text: e.target.value }))}
                rows={mode === 'manual' ? 4 : 2}
                className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                placeholder={
                  mode === 'manual'
                    ? 'Type the full question here'
                    : mode === 'screenshot'
                    ? 'Optional note. The screenshot can already contain the full question and options.'
                    : 'Optional prefix for all bulk screenshot questions'
                }
              />
            </label>

            {mode === 'manual' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white">Manual options</h3>
                {options.map((option, index) => (
                  <div key={option.id} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <div className="mb-2 text-xs font-semibold text-slate-400">
                      Option {formData.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
                    </div>
                    <textarea
                      value={option.text}
                      onChange={(e) => updateOption(option.id, e.target.value)}
                      rows={2}
                      className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white"
                      placeholder="Enter option text"
                    />
                  </div>
                ))}
              </div>
            )}

            {mode === 'screenshot' && (
              <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">Question screenshot</span>
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
                  placeholder="https://question-screenshot-url"
                />
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Upload one screenshot containing the full question and all options. Students will still get clean answer boxes to choose from.
                </p>
                {formData.image_url && <img src={formData.image_url} alt="Question" className="mt-4 max-h-64 w-full rounded-2xl object-contain" />}
              </div>
            )}

            {mode === 'bulk' && (
              <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">Bulk screenshots</span>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100">
                    {uploadingBulkImages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Choose files
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => setBulkFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                </div>
                <p className="text-xs leading-5 text-slate-400">
                  Upload many screenshots together. They will be saved in sequence under the selected exam and category context.
                </p>
                <div className="mt-4 space-y-2">
                  {bulkFiles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
                      No screenshots selected yet
                    </div>
                  ) : (
                    bulkFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200">
                        <span className="truncate">{index + 1}. {file.name}</span>
                        <span className="ml-4 shrink-0 text-xs text-slate-500">{Math.round(file.size / 1024)} KB</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

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
                  <div className="text-sm text-white">{formData.question_text || (mode === 'manual' ? 'Question preview' : 'Screenshot question preview')}</div>
                  {formData.image_url && <img src={formData.image_url} alt="Preview" className="mt-3 max-h-48 w-full rounded-2xl object-contain" />}
                </div>
                {previewOptions.map((option, index) => (
                  <div key={index} className={`rounded-2xl border p-3 ${index === correctIndex ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-slate-700 bg-slate-900'}`}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-xs font-semibold text-slate-200">
                        {formData.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-100">{option || `Choose option ${index + 1}`}</div>
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
                <div>{mode !== 'screenshot' || formData.image_url ? '✓' : '•'} Single screenshot ready</div>
                <div>{mode !== 'bulk' || bulkFiles.length > 0 ? '✓' : '•'} Bulk screenshots ready</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-700 pt-2 sm:col-span-2">
            <button type="button" onClick={handleClose} className="rounded-2xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? 'Saving...' : mode === 'bulk' ? 'Save screenshots' : 'Save question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
