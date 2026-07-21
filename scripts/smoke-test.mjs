const baseUrl = (process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const production = process.env.APP_ENVIRONMENT === 'production' || process.env.CI_ENVIRONMENT_NAME === 'production';
if (production && !baseUrl.startsWith('https://')) {
  throw new Error('Production smoke testi HTTPS URL gerektirir.');
}

const checks = [
  ['web', '/', [200]],
  ['manifest', '/manifest.webmanifest', [200]],
  ['service-worker', '/sw.js', [200]],
  ['api-live', '/health/live', [200]],
  ['api-ready', '/health/ready', [200]],
  ['api-storage', '/health/storage', [200]],
  ['login-contract', '/api/v1/auth/login', [400, 401]],
];

for (const [name, path, expected] of checks) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: name === 'login-contract' ? 'POST' : 'GET',
    headers: name === 'login-contract' ? { 'content-type': 'application/json' } : undefined,
    body: name === 'login-contract' ? JSON.stringify({ email: 'invalid', password: 'invalid' }) : undefined,
    redirect: 'manual',
  });
  if (!expected.includes(response.status)) {
    throw new Error(`${name}: ${response.status}, beklenen ${expected.join('/')}`);
  }
  if (name === 'web') {
    for (const header of ['content-security-policy', 'x-content-type-options', 'referrer-policy']) {
      if (!response.headers.get(header)) throw new Error(`web: ${header} başlığı eksik.`);
    }
  }
  console.log(`${name}: ${response.status}`);
}

console.log('Smoke test başarılı.');
