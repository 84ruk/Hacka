'use client';

import { Badge } from '@/components/ui/Badge';
import {
  SEVERITY_LABELS,
  STATUS_LABELS,
  type ReportSeverity,
  type ReportStatus,
} from '@/types/report';

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const variantMap: Record<ReportStatus, 'default' | 'warning' | 'success' | 'destructive'> = {
    PENDING: 'default',
    REVIEWING: 'warning',
    IN_PROGRESS: 'warning',
    RESOLVED: 'success',
  };

  return <Badge variant={variantMap[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function ReportSeverityBadge({ severity }: { severity: ReportSeverity }) {
  const variantMap: Record<ReportSeverity, 'default' | 'warning' | 'success' | 'destructive'> = {
    LOW: 'success',
    MEDIUM: 'warning',
    HIGH: 'warning',
    CRITICAL: 'destructive',
  };

  return <Badge variant={variantMap[severity]}>{SEVERITY_LABELS[severity]}</Badge>;
}
