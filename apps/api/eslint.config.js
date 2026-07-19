// @ts-check
const base = require('@masraf/eslint-config/node');

module.exports = [
  ...base,
  {
    // NestJS'in DI container'ı, constructor parametrelerinin tipini
    // reflect-metadata (emitDecoratorMetadata) ile çalışma zamanında okur.
    // `import type` bu referansı derleme çıktısından tamamen siler ve
    // "Nest can't resolve dependencies" hatasına yol açar; bu yüzden bu
    // kural NestJS kaynak kodunda kapalıdır (import stili tercihi, çalışma
    // zamanı doğruluğundan önemli değildir).
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    // Seed betiği bir CLI aracıdır; operatöre ilerleme bilgisi vermek için
    // console.log kullanımı burada meşrudur.
    files: ['prisma/seed.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
