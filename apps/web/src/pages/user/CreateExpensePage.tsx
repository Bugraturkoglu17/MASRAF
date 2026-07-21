import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileImage } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { useToast } from '@/components/feedback/toast-context';
import { LocalDraftRecoverySheet } from '@/components/pwa/LocalDraftRecoverySheet';
import { NetworkRequiredDialog } from '@/components/pwa/NetworkRequiredDialog';
import { AttachmentUploader } from '@/components/ui/AttachmentUploader';
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
  const [draftHandled, setDraftHandled] = useState(false);
  const [initialFiles] = useState<File[]>(() => {
    const state = location.state as { initialFiles?: unknown } | null;
    return Array.isArray(state?.initialFiles) &&
      state.initialFiles.every((item) => item instanceof File)
      ? state.initialFiles
      : [];
  });
  const isSaved = Boolean(savedExpenseId);
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
    const timeout = window.setTimeout(() => {
      void saveDraft({
        categoryId: formValues.categoryId,
        title: formValues.title,
        description: formValues.description,
        amount: typeof formValues.amount === 'number' ? formValues.amount : undefined,
        expenseDate: formValues.expenseDate,
        dueDate: formValues.dueDate,
      }).catch(() => showToast('Yerel taslak kaydedilemedi.', 'error'));
    }, 500);
    return () => window.clearTimeout(timeout);
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
    if (!values.dueDate || values.dueDate === '') {
      delete (values as Partial<FormValues>).dueDate;
    }

    if (editId) {
      await updateMut.mutateAsync(values);
      showToast('Masraf güncellendi.', 'success');
      navigate('/expenses?status=DRAFT');
    } else {
      const created = await createMut.mutateAsync(values);
      await clearDraft();
      showToast('Masraf taslak olarak kaydedildi. Belge ekleyebilirsiniz.', 'success');
      setSavedExpenseId(created.id);
    }
  });

  const handleDone = () => {
    navigate('/expenses?status=DRAFT');
  };

  const loading = isSubmitting || createMut.isPending || updateMut.isPending;

  const recoverLocalDraft = () => {
    if (!draft) return;
    reset({
      categoryId: draft.categoryId ?? '',
      title: draft.title ?? '',
      description: draft.description ?? '',
      amount: draft.amount,
      expenseDate: draft.expenseDate ?? '',
      dueDate: draft.dueDate ?? '',
    });
    setDraftHandled(true);
    showToast('Yerel taslak geri yüklendi.', 'success');
  };

  const deleteLocalDraft = () => {
    void clearDraft();
    reset();
    setDraftHandled(true);
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
        {!isSaved && initialFiles.length > 0 && (
          <section className="pending-attachment-selection" aria-label="Seçilen belgeler">
            <div>
              <FileImage aria-hidden="true" />
              <span>
                <strong>{initialFiles.length} belge hazır</strong>
                <small>Formu kaydettiğinizde güvenli yükleme başlayacak.</small>
              </span>
            </div>
            <div className="pending-attachment-grid">
              {initialFiles.map((file) => (
                <PendingFilePreview key={`${file.name}-${file.lastModified}`} file={file} />
              ))}
            </div>
          </section>
        )}
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
              <input
                id="expense-date"
                {...register('expenseDate')}
                type="date"
                style={inp(Boolean(errors.expenseDate))}
                disabled={isSaved && !editId}
              />
              {errors.expenseDate && (
                <p role="alert" style={errSt}>
                  {errors.expenseDate.message}
                </p>
              )}
            </div>

            {/* Due date — only shown when requiresDueDate */}
            {requiresDueDate && (
              <div>
                <label htmlFor="expense-due-date" style={labelSt}>
                  Vade Tarihi *{' '}
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-muted)' }}>
                    ({selectedCategory?.name} için zorunlu)
                  </span>
                </label>
                <input
                  id="expense-due-date"
                  {...register('dueDate')}
                  type="date"
                  style={inp(false)}
                  disabled={isSaved && !editId}
                />
              </div>
            )}

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

            {/* Save button — only if not yet saved */}
            {!isSaved && (
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

            {/* Edit (already saved) */}
            {editId && isSaved && (
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
                {loading ? 'Kaydediliyor...' : 'Güncelle'}
              </button>
            )}
          </div>
        </form>

        {/* Attachment uploader — shown after expense is saved */}
        {isSaved && savedExpenseId && !editId && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                letterSpacing: '0.05em',
                marginBottom: 12,
              }}
            >
              BELGELER (opsiyonel)
            </div>
            <AttachmentUploader
              expenseId={savedExpenseId}
              onFilesChange={setUploadedFiles}
              disabled={!isOnline}
              initialFiles={initialFiles}
            />
          </div>
        )}

        {/* Done button */}
        {isSaved && !editId && (
          <button
            type="button"
            onClick={handleDone}
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
      <LocalDraftRecoverySheet
        draft={
          !editId &&
          !isDraftLoading &&
          !draftHandled &&
          draft &&
          (draft.categoryId ||
            draft.title ||
            draft.description ||
            draft.amount ||
            draft.expenseDate ||
            draft.dueDate)
            ? draft
            : null
        }
        onRecover={recoverLocalDraft}
        onDelete={deleteLocalDraft}
      />
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

function PendingFilePreview({ file }: { file: File }) {
  const url = useMemo(
    () => (file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined),
    [file],
  );
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return <span title={file.name}>{url ? <img src={url} alt={file.name} /> : <FileImage />}</span>;
}
