'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui';
import { ReportStatusBadge, ReportSeverityBadge } from '@/components/reports/ReportStatusBadge';
import { getReports, updateReportStatus } from '@/lib/reports';
import { useToast } from '@/context/ToastContext';
import type { Report, ReportFilters, ReportSeverity, ReportStatus } from '@/types/report';
import { SEVERITY_LABELS, STATUS_LABELS } from '@/types/report';

const ReportMap = dynamic(() => import('@/components/reports/ReportMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-lg" />,
});

const ChoroplethMap = dynamic(() => import('@/components/reports/ChoroplethMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
});

const STATUS_OPTIONS: ReportStatus[] = ['PENDING', 'REVIEWING', 'IN_PROGRESS', 'RESOLVED'];
const SEVERITY_OPTIONS: ReportSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function AdminReportsPage() {
  const toast = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [filters, setFilters] = useState<ReportFilters>({ page: 1, limit: 20 });
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap'>('markers');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getReports(filters);
    if ('error' in result) {
      setError(result.error.message);
    } else {
      setReports(result.data.data);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleStatusChange = async (id: string, status: ReportStatus) => {
    setUpdatingId(id);
    const result = await updateReportStatus(id, status);
    if ('error' in result) {
      toast.error(result.error.message ?? 'Error al actualizar el estado.');
    } else {
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: result.data.status } : r)),
      );
      toast.success('Estado actualizado.', { title: 'Reporte actualizado' });
    }
    setUpdatingId(null);
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      [key]: value === '' ? undefined : value,
    }));
  };

  return (
    <ProtectedRoute requireAdmin>
      <PageContainer className="max-w-6xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Reportes — Panel Admin
            </h1>
            <p className="mt-1 text-slate-600">
              Visualiza, filtra y gestiona todos los reportes de escasez.
            </p>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Estado
                  </label>
                  <select
                    value={filters.status ?? ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="rounded-[var(--radius-sm)] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                  >
                    <option value="">Todos los estados</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Severidad
                  </label>
                  <select
                    value={filters.severity ?? ''}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                    className="rounded-[var(--radius-sm)] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                  >
                    <option value="">Todas las severidades</option>
                    {SEVERITY_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {SEVERITY_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ page: 1, limit: 20 })}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && <Alert variant="error">{error}</Alert>}

          {/* Mapa */}
          {!loading && reports.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>
                    {mapMode === 'markers'
                      ? `Mapa de reportes (${total} en total)`
                      : 'Mapa de calor por zonas — San Luis Potosí'}
                  </CardTitle>
                  <div className="flex rounded-[var(--radius-sm)] border border-slate-300 overflow-hidden text-sm">
                    <button
                      onClick={() => setMapMode('markers')}
                      className={`px-3 py-1.5 transition-colors ${
                        mapMode === 'markers'
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Marcadores
                    </button>
                    <button
                      onClick={() => setMapMode('heatmap')}
                      className={`px-3 py-1.5 border-l border-slate-300 transition-colors ${
                        mapMode === 'heatmap'
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Mapa de calor
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden rounded-b-lg">
                {mapMode === 'markers' ? (
                  <ReportMap reports={reports} className="h-72 w-full" />
                ) : (
                  <ChoroplethMap reports={reports} className="h-96 w-full" />
                )}
              </CardContent>
            </Card>
          )}

          {/* Tabla */}
          <Card>
            <CardHeader>
              <CardTitle>
                {loading
                  ? 'Cargando...'
                  : `${reports.length} resultado${reports.length !== 1 ? 's' : ''} de ${total}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : reports.length === 0 ? (
                <p className="py-8 text-center text-slate-500">
                  No hay reportes con los filtros seleccionados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        <th className="pb-3 pr-4">Título</th>
                        <th className="pb-3 pr-4">Severidad</th>
                        <th className="pb-3 pr-4">Estado actual</th>
                        <th className="pb-3 pr-4">Fecha</th>
                        <th className="pb-3">Cambiar estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reports.map((report) => (
                        <tr key={report.id} className="group">
                          <td className="py-3 pr-4">
                            <p className="max-w-[200px] truncate font-medium text-slate-900">
                              {report.title}
                            </p>
                            {report.address && (
                              <p className="truncate text-xs text-slate-400">{report.address}</p>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <ReportSeverityBadge severity={report.severity} />
                          </td>
                          <td className="py-3 pr-4">
                            <ReportStatusBadge status={report.status} />
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-500">
                            {new Date(report.createdAt).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3">
                            <select
                              value={report.status}
                              disabled={updatingId === report.id}
                              onChange={(e) =>
                                void handleStatusChange(report.id, e.target.value as ReportStatus)
                              }
                              className="rounded-[var(--radius-sm)] border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
