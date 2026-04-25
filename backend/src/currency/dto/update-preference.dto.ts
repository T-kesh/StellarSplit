import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { PreferredAsset } from '../entities/user-currency-preference.entity';

export class UpdatePreferenceDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  preferredCurrency?: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(PreferredAsset))
  preferredAsset?: string;
}
