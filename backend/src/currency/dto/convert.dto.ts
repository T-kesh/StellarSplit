import { Type } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';

export class ConvertDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.00000001)
  amount!: number;

  @IsString()
  from!: string;

  @IsString()
  to!: string;
}
