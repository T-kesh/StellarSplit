import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReceiptCaptureFlow } from './ReceiptCaptureFlow';
import { createReceiptOcrProvider } from '../../services/receiptOcrProvider';

const uploadReceiptForSplitMock = vi.fn();
const fetchReceiptOcrDataMock = vi.fn();
const fetchReceiptSignedUrlMock = vi.fn();

const transportOcrProvider = () =>
  createReceiptOcrProvider({
    strategy: 'transport',
    deps: {
      uploadReceiptForSplit: uploadReceiptForSplitMock,
      fetchReceiptOcrData: fetchReceiptOcrDataMock,
      fetchReceiptSignedUrl: fetchReceiptSignedUrlMock,
    },
    poll: { intervalMs: 5, maxAttempts: 3 },
  });

vi.mock('../CameraCapture', () => ({
  CameraCapture: ({
    onCapture,
  }: {
    onCapture: (file: File) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onCapture(new File(['image'], 'receipt.jpg', { type: 'image/jpeg' }))
      }
    >
      Mock capture
    </button>
  ),
}));

vi.mock('../ReceiptUpload', () => ({
  ReceiptUpload: ({
    onFilesChange,
    onManualEntry,
  }: {
    onFilesChange?: (files: File[]) => void;
    onManualEntry?: (data: {
      amount: string;
      date: string;
      merchant: string;
      notes: string;
    }) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onFilesChange?.([
            new File(['image'], 'grocery-receipt.jpg', { type: 'image/jpeg' }),
          ])
        }
      >
        Mock upload
      </button>
      <button
        type="button"
        onClick={() =>
          onManualEntry?.({
            amount: '18.75',
            date: '2026-03-25',
            merchant: 'Corner Store',
            notes: 'Late snack run',
          })
        }
      >
        Mock upload manual
      </button>
    </div>
  ),
  ManualEntryFallback: ({
    onSubmit,
    onCancel,
  }: {
    onSubmit: (data: {
      amount: string;
      date: string;
      merchant: string;
      notes: string;
    }) => void;
    onCancel: () => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            amount: '42.00',
            date: '2026-03-25',
            merchant: 'Manual Cafe',
            notes: 'Brunch',
          })
        }
      >
        Submit manual details
      </button>
      <button type="button" onClick={onCancel}>
        Cancel manual details
      </button>
    </div>
  ),
}));

vi.mock('./ReceiptParserResults', () => ({
  ReceiptParserResults: ({
    items,
    onAccept,
    onReject,
  }: {
    items: Array<{ name: string }>;
    onAccept: (items: Array<{ name: string }>) => void;
    onReject: () => void;
  }) => (
    <div>
      <div data-testid="review-item-count">{items.length}</div>
      <button type="button" onClick={() => onAccept(items)}>
        Accept parsed receipt
      </button>
      <button type="button" onClick={onReject}>
        Reject parsed receipt
      </button>
    </div>
  ),
}));

vi.mock('../../utils/api-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../utils/api-client')>();
  return {
    ...actual,
    getApiErrorMessage: (error: unknown) =>
      error instanceof Error ? error.message : 'Receipt request failed',
  };
});

describe('ReceiptCaptureFlow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    uploadReceiptForSplitMock.mockResolvedValue({
      id: 'receipt-123',
    });
    fetchReceiptOcrDataMock.mockResolvedValue({
      processed: true,
      data: {
        total: 31.5,
        confidence: 0.91,
        items: [
          {
            name: 'Fresh Produce',
            quantity: 1,
            price: 18.5,
          },
          {
            name: 'Snacks',
            quantity: 1,
            price: 13,
          },
        ],
      },
    });
    fetchReceiptSignedUrlMock.mockResolvedValue('https://example.com/receipt.jpg');
  });

  it('lets the user upload a receipt and apply reviewed OCR items', async () => {
    const onApply = vi.fn();

    render(
      <ReceiptCaptureFlow
        splitId="split-123"
        currency="USD"
        onApply={onApply}
        ocrProvider={transportOcrProvider()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /upload receipt/i }));
    fireEvent.click(screen.getByRole('button', { name: /^mock upload$/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /accept parsed receipt/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /accept parsed receipt/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        merchant: 'grocery-receipt',
        receiptTotal: 31.5,
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Fresh Produce' }),
        ]),
      })
    );
  });

  it('keeps a draft in localStorage and resumes review state', async () => {
    const onApply = vi.fn();

    const { unmount } = render(
      <ReceiptCaptureFlow
        splitId="split-abc"
        currency="USD"
        onApply={onApply}
        ocrProvider={transportOcrProvider()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /upload receipt/i }));
    fireEvent.click(screen.getByRole('button', { name: /mock upload manual/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /accept parsed receipt/i })).toBeInTheDocument()
    );

    unmount();

    render(
      <ReceiptCaptureFlow
        splitId="split-abc"
        currency="USD"
        onApply={onApply}
        ocrProvider={transportOcrProvider()}
      />
    );

    expect(screen.getByText(/corner store/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept parsed receipt/i })).toBeInTheDocument();
  });
});
