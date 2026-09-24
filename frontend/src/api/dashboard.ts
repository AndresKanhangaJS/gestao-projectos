import { api } from './client'
import type { DashboardData } from '@/types/projects'

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/projects/dashboard')
  return data
}
