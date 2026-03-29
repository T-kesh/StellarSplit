import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { isIP } from 'node:net';
import { DEFAULT_GEO_FALLBACK } from '../currency.constants';

type RequestLike = Pick<Request, 'ip' | 'headers'>;

export type GeoFallbackReason =
  | 'missing_ip'
  | 'invalid_ip'
  | 'private_ip'
  | 'lookup_failed'
  | 'unsupported_country';

export type GeoIpSource =
  | 'cf-connecting-ip'
  | 'x-forwarded-for'
  | 'x-real-ip'
  | 'request-ip'
  | 'direct-input'
  | 'none';

export interface GeoFallback {
  country: string;
  countryCode: string;
  currency: string;
  reason: GeoFallbackReason;
  message: string;
}

export interface GeoResult {
  ip: string | null;
  ipSource: GeoIpSource;
  viaProxy: boolean;
  country: string | null;
  countryCode: string | null;
  currency: string | null;
  detected: boolean;
  source: 'ip-api' | 'fallback';
  fallback: GeoFallback | null;
}

interface ResolvedClientIp {
  ip: string | null;
  source: GeoIpSource;
  viaProxy: boolean;
  public: boolean;
  chain: string[];
  reason: GeoFallbackReason;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  async detectFromRequest(request: RequestLike): Promise<GeoResult> {
    const resolved = this.resolveClientIp(request);

    if (!resolved.ip || !resolved.public) {
      return this.buildFallback(resolved, resolved.reason);
    }

    return this.lookupIp(resolved);
  }

  async detectFromIp(ip: string): Promise<GeoResult> {
    const normalizedIp = this.normalizeIp(ip);

    if (!normalizedIp) {
      return this.buildFallback(
        {
          ip: null,
          source: 'direct-input',
          viaProxy: false,
          public: false,
          chain: [],
          reason: 'invalid_ip',
        },
        'invalid_ip',
      );
    }

    if (!this.isPublicIp(normalizedIp)) {
      return this.buildFallback(
        {
          ip: normalizedIp,
          source: 'direct-input',
          viaProxy: false,
          public: false,
          chain: [normalizedIp],
          reason: 'private_ip',
        },
        'private_ip',
      );
    }

    return this.lookupIp({
      ip: normalizedIp,
      source: 'direct-input',
      viaProxy: false,
      public: true,
      chain: [normalizedIp],
      reason: 'lookup_failed',
    });
  }

