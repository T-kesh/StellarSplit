import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('split_comments')
@Index(['splitId'])
export class SplitComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  splitId!: string;

  @Column()
  userId!: string;

  @Column('text')
  comment!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
