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

export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export class InvalidFileError extends Error {}

export function assertValidAttachment(
  fileName: string,
  mimeType: string,
  sizeBytes: number,
  maxSizeBytes = MAX_ATTACHMENT_SIZE_BYTES,
): void {
  const ext = extname(fileName).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new InvalidFileError(`Dosya uzantısına izin verilmiyor: ${ext}`);
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new InvalidFileError(`Dosya türüne izin verilmiyor: ${mimeType}`);
  }
  if (sizeBytes > maxSizeBytes) {
    throw new InvalidFileError(`Dosya boyutu ${maxSizeBytes / (1024 * 1024)} MB sınırını aşıyor.`);
  }
}

/** Tahmin edilemeyen, orijinal ad ile ilişkilendirilmeyen depolama anahtarı üretir. */
export function generateStorageKey(organizationId: string, originalFileName: string): string {
  const ext = extname(originalFileName).toLowerCase();
  const random = randomBytes(24).toString('hex');
  const datePrefix = new Date().toISOString().slice(0, 10);
  return `attachments/${organizationId}/${datePrefix}/${random}${ext}`;
}
