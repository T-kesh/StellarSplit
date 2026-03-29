export const FIAT_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'CNY',
  'INR',
  'MXN',
  'BRL',
  'RUB',
  'KRW',
  'SGD',
  'HKD',
  'NOK',
  'SEK',
  'DKK',
  'PLN',
  'TRY',
  'ZAR',
  'THB',
  'MYR',
  'IDR',
  'PHP',
  'VND',
  'EGP',
  'ILS',
  'AED',
  'SAR',
  'NGN',
] as const;

export const CRYPTO_CURRENCIES = ['XLM', 'USDC'] as const;

export const SUPPORTED_CURRENCIES = [
  ...FIAT_CURRENCIES,
  ...CRYPTO_CURRENCIES,
] as const;

export const DEFAULT_GEO_FALLBACK = {
  country: 'United States',
  countryCode: 'US',
  currency: 'USD',
} as const;
