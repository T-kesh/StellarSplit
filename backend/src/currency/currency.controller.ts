import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ConvertDto } from './dto/convert.dto';
import { RateQueryDto } from './dto/rate-query.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import {
  CurrencyService,
  type ConversionResponse,
  type RateLookupResponse,
} from './currency.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get the current user currency preferences' })
  getPreferences(@Req() req: AuthenticatedRequest) {
    return this.currencyService.getPreferences(req.user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Create or update the current user currency preferences' })
  updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body(ValidationPipe) dto: UpdatePreferenceDto,
  ) {
    return this.currencyService.updatePreferences(req.user.id, dto);
  }

  @Post('setup')
  @ApiOperation({
    summary:
      'Create a first-login currency preference using geo detection with explicit fallback metadata',
  })
  firstLoginSetup(@Req() req: AuthenticatedRequest) {
    return this.currencyService.firstLoginSetup(req.user.id, req);
  }

  @Get('rates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get exchange rates for the requested base currency, including per-target source and stale-cache metadata',
  })
  @ApiQuery({
    name: 'base',
    required: false,
    type: 'string',
    description: 'Base currency code. Defaults to USD.',
  })
  @ApiQuery({
    name: 'targets',
    required: false,
    type: 'string',
    description: 'Comma-separated list of target currency codes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rates retrieved successfully',
  })
  getRates(
    @Query(ValidationPipe) query: RateQueryDto = {},
  ): Promise<RateLookupResponse> {
    const targets = query.targets
      ?.split(',')
      .map((target) => target.trim())
      .filter(Boolean);

    return this.currencyService.getRates(query.base ?? 'USD', targets);
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Convert an amount between currencies using the canonical rate service',
  })
  @ApiResponse({
    status: 200,
    description: 'Currency converted successfully',
  })
  convertCurrency(
    @Body(ValidationPipe) convertDto: ConvertDto,
  ): Promise<ConversionResponse> {
    return this.currencyService.convertCurrency(convertDto);
  }

  @Get('convert')
  @ApiOperation({
    summary:
      'Compatibility GET conversion endpoint backed by the canonical rate service',
  })
  convertCurrencyFromQuery(
    @Query(ValidationPipe) convertDto: ConvertDto,
  ): Promise<ConversionResponse> {
    return this.currencyService.convertCurrency(convertDto);
  }

  @Get('supported')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get list of supported currencies' })
  getSupportedCurrencies(): string[] {
    return this.currencyService.getSupportedCurrencies();
  }

  @Get('format')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Format an amount with a currency symbol or code' })
  async formatCurrency(
    @Query('amount') amount: string,
    @Query('currency') currency: string,
  ): Promise<{ formatted: string }> {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount)) {
      throw new BadRequestException('Invalid amount parameter');
    }

    return {
      formatted: this.currencyService.formatCurrency(parsedAmount, currency),
    };
  }

  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the persisted currency-rate cache' })
  async clearCache(): Promise<{ message: string }> {
    await this.currencyService.clearCache();
    return { message: 'Exchange rate cache cleared successfully' };
  }
}
