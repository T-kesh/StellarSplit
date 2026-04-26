import type { ParsedItem } from '../components/Receipt/ParsedItemEditor';
import type { ManualEntryData } from '../components/ReceiptUpload';
import type { ApiReceiptOcrData } from '../utils/api-client';
import {
  createManualReviewItems,
  simulateReceiptOcr,
  type ReceiptOcrProgress,
} from '../utils/receiptOcr';

export type ReceiptOcrStrategy = 'simulate' | 'transport';

export interface ReceiptOcrDeps {
  uploadReceiptForSplit: (
    splitId: string,
    file: File
  ) => Promise<{ id: string }>;
  fetchReceiptOcrData: (receiptId: string) => Promise<{
    processed: boolean;
    data?: ApiReceiptOcrData | null;
  }>;
  fetchReceiptSignedUrl: (receiptId: string) => Promise<string | null>;
}

export interface ProcessedFileOcrResult {
  receiptId?: string;
  signedPreviewUrl?: string | null;
  merchant: string;
  receiptTotal: number;
  items: ParsedItem[];
}

export interface ManualEntryOcrResult {
  merchant: string;
  receiptTotal: number;
  items: ParsedItem[];
  manualEntry: ManualEntryData;
}

export interface ReceiptOcrPollOptions {
  intervalMs: number;
  maxAttempts: number;
}

export interface ReceiptOcrProviderOptions {
  strategy: ReceiptOcrStrategy | (() => ReceiptOcrStrategy);
  deps: ReceiptOcrDeps;
  poll?: Partial<ReceiptOcrPollOptions>;
}

const DEFAULT_POLL: ReceiptOcrPollOptions = {
  intervalMs: 400,
  maxAttempts: 25,
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

function resolveStrategy(
  strategy: ReceiptOcrStrategy | (() => ReceiptOcrStrategy)
): ReceiptOcrStrategy {
  return typeof strategy === 'function' ? strategy() : strategy;
}

/** Maps API OCR payload into UI line items (confidence is carried from receipt-level score). */
export function mapApiOcrDataToParsedItems(
  data: ApiReceiptOcrData,
  receiptConfidence?: number
): ParsedItem[] {
  const confidencePct = Math.round((receiptConfidence ?? data.confidence ?? 0) * 100);

  return (data.items ?? []).map((item, index) => ({
    id: `receipt-item-${index + 1}`,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    confidence: confidencePct,
  }));
}

function merchantLabelFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

async function pollUntilOcrReady(
  receiptId: string,
  deps: ReceiptOcrDeps,
  poll: ReceiptOcrPollOptions,
  onProgress?: (progress: ReceiptOcrProgress) => void
): Promise<{ processed: boolean; data?: ApiReceiptOcrData | null }> {
  let attempt = 0;
  while (attempt < poll.maxAttempts) {
    const ocr = await deps.fetchReceiptOcrData(receiptId);
    if (ocr.processed && ocr.data) {
      return ocr;
    }

    attempt += 1;
    const pct = Math.min(
      95,
      55 + Math.floor((35 * attempt) / Math.max(1, poll.maxAttempts))
    );
    onProgress?.({
      progress: pct,
      label: 'Waiting for OCR to finish processing',
    });

    await delay(poll.intervalMs);
  }

  const last = await deps.fetchReceiptOcrData(receiptId);
  return last;
}

export function createReceiptOcrProvider(options: ReceiptOcrProviderOptions) {
  const poll: ReceiptOcrPollOptions = {
    ...DEFAULT_POLL,
    ...options.poll,
  };

  const deps = options.deps;

  async function processUploadedReceiptFile(input: {
    splitId: string;
    file: File;
    localPreviewUrl?: string | null;
    onProgress?: (progress: ReceiptOcrProgress) => void;
  }): Promise<ProcessedFileOcrResult> {
    const strategy = resolveStrategy(options.strategy);

    if (strategy === 'simulate') {
      const simulated = await simulateReceiptOcr(
        { fileName: input.file.name },
        input.onProgress
      );

      return {
        receiptId: undefined,
        signedPreviewUrl: input.localPreviewUrl ?? null,
        merchant: simulated.merchant,
        receiptTotal: simulated.receiptTotal,
        items: simulated.items,
      };
    }

    input.onProgress?.({
      progress: 15,
      label: 'Uploading your receipt',
    });

    const receipt = await deps.uploadReceiptForSplit(input.splitId, input.file);

    input.onProgress?.({
      progress: 55,
      label: 'Extracting items from the uploaded receipt',
    });

    let ocr = await deps.fetchReceiptOcrData(receipt.id);

    if (!ocr.processed || !ocr.data) {
      ocr = await pollUntilOcrReady(
        receipt.id,
        deps,
        poll,
        input.onProgress
      );
    }

    if (!ocr.processed || !ocr.data) {
      throw new Error(
        'Receipt OCR is still processing. Please try again in a moment.'
      );
    }

    const signedUrl = await deps.fetchReceiptSignedUrl(receipt.id);

    const items = mapApiOcrDataToParsedItems(
      ocr.data,
      ocr.data.confidence ?? undefined
    );

    return {
      receiptId: receipt.id,
      signedPreviewUrl: signedUrl ?? input.localPreviewUrl ?? null,
      merchant: merchantLabelFromFileName(input.file.name),
      receiptTotal: ocr.data.total ?? 0,
      items,
    };
  }

  function applyManualEntry(
    manualEntry: ManualEntryData,
    ctx?: { previousMerchant?: string }
  ): ManualEntryOcrResult {
    const items = createManualReviewItems(manualEntry);
    const receiptTotal = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    const merchant =
      manualEntry.merchant.trim() ||
      ctx?.previousMerchant?.trim() ||
      'Manual receipt';

    return {
      merchant,
      receiptTotal,
      items,
      manualEntry,
    };
  }

  return {
    processUploadedReceiptFile,
    applyManualEntry,
  };
}

export type ReceiptOcrProvider = ReturnType<typeof createReceiptOcrProvider>;

/** Reads `import.meta.env.VITE_RECEIPT_OCR_STRATEGY`: `simulate` uses local fixtures; anything else uses transport (upload + backend OCR). */
export function receiptOcrStrategyFromEnv(): ReceiptOcrStrategy {
  const raw = import.meta.env.VITE_RECEIPT_OCR_STRATEGY;
  return raw === 'simulate' ? 'simulate' : 'transport';
}
