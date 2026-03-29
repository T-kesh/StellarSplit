import axios from 'axios';
import { CurrencyRateService } from './currency-rate.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CurrencyRateService', () => {
  let service: CurrencyRateService;

  const mockRepo = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value),
    createQueryBuilder: jest.fn(() => ({
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    })),
  };

  beforeEach(() => {
    service = new CurrencyRateService(mockRepo as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return fresh cached rates without calling live providers', async () => {
    mockRepo.find.mockResolvedValue([
      {
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        rate: 0.85,
        source: 'ExchangeRateAPI',
        fetchedAt: new Date('2026-03-29T10:00:00.000Z'),
        expiresAt: new Date('2026-03-29T10:05:00.000Z'),
      },
    ]);

    const result = await service.getRates('USD', ['EUR']);

    expect(result).toEqual({
      base: 'USD',
      rates: {
        EUR: 0.85,
      },
      metadata: {
        EUR: {
          source: 'ExchangeRateAPI',
          stale: false,
          cached: true,
          fetchedAt: '2026-03-29T10:00:00.000Z',
          expiresAt: '2026-03-29T10:05:00.000Z',
          fallbackReason: null,
        },
      },
    });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('should fetch, compute, and cache live rates when the cache is cold', async () => {
    mockRepo.find.mockResolvedValue([]);
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          rates: {
            EUR: 0.85,
            USD: 1,
          },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          stellar: { usd: 0.2 },
          'usd-coin': { usd: 1 },
        },
      } as any);

    const result = await service.getRates('USD', ['EUR', 'XLM']);

    expect(result.base).toBe('USD');
    expect(result.rates.EUR).toBeCloseTo(0.85, 8);
    expect(result.rates.XLM).toBeCloseTo(5, 8);
    expect(result.metadata.EUR.source).toBe('ExchangeRateAPI');
    expect(result.metadata.XLM.source).toBe('ExchangeRateAPI+CoinGecko');
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should fall back to the latest stale cached rate when providers fail', async () => {
    mockRepo.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          baseCurrency: 'USD',
          targetCurrency: 'EUR',
          rate: 0.83,
          source: 'ExchangeRateAPI',
          fetchedAt: new Date('2026-03-29T09:00:00.000Z'),
          expiresAt: new Date('2026-03-29T09:05:00.000Z'),
        },
      ]);

    mockedAxios.get.mockRejectedValue(new Error('provider unavailable'));

    const result = await service.getRates('USD', ['EUR']);

    expect(result.rates.EUR).toBe(0.83);
    expect(result.metadata.EUR.stale).toBe(true);
    expect(result.metadata.EUR.fallbackReason).toBe('stale_cache');
  });

  it('should throw when neither live providers nor stale cache can satisfy the request', async () => {
    mockRepo.find.mockResolvedValue([]);
    mockedAxios.get.mockRejectedValue(new Error('provider unavailable'));

    await expect(service.getRates('USD', ['EUR'])).rejects.toThrow(
      /Exchange rates are currently unavailable/,
    );
  });
});
