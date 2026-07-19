import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi giriniz.'),
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
