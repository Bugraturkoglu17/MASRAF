import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('404 başlığını ve ana sayfa bağlantısını gösterir', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Sayfa bulunamadı')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ana sayfaya dön/i })).toBeInTheDocument();
  });
});
