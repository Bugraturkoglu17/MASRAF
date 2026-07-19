// @ts-check
const base = require('@masraf/eslint-config/react');

module.exports = [
  ...base,
  {
    // React context dosyaları bilinçli olarak Provider bileşeni ile birlikte
    // kendi hook'unu (useAuth, useToast) dışa aktarır; bu, Fast Refresh
    // granülaritesini etkiler ama kabul edilen, yaygın bir kalıptır.
    files: ['**/*-context.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
];
