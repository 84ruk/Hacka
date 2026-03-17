import { api } from './api';
import type {
  CreateReportDto,
  Report,
  ReportFilters,
  ReportsResponse,
  ReportStatus,
} from '@/types/report';

export async function getReports(filters?: ReportFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  return api<ReportsResponse>(`/reports${query ? `?${query}` : ''}`);
}

export async function getReport(id: string) {
  return api<Report>(`/reports/${id}`);
}

export async function createReport(dto: CreateReportDto) {
  return api<Report>('/reports', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateReportStatus(id: string, status: ReportStatus) {
  return api<Report>(`/reports/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
