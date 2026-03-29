import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import {
  DEFAULT_GEO_FALLBACK,
  SUPPORTED_CURRENCIES,
} from './currency.constants';
import {
  CurrencyRateService,
  type ExchangeRateResponse,
  type RateLookupResponse,
  type RateQuote,
} from './currency-rate.service';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import {
  PreferredAsset,
  UserCurrencyPreference,
} from './entities/user-currency-preference.entity';
import { GeoService, type GeoResult } from './geo/geo.service';

export type { ExchangeRateResponse, RateLookupResponse, RateQuote } from './currency-rate.service';

export interface ConversionRequest {
  amount: number;
  from: string;
  to: string;
}

export interface ConversionResponse {
  amount: number;
  convertedAmount: number;
  rate: number;
  from: string;
  to: string;
  metadata: RateQuote['metadata'];
}

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(UserCurrencyPreference)
    private readonly prefRepo: Repository<UserCurrencyPreference>,
    private readonly geoService: GeoService,
    private readonly currencyRateService: CurrencyRateService,
  ) {}

  detectFromRequest(request: Request): Promise<GeoResult> {
    return this.geoService.detectFromRequest(request);
  }

  detectFromIP(ip: string): Promise<GeoResult> {
    return this.geoService.detectFromIp(ip);
  }

  async getPreferences(userId: string): Promise<UserCurrencyPreference | null> {
    return this.prefRepo.findOne({ where: { userId } });
  }

  async getOrCreatePreference(
    userId: string,
    requestOrIp: Request | string,
  ): Promise<UserCurrencyPreference> {
    const existingPreference = await this.getPreferences(userId);

    if (existingPreference) {
      return existingPreference;
    }

    const detection =
      typeof requestOrIp === 'string'
        ? await this.geoService.detectFromIp(requestOrIp)
        : await this.geoService.detectFromRequest(requestOrIp);

    const preferredCurrency =
      detection.currency ??
      detection.fallback?.currency ??
      DEFAULT_GEO_FALLBACK.currency;

    const newPreference = this.prefRepo.create({
      userId,
      preferredCurrency,
      preferredAsset: PreferredAsset.XLM,
      detectedCountry: detection.countryCode ?? undefined,
      detectedCurrency: detection.currency ?? undefined,
      autoDetected: true,
    });

    return this.prefRepo.save(newPreference);
  }

  async updatePreferences(
    userId: string,
    dto: Partial<UpdatePreferenceDto>,
  ): Promise<UserCurrencyPreference> {
    if (!dto.preferredCurrency && !dto.preferredAsset) {
      throw new BadRequestException(
        'At least one currency preference field must be provided',
      );
    }

    const existingPreference = await this.getPreferences(userId);
    const preferredCurrency =
      dto.preferredCurrency !== undefined
        ? this.normalizeCurrency(dto.preferredCurrency)
        : existingPreference?.preferredCurrency ?? DEFAULT_GEO_FALLBACK.currency;
    const preferredAsset =
      dto.preferredAsset !== undefined
        ? this.normalizeAsset(dto.preferredAsset)
        : existingPreference?.preferredAsset ?? PreferredAsset.XLM;

    const preference =
      existingPreference ??
      this.prefRepo.create({
        userId,
      });

    Object.assign(preference, {
      preferredCurrency,
      preferredAsset,
      autoDetected: false,
    });

    return this.prefRepo.save(preference);
  }

  async updatePreference(
    userId: string,
    currency: string,
  ): Promise<UserCurrencyPreference> {
    const existingPreference = await this.getPreferences(userId);

    if (!existingPreference) {
      throw new NotFoundException(`Currency preference for user ${userId} not found`);
    }

    return this.updatePreferences(userId, {
      preferredCurrency: currency,
      preferredAsset: existingPreference.preferredAsset,
    });
  }

  async firstLoginSetup(
    userId: string,
    requestOrIp: Request | string,
  ): Promise<UserCurrencyPreference> {
    return this.getOrCreatePreference(userId, requestOrIp);
  }

  getSupportedCurrencies(): string[] {
    return [...SUPPORTED_CURRENCIES];
  }

  async getRates(
    base = 'USD',
    targets?: string[],
  ): Promise<RateLookupResponse> {
    return this.currencyRateService.getRates(base, targets);
  }

  async getExchangeRates(base = 'USD'): Promise<ExchangeRateResponse> {
    return this.currencyRateService.getExchangeRates(base);
  }

  async getRate(base: string, target: string): Promise<number> {
    return this.currencyRateService.getRate(base, target);
  }

  async getRateQuote(base: string, target: string): Promise<RateQuote> {
    return this.currencyRateService.getRateQuote(base, target);
  }

  async convertCurrency(
    request: ConversionRequest,
  ): Promise<ConversionResponse> {
    const amount = Number(request.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const from = this.normalizeCurrency(request.from);
    const to = this.normalizeCurrency(request.to);

    if (from === to) {
      return {
        amount,
        convertedAmount: amount,
        rate: 1,
        from,
        to,
        metadata: {
          source: 'identity',
          stale: false,
          cached: false,
          fetchedAt: null,
          expiresAt: null,
          fallbackReason: null,
        },
      };
    }

    const quote = await this.currencyRateService.getRateQuote(from, to);

    return {
      amount,
      convertedAmount: Number((amount * quote.rate).toFixed(8)),
      rate: Number(quote.rate.toFixed(8)),
      from,
      to,
      metadata: quote.metadata,
    };
  }

  async convert(base: string, target: string, amount: number) {
    const result = await this.convertCurrency({
      amount,
      from: base,
      to: target,
    });

    return {
      base: result.from,
      target: result.to,
      amount: result.amount,
      converted: result.convertedAmount,
      rate: result.rate,
      metadata: result.metadata,
    };
  }

  async clearCache(): Promise<void> {
    await this.currencyRateService.clearCache();
  }

  formatCurrency(amount: number, currency: string): string {
    const normalizedCurrency = this.normalizeCurrency(currency);

    if (normalizedCurrency === 'XLM' || normalizedCurrency === 'USDC') {
      return `${normalizedCurrency} ${amount.toFixed(8)}`;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private normalizeCurrency(currency: string): string {
    const normalized = currency?.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('Currency code is required');
    }

    if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(normalized)) {
      throw new BadRequestException(`Unsupported currency: ${normalized}`);
    }

    return normalized;
  }

  private normalizeAsset(asset: string): PreferredAsset {
    const normalized = asset?.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('Preferred asset is required');
    }

    if (!(normalized in PreferredAsset)) {
      throw new BadRequestException(`Unsupported preferred asset: ${normalized}`);
    }

    return PreferredAsset[normalized as keyof typeof PreferredAsset];
  }
}