  private async lookupIp(resolved: ResolvedClientIp): Promise<GeoResult> {
    try {
      const response = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(
          resolved.ip as string,
        )}?fields=status,message,country,countryCode`,
        {
          headers: {
            'User-Agent': 'StellarSplit-Geo-Service/1.0',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Geo lookup failed with status ${response.status}`);
      }

      const data = (await response.json()) as {
        status?: string;
        message?: string;
        country?: string;
        countryCode?: string;
      };

      if (data.status !== 'success' || !data.countryCode || !data.country) {
        throw new Error(data.message || 'Geo lookup returned no match');
      }

      const currency = this.mapCountryToCurrency(data.countryCode);

      if (!currency) {
        return this.buildFallback(
          resolved,
          'unsupported_country',
          `No currency mapping configured for country code ${data.countryCode}`,
        );
      }

      return {
        ip: resolved.ip,
        ipSource: resolved.source,
        viaProxy: resolved.viaProxy,
        country: data.country,
        countryCode: data.countryCode,
        currency,
        detected: true,
        source: 'ip-api',
        fallback: null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown geo lookup error';

      this.logger.warn(
        `Geo detection failed for IP ${resolved.ip ?? 'unknown'}: ${message}`,
      );

      return this.buildFallback(resolved, 'lookup_failed', message);
    }
  }

  private buildFallback(
    resolved: ResolvedClientIp,
    reason: GeoFallbackReason,
    message?: string,
  ): GeoResult {
    return {
      ip: resolved.ip,
      ipSource: resolved.source,
      viaProxy: resolved.viaProxy,
      country: null,
      countryCode: null,
      currency: null,
      detected: false,
      source: 'fallback',
      fallback: {
        ...DEFAULT_GEO_FALLBACK,
        reason,
        message: message ?? this.getFallbackMessage(reason),
      },
    };
  }

  private getFallbackMessage(reason: GeoFallbackReason): string {
    switch (reason) {
      case 'missing_ip':
        return 'No client IP was available for geo detection.';
      case 'invalid_ip':
        return 'The provided client IP was invalid.';
      case 'private_ip':
        return 'Geo detection was skipped because the resolved IP is private, local, or reserved.';
      case 'unsupported_country':
        return 'Geo detection succeeded but the country does not map to a supported currency yet.';
      case 'lookup_failed':
      default:
        return 'The geo provider lookup failed, so a documented fallback was returned instead.';
    }
  }

  private resolveClientIp(request: RequestLike): ResolvedClientIp {
    const forwardedFor = this.parseHeaderChain(
      this.getHeaderValue(request, 'x-forwarded-for'),
    );
    const cloudflareIp = this.normalizeIp(
      this.getHeaderValue(request, 'cf-connecting-ip'),
    );
    const realIp = this.normalizeIp(this.getHeaderValue(request, 'x-real-ip'));
    const requestIp = this.normalizeIp(request.ip ?? null);

    if (cloudflareIp) {
      return {
        ip: cloudflareIp,
        source: 'cf-connecting-ip',
        viaProxy: true,
        public: this.isPublicIp(cloudflareIp),
        chain: forwardedFor.length ? forwardedFor : [cloudflareIp],
        reason: this.isPublicIp(cloudflareIp) ? 'lookup_failed' : 'private_ip',
      };
    }

    if (forwardedFor.length) {
      const publicIp = forwardedFor.find((candidate) =>
        this.isPublicIp(candidate),
      );
      const selectedIp = publicIp ?? forwardedFor[0];

      return {
        ip: selectedIp ?? null,
        source: 'x-forwarded-for',
        viaProxy: true,
        public: selectedIp ? this.isPublicIp(selectedIp) : false,
        chain: forwardedFor,
        reason: publicIp
          ? 'lookup_failed'
          : selectedIp
            ? 'private_ip'
            : 'invalid_ip',
      };
    }

    if (realIp) {
      return {
        ip: realIp,
        source: 'x-real-ip',
        viaProxy: true,
        public: this.isPublicIp(realIp),
        chain: [realIp],
        reason: this.isPublicIp(realIp) ? 'lookup_failed' : 'private_ip',
      };
    }

    if (requestIp) {
      return {
        ip: requestIp,
        source: 'request-ip',
        viaProxy: false,
        public: this.isPublicIp(requestIp),
        chain: [requestIp],
        reason: this.isPublicIp(requestIp) ? 'lookup_failed' : 'private_ip',
      };
    }

    return {
      ip: null,
      source: 'none',
      viaProxy: false,
      public: false,
      chain: [],
      reason: 'missing_ip',
    };
  }

  private getHeaderValue(
    request: RequestLike,
    headerName: string,
  ): string | null {
    const lowerCasedHeaders = request.headers ?? {};
    const rawValue =
      lowerCasedHeaders[headerName] ??
      lowerCasedHeaders[headerName.toLowerCase()];

    if (Array.isArray(rawValue)) {
      return rawValue.join(',');
    }

    return rawValue ?? null;
  }

  private parseHeaderChain(rawValue: string | null): string[] {
    if (!rawValue) {
      return [];
    }

    return rawValue
      .split(',')
      .map((candidate) => this.normalizeIp(candidate))
      .filter((candidate): candidate is string => Boolean(candidate));
  }

  private normalizeIp(rawValue: string | null): string | null {
    if (!rawValue) {
      return null;
    }

    let value = rawValue.trim();

    if (!value) {
      return null;
    }

    value = value.replace(/^"+|"+$/g, '');

    if (value.startsWith('[') && value.includes(']')) {
      value = value.slice(1, value.indexOf(']'));
    }

    if (value.includes('%')) {
      value = value.slice(0, value.indexOf('%'));
    }

    if (value.startsWith('::ffff:')) {
      value = value.slice('::ffff:'.length);
    }

    if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) {
      value = value.slice(0, value.lastIndexOf(':'));
    }

    return isIP(value) ? value : null;
  }

  private isPublicIp(ip: string): boolean {
    const version = isIP(ip);

    if (!version) {
      return false;
    }

    if (version === 4) {
      const [a, b, c] = ip.split('.').map(Number);

      if (a === 10 || a === 127 || a === 0) {
        return false;
      }

      if (a === 100 && b >= 64 && b <= 127) {
        return false;
      }

      if (a === 169 && b === 254) {
        return false;
      }

      if (a === 172 && b >= 16 && b <= 31) {
        return false;
      }

      if (a === 192 && b === 168) {
        return false;
      }

      if (a === 192 && b === 0 && c === 0) {
        return false;
      }

      if (a === 192 && b === 0 && c === 2) {
        return false;
      }

      if (a === 198 && (b === 18 || b === 19)) {
        return false;
      }

      if (a === 198 && b === 51 && c === 100) {
        return false;
      }

      if (a === 203 && b === 0 && c === 113) {
        return false;
      }

      if (a >= 224) {
        return false;
      }

      return true;
    }

    const normalized = ip.toLowerCase();

    if (normalized === '::' || normalized === '::1') {
      return false;
    }

    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return false;
    }

    if (/^fe[89ab]/.test(normalized)) {
      return false;
    }

    if (normalized.startsWith('2001:db8')) {
      return false;
    }

    if (normalized.startsWith('ff')) {
      return false;
    }

    return true;
  }

  private mapCountryToCurrency(countryCode: string): string | null {
    const normalizedCountry = countryCode.toUpperCase();

    const directMap: Record<string, string> = {
      AE: 'AED',
      AU: 'AUD',
      BR: 'BRL',
      CA: 'CAD',
      CH: 'CHF',
      CN: 'CNY',
      DK: 'DKK',
      EG: 'EGP',
      GB: 'GBP',
      HK: 'HKD',
      ID: 'IDR',
      IL: 'ILS',
      IN: 'INR',
      JP: 'JPY',
      KR: 'KRW',
      MX: 'MXN',
      MY: 'MYR',
      NG: 'NGN',
      NO: 'NOK',
      PH: 'PHP',
      PL: 'PLN',
      RU: 'RUB',
      SA: 'SAR',
      SE: 'SEK',
      SG: 'SGD',
      TH: 'THB',
      TR: 'TRY',
      US: 'USD',
      VN: 'VND',
      ZA: 'ZAR',
    };

    if (directMap[normalizedCountry]) {
      return directMap[normalizedCountry];
    }

    const euroCountries = new Set([
      'AT',
      'BE',
      'CY',
      'DE',
      'EE',
      'ES',
      'FI',
      'FR',
      'GR',
      'HR',
      'IE',
      'IT',
      'LT',
      'LU',
      'LV',
      'MT',
      'NL',
      'PT',
      'SI',
      'SK',
    ]);

    return euroCountries.has(normalizedCountry) ? 'EUR' : null;
  }
}
