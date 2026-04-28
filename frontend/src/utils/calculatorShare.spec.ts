import { buildCalculatorShareUrl, decodeCalculatorShare, encodeCalculatorShare } from './calculatorShare';
import type { CalculatorState } from '../components/SplitCalculator/SplitCalculator';

describe('calculatorShare', () => {
  const sampleState: CalculatorState = {
    type: 'equal',
    participants: [
      { id: '1', name: 'Alice', amount: 10, percentage: 50, items: [] },
      { id: '2', name: 'Bob', amount: 10, percentage: 50, items: [] },
    ],
    items: [],
    totalAmount: 20,
    taxAmount: 2,
    tipAmount: 3,
    currency: 'USD',
    rounding: 'none',
  };

  it('encodes and decodes calculator state correctly', () => {
    const raw = encodeCalculatorShare(sampleState);
    const decoded = decodeCalculatorShare(raw);

    expect(decoded).toEqual(sampleState);
  });

  it('builds a calculator share link containing the calculator route', () => {
    const link = buildCalculatorShareUrl(sampleState);

    expect(link).toContain('/calculator?data=');
    expect(link).not.toContain(' ');
  });

  it('returns null for invalid share payloads', () => {
    expect(decodeCalculatorShare('not-base64')).toBeNull();
  });
});
