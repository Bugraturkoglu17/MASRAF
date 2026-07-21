import { describe, expect, it } from 'vitest';

import { getReconnectDelay } from './use-manager-sse';

describe('manager realtime yeniden bağlanma politikası', () => {
  it('üstel geri çekilme uygular ve beşinci hatada polling fallback seçer', () => {
    expect([1, 2, 3, 4].map(getReconnectDelay)).toEqual([1000, 2000, 4000, 8000]);
    expect(getReconnectDelay(5)).toBeNull();
    expect(getReconnectDelay(20)).toBeNull();
  });
});
