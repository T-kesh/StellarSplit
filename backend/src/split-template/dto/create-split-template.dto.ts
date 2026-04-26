import {
    IsEnum,
    IsOptional,
    IsString,
    IsArray,
    IsNumber,
} from "class-validator";
import { SplitType } from "../entities/split-template.entity";

export class CreateSplitTemplateDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(SplitType)
    splitType!: SplitType;

    @IsArray()
    defaultParticipants!: any[];

    @IsOptional()
    @IsArray()
    defaultItems?: any[];

    @IsNumber()
    taxPercentage!: number;

    @IsNumber()
    tipPercentage!: number;
}
