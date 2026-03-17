export type ReportSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReportStatus = 'PENDING' | 'REVIEWING' | 'IN_PROGRESS' | 'RESOLVED';

export interface Report {
  id: string;
  userId: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  severity: ReportSeverity;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReportsResponse {
  data: Report[];
  total: number;
}

export interface CreateReportDto {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  severity: ReportSeverity;
}

export interface ReportFilters {
  status?: ReportStatus;
  severity?: ReportSeverity;
  page?: number;
  limit?: number;
}

export const SEVERITY_LABELS: Record<ReportSeverity, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: 'Pendiente',
  REVIEWING: 'En revisión',
  IN_PROGRESS: 'En progreso',
  RESOLVED: 'Resuelto',
};

export const SEVERITY_COLORS: Record<ReportSeverity, string> = {
  LOW: '#16a34a',
  MEDIUM: '#ca8a04',
  HIGH: '#ea580c',
  CRITICAL: '#dc2626',
};
