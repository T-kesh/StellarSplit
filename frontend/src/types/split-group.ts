export type MemberRole = "owner" | "admin" | "member";

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
  color: string;
  role: MemberRole;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  accentColor: string;
  members: Member[];
  totalSpent: number;
  currency: string;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface SplitRequest {
  groupId: string;
  members: Member[];
  amount: number;
  description: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface Split {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  createdAt: Date;
}
