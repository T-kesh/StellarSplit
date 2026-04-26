import type { Group, ApiResponse } from "../types/split-group";
import { getSplitGroupDataSource } from "./splitGroupDataSource";

export async function fetchGroups(): Promise<ApiResponse<Group[]>> {
  const groups = await getSplitGroupDataSource().list();
  return { data: groups };
}

export async function createGroup(group: Group): Promise<ApiResponse<Group>> {
  const created = await getSplitGroupDataSource().create(group);
  return { data: created };
}

export async function updateGroup(group: Group): Promise<ApiResponse<Group>> {
  const updated = await getSplitGroupDataSource().update(group);
  return { data: updated };
}

export async function deleteGroup(groupId: string): Promise<ApiResponse<{ id: string }>> {
  await getSplitGroupDataSource().remove(groupId);
  return { data: { id: groupId } };
}

export async function startSplit(groupId: string): Promise<ApiResponse<Group | null>> {
  const updated = await getSplitGroupDataSource().touchSplit(groupId);
  return { data: updated };
}
