import { Body, Controller, Get, Post, Put, Query, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrencyService } from './user-currency.service';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

interface ConvertBody {
  base: string;
  target: string;
  amount: number;
}

@ApiExcludeController()
@Controller('legacy/currency')
export class CurrencyController {
  constructor(private readonly service: CurrencyService) {}

  @Get('detect')
  detect(@Req() req: Request) {
    return this.service.detectCurrencyFromRequest(req);
  }

  @Get('preferences')
  getPref(@Req() req: AuthenticatedRequest) {
    return this.service.getOrCreatePreference(req.user.id, req);
  }

  @Put('preferences')
  updatePref(
    @Req() req: AuthenticatedRequest,
    @Body('currency') currency: string,
  ) {
    return this.service.updatePreference(req.user.id, currency);
  }

  @Get('rates')
  getRates(
    @Query('base') base: string,
    @Query('targets') targets: string,
  ) {
    const list = targets
      ?.split(',')
      .map((target) => target.trim())
      .filter(Boolean);

    return this.service.getRates(base, list);
  }

  @Post('convert')
  convert(@Body() body: ConvertBody) {
    return this.service.convert(body.base, body.target, body.amount);
  }

  @Get('supported')
  supported() {
    return this.service.getSupportedSummary();
  }
}
