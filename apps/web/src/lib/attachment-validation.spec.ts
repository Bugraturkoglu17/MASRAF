import { describe, expect, it } from 'vitest';

import {
  getAttachmentMimeType,
  getAttachmentValidationError,
  getUploadTimeoutMs,
} from './attachment-validation';

describe('attachment validation', () => {
  it.each([
    ['receipt.jpg', 'image/jpeg'],
    ['receipt.jpeg', 'image/jpg'],
    ['receipt.png', 'image/png'],
    ['receipt.pdf', 'application/pdf'],
  ])('accepts %s', (name, type) => {
    expect(getAttachmentValidationError({ name, type, size: 128 })).toBeNull();
  });

  it('infers a missing browser MIME type from a safe extension', () => {
    expect(getAttachmentMimeType({ name: 'receipt.jpeg', type: '' })).toBe('image/jpeg');
  });

  it('mobil yükleme timeoutunu signed URL süresine göre en az 2 dakika verir', () => {
    expect(getUploadTimeoutMs(60)).toBe(120_000);
    expect(getUploadTimeoutMs(300)).toBe(270_000);
    expect(getUploadTimeoutMs(900)).toBe(600_000);
  });
});
