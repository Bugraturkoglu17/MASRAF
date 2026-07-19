import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PermissionGate } from './PermissionGate';

describe('PermissionGate', () => {
  it('gerekli izinler mevcutsa içeriği gösterir', () => {
    render(
      <PermissionGate permissions={['READ:EXPENSE', 'CREATE:EXPENSE']} required={['READ:EXPENSE']}>
        <span>Görünür içerik</span>
      </PermissionGate>,
    );
    expect(screen.getByText('Görünür içerik')).toBeInTheDocument();
  });

  it('gerekli izin eksikse fallback gösterir', () => {
    render(
      <PermissionGate
        permissions={['READ:EXPENSE']}
        required={['APPROVE:EXPENSE']}
        fallback={<span>Yetkisiz</span>}
      >
        <span>Görünür içerik</span>
      </PermissionGate>,
    );
    expect(screen.queryByText('Görünür içerik')).not.toBeInTheDocument();
    expect(screen.getByText('Yetkisiz')).toBeInTheDocument();
  });
});
