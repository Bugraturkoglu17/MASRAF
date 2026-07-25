export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Kullanıcı oluşturuldu',
  UPDATE: 'Kullanıcı düzenlendi',
  ASSIGN: 'Rol değiştirildi',
  ACTIVATE: 'Hesap aktif edildi',
  DEACTIVATE: 'Hesap pasife alındı',
  PASSWORD_RESET: 'Şifre sıfırlandı',
  SESSIONS_REVOKED: 'Oturumlar kapatıldı',
  LOGIN: 'Giriş yapıldı',
  LOGOUT: 'Çıkış yapıldı',
  APPROVE: 'Onaylandı',
  REJECT: 'Reddedildi',
  DELETE: 'Silindi',
  UPLOAD: 'Dosya yüklendi',
};
