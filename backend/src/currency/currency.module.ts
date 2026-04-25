import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { CurrencyRateService } from './currency-rate.service';
import { ConversionService } from './conversion.service';
import { UserCurrencyPreference } from './entities/user-currency-preference.entity';
import { CurrencyRateCache } from './entities/currency-rate-cache.entity';
import { GeoModule } from './geo/geo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCurrencyPreference, CurrencyRateCache]),
    GeoModule,
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService, CurrencyRateService, ConversionService],
  exports: [CurrencyService, CurrencyRateService, ConversionService],
})
export class CurrencyModule {}
