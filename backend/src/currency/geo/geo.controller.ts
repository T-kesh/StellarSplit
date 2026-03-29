import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { GeoService, type GeoResult } from './geo.service';

@ApiTags('currency')
@Controller('currency/geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('detect')
  @ApiOperation({
    summary: 'Detect a country and recommended currency from the client IP',
  })
  @ApiResponse({
    status: 200,
    description:
      'Geo detection result with explicit fallback metadata when the lookup cannot be trusted.',
  })
  detect(@Req() req: Request): Promise<GeoResult> {
    return this.geoService.detectFromRequest(req);
  }
}
