import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("jsonb", { default: {} })
  balances!: Record<string, number>; // asset → amount

  @Column({ type: "timestamp", nullable: true })
  snoozedUntil!: Date | null;
}
