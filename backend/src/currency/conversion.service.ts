import { Injectable } from '@nestjs/common';
import { CurrencyRateService } from './currency-rate.service';

@Injectable()
export class ConversionService {
  constructor(private readonly rateService: CurrencyRateService) {}

  async convert(amount: number, base: string, target: string) {
    const quote = await this.rateService.getRateQuote(base, target);
    return {
      base,
      target,
      rate: quote.rate,
      amount,
      converted: Number((amount * quote.rate).toFixed(8)),
      metadata: quote.metadata,
    };
  }
}
