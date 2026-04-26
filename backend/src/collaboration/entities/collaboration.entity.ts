import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Artist } from '../../artists/entities/artist.entity';

export enum CollaborationStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  REMOVED = 'removed',
  COMPLETED = 'completed',
}

export enum CollaborationRole {
  OWNER = 'owner',
  COLLABORATOR = 'collaborator',
  PRODUCER = 'producer',
  FEATURED_ARTIST = 'featured_artist',
  WRITER = 'writer',
}

export enum CollaborationType {
  TRACK_COLLABORATION = 'track_collaboration',
  ALBUM_COLLABORATION = 'album_collaboration',
  PRODUCTION_WORK = 'production_work',
  FEATURE = 'feature',
  SONGWRITING = 'songwriting',
}

@Entity('collaborations')
@Index(['trackId', 'artistId'], { unique: true })
@Index(['status'])
@Index(['invitedBy'])
export class Collaboration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  trackId!: string;

  @Column()
  trackTitle!: string;

  @ManyToOne(() => Artist, { eager: true })
  @JoinColumn({ name: 'artistId' })
  artist!: Artist;

  @Column()
  artistId!: string;

  @Column()
  invitedBy!: string; // User wallet address who sent the invite

  @Column({
    type: 'enum',
    enum: CollaborationStatus,
    default: CollaborationStatus.INVITED,
  })
  status!: CollaborationStatus;

  @Column({
    type: 'enum',
    enum: CollaborationRole,
    default: CollaborationRole.COLLABORATOR,
  })
  role!: CollaborationRole;

  @Column({
    type: 'enum',
    enum: CollaborationType,
    default: CollaborationType.TRACK_COLLABORATION,
  })
  type!: CollaborationType;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  splitPercentage!: number | null;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'jsonb', nullable: true })
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

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  respondedAt?: Date;

  @Column({ nullable: true })
  respondedBy?: string;

  @Column({ type: 'text', nullable: true })
  responseMessage?: string;

  @Column({ nullable: true })
  removedAt?: Date;

  @Column({ nullable: true })
  removedBy?: string;

  @Column({ type: 'text', nullable: true })
  removalReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  auditLog?: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    details?: Record<string, any>;
  }>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
