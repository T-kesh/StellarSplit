import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  CRYPTO_CURRENCIES,
  FIAT_CURRENCIES,
} from '@/currency/currency.constants';
import { CurrencyService as CoreCurrencyService } from '@/currency/currency.service';

@Injectable()
export class CurrencyService {
  constructor(private readonly coreCurrencyService: CoreCurrencyService) {}

  detectCurrency(ip: string) {
    return this.coreCurrencyService.detectFromIP(ip);
  }

  detectCurrencyFromRequest(request: Request) {
    return this.coreCurrencyService.detectFromRequest(request);
  }

  getOrCreatePreference(userId: string, requestOrIp: Request | string) {
    return this.coreCurrencyService.getOrCreatePreference(userId, requestOrIp);
  }

  updatePreference(userId: string, currency: string) {
    return this.coreCurrencyService.updatePreference(userId, currency);
  }

  getRate(base: string, target: string) {
    return this.coreCurrencyService.getRate(base, target);
  }

  getRates(base: string, targets?: string[]) {
    return this.coreCurrencyService.getRates(base, targets);
  }

  convert(base: string, target: string, amount: number) {
    return this.coreCurrencyService.convert(base, target, amount);
  }

  getSupportedSummary() {
    return {
      fiatSupported: FIAT_CURRENCIES.length,
      cryptoSupported: [...CRYPTO_CURRENCIES],
    };
  }
}
