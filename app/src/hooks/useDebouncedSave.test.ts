import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedSave } from './useDebouncedSave';

describe('useDebouncedSave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves once after changes stop', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDebouncedSave(save, 500));

    act(() => result.current.schedule());
    act(() => result.current.schedule());
    expect(result.current.status).toBe('pending');
    await act(async () => vi.advanceTimersByTime(500));

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
  });

  it('reports failures', async () => {
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useDebouncedSave(save, 100));
    act(() => result.current.schedule());
    await act(async () => vi.advanceTimersByTime(100));
    expect(result.current.status).toBe('error');
  });

  it('flushes a pending save on unmount', () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useDebouncedSave(save, 1000));
    act(() => result.current.schedule());
    unmount();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
