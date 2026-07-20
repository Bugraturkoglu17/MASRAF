import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { useToast } from '@/components/feedback/toast-context';
import { apiFetch } from '@/lib/api-client';

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
}
interface Expense extends FormValues {
  id: string;
  status: string;
}

export function CreateExpensePage(): JSX.Element {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const { showToast } = useToast();
  const qc = useQueryClient();

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
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (editingExpense) {
      reset({
        categoryId: editingExpense.categoryId,
        title: editingExpense.title,
        description: editingExpense.description,
        amount: editingExpense.amount,
        expenseDate: editingExpense.expenseDate?.split('T')[0] ?? '',
        dueDate: editingExpense.dueDate?.split('T')[0] ?? '',
      });
    }
  }, [editingExpense, reset]);

  const createMut = useMutation({
    mutationFn: (data: FormValues) => apiFetch('/expenses', { method: 'POST', body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-counts'] });
      showToast('Masraf taslak olarak kaydedildi.', 'success');
      navigate('/expenses?status=DRAFT');
    },
    onError: () => showToast('Kaydedilemedi.', 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (data: FormValues) =>
      apiFetch(`/expenses/${editId}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      showToast('Masraf güncellendi.', 'success');
      navigate('/expenses?status=DRAFT');
    },
    onError: () => showToast('Güncellenemedi.', 'error'),
  });

  const onSubmit = handleSubmit((values) => {
    if (editId) updateMut.mutate(values);
    else createMut.mutate(values);
  });

  const loading = isSubmitting || createMut.isPending || updateMut.isPending;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}>
          <ArrowLeft size={16} /> Geri
        </button>
        <h1 style={titleStyle}>{editId ? 'Masrafı Düzenle' : 'Yeni Masraf'}</h1>
      </div>

      <div style={cardStyle}>
        <form onSubmit={onSubmit} noValidate>
          <div style={gridStyle}>
            <Field label="Kategori" error={errors.categoryId?.message} span={2}>
              <select {...register('categoryId')} style={inputStyle(Boolean(errors.categoryId))}>
                <option value="">Kategori seçiniz</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Başlık" error={errors.title?.message} span={2}>
              <input
                {...register('title')}
                placeholder="Masraf başlığı"
                style={inputStyle(Boolean(errors.title))}
              />
            </Field>

            <Field label="Tutar (₺)" error={errors.amount?.message}>
              <input
                {...register('amount')}
                type="number"
                step="0.01"
                placeholder="0.00"
                style={inputStyle(Boolean(errors.amount))}
              />
            </Field>

            <Field label="Masraf Tarihi" error={errors.expenseDate?.message}>
              <input
                {...register('expenseDate')}
                type="date"
                style={inputStyle(Boolean(errors.expenseDate))}
              />
            </Field>

            <Field label="Vade Tarihi (opsiyonel)">
              <input {...register('dueDate')} type="date" style={inputStyle(false)} />
            </Field>

            <Field label="Açıklama (opsiyonel)" span={2}>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Masraf hakkında not ekleyin..."
                style={{ ...inputStyle(false), resize: 'vertical', fontFamily: 'inherit' }}
              />
            </Field>
          </div>

          <div style={actionsStyle}>
            <button type="button" onClick={() => navigate(-1)} style={cancelBtnStyle}>
              İptal
            </button>
            <button type="submit" disabled={loading} style={submitBtnStyle}>
              {loading ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Taslak Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  span,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  span?: number;
}): JSX.Element {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined, marginBottom: 0 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p style={errStyle}>{error}</p>}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: '28px 32px', maxWidth: 720 };
const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  marginBottom: 24,
};
const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text)',
  fontSize: 13,
  cursor: 'pointer',
};
const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--color-text)',
  margin: 0,
};
const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '28px 24px',
  boxShadow: 'var(--shadow-sm)',
};
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px 20px',
  marginBottom: 24,
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text)',
  marginBottom: 6,
};
const inputStyle = (hasErr: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  border: `1px solid ${hasErr ? 'var(--color-danger)' : 'var(--color-border)'}`,
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 14,
  boxSizing: 'border-box',
});
const errStyle: React.CSSProperties = {
  color: 'var(--color-danger)',
  fontSize: 12,
  margin: '4px 0 0',
};
const actionsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 12 };
const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text)',
  fontSize: 14,
  cursor: 'pointer',
};
const submitBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--color-primary)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};
