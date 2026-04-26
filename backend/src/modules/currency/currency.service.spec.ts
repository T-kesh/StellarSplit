import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CurrencyService } from './currency.service';
import { CurrencyRateService } from '../../currency/currency-rate.service';
import { UserCurrencyPreference } from '../../currency/entities/user-currency-preference.entity';
import { GeoService } from '../../currency/geo/geo.service';

describe('CurrencyService', () => {
  let service: CurrencyService;

  const mockPreferenceRepo = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };

  const mockGeoService = {
    detectFromRequest: jest.fn(),
    detectFromIp: jest.fn(),
  };

  const mockRateService = {
    getRates: jest.fn(),
    getExchangeRates: jest.fn(),
    getRate: jest.fn(),
    getRateQuote: jest.fn(),
    clearCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        {
          provide: getRepositoryToken(UserCurrencyPreference),
          useValue: mockPreferenceRepo,
        },
        {
          provide: GeoService,
          useValue: mockGeoService,
        },
        {
          provide: CurrencyRateService,
          useValue: mockRateService,
        },
      ],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a first-login preference from successful geo detection', async () => {
    mockPreferenceRepo.findOne.mockResolvedValue(null);
    mockGeoService.detectFromIp.mockResolvedValue({
      currency: 'NGN',
      countryCode: 'NG',
      detected: true,
      fallback: null,
    });

    const result = await service.getOrCreatePreference('user-1', '8.8.8.8');

    expect(result).toMatchObject({
      userId: 'user-1',
      preferredCurrency: 'NGN',
      detectedCountry: 'NG',
      detectedCurrency: 'NGN',
      autoDetected: true,
    });
  });

  it('should create a first-login preference from explicit fallback metadata without pretending detection succeeded', async () => {
    mockPreferenceRepo.findOne.mockResolvedValue(null);
    mockGeoService.detectFromIp.mockResolvedValue({
      currency: null,
      countryCode: null,
      detected: false,
      fallback: {
        currency: 'USD',
      },
    });

    const result = await service.getOrCreatePreference('user-1', '10.0.0.2');

    expect(result).toMatchObject({
      preferredCurrency: 'USD',
      detectedCountry: undefined,
      detectedCurrency: undefined,
      autoDetected: true,
    });
  });

  it('should convert currencies through the canonical rate service', async () => {
    mockRateService.getRateQuote.mockResolvedValue({
      rate: 0.85,
      metadata: {
        source: 'ExchangeRateAPI',
        stale: false,
        cached: false,
        fetchedAt: '2026-03-29T10:00:00.000Z',
        expiresAt: '2026-03-29T10:05:00.000Z',
        fallbackReason: null,
      },
    });

    const result = await service.convertCurrency({
      amount: 100,
      from: 'USD',
      to: 'EUR',
    });

    expect(result).toEqual({
      amount: 100,
      convertedAmount: 85,
      rate: 0.85,
      from: 'USD',
      to: 'EUR',
      metadata: {
        source: 'ExchangeRateAPI',
        stale: false,
        cached: false,
        fetchedAt: '2026-03-29T10:00:00.000Z',
        expiresAt: '2026-03-29T10:05:00.000Z',
        fallbackReason: null,
      },
    });
  });

  it('should return the supported currency list', () => {
    const currencies = service.getSupportedCurrencies();

    expect(currencies).toContain('USD');
    expect(currencies).toContain('EUR');
    expect(currencies).toContain('XLM');
    expect(currencies).toContain('USDC');
  });

  it('should format crypto amounts with fixed precision', () => {
    expect(service.formatCurrency(100.12345678, 'XLM')).toBe(
      'XLM 100.12345678',
    );
  });
});
