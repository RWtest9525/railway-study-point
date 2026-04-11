import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Circle, Loader2, Plus, Save, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { createQuestionsBatch, getQuestions } from '../lib/firestore';
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

interface QuestionDraft {
  mode: QuestionMode;
  question_text: string;
  explanation: string;
  video_explanation_url: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  negative_marks: number;
  is_draft: boolean;
  image_url: string;
  option_label_style: 'alphabet' | 'numeric';
  options: OptionDraft[];
  correct_index: number;
}

const defaultDraft = (initialMode: QuestionMode = 'manual'): QuestionDraft => ({
  mode: initialMode,
  question_text: '',
  explanation: '',
  video_explanation_url: '',
  difficulty: 'medium',
  marks: 1,
  negative_marks: 0,
  is_draft: false,
  image_url: '',
  option_label_style: 'alphabet',
  options: defaultOptions(),
  correct_index: 0,
});

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
  const [draftQuestions, setDraftQuestions] = useState<QuestionDraft[]>([defaultDraft(initialMode)]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
  const [uploadingBulkImages, setUploadingBulkImages] = useState(false);

  const isLinkedQuestionBank = Boolean(categoryNodeId);
  const currentDraft = draftQuestions[currentIndex];
  const isBulkMode = currentDraft.mode === 'bulk';

  const previewOptions = useMemo(
    () => (currentDraft.mode === 'manual' ? buildFinalOptions(currentDraft.options, currentDraft.option_label_style) : buildFallbackOptions(currentDraft.option_label_style)),
    [currentDraft.mode, currentDraft.options, currentDraft.option_label_style]
  );

  useEffect(() => {
    if (!isOpen) return;
    setDraftQuestions([defaultDraft(initialMode)]);
    setCurrentIndex(0);
    setBulkFiles([]);
  }, [isOpen, initialMode]);

  const updateCurrentDraft = (updates: Partial<QuestionDraft>) => {
    setDraftQuestions((prev) => prev.map((q, i) => (i === currentIndex ? { ...q, ...updates } : q)));
  };

  const updateDraftOption = (id: string, text: string) => {
    const updatedOptions = currentDraft.options.map((option) => (option.id === id ? { ...option, text } : option));
    updateCurrentDraft({ options: updatedOptions });
  };

  const resetForm = () => {
    setError('');
    setDraftQuestions([defaultDraft(initialMode)]);
    setCurrentIndex(0);
    setBulkFiles([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
      updateCurrentDraft({ image_url: uploaded.url });
      toast.success('Question screenshot uploaded');
    } catch (uploadError: any) {
      const message = uploadError?.message || 'Failed to upload screenshot';
      setError(message);
      toast.error(message);
    } finally {
      setUploadingQuestionImage(false);
    }
  };

  const saveQuestions = async () => {
    if (!profile?.id) throw new Error('Please sign in again.');
    if (!categoryNodeId) throw new Error('Please choose the folder first.');

    const existingQuestions = examId ? await getQuestions(examId) : [];
    
    // Filter out completely empty drafts
    const validDrafts = draftQuestions.filter(d => 
      (d.mode === 'manual' && d.question_text.trim()) || 
      (d.mode === 'screenshot' && d.image_url.trim())
    );

    if (validDrafts.length === 0) throw new Error('No valid questions entered to save.');

    const formattedQuestions = validDrafts.map((draft, idx) => ({
      exam_id: examId || null,
      category_node_id: categoryNodeId,
      subject: linkedLabel || 'General',
      question_text: draft.question_text.trim() || 'Screenshot question',
      options: buildFinalOptions(draft.options, draft.option_label_style),
      option_label_style: draft.option_label_style,
      correct_index: draft.correct_index,
      explanation: draft.explanation.trim() || null,
      video_explanation_url: draft.video_explanation_url.trim() || null,
      difficulty: draft.difficulty,
      image_url: draft.image_url.trim() || null,
      marks: Number(draft.marks) || 1,
      negative_marks: Number(draft.negative_marks) || 0,
      order: existingQuestions.length + idx + 1,
      is_draft: draft.is_draft,
      version: 1,
      created_by: profile.id,
      updated_at: new Date().toISOString(),
    }));

    await createQuestionsBatch(formattedQuestions as any);
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
          exam_id: examId || null,
          category_node_id: categoryNodeId,
          subject: linkedLabel || 'General',
          question_text: `Screenshot question ${existingQuestions.length + index + 1}`,
          options: buildFallbackOptions(currentDraft.option_label_style),
          option_label_style: currentDraft.option_label_style,
          correct_index: currentDraft.correct_index,
          explanation: currentDraft.explanation.trim() || null,
          video_explanation_url: currentDraft.video_explanation_url.trim() || null,
          difficulty: currentDraft.difficulty,
          image_url: url,
          marks: Number(currentDraft.marks) || 1,
          negative_marks: Number(currentDraft.negative_marks) || 0,
          order: existingQuestions.length + index + 1,
          is_draft: currentDraft.is_draft,
          version: 1,
          created_by: profile.id,
          updated_at: new Date().toISOString(),
        } as any))
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
      if (isBulkMode) {
        await saveBulkQuestions();
        toast.success(`${bulkFiles.length} screenshot question(s) created`);
      } else {
        await saveQuestions();
        toast.success(`${draftQuestions.filter(d => Boolean(d.question_text || d.image_url)).length} questions created successfully`);
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
                  onClick={() => {
                    if (draftQuestions.length > 1 && item.id === 'bulk') {
                      toast.error('Bulk upload cannot be combined with existing drafts. Save drafts first.');
                      return;
                    }
                    updateCurrentDraft({ mode: item.id });
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    currentDraft.mode === item.id
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
                  value={currentDraft.option_label_style}
                  onChange={(e) => updateCurrentDraft({ option_label_style: e.target.value as 'alphabet' | 'numeric' })}
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
                  value={currentDraft.difficulty}
                  onChange={(e) => updateCurrentDraft({ difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
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
                  value={currentDraft.marks}
                  onChange={(e) => updateCurrentDraft({ marks: Number(e.target.value) })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Negative</span>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={currentDraft.negative_marks}
                  onChange={(e) => updateCurrentDraft({ negative_marks: Number(e.target.value) })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Correct answer</span>
                <select
                  value={currentDraft.correct_index}
                  onChange={(e) => updateCurrentDraft({ correct_index: Number(e.target.value) })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                >
                  {buildFallbackOptions(currentDraft.option_label_style).map((_, index) => (
                    <option key={index} value={index}>
                      {currentDraft.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {currentDraft.mode === 'manual' && (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Question</span>
                  <textarea
                    value={currentDraft.question_text}
                    onChange={(e) => updateCurrentDraft({ question_text: e.target.value })}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    placeholder="Type the full question here"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {currentDraft.options.map((option, index) => (
                    <label key={option.id} className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Option {currentDraft.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
                      </span>
                      <textarea
                        value={option.text}
                        onChange={(e) => updateDraftOption(option.id, e.target.value)}
                        rows={2}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                        placeholder="Enter option text"
                      />
                    </label>
                  ))}
                </div>
              </>
            )}

            {currentDraft.mode === 'screenshot' && (
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
                {currentDraft.image_url ? (
                  <img src={currentDraft.image_url} alt="Question" className="max-h-72 w-full rounded-2xl border border-slate-200 bg-white object-contain" />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-400">
                    Upload the full question screenshot here
                  </div>
                )}
              </div>
            )}

            {currentDraft.mode === 'bulk' && (
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
                  value={currentDraft.explanation}
                  onChange={(e) => updateCurrentDraft({ explanation: e.target.value })}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Video explanation URL</span>
                  <input
                    type="url"
                    value={currentDraft.video_explanation_url}
                    onChange={(e) => updateCurrentDraft({ video_explanation_url: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentDraft.is_draft}
                    onChange={(e) => updateCurrentDraft({ is_draft: e.target.checked })}
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
                    {linkedLabel || 'Selected folder'} • {currentDraft.marks} mark(s)
                  </div>
                  <div className="text-sm text-slate-900">
                    {currentDraft.mode === 'manual' ? currentDraft.question_text || 'Question preview' : 'Screenshot question preview'}
                  </div>
                  {currentDraft.image_url && (
                    <img src={currentDraft.image_url} alt="Preview" className="mt-3 max-h-48 w-full rounded-2xl border border-slate-200 object-contain" />
                  )}
                </div>
                {previewOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl border p-3 ${
                      index === currentDraft.correct_index ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-700">
                        {currentDraft.option_label_style === 'numeric' ? index + 1 : String.fromCharCode(65 + index)}
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
              <div className="mb-4 font-semibold text-slate-900">Ready check</div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {isLinkedQuestionBank ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />} 
                  <span className={isLinkedQuestionBank ? "text-slate-900 text-sm" : "text-slate-500 text-sm"}>Folder selected</span>
                </div>
                <div className="flex items-center gap-2">
                  {examTitle ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />} 
                  <span className={examTitle ? "text-slate-900 text-sm" : "text-slate-500 text-sm"}>Exam link optional</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentDraft.mode !== 'manual' || currentDraft.question_text.trim() ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />} 
                  <span className={currentDraft.mode !== 'manual' || currentDraft.question_text.trim() ? "text-slate-900 text-sm" : "text-slate-500 text-sm"}>Manual question ready</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentDraft.mode !== 'screenshot' || currentDraft.image_url ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />} 
                  <span className={currentDraft.mode !== 'screenshot' || currentDraft.image_url ? "text-slate-900 text-sm" : "text-slate-500 text-sm"}>Screenshot uploaded</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentDraft.mode !== 'bulk' || bulkFiles.length > 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />} 
                  <span className={currentDraft.mode !== 'bulk' || bulkFiles.length > 0 ? "text-slate-900 text-sm" : "text-slate-500 text-sm"}>Bulk screenshots selected</span>
                </div>
              </div>
            </div>
            
            {!isBulkMode && (
              <div className="mt-4 flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-slate-700 transition disabled:opacity-30 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back Question No.
                </button>
                <div className="font-bold text-slate-900">
                  Question {currentIndex + 1} of {draftQuestions.length}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const isLast = currentIndex === draftQuestions.length - 1;
                    if (isLast) {
                      setDraftQuestions((prev) => [...prev, defaultDraft(currentDraft.mode)]);
                    }
                    setCurrentIndex((c) => c + 1);
                  }}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  {currentIndex === draftQuestions.length - 1 ? (
                    <>Add Next Page <Plus className="h-4 w-4" /></>
                  ) : (
                    <>Question {currentIndex + 2} <ChevronRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-2 lg:col-span-2">
            <button type="button" onClick={handleClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-70">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? 'Saving...' : isBulkMode ? 'Save bulk screenshots' : `Save ${draftQuestions.length} question(s)`}
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
