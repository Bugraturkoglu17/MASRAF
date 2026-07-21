import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = resolve(root, 'dist');
const manifestPath = resolve(dist, 'manifest.webmanifest');
const requiredSizes = [48, 72, 96, 128, 144, 152, 180, 192, 384, 512];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(existsSync(manifestPath), 'manifest.webmanifest oluşturulmadı.');
assert(existsSync(resolve(dist, 'sw.js')), 'Service worker oluşturulmadı.');
assert(existsSync(resolve(dist, 'offline.html')), 'Offline ekranı build çıktısında yok.');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert(manifest.name === 'Masraf Uygulaması', 'Manifest adı hatalı.');
assert(manifest.display === 'standalone', 'Standalone modu eksik.');
assert(manifest.orientation === 'portrait-primary', 'Portrait orientation eksik.');
assert(manifest.lang === 'tr-TR', 'Manifest dili tr-TR değil.');
assert(manifest.dir === 'ltr', 'Manifest yönü eksik.');
assert(
  Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 3,
  'PWA kısayolları eksik.',
);

for (const size of requiredSizes) {
  const icon = manifest.icons.find(
    (entry) => entry.sizes === `${size}x${size}` && entry.purpose === 'any',
  );
  assert(icon, `${size}x${size} normal ikon manifestte yok.`);
  assert(existsSync(resolve(dist, icon.src)), `${icon.src} build çıktısında yok.`);
}

for (const size of [192, 384, 512]) {
  const icon = manifest.icons.find(
    (entry) => entry.sizes === `${size}x${size}` && entry.purpose === 'maskable',
  );
  assert(icon, `${size}x${size} maskable ikon manifestte yok.`);
  assert(existsSync(resolve(dist, icon.src)), `${icon.src} build çıktısında yok.`);
}

process.stdout.write(
  `PWA doğrulaması başarılı: ${manifest.icons.length} ikon, ${manifest.shortcuts.length} kısayol.\n`,
);
