export type DraftType = 'wizard' | 'receipt';

export interface DraftMetadata {
  key: string;
  type: DraftType;
  updatedAt: string;
  title?: string;
}

export interface DraftEntry {
  data: any;
  metadata: DraftMetadata;
}

export interface DraftStorage {
  version: number;
  drafts: Record<string, DraftEntry>;
}