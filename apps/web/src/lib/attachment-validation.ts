export const DEFAULT_MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;

export function getUploadTimeoutMs(expiresInSeconds: number): number {
  return Math.max(120_000, Math.min(Math.max(1, expiresInSeconds - 30) * 1000, 600_000));
}

const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  webp: 'image/webp',
  heic: 'image/heic',
};

export function getAttachmentMimeType(file: Pick<File, 'name' | 'type'>): string | null {
  const declared = file.type.toLowerCase();
  if (declared === 'image/jpg') return 'image/jpeg';
  if (SUPPORTED_MIME_TYPES.includes(declared)) return declared;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? null;
}

export function getAttachmentValidationError(
  file: Pick<File, 'name' | 'type' | 'size'>,
  maxSizeBytes = DEFAULT_MAX_ATTACHMENT_SIZE,
): string | null {
  if (!getAttachmentMimeType(file)) {
    return `${file.name}: yalnızca JPG, JPEG, PNG, WEBP, HEIC ve PDF dosyaları yüklenebilir.`;
  }
  if (file.size <= 0) return `${file.name}: dosya boş olduğu için yüklenemedi.`;
  if (file.size > maxSizeBytes) {
    return `${file.name}: dosya boyutu ${(maxSizeBytes / 1024 / 1024).toFixed(0)} MB sınırını aşıyor.`;
  }
  return null;
}
