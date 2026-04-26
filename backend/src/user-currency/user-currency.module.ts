import { Module } from "@nestjs/common";
import { CurrencyModule } from "@/currency/currency.module";
import { CurrencyService } from "./user-currency.service";
import { CurrencyController } from "./user-currency.controller";

@Module({
  imports: [CurrencyModule],
  providers: [CurrencyService],
  controllers: [CurrencyController],
  exports: [CurrencyService],
})
export class UserCurrencyModule {}
