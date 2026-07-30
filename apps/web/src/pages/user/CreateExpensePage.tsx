import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  type Location,
  useBlocker,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { z } from 'zod';

import { useToast } from '@/components/feedback/toast-context';
import { NetworkRequiredDialog } from '@/components/pwa/NetworkRequiredDialog';
import { AttachmentUploader } from '@/components/ui/AttachmentUploader';
import { DatePickerTr } from '@/components/ui/DatePickerTr';
import { TurkeyIbanInput } from '@/components/ui/TurkeyIbanInput';
import { useAuth } from '@/features/auth/auth-context';
import { useAttachmentUploads, type UploadedFile } from '@/hooks/useAttachmentUploads';
import { useLocalExpenseDraft } from '@/hooks/useLocalExpenseDraft';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';
import { DEFAULT_MAX_ATTACHMENT_SIZE } from '@/lib/attachment-validation';
import { getExpenseDateMax, toLocalIsoDate } from '@/lib/date-limits';
import { decimalToTurkishInput, formatTurkishMoneyInput, toDecimalString } from '@/lib/money';

const schema = z
  .object({
    categoryId: z.string().uuid('Kategori seçiniz'),
    title: z.string().min(1, 'Başlık zorunludur'),
    description: z.string().optional(),
    amount: z
      .string()
      .refine((value) => toDecimalString(value) !== null, 'Geçerli bir tutar giriniz'),
    expenseDate: z
      .string()
      .min(1, 'Masraf tarihi zorunludur')
      .refine(
        (value) => !value || value <= getExpenseDateMax(),
        'Masraf tarihi en fazla 2 ay sonrası olabilir.',
      ),
    dueDate: z
      .string()
      .optional()
      .refine(
        (value) => !value || value >= toLocalIsoDate(),
        'Vade tarihi geçmiş bir tarih olamaz.',
      ),
    hasRecipient: z.boolean().optional().default(false),
    recipientFirstName: z.string().max(100).optional(),
    recipientLastName: z.string().max(100).optional(),
    recipientIban: z.string().optional(),
    recipientCompanyName: z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.hasRecipient) return;
    if (!data.recipientFirstName?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['recipientFirstName'],
        message: 'Alıcı adı zorunludur',
      });
    }
    if (!data.recipientLastName?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['recipientLastName'],
        message: 'Alıcı soyadı zorunludur',
      });
    }
    const iban = data.recipientIban?.replace(/\s/g, '').toUpperCase() ?? '';
    if (!iban) {
      ctx.addIssue({ code: 'custom', path: ['recipientIban'], message: 'Alıcı IBAN zorunludur' });
    } else if (!/^TR\d{24}$/.test(iban)) {
      ctx.addIssue({
        code: 'custom',
        path: ['recipientIban'],
        message: 'Geçerli bir Türkiye IBAN giriniz (TR + 24 rakam)',
      });
    }
  });

type FormValues = z.infer<typeof schema>;
type Payload = Omit<
  FormValues,
  | 'hasRecipient'
  | 'recipientFirstName'
  | 'recipientLastName'
  | 'recipientIban'
  | 'recipientCompanyName'
> & {
  amount: string;
  paymentRecipientType: 'SELF' | 'THIRD_PARTY';
  recipientFirstName?: string | null;
  recipientLastName?: string | null;
  recipientIban?: string | null;
  recipientCompanyName?: string | null;
};

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
  paymentRecipientType?: string;
  recipientFirstName?: string | null;
  recipientLastName?: string | null;
  recipientIban?: string | null;
  recipientCompanyName?: string | null;
}

interface UploadConfig {
  uploads?: { maxFiles: number; maxFileSizeBytes: number; allowedMimeTypes: string[] };
}

type SubmitPhase = 'idle' | 'uploading' | 'saving';

