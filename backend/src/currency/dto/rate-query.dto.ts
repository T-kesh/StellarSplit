import { IsOptional, IsString } from 'class-validator';

export class RateQueryDto {
  @IsOptional()
  @IsString()
  base?: string;

  @IsOptional()
  @IsString()
  targets?: string;
}
