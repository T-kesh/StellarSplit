import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity('friendships')
@Index(['userId', 'friendId'], { unique: true })
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  friendId!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'blocked'],
    default: 'pending',
  })
  status!: 'pending' | 'accepted' | 'blocked';

  @Column({ nullable: true })
  requestedByUserId?: string | null;

  @Column({ nullable: true })
  blockedByUserId?: string | null;

  @Column({ nullable: true })
  nickname?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
