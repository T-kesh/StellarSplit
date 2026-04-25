import { GeoService } from './geo.service';

describe('GeoService', () => {
  let service: GeoService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new GeoService();
    fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should resolve a public forwarded IP and return geo metadata', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        country: 'Nigeria',
        countryCode: 'NG',
      }),
    });

    const result = await service.detectFromRequest({
      ip: '10.0.0.1',
      headers: {
        'x-forwarded-for': '10.0.0.4, 8.8.8.8',
      },
    } as any);

    expect(fetchMock).toHaveBeenCalled();
    expect(result).toEqual({
      ip: '8.8.8.8',
      ipSource: 'x-forwarded-for',
      viaProxy: true,
      country: 'Nigeria',
      countryCode: 'NG',
      currency: 'NGN',
      detected: true,
      source: 'ip-api',
      fallback: null,
    });
  });

  it('should skip geo lookup for private request IPs and return fallback metadata', async () => {
    const result = await service.detectFromRequest({
      ip: '::1',
      headers: {},
    } as any);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.detected).toBe(false);
    expect(result.source).toBe('fallback');
    expect(result.fallback?.reason).toBe('private_ip');
    expect(result.countryCode).toBeNull();
    expect(result.currency).toBeNull();
  });

  it('should return explicit fallback metadata when the geo provider fails', async () => {
    fetchMock.mockRejectedValue(new Error('provider down'));

    const result = await service.detectFromIp('8.8.8.8');

    expect(result.detected).toBe(false);
    expect(result.source).toBe('fallback');
    expect(result.fallback?.reason).toBe('lookup_failed');
    expect(result.fallback?.currency).toBe('USD');
    expect(result.country).toBeNull();
  });
});
