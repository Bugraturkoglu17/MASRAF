import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.js',
  '.jar',
  '.msi',
  '.dll',
]);

const MIME_BY_EXTENSION = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.heic', 'image/heic'],
  ['.pdf', 'application/pdf'],
]);

export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export class InvalidFileError extends Error {}

export function normalizeAttachmentMimeType(fileName: string, mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === 'image/jpg') return 'image/jpeg';
  if (ALLOWED_MIME_TYPES.has(normalized)) return normalized;
  return MIME_BY_EXTENSION.get(extname(fileName).toLowerCase()) ?? normalized;
}

export function assertValidAttachment(
  fileName: string,
  mimeType: string,
  sizeBytes: number,
  maxSizeBytes = MAX_ATTACHMENT_SIZE_BYTES,
): string {
  const ext = extname(fileName).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new InvalidFileError(`Dosya uzantısına izin verilmiyor: ${ext}`);
  }
  const normalizedMimeType = normalizeAttachmentMimeType(fileName, mimeType);
  if (!ALLOWED_MIME_TYPES.has(normalizedMimeType)) {
    throw new InvalidFileError('Yalnızca JPG, JPEG, PNG, WEBP, HEIC ve PDF dosyaları yüklenebilir.');
  }
  const expectedMimeType = MIME_BY_EXTENSION.get(ext);
  if (expectedMimeType && expectedMimeType !== normalizedMimeType) {
    throw new InvalidFileError('Dosya uzantısı ile içerik türü uyuşmuyor.');
  }
  if (sizeBytes <= 0) {
    throw new InvalidFileError('Boş dosyalar yüklenemez.');
  }
  if (sizeBytes > maxSizeBytes) {
    throw new InvalidFileError(`Dosya boyutu ${maxSizeBytes / (1024 * 1024)} MB sınırını aşıyor.`);
  }
  return normalizedMimeType;
}

/** Tahmin edilemeyen, orijinal ad ile ilişkilendirilmeyen depolama anahtarı üretir. */
export function generateStorageKey(organizationId: string, originalFileName: string): string {
  const ext = extname(originalFileName).toLowerCase();
  const random = randomBytes(24).toString('hex');
  const datePrefix = new Date().toISOString().slice(0, 10);
  return `attachments/${organizationId}/${datePrefix}/${random}${ext}`;
}
