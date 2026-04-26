import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createReceiptOcrProvider,
  mapApiOcrDataToParsedItems,
} from './receiptOcrProvider';
import type { ManualEntryData } from '../components/ReceiptUpload';

describe('receiptOcrProvider', () => {
  const uploadReceiptForSplit = vi.fn();
  const fetchReceiptOcrData = vi.fn();
  const fetchReceiptSignedUrl = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    uploadReceiptForSplit.mockResolvedValue({ id: 'rec-1' });
    fetchReceiptSignedUrl.mockResolvedValue('https://cdn.example/r.jpg');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('simulated OCR returns fixture data without calling transport', async () => {
    const provider = createReceiptOcrProvider({
      strategy: 'simulate',
      deps: {
        uploadReceiptForSplit,
        fetchReceiptOcrData,
        fetchReceiptSignedUrl,
      },
    });

    const file = new File([], 'nobu-sushi-night.jpg', { type: 'image/jpeg' });
    const out = await provider.processUploadedReceiptFile({
      splitId: 'split-x',
      file,
      localPreviewUrl: 'blob:preview',
    });

    expect(uploadReceiptForSplit).not.toHaveBeenCalled();
    expect(fetchReceiptOcrData).not.toHaveBeenCalled();
    expect(out.receiptId).toBeUndefined();
    expect(out.signedPreviewUrl).toBe('blob:preview');
    expect(out.merchant).toMatch(/nobu/i);
    expect(out.items.length).toBeGreaterThan(0);
  });

  it('transport OCR resolves deferred polling before returning items', async () => {
    fetchReceiptOcrData
      .mockResolvedValueOnce({ processed: false, data: null })
      .mockResolvedValueOnce({
        processed: true,
        data: {
          total: 42,
          confidence: 0.88,
          items: [{ name: 'Tea', quantity: 1, price: 42 }],
        },
      });

    const provider = createReceiptOcrProvider({
      strategy: 'transport',
      deps: {
        uploadReceiptForSplit,
        fetchReceiptOcrData,
        fetchReceiptSignedUrl,
      },
      poll: { intervalMs: 100, maxAttempts: 5 },
    });

    const file = new File([], 'tea.jpg', { type: 'image/jpeg' });
    const out = await provider.processUploadedReceiptFile({
      splitId: 'split-x',
      file,
    });

    expect(uploadReceiptForSplit).toHaveBeenCalledWith('split-x', file);
    expect(fetchReceiptOcrData).toHaveBeenCalledTimes(2);
    expect(out.receiptId).toBe('rec-1');
    expect(out.receiptTotal).toBe(42);
    expect(out.items[0]?.name).toBe('Tea');
    expect(out.items[0]?.confidence).toBe(88);
  });

  it('transport OCR throws after polling exhausts when OCR never completes', async () => {
    vi.useFakeTimers();

    fetchReceiptOcrData.mockResolvedValue({ processed: false, data: null });

    const provider = createReceiptOcrProvider({
      strategy: 'transport',
      deps: {
        uploadReceiptForSplit,
        fetchReceiptOcrData,
        fetchReceiptSignedUrl,
      },
      poll: { intervalMs: 50, maxAttempts: 2 },
    });

    const file = new File([], 'slow.pdf', { type: 'application/pdf' });
    const pending = provider.processUploadedReceiptFile({
      splitId: 'split-x',
      file,
    });

    const assertion = expect(pending).rejects.toThrow(/still processing/i);
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchReceiptSignedUrl).not.toHaveBeenCalled();
  });

  it('manual entry builds review rows without transport', () => {
    const provider = createReceiptOcrProvider({
      strategy: 'transport',
      deps: {
        uploadReceiptForSplit,
        fetchReceiptOcrData,
        fetchReceiptSignedUrl,
      },
    });

    const manualEntry: ManualEntryData = {
      amount: '33.50',
      date: '2026-01-01',
      merchant: 'Brunch spot',
      notes: '',
    };

    const out = provider.applyManualEntry(manualEntry);
    expect(uploadReceiptForSplit).not.toHaveBeenCalled();
    expect(out.items).toHaveLength(1);
    expect(out.receiptTotal).toBe(33.5);
    expect(out.merchant).toBe('Brunch spot');
    expect(out.manualEntry).toEqual(manualEntry);
  });

  it('manual entry falls back to previous merchant when new merchant is blank', () => {
    const provider = createReceiptOcrProvider({
      strategy: 'transport',
      deps: {
        uploadReceiptForSplit,
        fetchReceiptOcrData,
        fetchReceiptSignedUrl,
      },
    });

    const manualEntry: ManualEntryData = {
      amount: '12',
      date: '2026-01-01',
      merchant: '   ',
      notes: '',
    };

    const out = provider.applyManualEntry(manualEntry, {
      previousMerchant: 'Earlier stop',
    });
    expect(out.merchant).toBe('Earlier stop');
  });

  it('mapApiOcrDataToParsedItems maps line items with receipt confidence', () => {
    const items = mapApiOcrDataToParsedItems(
      {
        items: [{ name: 'A', quantity: 2, price: 3 }],
        confidence: 0.5,
      },
      0.25
    );
    expect(items[0]?.confidence).toBe(25);
  });
});
