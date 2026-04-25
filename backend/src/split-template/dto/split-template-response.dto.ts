import { SplitType } from "../entities/split-template.entity";

export class SplitTemplateResponseDto {
  id!: string;
  userId!: string;
  name!: string;
  description?: string;
  splitType!: SplitType;
  defaultParticipants!: any[];
  defaultItems?: any[];
  taxPercentage!: number;
  tipPercentage!: number;
  usageCount!: number;
  createdAt!: Date;
}

export class CreateSplitFromTemplateResponseDto {
  splitType!: SplitType;
  participants!: any[];
  items?: any[];
  taxPercentage!: number;
  tipPercentage!: number;
}