export function CreateExpensePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const savedId = params.get('saved');
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const qc = useQueryClient();

  // Masraf taslağının kimliği. State render için, ref ise senkron okuma içindir —
  // aynı taslağın iki kez oluşturulmasını ref engeller.
  const [savedExpenseId, setSavedExpenseId] = useState<string | null>(editId ?? savedId);
  const expenseIdRef = useRef<string | null>(editId ?? savedId);
  const submitLockRef = useRef(false);
  const initialFilesHandledRef = useRef(false);
  const allowNavRef = useRef(false); // kayıt sonrası blocker'ı geçer

  const [showNetworkDialog, setShowNetworkDialog] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [showExitModal, setShowExitModal] = useState(false);
  const [savingOnExit, setSavingOnExit] = useState(false);
  const [discardingDraft, setDiscardingDraft] = useState(false);
  const exitModalOpenRef = useRef(false); // çift modal koruması
  const [uploadLimits, setUploadLimits] = useState({
    maxFiles: 5,
    maxFileSizeBytes: DEFAULT_MAX_ATTACHMENT_SIZE,
  });

  const uploads = useAttachmentUploads({
    maxFiles: uploadLimits.maxFiles,
    maxFileSizeBytes: uploadLimits.maxFileSizeBytes,
    onError: (message) => showToast(message, 'error'),
  });

  const { clearDraft } = useLocalExpenseDraft(user?.id, user?.organizationId);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/expense-categories'),
  });

  // Yalnızca düzenleme modunda sunucudaki değerler forma yazılır. `?saved=` modunda
  // form kullanıcının yazdığı hâliyle kalır — reset kullanıcının girdisini silmemeli.
  const { data: editingExpense } = useQuery<Expense>({
    queryKey: ['expense', editId],
    queryFn: () => apiFetch(`/expenses/${editId}`),
    enabled: Boolean(editId),
  });

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  const selectedCategoryId = useWatch({ control, name: 'categoryId' });
  const hasRecipient = useWatch({ control, name: 'hasRecipient' });
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const requiresDueDate = selectedCategory?.requiresDueDate ?? false;

  useEffect(() => {
    void apiFetch<UploadConfig>('/app/config')
      .then((value) => value.uploads && setUploadLimits(value.uploads))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (editingExpense) {
      const isThirdParty = editingExpense.paymentRecipientType === 'THIRD_PARTY';
      reset({
        categoryId: editingExpense.categoryId,
        title: editingExpense.title,
        description: editingExpense.description,
        amount: decimalToTurkishInput(editingExpense.amount),
        expenseDate: editingExpense.expenseDate?.split('T')[0] ?? '',
        dueDate: editingExpense.dueDate?.split('T')[0] ?? '',
        hasRecipient: isThirdParty,
        recipientFirstName: isThirdParty ? (editingExpense.recipientFirstName ?? '') : '',
        recipientLastName: isThirdParty ? (editingExpense.recipientLastName ?? '') : '',
        recipientIban: isThirdParty ? (editingExpense.recipientIban ?? '') : '',
        recipientCompanyName: isThirdParty ? (editingExpense.recipientCompanyName ?? '') : '',
      });
    }
  }, [editingExpense, reset]);

  // Mevcut ekleri (düzenleme veya sayfa yenilemesi sonrası) kuyruğa yansıt.
  useEffect(() => {
    const expenseId = editId ?? savedId;
    if (!expenseId) return;
    void apiFetch<UploadedFile[]>(`/attachments/expense/${expenseId}`)
      .then((files) => files.length > 0 && uploads.hydrate(files))
      .catch(() => undefined);
    uploads.attachExpense(expenseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, savedId]);

  // Başka bir ekrandan dosya ile gelindiyse (ör. PWA paylaşım hedefi) kuyruğa al.
  useEffect(() => {
    if (initialFilesHandledRef.current) return;
    initialFilesHandledRef.current = true;
    const state = location.state as { initialFiles?: unknown } | null;
    const files = Array.isArray(state?.initialFiles)
      ? state.initialFiles.filter((item): item is File => item instanceof File)
      : [];
    if (files.length > 0) uploads.addFiles(files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Geri çıkış blocker ───────────────────────────────────────────────────
  const isFormDirty = isDirty || uploads.userModified;

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: Location; nextLocation: Location }) =>
        !allowNavRef.current && isFormDirty && currentLocation.pathname !== nextLocation.pathname,
      [isFormDirty],
    ),
  );

  useEffect(() => {
    if (blocker.state === 'blocked' && !exitModalOpenRef.current) {
      exitModalOpenRef.current = true;
      setShowExitModal(true);
    }
  }, [blocker.state]);

  useEffect(() => {
    if (!showExitModal) exitModalOpenRef.current = false;
  }, [showExitModal]);

  const handleBack = () => {
    if (isFormDirty) {
      setShowExitModal(true);
    } else {
      navigate(-1);
    }
  };

  const handleExitSave = async () => {
    setSavingOnExit(true);
    try {
      if (!isOnline) {
        setShowNetworkDialog(true);
        setSavingOnExit(false);
        return;
      }
      const isValid = await trigger();
      if (!isValid) {
        showToast('Kaydetmek için zorunlu alanları doldurun.', 'error');
        return;
      }
      const values = getValues();
      const payload = buildPayload(values);
      if (!payload) {
        showToast('Geçerli bir tutar girin.', 'error');
        return;
      }
      const ensured = editId ? { id: editId, created: false } : await ensureExpense(payload);
      if (!ensured.created) {
        await updateMut.mutateAsync({ id: ensured.id, data: payload });
      }
      if (uploads.items.some((item) => item.status !== 'done')) {
        await uploads.flush(ensured.id);
      }
      await clearDraft();
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-counts'] });
      showToast('Taslak kaydedildi.', 'success');
      allowNavRef.current = true;
      setShowExitModal(false);
      if (blocker.state === 'blocked') blocker.proceed();
      else navigate(-1);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Kaydedilemedi.'), 'error');
    } finally {
      setSavingOnExit(false);
    }
  };

  // "İptal Et" = taslağı sil ve çık
  const handleCancelExit = async () => {
    setDiscardingDraft(true);
    try {
      if (expenseIdRef.current) {
        await apiFetch(`/expenses/${expenseIdRef.current}`, { method: 'DELETE' });
      }
      await clearDraft();
    } catch {
      // Taslak silinemese bile çıkışa izin ver
    } finally {
      setDiscardingDraft(false);
    }
    allowNavRef.current = true;
    setShowExitModal(false);
    if (blocker.state === 'blocked') blocker.proceed();
    else navigate(-1);
  };

  useEffect(() => {
    document.documentElement.dataset.unsavedForm = String(isDirty && !savedExpenseId);
    return () => {
      delete document.documentElement.dataset.unsavedForm;
    };
  }, [isDirty, savedExpenseId]);

  // Hata mesajını burada göstermiyoruz: taslak oluşturma hem dosya seçiminde
  // (arka planda, sessiz) hem de kaydederken denenir. Arka plan denemesi
  // başarısız olursa kullanıcı rahatsız edilmez; hata yalnızca kullanıcı
  // "kaydet" dediğinde onSubmit tarafından gösterilir.
  const createMut = useMutation({
    mutationFn: (data: Payload) =>
      apiFetch<{ id: string }>('/expenses', { method: 'POST', body: data }),
  });

  // Hata mesajı onSubmit'teki tek catch bloğunda gösterilir (çift toast olmasın).
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Payload }) =>
      apiFetch(`/expenses/${id}`, { method: 'PATCH', body: data }),
  });

  const buildPayload = (values: FormValues): Payload | null => {
    const amount = toDecimalString(values.amount);
    if (!amount) return null;
    const {
      hasRecipient: _hr,
      recipientFirstName,
      recipientLastName,
      recipientIban,
      recipientCompanyName,
      ...rest
    } = values;
    const isThirdParty = values.hasRecipient === true;
    const payload: Payload = {
      ...rest,
      amount,
      paymentRecipientType: isThirdParty ? 'THIRD_PARTY' : 'SELF',
      ...(isThirdParty
        ? {
            recipientFirstName: recipientFirstName?.trim() || null,
            recipientLastName: recipientLastName?.trim() || null,
            recipientIban: recipientIban?.replace(/\s/g, '').toUpperCase() || null,
            recipientCompanyName: recipientCompanyName?.trim() || null,
          }
        : {
            recipientFirstName: null,
            recipientLastName: null,
            recipientIban: null,
            recipientCompanyName: null,
          }),
    };
    if (!payload.dueDate) delete (payload as { dueDate?: string }).dueDate;
    return payload;
  };

  /**
   * Masraf taslağını oluşturur (yoksa) ve kimliğini döndürür.
   * `expenseIdRef` senkron okunduğu için aynı taslak asla iki kez yaratılmaz.
   * `created`, çağıranın gereksiz bir PATCH atmasını önlemek için döndürülür.
   */
  const ensureExpense = async (payload: Payload): Promise<{ id: string; created: boolean }> => {
    const existing = expenseIdRef.current;
    if (existing) return { id: existing, created: false };
    const created = await createMut.mutateAsync(payload);
    expenseIdRef.current = created.id;
    setSavedExpenseId(created.id);
    // Sayfa yenilenirse aynı taslağa devam edilsin diye kimlik URL'de tutulur.
    navigate(`/expenses/new?saved=${created.id}`, { replace: true });
    uploads.attachExpense(created.id);
    return { id: created.id, created: true };
  };

  // ── Dosya seçimi: yükleme burada başlar, "kaydet" butonunda değil ──────────

  useEffect(() => {
    if (uploads.items.length === 0 || expenseIdRef.current || !isOnline) return;
    // Yeni dosya kuyruğa girdi ve henüz taslak yok: form geçerliyse taslağı
    // hemen oluşturup yüklemeyi başlat, böylece kullanıcı beklemek zorunda kalmaz.
    let cancelled = false;
    void (async () => {
      const isValid = await trigger();
      if (cancelled || !isValid || expenseIdRef.current) return;
      const payload = buildPayload(getValues());
      if (!payload) return;
      try {
        await ensureExpense(payload);
      } catch {
        // createMut hatayı kullanıcıya gösterir; dosyalar kuyrukta bekler.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads.items.length, isOnline]);

  // ── Tek tıklamalı kaydetme ────────────────────────────────────────────────

  const submitValues = async (values: FormValues) => {
    if (submitLockRef.current) return; // çift kayıt koruması
    submitLockRef.current = true;
    try {
      if (!isOnline) {
        setShowNetworkDialog(true);
        return;
      }
      const payload = buildPayload(values);
      if (!payload) return;

      setSubmitPhase('saving');
      let expenseId: string;
      try {
        const ensured = editId ? { id: editId, created: false } : await ensureExpense(payload);
        expenseId = ensured.id;

        // Taslak `ensureExpense` içinde yeni oluştuysa değerler zaten yazıldı;
        // aksi hâlde (dosya seçiminde oluşmuş taslak veya edit modu) güncellenir.
        if (!ensured.created) {
          await updateMut.mutateAsync({ id: expenseId, data: payload });
        }
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Kaydedilemedi.'), 'error');
        return;
      }

      // Devam eden yüklemeler aynı tıklamanın içinde beklenir; kullanıcıdan
      // ikinci kez butona basması istenmez.
      if (uploads.items.some((item) => item.status !== 'done')) {
        setSubmitPhase('uploading');
      }
      const result = await uploads.flush(expenseId);

      if (result.failed.length > 0) {
        showToast(
          `${result.failed.length} belge yüklenemedi. Yeniden deneyip tekrar kaydedin.`,
          'error',
        );
        return; // başarısız dosya varken taslak kaydı başarılı gösterilmez
      }

      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-counts'] });
      await clearDraft();
      allowNavRef.current = true;
      showToast(editId ? 'Masraf güncellendi.' : 'Taslak kaydedildi.', 'success');
      navigate('/expenses?status=DRAFT');
    } finally {
      submitLockRef.current = false;
      setSubmitPhase('idle');
    }
  };

  // handleSubmit() render sırasında değil, submit anında çağrılır — böylece
  // submitLockRef render fazında okunmuş olmaz.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit(submitValues)(event);
  };

  const loading = isSubmitting || submitPhase !== 'idle';
  const submitLabel =
    submitPhase === 'uploading'
      ? 'Fatura yükleniyor…'
      : loading
        ? 'Kaydediliyor...'
        : editId
          ? 'Güncelle'
          : 'Taslak olarak kaydet';

  const inp = (hasErr: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1.5px solid ${hasErr ? 'var(--color-danger)' : 'var(--color-border)'}`,
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontSize: 16,
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
          onClick={handleBack}
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
              >
                <option value="">Kategori seçiniz</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
              />
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="expense-amount" style={labelSt}>
                Tutar (₺) *
              </label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <input
                    id="expense-amount"
                    name={field.name}
                    ref={field.ref}
                    value={field.value ?? ''}
                    onBlur={(event) => {
                      field.onBlur();
                      const decimal = toDecimalString(event.target.value);
                      if (decimal) field.onChange(decimalToTurkishInput(decimal));
                    }}
                    onChange={(event) =>
                      field.onChange(formatTurkishMoneyInput(event.target.value))
                    }
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0,00"
                    style={inp(Boolean(errors.amount))}
                  />
                )}
              />
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
                  <DatePickerTr
                    id="expense-date"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    style={inp(Boolean(errors.expenseDate))}
                    max={getExpenseDateMax()}
                  />
                )}
              />
            </div>

            {/* Due date */}
            <div>
              <label htmlFor="expense-due-date" style={labelSt}>
                Vade Tarihi{requiresDueDate ? ' *' : ''}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: 'var(--color-text-muted)',
                    marginLeft: 4,
                  }}
                >
                  {requiresDueDate ? `(${selectedCategory?.name} için zorunlu)` : '(opsiyonel)'}
                </span>
              </label>
              <Controller
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <DatePickerTr
                    id="expense-due-date"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    style={inp(Boolean(errors.dueDate))}
                    clearable={!requiresDueDate}
                    min={toLocalIsoDate()}
                  />
                )}
              />
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
              />
            </div>

            {/* Alıcı Bilgisi */}
            <div
              style={{
                border: '1.5px solid var(--color-border)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <Controller
                control={control}
                name="hasRecipient"
                render={({ field }) => (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '14px 14px',
                      cursor: 'pointer',
                      background: field.value ? 'var(--color-surface)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={(e) => {
                        field.onChange(e.target.checked);
                        if (!e.target.checked) {
                          setValue('recipientFirstName', '');
                          setValue('recipientLastName', '');
                          setValue('recipientIban', '');
                          setValue('recipientCompanyName', '');
                        }
                      }}
                      style={{
                        marginTop: 2,
                        width: 16,
                        height: 16,
                        flexShrink: 0,
                        accentColor: 'var(--color-primary)',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                        Alıcı Bilgisi
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Ödeme başka bir kişiye veya taşeron firmaya yapılacaksa işaretleyin.
                      </div>
                    </div>
                  </label>
                )}
              />

              {hasRecipient && (
                <div
                  style={{
                    borderTop: '1px solid var(--color-border)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    background: 'var(--color-bg)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelSt}>Alıcı Adı *</label>
                      <input
                        {...register('recipientFirstName')}
                        placeholder="Ad"
                        style={inp(Boolean(errors.recipientFirstName))}
                      />
                      {errors.recipientFirstName && (
                        <p
                          style={{ color: 'var(--color-danger)', fontSize: 12, margin: '4px 0 0' }}
                        >
                          {errors.recipientFirstName.message}
                        </p>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelSt}>Alıcı Soyadı *</label>
                      <input
                        {...register('recipientLastName')}
                        placeholder="Soyad"
                        style={inp(Boolean(errors.recipientLastName))}
                      />
                      {errors.recipientLastName && (
                        <p
                          style={{ color: 'var(--color-danger)', fontSize: 12, margin: '4px 0 0' }}
                        >
                          {errors.recipientLastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={labelSt}>Alıcı IBAN *</label>
                    <Controller
                      control={control}
                      name="recipientIban"
                      render={({ field }) => (
                        <TurkeyIbanInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          style={inp(Boolean(errors.recipientIban))}
                          placeholder="TR00 0000 0000 0000 0000 0000 00"
                        />
                      )}
                    />
                    {errors.recipientIban && (
                      <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: '4px 0 0' }}>
                        {errors.recipientIban.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={labelSt}>
                      Firma Adı
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
                    </label>
                    <input
                      {...register('recipientCompanyName')}
                      placeholder="Firma / şirket adı"
                      style={inp(false)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            {isSubmitted && Object.keys(errors).length > 0 && (
              <p
                role="alert"
                style={{
                  color: 'var(--color-danger)',
                  fontSize: 13,
                  margin: '0 0 8px',
                  textAlign: 'center',
                }}
              >
                Lütfen zorunlu alanları eksiksiz doldurun.
              </p>
            )}
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
              {submitLabel}
            </button>
          </div>
        </form>

        {/* ── Belge / Fatura alanı ── */}
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

          <AttachmentUploader
            uploads={uploads}
            maxFiles={uploadLimits.maxFiles}
            maxFileSizeBytes={uploadLimits.maxFileSizeBytes}
            disabled={!isOnline}
            awaitingExpense={!savedExpenseId}
          />
        </div>
      </div>

      <NetworkRequiredDialog open={showNetworkDialog} onClose={() => setShowNetworkDialog(false)} />
      <ExitConfirmModal
        open={showExitModal}
        saving={savingOnExit}
        discarding={discardingDraft}
        onSave={() => {
          void handleExitSave();
        }}
        onCancel={() => {
          void handleCancelExit();
        }}
      />
    </div>
  );
}

function ExitConfirmModal({
  open,
  saving,
  discarding,
  onSave,
  onCancel,
}: {
  open: boolean;
  saving: boolean;
  discarding: boolean;
  onSave: () => void;
  onCancel: () => void;
}): JSX.Element | null {
  if (!open) return null;
  const busy = saving || discarding;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1500,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '16px 16px 0 0',
          padding: '24px 20px',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          width: '100%',
        }}
      >
        <h3
          style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}
        >
          Çıkmak istiyor musunuz?
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--color-text-muted)' }}>
          Kaydedilmemiş değişiklikleriniz var.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1,
              padding: '13px',
              borderRadius: 10,
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontWeight: 600,
              fontSize: 15,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {discarding ? 'Siliniyor…' : 'İptal Et'}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            style={{
              flex: 1,
              padding: '13px',
              borderRadius: 10,
              border: 'none',
              background: busy ? 'var(--color-border)' : 'var(--color-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
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
