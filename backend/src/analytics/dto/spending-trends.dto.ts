import { IsOptional, IsString, IsIn, IsISO8601 } from "class-validator";

export class SpendingTrendsDto {
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @IsIn(["daily", "weekly", "monthly"])
  granularity?: "daily" | "weekly" | "monthly" = "monthly";

  @IsOptional()
  @IsString()
  userId?: string;
}
