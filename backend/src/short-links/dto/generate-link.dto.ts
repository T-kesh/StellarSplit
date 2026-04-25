import { IsEnum, IsOptional, IsUUID, IsNumber, Min } from "class-validator";
import { LinkType } from "../entities/split-short-link.entity";

export class GenerateLinkDto {
  @IsUUID()
  splitId!: string;

  @IsEnum(LinkType)
  linkType!: LinkType;

  @IsOptional()
  @IsUUID()
  targetParticipantId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  expiryHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAccesses?: number;
}
