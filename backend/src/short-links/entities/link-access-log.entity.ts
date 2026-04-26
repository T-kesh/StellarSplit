import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { SplitShortLink } from './split-short-link.entity';

@Entity('link_access_logs')
export class LinkAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SplitShortLink, { onDelete: 'CASCADE' })
  shortLink!: SplitShortLink;

  @CreateDateColumn()
  accessedAt!: Date;

  @Column()
  ipHash!: string;

  @Column()
  userAgent!: string;

  @Column({ nullable: true })
  resolvedUserId?: string;
}
