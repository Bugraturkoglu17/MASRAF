import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Camera, FileText, ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { useToast } from '@/components/feedback/toast-context';
import { NetworkRequiredDialog } from '@/components/pwa/NetworkRequiredDialog';
import { AttachmentUploader } from '@/components/ui/AttachmentUploader';
import { ImageEditor } from '@/components/ui/ImageEditor';
import { useAuth } from '@/features/auth/auth-context';
import { useLocalExpenseDraft } from '@/hooks/useLocalExpenseDraft';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

const schema = z.object({
  categoryId: z.string().uuid('Kategori seçiniz'),
  title: z.string().min(1, 'Başlık zorunludur'),
  description: z.string().optional(),
  amount: z.coerce.number().positive('Tutar pozitif olmalıdır'),
  expenseDate: z.string().min(1, 'Masraf tarihi zorunludur'),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Category {
  id: string;
  name: string;
  requiresDueDate: boolean;
}

interface Expense {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  amount: string;
  expenseDate: string;
  dueDate?: string | null;
  status: string;
}

interface UploadedFile {
  id: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export function CreateExpensePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const qc = useQueryClient();

  const [savedExpenseId, setSavedExpenseId] = useState<string | null>(editId);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showNetworkDialog, setShowNetworkDialog] = useState(false);
  const autoRecoveredRef = useRef(false);

  // Pending files — local queue before draft is saved
  const [pendingFiles, setPendingFiles] = useState<File[]>(() => {
    const state = location.state as { initialFiles?: unknown } | null;
    return Array.isArray(state?.initialFiles) &&
      state.initialFiles.every((item) => item instanceof File)
      ? state.initialFiles
      : [];
  });

  // Pre-save image editor state
  const pendingCameraRef = useRef<HTMLInputElement>(null);
  const pendingGalleryRef = useRef<HTMLInputElement>(null);
  const [pendingEditor, setPendingEditor] = useState<{
    file: File;
    inputRef: React.RefObject<HTMLInputElement>;
    replaceFile?: File; // replace existing pending file
  } | null>(null);

  const isSaved = Boolean(savedExpenseId);
  const removePending = (file: File) => setPendingFiles((prev) => prev.filter((f) => f !== file));

  const {
    draft,
    isLoading: isDraftLoading,
    saveDraft,
    clearDraft,
  } = useLocalExpenseDraft(user?.id, user?.organizationId);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/expense-categories'),
  });

  const { data: editingExpense } = useQuery<Expense>({
    queryKey: ['expense', editId],
    queryFn: () => apiFetch(`/expenses/${editId}`),
    enabled: Boolean(editId),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedCategoryId = useWatch({ control, name: 'categoryId' });
  const formValues = useWatch({ control });
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const requiresDueDate = selectedCategory?.requiresDueDate ?? false;

  useEffect(() => {
    if (editingExpense) {
      reset({
        categoryId: editingExpense.categoryId,
        title: editingExpense.title,
        description: editingExpense.description,
        amount: Number(editingExpense.amount),
        expenseDate: editingExpense.expenseDate?.split('T')[0] ?? '',
        dueDate: editingExpense.dueDate?.split('T')[0] ?? '',
      });
    }
  }, [editingExpense, reset]);

  useEffect(() => {
    if (editId || isDraftLoading || autoRecoveredRef.current) return;
    autoRecoveredRef.current = true;
    if (!draft || (!draft.categoryId && !draft.title && !draft.amount && !draft.expenseDate))
      return;
    reset({
      categoryId: draft.categoryId ?? '',
      title: draft.title ?? '',
      description: draft.description ?? '',
      amount: draft.amount,
      expenseDate: draft.expenseDate ?? '',
      dueDate: draft.dueDate ?? '',
    });
  }, [draft, editId, isDraftLoading, reset]);

  useEffect(() => {
    document.documentElement.dataset.unsavedForm = String(isDirty && !isSaved);
    return () => {
      delete document.documentElement.dataset.unsavedForm;
    };
  }, [isDirty, isSaved]);

  useEffect(() => {
    const hasContent = Boolean(
      formValues.categoryId ||
      formValues.title ||
      formValues.description ||
      formValues.amount ||
      formValues.expenseDate ||
      formValues.dueDate,
    );
    if (editId || isSaved || !isDirty || !user || !hasContent) return;
    const t = window.setTimeout(() => {
      void saveDraft({
        categoryId: formValues.categoryId,
        title: formValues.title,
        description: formValues.description,
        amount: typeof formValues.amount === 'number' ? formValues.amount : undefined,
        expenseDate: formValues.expenseDate,
        dueDate: formValues.dueDate,
      }).catch(() => showToast('Yerel taslak kaydedilemedi.', 'error'));
    }, 500);
    return () => window.clearTimeout(t);
  }, [editId, formValues, isDirty, isSaved, saveDraft, showToast, user]);

  const createMut = useMutation({
    mutationFn: (data: FormValues) =>
      apiFetch<{ id: string }>('/expenses', { method: 'POST', body: data }),
    onSuccess: (expense) => {
      setSavedExpenseId(expense.id);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-counts'] });
    },
    onError: (error) => showToast(getApiErrorMessage(error, 'Kaydedilemedi.'), 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (data: FormValues) =>
      apiFetch(`/expenses/${editId}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error) => showToast(getApiErrorMessage(error, 'Güncellenemedi.'), 'error'),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!isOnline) {
      setShowNetworkDialog(true);
      return;
    }
    if (!values.dueDate || values.dueDate === '') delete (values as Partial<FormValues>).dueDate;

    if (editId) {
      await updateMut.mutateAsync(values);
      showToast('Masraf güncellendi.', 'success');
      navigate('/expenses?status=DRAFT');
    } else {
      const created = await createMut.mutateAsync(values);
      await clearDraft();
      showToast('Masraf taslak olarak kaydedildi.', 'success');
      setSavedExpenseId(created.id);
    }
  });

  const loading = isSubmitting || createMut.isPending || updateMut.isPending;

  // ── Pre-save file selection ───────────────────────────────────────────────

  const onPendingFileInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    inputRef: React.RefObject<HTMLInputElement>,
    replaceFile?: File,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type.startsWith('image/')) {
      setPendingEditor({ file, inputRef, replaceFile });
    } else {
      if (replaceFile) setPendingFiles((p) => p.map((f) => (f === replaceFile ? file : f)));
      else setPendingFiles((p) => [...p, file]);
    }
  };

  const handlePendingEditorSave = (edited: File) => {
    const { replaceFile } = pendingEditor!;
    setPendingEditor(null);
    if (replaceFile) {
      setPendingFiles((p) => p.map((f) => (f === replaceFile ? edited : f)));
    } else {
      setPendingFiles((p) => [...p, edited]);
    }
  };

  const handlePendingEditorReselect = () => {
    const inputRef = pendingEditor?.inputRef;
    setPendingEditor(null);
    setTimeout(() => inputRef?.current?.click(), 80);
  };

  const inp = (hasErr: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1.5px solid ${hasErr ? 'var(--color-danger)' : 'var(--color-border)'}`,
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontSize: 15,
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    appearance: 'none',
  });

  return (
    <div style={{ padding: '0 0 80px', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Geri dön"
          style={{
            width: 36,
            height: 36,
            minHeight: 36,
            padding: 0,
            boxSizing: 'border-box',
            borderRadius: '50%',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} color="var(--color-text)" />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
          {editId ? 'Masrafı Düzenle' : 'Yeni Masraf'}
        </h1>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Form */}
        <form onSubmit={onSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Category */}
            <div>
              <label htmlFor="expense-category" style={labelSt}>
                Kategori *
              </label>
              <select
                id="expense-category"
                {...register('categoryId')}
                style={inp(Boolean(errors.categoryId))}
                disabled={isSaved && !editId}
              >
                <option value="">Kategori seçiniz</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p role="alert" style={errSt}>
                  {errors.categoryId.message}
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label htmlFor="expense-title" style={labelSt}>
                Başlık *
              </label>
              <input
                id="expense-title"
                {...register('title')}
                placeholder="Masraf başlığı"
                style={inp(Boolean(errors.title))}
                disabled={isSaved && !editId}
              />
              {errors.title && (
                <p role="alert" style={errSt}>
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="expense-amount" style={labelSt}>
                Tutar (₺) *
              </label>
              <input
                id="expense-amount"
                {...register('amount')}
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                style={inp(Boolean(errors.amount))}
                disabled={isSaved && !editId}
              />
              {errors.amount && (
                <p role="alert" style={errSt}>
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Expense date */}
            <div>
              <label htmlFor="expense-date" style={labelSt}>
                Masraf Tarihi *
              </label>
              <Controller
                control={control}
                name="expenseDate"
                render={({ field }) => (
                  <DateInputTr
                    id="expense-date"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    style={inp(Boolean(errors.expenseDate))}
                    disabled={isSaved && !editId}
                  />
                )}
              />
              {errors.expenseDate && (
                <p role="alert" style={errSt}>
                  {errors.expenseDate.message}
                </p>
              )}
            </div>

            {/* Due date */}
            <div>
              <label htmlFor="expense-due-date" style={labelSt}>
                Vade Tarihi{requiresDueDate ? ' *' : ''}
                {requiresDueDate && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: 'var(--color-text-muted)',
                      marginLeft: 4,
                    }}
                  >
                    ({selectedCategory?.name} için zorunlu)
                  </span>
                )}
                {!requiresDueDate && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: 'var(--color-text-muted)',
                      marginLeft: 4,
                    }}
                  >
                    (opsiyonel)
                  </span>
                )}
              </label>
              <Controller
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <DateInputTr
                    id="expense-due-date"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    style={inp(Boolean(errors.dueDate))}
                    disabled={isSaved && !editId}
                  />
                )}
              />
              {errors.dueDate && (
                <p role="alert" style={errSt}>
                  {errors.dueDate.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="expense-description" style={labelSt}>
                Açıklama
              </label>
              <textarea
                id="expense-description"
                {...register('description')}
                rows={3}
                placeholder="Masraf hakkında not ekleyin..."
                style={{
                  ...inp(false),
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
                disabled={isSaved && !editId}
              />
            </div>

            {/* Submit */}
            {(!isSaved || editId) && (
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px',
                  borderRadius: 12,
                  border: 'none',
                  background: loading ? 'var(--color-border)' : 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  width: '100%',
                }}
              >
                {loading ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Taslak Kaydet'}
              </button>
            )}
          </div>
        </form>

        {/* ── Belge / Fatura alanı — her zaman görünür ── */}
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.05em',
              marginBottom: 12,
            }}
          >
            FATURALAR (opsiyonel)
          </div>

          {/* Edit mode OR post-save: real uploader with view/replace/delete */}
          {isSaved && savedExpenseId ? (
            <AttachmentUploader
              expenseId={savedExpenseId}
              onFilesChange={setUploadedFiles}
              disabled={!isOnline}
              initialFiles={pendingFiles}
            />
          ) : (
            /* Pre-save: local pending queue */
            <div className="attachment-uploader">
              {/* Hidden inputs */}
              <input
                ref={pendingCameraRef}
                className="visually-hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={(e) => onPendingFileInput(e, pendingCameraRef)}
              />
              <input
                ref={pendingGalleryRef}
                className="visually-hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                onChange={(e) => onPendingFileInput(e, pendingGalleryRef)}
              />

              {/* Buttons — always visible */}
              <div className="attachment-action-row">
                <button
                  type="button"
                  className="upload-action-btn"
                  onClick={() => pendingCameraRef.current?.click()}
                >
                  <Camera size={20} />
                  <span>Fotoğraf Çek</span>
                </button>
                <button
                  type="button"
                  className="upload-action-btn"
                  onClick={() => pendingGalleryRef.current?.click()}
                >
                  <ImagePlus size={20} />
                  <span>Fotoğraf Yükle</span>
                </button>
                {pendingFiles.length > 0 && (
                  <small className="attachment-count">{pendingFiles.length} belge hazır</small>
                )}
              </div>

              {/* Pending file cards */}
              {pendingFiles.length > 0 && (
                <div className="attachment-list">
                  {pendingFiles.map((file) => (
                    <PendingFileCard
                      key={`${file.name}-${file.lastModified}`}
                      file={file}
                      onRemove={() => removePending(file)}
                      onEdit={() =>
                        setPendingEditor({ file, inputRef: pendingGalleryRef, replaceFile: file })
                      }
                    />
                  ))}
                </div>
              )}

              {pendingFiles.length === 0 && (
                <p className="attachment-help">
                  Fotoğraf Çek veya Fotoğraf Yükle ile fatura ekleyin. Taslak kaydedildikten sonra
                  yüklenecek.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Done button */}
        {isSaved && !editId && (
          <button
            type="button"
            onClick={() => navigate('/expenses?status=DRAFT')}
            style={{
              marginTop: 20,
              padding: '14px',
              borderRadius: 12,
              border: '2px solid var(--color-approved)',
              background: 'var(--color-approved-bg)',
              color: 'var(--color-approved)',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {uploadedFiles.length > 0
              ? `Taslağa Git (${uploadedFiles.length} belge)`
              : 'Taslağa Git'}
          </button>
        )}
      </div>

      {/* Pre-save image editor */}
      {pendingEditor && (
        <ImageEditor
          file={pendingEditor.file}
          onSave={handlePendingEditorSave}
          onCancel={() => setPendingEditor(null)}
          onReselect={handlePendingEditorReselect}
        />
      )}

      <NetworkRequiredDialog open={showNetworkDialog} onClose={() => setShowNetworkDialog(false)} />
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: 6,
};
const errSt: React.CSSProperties = {
  color: 'var(--color-danger)',
  fontSize: 12,
  margin: '4px 0 0',
};

// ── DateInputTr ───────────────────────────────────────────────────────────────

function DateInputTr({
  id,
  value,
  onChange,
  onBlur,
  style,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  onBlur?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const dateRef = useRef<HTMLInputElement>(null);
  const toDisplay = (iso: string) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  };
  const [display, setDisplay] = useState(() => toDisplay(value));
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setDisplay(value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? toDisplay(value) : display);
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length > 4)
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
    setDisplay(formatted);
    if (digits.length === 8)
      onChange(`${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`);
    else onChange('');
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="GG.AA.YYYY"
        maxLength={10}
        value={display}
        onChange={handleTextChange}
        onBlur={onBlur}
        disabled={disabled}
        style={{ ...style, flex: 1 }}
      />
      <label
        aria-label="Takvimden tarih seç"
        style={{
          position: 'relative',
          width: 44,
          height: 44,
          minHeight: 44,
          boxSizing: 'border-box',
          border: '1.5px solid var(--color-border)',
          borderRadius: 10,
          background: 'var(--color-surface)',
          color: 'var(--color-text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <CalendarDays size={18} style={{ pointerEvents: 'none' }} />
        <input
          ref={dateRef}
          type="date"
          value={value}
          onChange={(e) => {
            const iso = e.target.value;
            onChange(iso);
            setDisplay(toDisplay(iso));
          }}
          onBlur={onBlur}
          disabled={disabled}
          tabIndex={-1}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
        />
      </label>
    </div>
  );
}

// ── PendingFileCard ───────────────────────────────────────────────────────────

function PendingFileCard({
  file,
  onRemove,
  onEdit,
}: {
  file: File;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const url = useMemo(
    () => (file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined),
    [file],
  );
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <article className="attachment-preview">
      <span className="attachment-thumbnail">{url ? <img src={url} alt="" /> : <FileText />}</span>
      <div className="attachment-meta">
        <strong title={file.name}>{file.name}</strong>
        <small>{Math.ceil(file.size / 1024)} KB · Yüklenmeyi bekliyor</small>
      </div>
      <div className="attachment-card-actions">
        {file.type.startsWith('image/') && (
          <button
            type="button"
            className="attachment-icon-button"
            aria-label={`${file.name} düzenle`}
            onClick={onEdit}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="attachment-icon-button danger"
          aria-label={`${file.name} kaldır`}
          onClick={onRemove}
        >
          <X size={14} />
        </button>
      </div>
    </article>
  );
}
