import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { In, MoreThan, Repository } from 'typeorm';
import {
  CRYPTO_CURRENCIES,
  FIAT_CURRENCIES,
  SUPPORTED_CURRENCIES,
} from './currency.constants';
import { CurrencyRateCache } from './entities/currency-rate-cache.entity';

export interface ExchangeRateResponse {
  [currency: string]: number;
}

export interface RateMetadata {
  source: string;
  stale: boolean;
  cached: boolean;
  fetchedAt: string | null;
  expiresAt: string | null;
  fallbackReason: 'stale_cache' | null;
}

export interface RateQuote {
  base: string;
  target: string;
  rate: number;
  metadata: RateMetadata;
}

export interface RateLookupResponse {
  base: string;
  rates: ExchangeRateResponse;
  metadata: Record<string, RateMetadata>;
}

interface ReferenceRates {
  usdPerUnit: Record<string, number>;
  sourceByCurrency: Record<string, string>;
  fetchedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class CurrencyRateService {
  private readonly logger = new Logger(CurrencyRateService.name);
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly fiatApiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';
  private readonly cryptoApiUrl = 'https://api.coingecko.com/api/v3/simple/price';

  constructor(
    @InjectRepository(CurrencyRateCache)
    private readonly rateRepo: Repository<CurrencyRateCache>,
  ) {}

  async getRate(base: string, target: string): Promise<number> {
    const quote = await this.getRateQuote(base, target);
    return quote.rate;
  }

  async getRateQuote(base: string, target: string): Promise<RateQuote> {
    const lookup = await this.getRates(base, [target]);

    return {
      base: lookup.base,
      target: target.trim().toUpperCase(),
      rate: lookup.rates[target.trim().toUpperCase()],
      metadata: lookup.metadata[target.trim().toUpperCase()],
    };
  }

  async getRates(base = 'USD', targets?: string[]): Promise<RateLookupResponse> {
    const normalizedBase = this.normalizeCurrency(base);
    const normalizedTargets = this.normalizeTargets(normalizedBase, targets);

    if (!normalizedTargets.length) {
      return {
        base: normalizedBase,
        rates: {},
        metadata: {},
      };
    }

    const now = new Date();
    const freshCache = await this.rateRepo.find({
      where: {
        baseCurrency: normalizedBase,
        targetCurrency: In(normalizedTargets),
        expiresAt: MoreThan(now),
      },
    });

    const rates: ExchangeRateResponse = {};
    const metadata: Record<string, RateMetadata> = {};

    for (const cachedRate of freshCache) {
      rates[cachedRate.targetCurrency] = Number(cachedRate.rate);
      metadata[cachedRate.targetCurrency] = this.toMetadata(cachedRate, true, false);
    }

    const missingTargets = normalizedTargets.filter(
      (target) => !(target in rates),
    );

    if (!missingTargets.length) {
      return {
        base: normalizedBase,
        rates,
        metadata,
      };
    }

    try {
      const referenceRates = await this.fetchReferenceRates([
        normalizedBase,
        ...missingTargets,
      ]);
      const fetchedQuotes = await this.buildAndCacheQuotes(
        normalizedBase,
        missingTargets,
        referenceRates,
      );

      for (const quote of fetchedQuotes) {
        rates[quote.target] = quote.rate;
        metadata[quote.target] = quote.metadata;
      }

      return {
        base: normalizedBase,
        rates,
        metadata,
      };
    } catch (error) {
      const fallbackQuotes = await this.getLatestCachedQuotes(
        normalizedBase,
        missingTargets,
      );

      for (const quote of fallbackQuotes) {
        rates[quote.target] = quote.rate;
        metadata[quote.target] = quote.metadata;
      }

      const unresolvedTargets = missingTargets.filter(
        (target) => !(target in rates),
      );

      if (unresolvedTargets.length) {
        const message =
          error instanceof Error ? error.message : 'Unknown rate provider error';

        this.logger.error(
          `No live or cached exchange rates available for ${normalizedBase} -> ${unresolvedTargets.join(', ')}`,
          error instanceof Error ? error.stack : undefined,
        );

        throw new ServiceUnavailableException(
          `Exchange rates are currently unavailable for ${unresolvedTargets.join(', ')}. Last provider error: ${message}`,
        );
      }

      return {
        base: normalizedBase,
        rates,
        metadata,
      };
    }
  }

  async getExchangeRates(base = 'USD'): Promise<ExchangeRateResponse> {
    const normalizedBase = this.normalizeCurrency(base);
    const lookup = await this.getRates(normalizedBase);

    return {
      [normalizedBase]: 1,
      ...lookup.rates,
    };
  }

  async clearCache(): Promise<void> {
    await this.rateRepo.createQueryBuilder().delete().from(CurrencyRateCache).execute();
    this.logger.log('Currency rate cache cleared');
  }

  private async buildAndCacheQuotes(
    base: string,
    targets: string[],
    referenceRates: ReferenceRates,
  ): Promise<RateQuote[]> {
    const now = new Date();

    const cacheRows = targets.map((target) => {
      const rate = this.computePairRate(
        base,
        target,
        referenceRates.usdPerUnit,
      );

      return this.rateRepo.create({
        baseCurrency: base,
        targetCurrency: target,
        rate,
        source: this.buildSourceLabel(
          base,
          target,
          referenceRates.sourceByCurrency,
        ),
        fetchedAt: referenceRates.fetchedAt,
        expiresAt: referenceRates.expiresAt,
      });
    });

    await this.rateRepo.save(cacheRows);

    return cacheRows.map((row) => ({
      base,
      target: row.targetCurrency,
      rate: Number(row.rate),
      metadata: {
        source: row.source,
        stale: false,
        cached: false,
        fetchedAt: row.fetchedAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        fallbackReason: null,
      },
    }));
  }

  private async getLatestCachedQuotes(
    base: string,
    targets: string[],
  ): Promise<RateQuote[]> {
    const cachedRows = await this.rateRepo.find({
      where: {
        baseCurrency: base,
        targetCurrency: In(targets),
      },
      order: {
        fetchedAt: 'DESC',
      },
    });

    const latestByTarget = new Map<string, CurrencyRateCache>();

    for (const row of cachedRows) {
      if (!latestByTarget.has(row.targetCurrency)) {
        latestByTarget.set(row.targetCurrency, row);
      }
    }

    return targets
      .map((target) => latestByTarget.get(target))
      .filter((row): row is CurrencyRateCache => Boolean(row))
      .map((row) => ({
        base,
        target: row.targetCurrency,
        rate: Number(row.rate),
        metadata: this.toMetadata(row, true, true),
      }));
  }

  private async fetchReferenceRates(
    currencies: string[],
  ): Promise<ReferenceRates> {
    const normalizedCurrencies = [...new Set(currencies.map((currency) => this.normalizeCurrency(currency)))];
    const needsFiat = normalizedCurrencies.some((currency) =>
      (FIAT_CURRENCIES as readonly string[]).includes(currency),
    );
    const needsCrypto = normalizedCurrencies.some((currency) =>
      (CRYPTO_CURRENCIES as readonly string[]).includes(currency),
    );

    const [fiatRates, cryptoRates] = await Promise.all([
      needsFiat ? this.fetchFiatReferenceRates() : Promise.resolve(null),
      needsCrypto ? this.fetchCryptoReferenceRates() : Promise.resolve(null),
    ]);

    const usdPerUnit: Record<string, number> = {};
    const sourceByCurrency: Record<string, string> = {};
    const timestamps: Date[] = [];
    const expirations: Date[] = [];

    for (const result of [fiatRates, cryptoRates]) {
      if (!result) {
        continue;
      }

      Object.assign(usdPerUnit, result.usdPerUnit);
      Object.assign(sourceByCurrency, result.sourceByCurrency);
      timestamps.push(result.fetchedAt);
      expirations.push(result.expiresAt);
    }

    for (const currency of normalizedCurrencies) {
      if (!(currency in usdPerUnit) && currency !== 'USD') {
        throw new ServiceUnavailableException(
          `No live provider returned a usable reference rate for ${currency}`,
        );
      }
    }

    return {
      usdPerUnit: {
        USD: 1,
        ...usdPerUnit,
      },
      sourceByCurrency: {
        USD: sourceByCurrency.USD ?? 'identity',
        ...sourceByCurrency,
      },
      fetchedAt:
        timestamps.sort((left, right) => left.getTime() - right.getTime())[0] ??
        new Date(),
      expiresAt:
        expirations.sort((left, right) => left.getTime() - right.getTime())[0] ??
        new Date(Date.now() + this.cacheTtlMs),
    };
  }

  private async fetchFiatReferenceRates(): Promise<ReferenceRates> {
    const fetchedAt = new Date();
    const response = await axios.get(this.fiatApiUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'StellarSplit-Currency-Service/1.0',
      },
    });

