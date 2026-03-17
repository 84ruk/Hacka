'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Alert,
} from '@/components/ui';
import { ReportStatusBadge, ReportSeverityBadge } from '@/components/reports/ReportStatusBadge';
import { getReports } from '@/lib/reports';
import type { Report } from '@/types/report';

const ReportMap = dynamic(() => import('@/components/reports/ReportMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
});

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getReports({ limit: 50 });
    if ('error' in result) {
      setError(result.error.message);
    } else {
      setReports(result.data.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  return (
    <PageContainer className="max-w-5xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Mis reportes
            </h1>
            <p className="mt-1 text-slate-600">
              Aquí aparecen los reportes que has enviado.
            </p>
          </div>
          <Link href="/reports/new">
            <Button variant="primary" size="md">
              + Nuevo reporte
            </Button>
          </Link>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {/* Mapa */}
        {!loading && reports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mapa de reportes</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden rounded-b-lg">
              <ReportMap reports={reports} className="h-72 w-full" />
            </CardContent>
          </Card>
        )}

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>
              {loading ? 'Cargando...' : `${reports.length} reporte${reports.length !== 1 ? 's' : ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : reports.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-slate-500">No tienes reportes aún.</p>
                <Link href="/reports/new" className="mt-4 inline-block">
                  <Button variant="primary" size="md">
                    Crear tu primer reporte
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <li key={report.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">
                          {report.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                          {report.description}
                        </p>
                        {report.address && (
                          <p className="mt-1 text-xs text-slate-400">{report.address}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(report.createdAt).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <ReportSeverityBadge severity={report.severity} />
                        <ReportStatusBadge status={report.status} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
