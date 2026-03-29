import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { CollaborationStatus } from '../entities/collaboration.entity';

export class RespondToCollaborationDto {
  @IsEnum([CollaborationStatus.ACTIVE, CollaborationStatus.REJECTED])
  status!: CollaborationStatus.ACTIVE | CollaborationStatus.REJECTED;

  @IsOptional()
  @IsString()
  responseMessage?: string;
}

export class UpdateCollaborationDto {
  @IsOptional()
  @IsEnum([CollaborationStatus.ACTIVE, CollaborationStatus.COMPLETED])
  status?: CollaborationStatus.ACTIVE | CollaborationStatus.COMPLETED;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  splitPercentage?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  removalReason?: string;
}

export class RemoveCollaborationDto {
  @IsString()
  removalReason!: string;
}
