// @ts-check
const base = require('@masraf/eslint-config/node');

module.exports = [
  ...base,
  {
    // Seed betiği bir CLI aracıdır; operatöre ilerleme bilgisi vermek için
    // console.log kullanımı burada meşrudur.
    files: ['prisma/seed.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
