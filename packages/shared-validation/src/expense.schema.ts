import { z } from 'zod';

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid('Geçerli bir kategori seçiniz.'),
  departmentId: z.string().uuid().optional(),
  title: z.string().trim().min(3, 'Başlık en az 3 karakter olmalıdır.').max(200),
  description: z.string().trim().max(2000).optional(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Tutar geçerli bir para değeri olmalıdır (örn. 150.00).'),
  currency: z
    .string()
    .length(3, 'Para birimi 3 harfli ISO kodu olmalıdır (örn. TRY).')
    .default('TRY'),
  expenseDate: z.string().datetime({ message: 'Masraf tarihi ISO 8601 formatında olmalıdır.' }),
  documentDate: z.string().datetime().optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const rejectExpenseSchema = z.object({
  reason: z.string().trim().min(3, 'Ret nedeni en az 3 karakter olmalıdır.').max(1000),
});
export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>;
