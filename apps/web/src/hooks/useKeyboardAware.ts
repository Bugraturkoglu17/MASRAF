import { useEffect } from 'react';

function findScrollParent(el: HTMLElement): HTMLElement {
  let current: HTMLElement | null = el.parentElement;
  while (current && current !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(current);
    if (overflowY === 'auto' || overflowY === 'scroll') return current;
    current = current.parentElement;
  }
  return document.documentElement;
}

export function useKeyboardAware(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    // Capture initial window height before any keyboard opens
    const initialWindowHeight = window.innerHeight;
    let rafId = 0;

    function onViewportResize() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const keyboardHeight = Math.max(0, initialWindowHeight - vv!.height);
        const isOpen = keyboardHeight > 80;

        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
        document.documentElement.classList.toggle('keyboard-open', isOpen);

        if (isOpen) {
          const focused = document.activeElement as HTMLElement | null;
          if (focused && ['INPUT', 'TEXTAREA', 'SELECT'].includes(focused.tagName)) {
            // Wait for keyboard animation to finish before scrolling
            setTimeout(() => {
              const rect = focused.getBoundingClientRect();
              const visibleBottom = vv!.height - 24; // 24px breathing room above keyboard

              if (rect.bottom > visibleBottom) {
                const scrollParent = findScrollParent(focused);
                scrollParent.scrollBy({
                  top: rect.bottom - visibleBottom,
                  behavior: 'smooth',
                });
              }
            }, 150);
          }
        }
      });
    }

    vv.addEventListener('resize', onViewportResize);
    return () => {
      vv.removeEventListener('resize', onViewportResize);
      cancelAnimationFrame(rafId);
      document.documentElement.style.removeProperty('--keyboard-height');
      document.documentElement.classList.remove('keyboard-open');
    };
  }, []);
}
