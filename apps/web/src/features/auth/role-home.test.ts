import { describe, expect, it } from 'vitest';

import { getPostLoginPath, getRoleHome } from './role-home';

describe('role-based navigation', () => {
  it.each([
    ['USER', '/'],
    ['MANAGER', '/manager'],
    ['ADMIN', '/admin'],
  ] as const)('%s rolünü kendi ana sayfasına yönlendirir', (role, expected) => {
    expect(getRoleHome(role)).toBe(expected);
  });

  it('admin hesabını kullanıcı ana sayfasına göndermez', () => {
    expect(getPostLoginPath('ADMIN', '/')).toBe('/admin');
  });

  it('role uygun korumalı derin bağlantıyı korur', () => {
    expect(getPostLoginPath('ADMIN', '/admin/users?status=ACTIVE')).toBe(
      '/admin/users?status=ACTIVE',
    );
    expect(getPostLoginPath('MANAGER', '/manager/pending')).toBe('/manager/pending');
    expect(getPostLoginPath('USER', '/expenses?status=DRAFT')).toBe('/expenses?status=DRAFT');
  });
});
