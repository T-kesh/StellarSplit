import type { CalculatorState, CalculatorType, Participant, SplitItem } from '../components/SplitCalculator/SplitCalculator';

const SHARE_VERSION = 1;

export interface CalculatorSharePayload {
  version: number;
  state: CalculatorState;
}

export interface LegacyCalculatorSharePayload {
  type: CalculatorType;
  participants: Participant[];
  items: SplitItem[];
  subtotal: number;
  currency: string;
  rounding?: CalculatorState['rounding'];
}

function base64Encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64Decode(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function isCalculatorState(value: unknown): value is CalculatorState {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as CalculatorState;
  return (
    candidate != null &&
    typeof candidate.type === 'string' &&
    Array.isArray(candidate.participants) &&
    Array.isArray(candidate.items) &&
    typeof candidate.totalAmount === 'number' &&
    typeof candidate.taxAmount === 'number' &&
    typeof candidate.tipAmount === 'number' &&
    typeof candidate.currency === 'string' &&
    ['none', 'up', 'down', 'nearest'].includes(candidate.rounding)
  );
}

export function encodeCalculatorShare(state: CalculatorState): string {
  const payload: CalculatorSharePayload = {
    version: SHARE_VERSION,
    state,
  };

  return base64Encode(JSON.stringify(payload));
}

function parseLegacyPayload(value: unknown): CalculatorState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const legacy = value as LegacyCalculatorSharePayload;
  if (
    typeof legacy.type !== 'string' ||
    !Array.isArray(legacy.participants) ||
    !Array.isArray(legacy.items) ||
    typeof legacy.subtotal !== 'number' ||
    typeof legacy.currency !== 'string'
  ) {
    return null;
  }

  return {
    type: legacy.type,
    participants: legacy.participants,
    items: legacy.items,
    totalAmount: legacy.subtotal,
    taxAmount: 0,
    tipAmount: 0,
    currency: legacy.currency,
    rounding: legacy.rounding ?? 'none',
  };
}

export function decodeCalculatorShare(encoded: string): CalculatorState | null {
  try {
    const raw = decodeURIComponent(encoded);
    const json = base64Decode(raw);
    const parsed = JSON.parse(json) as unknown;

    if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
      const payload = parsed as CalculatorSharePayload;
      if (payload.version !== SHARE_VERSION) {
        return null;
      }

      if (isCalculatorState(payload.state)) {
        return payload.state;
      }

      return null;
    }

    return parseLegacyPayload(parsed);
  } catch {
    return null;
  }
}

export function buildCalculatorShareUrl(state: CalculatorState): string {
  const encoded = encodeURIComponent(encodeCalculatorShare(state));
  return `/calculator?data=${encoded}`;
}
