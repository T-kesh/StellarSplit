export interface ExportSplitCalculationPayload {
  type: string;
  participants: Array<Record<string, unknown>>;
  items: Array<Record<string, unknown>>;
  subtotal: number;
  currency: string;
  rounding?: string;
}

export function buildSplitCalculationFileName(prefix = 'split-calculation'): string {
  return `${prefix}-${Date.now()}.json`;
}

export function exportSplitCalculation(
  payload: ExportSplitCalculationPayload,
  fileName = buildSplitCalculationFileName(),
): void {
  const file = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
