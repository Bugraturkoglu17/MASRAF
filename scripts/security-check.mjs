import { readFile } from 'node:fs/promises';

const files = {
  jwt: 'apps/api/src/modules/auth/strategies/jwt.strategy.ts',
  main: 'apps/api/src/main.ts',
  nginx: 'infrastructure/nginx/web.conf',
  sw: 'apps/web/vite.config.ts',
};

const source = Object.fromEntries(
  await Promise.all(Object.entries(files).map(async ([key, path]) => [key, await readFile(path, 'utf8')])),
);
const failures = [];
const requireText = (key, text, label) => {
  if (!source[key].includes(text)) failures.push(label);
};
const forbidText = (key, text, label) => {
  if (source[key].includes(text)) failures.push(label);
};

forbidText('jwt', 'fromUrlQueryParameter', 'Access token URL query parametresinden okunuyor.');
requireText('jwt', 'fromAuthHeaderAsBearerToken', 'Bearer token header doğrulaması eksik.');
requireText('main', 'if (appConfig.swaggerEnabled)', 'Swagger ortam koşulu eksik.');
for (const header of [
  'Content-Security-Policy',
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
]) requireText('nginx', header, `${header} eksik.`);
requireText('sw', "handler: 'NetworkOnly'", 'API NetworkOnly kuralı eksik.');
forbidText('sw', 'CacheFirst', 'CacheFirst stratejisi hassas veri riski için manuel incelenmeli.');

if (failures.length) {
  console.error(`Security kontrolü başarısız:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Security statik kontrolleri başarılı.');
