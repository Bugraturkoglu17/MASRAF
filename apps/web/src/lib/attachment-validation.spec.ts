import { describe, expect, it } from 'vitest';

import { getAttachmentMimeType, getAttachmentValidationError } from './attachment-validation';

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
});
