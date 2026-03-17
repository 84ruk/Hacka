'use client';

import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Button, Input, Label, Alert, Spinner, Skeleton } from '@/components/ui';
import { SEVERITY_LABELS, type ReportSeverity } from '@/types/report';

const ReportMap = dynamic(() => import('./ReportMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
});

const schema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(120),
  description: z.string().min(10, 'Mínimo 10 caracteres').max(1000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  address: z.string().max(255).optional(),
  latitude: z.number({ invalid_type_error: 'Selecciona una ubicación' }),
  longitude: z.number({ invalid_type_error: 'Selecciona una ubicación' }),
});

export type ReportFormValues = z.infer<typeof schema>;

interface ReportFormProps {
  onSubmit: (values: ReportFormValues) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

const SEVERITY_OPTIONS: ReportSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function ReportForm({ onSubmit, isLoading = false, error }: ReportFormProps) {
  const { coords, loading: geoLoading, error: geoError, request: requestGeo } = useGeolocation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(schema),
  });

  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const handleGeoClick = () => {
    requestGeo();
  };

  // Cuando llegan coords del navegador, las ponemos en el form
  if (coords && (coords.latitude !== latitude || coords.longitude !== longitude)) {
    setValue('latitude', coords.latitude, { shouldValidate: true });
    setValue('longitude', coords.longitude, { shouldValidate: true });
  }

  const handleMapSelect = (lat: number, lng: number) => {
    setValue('latitude', lat, { shouldValidate: true });
    setValue('longitude', lng, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Título */}
      <div>
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Ej: Sin agua en colonia norte"
          className="mt-1"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-[var(--destructive)]">{errors.title.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <Label htmlFor="description">Descripción *</Label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          placeholder="Describe la situación con detalle"
          className="mt-1 block w-full rounded-[var(--radius-sm)] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-[var(--destructive)]">{errors.description.message}</p>
        )}
      </div>

      {/* Severidad */}
      <div>
        <Label htmlFor="severity">Severidad *</Label>
        <select
          id="severity"
          {...register('severity')}
          className="mt-1 block w-full rounded-[var(--radius-sm)] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
        >
          <option value="">Selecciona severidad</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>
        {errors.severity && (
          <p className="mt-1 text-xs text-[var(--destructive)]">{errors.severity.message}</p>
        )}
      </div>

      {/* Dirección (opcional) */}
      <div>
        <Label htmlFor="address">Dirección (opcional)</Label>
        <Input
          id="address"
          {...register('address')}
          placeholder="Ej: Av. Insurgentes 123, CDMX"
          className="mt-1"
        />
      </div>

      {/* Ubicación */}
      <div className="space-y-2">
        <Label>Ubicación *</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGeoClick}
            isLoading={geoLoading}
            disabled={geoLoading}
          >
            {geoLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación'}
          </Button>
          {latitude !== undefined && longitude !== undefined && (
            <span className="text-xs text-slate-500">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
          )}
        </div>

        {geoError && (
          <Alert variant="error" className="text-sm">
            {geoError}
          </Alert>
        )}

        <p className="text-xs text-slate-500">
          O haz clic en el mapa para seleccionar la ubicación exacta.
        </p>

        <ReportMap
          selectable
          selectedLat={latitude}
          selectedLng={longitude}
          onLocationSelect={handleMapSelect}
          className="h-64 w-full"
        />

        {(errors.latitude || errors.longitude) && (
          <p className="text-xs text-[var(--destructive)]">
            Selecciona una ubicación usando el botón o el mapa.
          </p>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" variant="primary" size="md" isLoading={isLoading} disabled={isLoading}>
        {isLoading ? 'Enviando reporte...' : 'Enviar reporte'}
      </Button>
    </form>
  );
}
