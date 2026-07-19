import {
  assertValidAttachment,
  generateStorageKey,
  InvalidFileError,
  MAX_ATTACHMENT_SIZE_BYTES,
} from './file-validation';

describe('assertValidAttachment', () => {
  it('izinli mime type ve boyuttaki dosyayı kabul eder', () => {
    expect(() => assertValidAttachment('fis.pdf', 'application/pdf', 1024)).not.toThrow();
  });

  it('tehlikeli uzantıyı reddeder', () => {
    expect(() => assertValidAttachment('virus.exe', 'application/pdf', 1024)).toThrow(
      InvalidFileError,
    );
  });

  it('izinsiz mime type reddeder', () => {
    expect(() => assertValidAttachment('dosya.txt', 'text/plain', 1024)).toThrow(InvalidFileError);
  });

  it('boyut sınırını aşan dosyayı reddeder', () => {
    expect(() =>
      assertValidAttachment('fis.pdf', 'application/pdf', MAX_ATTACHMENT_SIZE_BYTES + 1),
    ).toThrow(InvalidFileError);
  });
});

describe('generateStorageKey', () => {
  it('tahmin edilemeyen ve orijinal ad içermeyen bir anahtar üretir', () => {
    const key = generateStorageKey('org-1', 'ozel-dosya-adi.pdf');
    expect(key).toMatch(/^attachments\/org-1\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{48}\.pdf$/);
    expect(key).not.toContain('ozel-dosya-adi');
  });
});
