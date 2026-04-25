import { MOCK_GROUPS } from "@components/SplitGroup/data";
import type { Group } from "@src/types/split-group";

const STORAGE_KEY = "stellarsplit:groups:v1";

export interface SplitGroupDataSource {
  list(): Promise<Group[]>;
  create(group: Group): Promise<Group>;
  update(group: Group): Promise<Group>;
  remove(id: string): Promise<void>;
  touchSplit(id: string): Promise<Group | null>;
}

function cloneGroup(group: Group): Group {
  return {
    ...group,
    members: group.members.map((member) => ({ ...member })),
    createdAt: new Date(group.createdAt),
    lastActivityAt: new Date(group.lastActivityAt),
  };
}

function cloneGroups(groups: Group[]): Group[] {
  return groups.map(cloneGroup);
}

function readStoredGroups(): Group[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Array<
      Omit<Group, "createdAt" | "lastActivityAt"> & {
        createdAt: string;
        lastActivityAt: string;
      }
    >;
    return parsed.map((group) => ({
      ...group,
      createdAt: new Date(group.createdAt),
      lastActivityAt: new Date(group.lastActivityAt),
    }));
  } catch {
    return null;
  }
}

function persistGroups(groups: Group[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      groups.map((group) => ({
        ...group,
        createdAt: group.createdAt.toISOString(),
        lastActivityAt: group.lastActivityAt.toISOString(),
      })),
    ),
  );
}

class LocalSplitGroupDataSource implements SplitGroupDataSource {
  private groups: Group[] | null = null;

  private ensureLoaded() {
    if (this.groups) return;
    const stored = readStoredGroups();
    this.groups = cloneGroups(stored ?? MOCK_GROUPS);
    persistGroups(this.groups);
  }

  async list(): Promise<Group[]> {
    this.ensureLoaded();
    return cloneGroups(this.groups ?? []);
  }

  async create(group: Group): Promise<Group> {
    this.ensureLoaded();
    this.groups = [cloneGroup(group), ...(this.groups ?? [])];
    persistGroups(this.groups);
    return cloneGroup(group);
  }

  async update(group: Group): Promise<Group> {
    this.ensureLoaded();
    this.groups = (this.groups ?? []).map((entry) =>
      entry.id === group.id ? cloneGroup(group) : entry,
    );
    persistGroups(this.groups);
    return cloneGroup(group);
  }

  async remove(id: string): Promise<void> {
    this.ensureLoaded();
    this.groups = (this.groups ?? []).filter((entry) => entry.id !== id);
    persistGroups(this.groups);
  }

  async touchSplit(id: string): Promise<Group | null> {
    this.ensureLoaded();
    let updated: Group | null = null;
    this.groups = (this.groups ?? []).map((entry) => {
      if (entry.id !== id) return entry;
      updated = {
        ...entry,
        lastActivityAt: new Date(),
      };
      return updated;
    });
    persistGroups(this.groups);
    return updated ? cloneGroup(updated) : null;
  }
}

let singleton: SplitGroupDataSource | null = null;

export function getSplitGroupDataSource(): SplitGroupDataSource {
  if (!singleton) singleton = new LocalSplitGroupDataSource();
  return singleton;
}
