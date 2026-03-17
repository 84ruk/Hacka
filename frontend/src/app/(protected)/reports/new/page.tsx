'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { ReportForm, type ReportFormValues } from '@/components/reports/ReportForm';
import { createReport } from '@/lib/reports';
import { useToast } from '@/context/ToastContext';

export default function NewReportPage() {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ReportFormValues) => {
    setIsLoading(true);
    setError(null);

    const result = await createReport({
      title: values.title,
      description: values.description,
      latitude: values.latitude,
      longitude: values.longitude,
      severity: values.severity,
      address: values.address,
    });

    if ('error' in result) {
      setError(result.error.message ?? 'Error al crear el reporte.');
      setIsLoading(false);
      return;
    }

    toast.success('Tu reporte fue enviado correctamente.', { title: 'Reporte creado' });
    router.push('/reports');
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Nuevo reporte
          </h1>
          <p className="mt-1 text-slate-600">
            Reporta una situación de escasez de agua en tu zona.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del reporte</CardTitle>
            <CardDescription>
              Completa los datos y marca la ubicación en el mapa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error={error}
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
