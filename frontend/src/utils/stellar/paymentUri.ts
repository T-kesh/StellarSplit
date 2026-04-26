import type { PaymentRequest } from "../../types/payment";

export function parsePaymentUri(uri: string): PaymentRequest {
  // Example: stellar:pay?asset=USD&amount=50&memo=Lunch&to=GABC...
  const url = new URL(uri);
  return {
    asset: url.searchParams.get("asset") || "XLM",
    amount: Number(url.searchParams.get("amount")),
    memo: url.searchParams.get("memo") || undefined,
    from: url.searchParams.get("from") || "",
    to: url.searchParams.get("to") || "",
    splitId: url.searchParams.get("splitId") || undefined,
  };
}
export const STELLAR_PAYMENT_SCHEME = 'web+stellar:pay';

const STELLAR_ACCOUNT_REGEX = /^G[A-Z2-7]{55}$/;
const MEMO_TYPES = new Set(['text', 'id', 'hash', 'return']);

export interface StellarPaymentRequest {
  destination: string;
  amount?: number;
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
  memoType?: 'text' | 'id' | 'hash' | 'return';
  message?: string;
  callback?: string;
  splitId?: string;
}

export interface ParsedStellarPaymentURI extends StellarPaymentRequest {
  uri: string;
}

export interface PaymentDeepLinks {
  stellarUri: string;
  walletDeepLink: string;
  customSchemeDeepLink: string;
  webFallbackLink: string;
}

export const isValidStellarAddress = (address: string): boolean => {
  return STELLAR_ACCOUNT_REGEX.test(address);
};

const normalizeUriInput = (input: string): string => {
  try {
    const maybeDecoded = decodeURIComponent(input);
    if (maybeDecoded.startsWith(STELLAR_PAYMENT_SCHEME)) {
      return maybeDecoded;
    }
  } catch {
    // Keep original if decode fails.
  }

  return input;
};

const extractQueryString = (uri: string): string | null => {
  if (!uri.startsWith(STELLAR_PAYMENT_SCHEME)) {
    return null;
  }

  const queryStart = uri.indexOf('?');
  if (queryStart === -1 || queryStart === uri.length - 1) {
    return '';
  }

  return uri.slice(queryStart + 1);
};

export const buildStellarPaymentURI = (request: StellarPaymentRequest): string => {
  if (!isValidStellarAddress(request.destination)) {
    throw new Error('Invalid Stellar destination address');
  }

  if (request.amount !== undefined && (!Number.isFinite(request.amount) || request.amount <= 0)) {
    throw new Error('Amount must be a positive number');
  }

  if ((request.assetCode && !request.assetIssuer) || (!request.assetCode && request.assetIssuer)) {
    throw new Error('assetCode and assetIssuer must be provided together');
  }

  if (request.memoType && !MEMO_TYPES.has(request.memoType)) {
    throw new Error('Unsupported memo type');
  }

  const params = new URLSearchParams();
  params.set('destination', request.destination);

  if (request.amount !== undefined) {
    params.set('amount', request.amount.toFixed(7).replace(/\.?0+$/, ''));
  }

  if (request.assetCode && request.assetIssuer) {
    params.set('asset_code', request.assetCode);
    params.set('asset_issuer', request.assetIssuer);
  }

  if (request.memo) {
    params.set('memo', request.memo);
  }

  if (request.memoType) {
    params.set('memo_type', request.memoType);
  }

  if (request.message) {
    params.set('msg', request.message);
  }

  if (request.callback) {
    params.set('callback', request.callback);
  }

  if (request.splitId) {
    params.set('split_id', request.splitId);
  }

  return `${STELLAR_PAYMENT_SCHEME}?${params.toString()}`;
};

export const parseStellarPaymentURI = (input: string): ParsedStellarPaymentURI | null => {
  const uri = normalizeUriInput(input.trim());
  const queryString = extractQueryString(uri);
  if (queryString === null) {
    return null;
  }

  const params = new URLSearchParams(queryString);
  const destination = params.get('destination') ?? '';
  if (!isValidStellarAddress(destination)) {
    return null;
  }

  const amountRaw = params.get('amount');
  let amount: number | undefined;
  if (amountRaw !== null) {
    const parsedAmount = Number(amountRaw);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return null;
    }
    amount = parsedAmount;
  }

  const memoTypeRaw = params.get('memo_type') ?? undefined;
  if (memoTypeRaw && !MEMO_TYPES.has(memoTypeRaw)) {
    return null;
  }

  const assetCode = params.get('asset_code') ?? undefined;
  const assetIssuer = params.get('asset_issuer') ?? undefined;
  if ((assetCode && !assetIssuer) || (!assetCode && assetIssuer)) {
    return null;
  }

  return {
    uri,
    destination,
    amount,
    assetCode,
    assetIssuer,
    memo: params.get('memo') ?? undefined,
    memoType: memoTypeRaw as StellarPaymentRequest['memoType'],
    message: params.get('msg') ?? undefined,
    callback: params.get('callback') ?? undefined,
    splitId: params.get('split_id') ?? undefined,
  };
};

export const buildPaymentDeepLinks = (
  stellarUri: string,
  options?: { fallbackBaseUrl?: string },
): PaymentDeepLinks => {
  const encodedUri = encodeURIComponent(stellarUri);
  const fallbackBaseUrl =
    options?.fallbackBaseUrl ??
    (typeof window !== 'undefined' ? window.location.origin : 'https://stellarsplit.app');

  return {
    stellarUri,
    walletDeepLink: stellarUri,
    customSchemeDeepLink: `stellarsplit://pay?uri=${encodedUri}`,
    webFallbackLink: `${fallbackBaseUrl}/pay?uri=${encodedUri}`,
  };
};

export const extractPaymentURIFromSearch = (search: string): string | null => {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const rawUri = params.get('uri') ?? params.get('payment_uri');
  return rawUri ? decodeURIComponent(rawUri) : null;
};
