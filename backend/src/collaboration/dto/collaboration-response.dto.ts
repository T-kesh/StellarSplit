import { Collaboration, CollaborationStatus, CollaborationRole, CollaborationType } from '../entities/collaboration.entity';
import { Artist } from '../../artists/entities/artist.entity';

export class CollaborationResponseDto {
  id!: string;
  trackId!: string;
  trackTitle!: string;
  artist!: Artist;
  invitedBy!: string;
  status!: CollaborationStatus;
  role!: CollaborationRole;
  type!: CollaborationType;
  splitPercentage?: number;
  message?: string;
  terms?: {
    deliverables?: string[];
    deadline?: Date;
    compensation?: {
      type: 'percentage' | 'fixed' | 'royalty';
      amount?: number;
      percentage?: number;
    };
    rights?: string[];
  };
  metadata?: Record<string, any>;
  respondedAt?: Date;
  respondedBy?: string;
  responseMessage?: string;
  removedAt?: Date;
  removedBy?: string;
  removalReason?: string;
  auditLog?: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    details?: Record<string, any>;
  }>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CollaborationListResponseDto {
  collaborations!: CollaborationResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
}

export class CollaborationStatsResponseDto {
  totalInvites!: number;
  activeCollaborations!: number;
  pendingResponses!: number;
  rejectedInvites!: number;
  completedCollaborations!: number;
  averageResponseTime?: number; // in hours
}
