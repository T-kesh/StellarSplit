import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Collaboration } from '../../collaboration/entities/collaboration.entity';

export enum ArtistStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum ArtistType {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
  ORGANIZATION = 'organization',
}

@Entity('artists')
export class Artist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  walletAddress!: string;

  @Column()
  displayName!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({
    type: 'enum',
    enum: ArtistStatus,
    default: ArtistStatus.ACTIVE,
  })
  status!: ArtistStatus;

  @Column({
    type: 'enum',
    enum: ArtistType,
    default: ArtistType.INDIVIDUAL,
  })
  type!: ArtistType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  reputationScore!: number;

  @Column({ default: 0 })
  totalCollaborations!: number;

  @Column({ default: 0 })
  successfulCollaborations!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ default: false })
  isVerified!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Collaboration, (collaboration) => collaboration.artist)
  collaborations!: Collaboration[];
}
