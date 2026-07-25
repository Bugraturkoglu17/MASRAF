import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/u, 'Geçerli bir e-posta adresi giriniz.');

export const loginIdentifierSchema = z
  .string()
  .trim()
  .min(1, 'E-posta veya telefon numarası zorunludur.')
  .refine((value) => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) return true;
    const digits = value.replace(/\D/g, '');
    const local = digits.startsWith('90')
      ? digits.slice(2)
      : digits.startsWith('0')
        ? digits.slice(1)
        : digits;
    return /^5\d{9}$/.test(local);
  }, 'Geçerli bir e-posta veya cep telefonu giriniz (5XX XXX XX XX).')
  .transform((value) => (value.includes('@') ? value.toLowerCase() : value));

export const loginSchema = z.object({
  identifier: loginIdentifierSchema,
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token zorunludur.'),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(8, 'Yeni şifre en az 8 karakter olmalıdır.')
    .regex(/[A-Z]/, 'En az bir büyük harf içermelidir.')
    .regex(/[a-z]/, 'En az bir küçük harf içermelidir.')
    .regex(/[0-9]/, 'En az bir rakam içermelidir.'),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
