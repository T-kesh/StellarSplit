import {
    IsString,
    IsEnum,
    IsOptional,
    IsNumber,
    IsArray,
    IsObject,
    Min,
    Max,
    ValidateNested,
    IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import {
    CollaborationRole,
    CollaborationType,
} from "../entities/collaboration.entity";

export class CompensationDto {
    @IsEnum(["percentage", "fixed", "royalty"])
    type!: "percentage" | "fixed" | "royalty";

    @IsOptional()
    @IsNumber()
    @Min(0)
    amount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    percentage?: number;
}

export class TermsDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    deliverables?: string[];

    @IsOptional()
    @IsDateString()
    deadline?: Date;

    @IsOptional()
    @ValidateNested()
    @Type(() => CompensationDto)
    compensation?: CompensationDto;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    rights?: string[];
}

export class CreateCollaborationDto {
    @IsString()
    trackId!: string;

    @IsString()
    trackTitle!: string;

    @IsString()
    artistWalletAddress!: string;

    @IsEnum(CollaborationRole)
    role!: CollaborationRole;

    @IsEnum(CollaborationType)
    type!: CollaborationType;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    splitPercentage?: number;

    @IsOptional()
    @IsString()
    message?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => TermsDto)
    terms?: TermsDto;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