    if (!response.data?.rates) {
      throw new ServiceUnavailableException('Fiat provider returned an invalid response');
    }

    const usdPerUnit: Record<string, number> = {};
    const sourceByCurrency: Record<string, string> = {};

    for (const currency of FIAT_CURRENCIES) {
      if (currency === 'USD') {
        usdPerUnit.USD = 1;
        sourceByCurrency.USD = 'ExchangeRateAPI';
        continue;
      }

      const providerRate = Number(response.data.rates[currency]);

      if (providerRate > 0) {
        usdPerUnit[currency] = 1 / providerRate;
        sourceByCurrency[currency] = 'ExchangeRateAPI';
      }
    }

    return {
      usdPerUnit,
      sourceByCurrency,
      fetchedAt,
      expiresAt: new Date(fetchedAt.getTime() + this.cacheTtlMs),
    };
  }

  private async fetchCryptoReferenceRates(): Promise<ReferenceRates> {
    const fetchedAt = new Date();
    const response = await axios.get(this.cryptoApiUrl, {
      timeout: 5000,
      params: {
        ids: 'stellar,usd-coin',
        vs_currencies: 'usd',
      },
      headers: {
        'User-Agent': 'StellarSplit-Currency-Service/1.0',
      },
    });

    const xlmPrice = Number(response.data?.stellar?.usd);
    const usdcPrice = Number(response.data?.['usd-coin']?.usd);

    if (!xlmPrice || !usdcPrice) {
      throw new ServiceUnavailableException('Crypto provider returned an invalid response');
    }

    return {
      usdPerUnit: {
        XLM: xlmPrice,
        USDC: usdcPrice,
      },
      sourceByCurrency: {
        XLM: 'CoinGecko',
        USDC: 'CoinGecko',
      },
      fetchedAt,
      expiresAt: new Date(fetchedAt.getTime() + this.cacheTtlMs),
    };
  }

  private computePairRate(
    base: string,
    target: string,
    usdPerUnit: Record<string, number>,
  ): number {
    if (base === target) {
      return 1;
    }

    const baseUsdValue = usdPerUnit[base];
    const targetUsdValue = usdPerUnit[target];

    if (!baseUsdValue || !targetUsdValue) {
      throw new ServiceUnavailableException(
        `Cannot compute exchange rate for ${base} -> ${target}`,
      );
    }

    return baseUsdValue / targetUsdValue;
  }

  private buildSourceLabel(
    base: string,
    target: string,
    sourceByCurrency: Record<string, string>,
  ): string {
    const sources = [
      sourceByCurrency[base] ?? 'identity',
      sourceByCurrency[target] ?? 'identity',
    ];

    return [...new Set(sources)].join('+');
  }

  private toMetadata(
    row: CurrencyRateCache,
    cached: boolean,
    stale: boolean,
  ): RateMetadata {
    return {
      source: row.source,
      stale,
      cached,
      fetchedAt: row.fetchedAt?.toISOString?.() ?? null,
      expiresAt: row.expiresAt?.toISOString?.() ?? null,
      fallbackReason: stale ? 'stale_cache' : null,
    };
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

  private normalizeTargets(base: string, targets?: string[]): string[] {
    if (!targets?.length) {
      return (SUPPORTED_CURRENCIES as readonly string[]).filter(
        (currency) => currency !== base,
      );
    }

    const normalizedTargets = [
      ...new Set(targets.map((target) => this.normalizeCurrency(target))),
    ];

    return normalizedTargets.filter((target) => target !== base);
  }
}
