import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { NotFoundPage } from './NotFoundPage';

function renderWithRouter(element: React.ReactElement) {
  const r = createMemoryRouter([{ path: '/', element }], {
    future: { v7_relativeSplatPath: true },
  });
  return render(<RouterProvider router={r} future={{ v7_startTransition: true }} />);
}

describe('NotFoundPage', () => {
  it('404 başlığını ve ana sayfa bağlantısını gösterir', () => {
    renderWithRouter(<NotFoundPage />);
    expect(screen.getByText('Sayfa bulunamadı')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ana sayfaya dön/i })).toBeInTheDocument();
  });
});
