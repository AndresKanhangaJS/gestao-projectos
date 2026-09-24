import { api } from './client'
import type { Label } from '@/types/projects'

export interface LabelPayload {
  name: string
  color?: string | null
}

export async function listLabels(projectId: number): Promise<Label[]> {
  const { data } = await api.get<{ data: Label[] }>(`/projects/${projectId}/labels`)
  return data.data
}

export async function createLabel(projectId: number, payload: LabelPayload): Promise<Label> {
  const { data } = await api.post<{ data: Label }>(`/projects/${projectId}/labels`, payload)
  return data.data
}

export async function updateLabel(labelId: number, payload: Partial<LabelPayload>): Promise<Label> {
  const { data } = await api.patch<{ data: Label }>(`/projects/labels/${labelId}`, payload)
  return data.data
}

export async function deleteLabel(labelId: number): Promise<void> {
  await api.delete(`/projects/labels/${labelId}`)
}
