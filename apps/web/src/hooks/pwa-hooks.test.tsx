import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectIosSafari } from './usePwaInstall';
import { getStandaloneMode } from './useStandaloneMode';

import { MobileBottomNavigation } from '@/components/navigation/MobileBottomNavigation';

describe('PWA cihaz ve görünüm tespiti', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('iOS Safari kullanıcı aracısını tanır', () => {
    expect(
      detectIosSafari(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(true);
  });

  it('iOS Chrome tarayıcısını Safari kurulum akışına almaz', () => {
    expect(
      detectIosSafari(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false);
  });

  it('display-mode standalone eşleşmesini tanır', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    expect(getStandaloneMode()).toBe(true);
  });
});

describe('mobil alt navigasyon', () => {
  it('USER rolünde dört hedef ve yalnızca üç seçenekli hızlı masraf menüsü gösterir', () => {
    render(
      <MemoryRouter>
        <MobileBottomNavigation role="USER" />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'Yeni masraf ekle' }));
    expect(screen.getAllByRole('button', { name: /Galeri|Kamera|Manuel/ })).toHaveLength(3);
    expect(screen.getByLabelText('Galeriden belge seç')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp',
    );
    expect(screen.getByLabelText('Galeriden belge seç')).toHaveAttribute('multiple');
    expect(screen.getByLabelText('Kamera ile belge çek')).toHaveAttribute('capture', 'environment');
    expect(screen.queryByText('QR Kod')).not.toBeInTheDocument();
    expect(screen.queryByText('Mesafe')).not.toBeInTheDocument();
  });

  it('MANAGER rolünde hızlı masraf düğmesi olmadan dört hedef gösterir', () => {
    render(
      <MemoryRouter>
        <MobileBottomNavigation role="MANAGER" />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Yeni masraf ekle' })).not.toBeInTheDocument();
  });

  it('ADMIN Menü düğmesi profile yönlendirmek yerine yönetim panelini açar', () => {
    render(
      <MemoryRouter>
        <MobileBottomNavigation role="ADMIN" />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.queryByRole('link', { name: /Menü/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Menü/ }));
    expect(screen.getByRole('dialog', { name: 'Yönetim menüsü' })).toBeInTheDocument();
  });
});
