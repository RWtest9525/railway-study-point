import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Save, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { createQuestion, createQuestionsBatch, getQuestions } from '../lib/firestore';
import { uploadImage, validateImage } from '../lib/imageUtils';

type QuestionMode = 'manual' | 'screenshot' | 'bulk';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  examId?: string;
  examTitle?: string;
  categoryNodeId?: string;
  linkedLabel?: string;
  initialMode?: QuestionMode;
}

interface OptionDraft {
  id: string;
  text: string;
}

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
  examTitle,
  categoryNodeId,
  linkedLabel,
  initialMode = 'manual',
}: AddQuestionModalProps) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<QuestionMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [correctIndex, setCorrectIndex] = useState(0);
  const [options, setOptions] = useState<OptionDraft[]>(defaultOptions());
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
  const [uploadingBulkImages, setUploadingBulkImages] = useState(false);
  const [formData, setFormData] = useState({
    question_text: '',
    explanation: '',
    video_explanation_url: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    marks: 1,
    negative_marks: 0,
    is_draft: false,
    image_url: '',
    option_label_style: 'alphabet' as 'alphabet' | 'numeric',
  });

  const isLinkedQuestionBank = Boolean(categoryNodeId);
  const previewOptions = useMemo(
    () => (mode === 'manual' ? buildFinalOptions(options, formData.option_label_style) : buildFallbackOptions(formData.option_label_style)),
    [mode, options, formData.option_label_style]
  );

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
  }, [isOpen, initialMode]);

  const resetForm = () => {
    setError('');
    setMode(initialMode);
    setCorrectIndex(0);
    setOptions(defaultOptions());
    setBulkFiles([]);
    setFormData({
      question_text: '',
      explanation: '',
      video_explanation_url: '',
      difficulty: 'medium',
      marks: 1,
      negative_marks: 0,
      is_draft: false,
      image_url: '',
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
      const message = uploadError?.message || 'Failed to upload screenshot';
      setError(message);
      toast.error(message);
    } finally {
      setUploadingQuestionImage(false);
    }
  };

  const saveSingleQuestion = async () => {
    if (!profile?.id) throw new Error('Please sign in again.');
    if (!categoryNodeId) throw new Error('Please choose the folder first.');

    const existingQuestions = examId ? await getQuestions(examId) : [];
    const finalOptions = buildFinalOptions(options, formData.option_label_style);

    if (mode === 'manual') {
      if (!formData.question_text.trim()) throw new Error('Please enter the question text.');
      if (!options.some((option) => option.text.trim())) throw new Error('Please enter all option text.');
    }

    if (mode === 'screenshot' && !formData.image_url.trim()) {
      throw new Error('Please upload the screenshot.');
    }

    await createQuestion({
      exam_id: examId || undefined,
      category_node_id: categoryNodeId,
      subject: linkedLabel || 'General',
      question_text: formData.question_text.trim() || 'Screenshot question',
      options: finalOptions,
      option_label_style: formData.option_label_style,
      correct_index: correctIndex,
      explanation: formData.explanation.trim() || undefined,
      video_explanation_url: formData.video_explanation_url.trim() || undefined,
      difficulty: formData.difficulty,
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
    if (!categoryNodeId) throw new Error('Please choose the folder first.');
    if (bulkFiles.length === 0) throw new Error('Please choose one or more screenshots.');

    setUploadingBulkImages(true);
    try {
      const existingQuestions = examId ? await getQuestions(examId) : [];
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
          exam_id: examId || undefined,
          category_node_id: categoryNodeId,
          subject: linkedLabel || 'General',
          question_text: `Screenshot question ${existingQuestions.length + index + 1}`,
          options: buildFallbackOptions(formData.option_label_style),
          option_label_style: formData.option_label_style,
          correct_index: correctIndex,
          explanation: formData.explanation.trim() || undefined,
          video_explanation_url: formData.video_explanation_url.trim() || undefined,
          difficulty: formData.difficulty,
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

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/85 p-3 sm:p-6">
      <div className="mx-auto max-h-[92vh] max-w-6xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Add Questions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Save questions directly into the selected folder.
            </p>
          </div>
          <button onClick={handleClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 p-5 lg:grid-cols-[1.3fr_0.8fr] lg:p-6">
          <div className="space-y-5">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: 'manual' as QuestionMode, title: 'Manual', subtitle: 'Type question and options' },
                { id: 'screenshot' as QuestionMode, title: 'Single Screenshot', subtitle: 'Upload one screenshot' },
                { id: 'bulk' as QuestionMode, title: 'Bulk Screenshot', subtitle: 'Upload many screenshots' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    mode === item.id
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.subtitle}</div>
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <InfoCard label="Folder" value={linkedLabel || 'Selected folder'} />
              <InfoCard label="Exam" value={examTitle || 'Question bank only'} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Option style</span>
                <select
                  value={formData.option_label_style}
                  onChange={(e) => setFormData((prev) => ({ ...prev, option_label_style: e.target.value as 'alphabet' | 'numeric' }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                >
                  <option value="alphabet">A B C D</option>
                  <option value="numeric">1 2 3 4</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Difficulty</span>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData((prev) => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Marks</span>
                <input
                  type="number"
                  min="1"
                  value={formData.marks}
                  onChange={(e) => setFormData((prev) => ({ ...prev, marks: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Negative</span>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={formData.negative_marks}
                  onChange={(e) => setFormData((prev) => ({ ...prev, negative_marks: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Correct answer</span>
                <select
                  value={correctIndex}
                  onChange={(e) => setCorrectIndex(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                >
                  {buildFallbackOptions(formData.option_label_style).map((_, index) => (
                    <option key={index} value={index}>
                      {formData.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {mode === 'manual' && (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Question</span>
                  <textarea
                    value={formData.question_text}
                    onChange={(e) => setFormData((prev) => ({ ...prev, question_text: e.target.value }))}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    placeholder="Type the full question here"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {options.map((option, index) => (
                    <label key={option.id} className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Option {formData.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
                      </span>
                      <textarea
                        value={option.text}
                        onChange={(e) => updateOption(option.id, e.target.value)}
                        rows={2}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                        placeholder="Enter option text"
                      />
                    </label>
                  ))}
                </div>
              </>
            )}

            {mode === 'screenshot' && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Upload screenshot</span>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                    {uploadingQuestionImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Choose file
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
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Question" className="max-h-72 w-full rounded-2xl border border-slate-200 bg-white object-contain" />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-400">
                    Upload the full question screenshot here
                  </div>
                )}
              </div>
            )}

            {mode === 'bulk' && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Bulk screenshots</span>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
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
                <div className="space-y-2">
                  {bulkFiles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-400">
                      Select screenshots to auto-save in sequence
                    </div>
                  ) : (
                    bulkFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <span className="truncate">{index + 1}. {file.name}</span>
                        <span className="ml-4 shrink-0 text-xs text-slate-400">{Math.round(file.size / 1024)} KB</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Explanation</span>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, explanation: e.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Video explanation URL</span>
                  <input
                    type="url"
                    value={formData.video_explanation_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, video_explanation_url: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.is_draft}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_draft: e.target.checked }))}
                  />
                  Save as draft
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Student preview</h3>
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 text-xs text-slate-400">
                    {linkedLabel || 'Selected folder'} • {formData.marks} mark(s)
                  </div>
                  <div className="text-sm text-slate-900">
                    {mode === 'manual' ? formData.question_text || 'Question preview' : 'Screenshot question preview'}
                  </div>
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="mt-3 max-h-48 w-full rounded-2xl border border-slate-200 object-contain" />
                  )}
                </div>
                {previewOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl border p-3 ${
                      index === correctIndex ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-700">
                        {formData.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
                      </span>
                      <div className="min-w-0 flex-1 text-sm text-slate-700">
                        {option || `Choose option ${index + 1}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="mb-3 font-semibold text-slate-900">Ready check</div>
              <div className="space-y-2">
                <div>{isLinkedQuestionBank ? '✓' : '•'} Folder selected</div>
                <div>{examTitle ? '✓' : '•'} Exam link optional</div>
                <div>{mode !== 'manual' || formData.question_text.trim() ? '✓' : '•'} Manual question ready</div>
                <div>{mode !== 'screenshot' || formData.image_url ? '✓' : '•'} Screenshot uploaded</div>
                <div>{mode !== 'bulk' || bulkFiles.length > 0 ? '✓' : '•'} Bulk screenshots selected</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-2 lg:col-span-2">
            <button type="button" onClick={handleClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700">
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function buildFinalOptions(options: OptionDraft[], style: 'alphabet' | 'numeric') {
  const typedOptions = options.map((option) => option.text.trim());
  return typedOptions.some(Boolean)
    ? typedOptions.map((option, index) => option || buildFallbackOptions(style)[index])
    : buildFallbackOptions(style);
}
