'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Feature, FeatureCollection } from 'geojson';
import type { PathOptions, Layer } from 'leaflet';
import type { Report } from '@/types/report';
import { SEVERITY_LABELS } from '@/types/report';
import { computeZoneStats, scoreToColor, colorLabel } from '@/lib/geo';

// Centro del municipio de San Luis Potosí
const SLP_CENTER: [number, number] = [22.135, -100.990];
const SLP_ZOOM = 12;

interface ChoroplethMapProps {
  reports: Report[];
  className?: string;
}

export default function ChoroplethMap({
  reports,
  className = 'h-96 w-full',
}: ChoroplethMapProps) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const fixedRef = useRef(false);

  // Fix íconos Leaflet (necesario aunque no usemos Markers, evita warnings)
  useEffect(() => {
    if (!fixedRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      fixedRef.current = true;
    }
  }, []);

  // Cargar GeoJSON desde public/
  useEffect(() => {
    fetch('/slp-zonas.geojson')
      .then((r) => r.json())
      .then((data: FeatureCollection) => setGeojson(data))
      .catch(() => console.error('No se pudo cargar slp-zonas.geojson'));
  }, []);

  if (!geojson) {
    return (
      <div
        className={`${className} flex items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500`}
      >
        Cargando mapa de zonas…
      </div>
    );
  }

  const zoneStats = computeZoneStats(reports, geojson);
  const maxScore = Math.max(...Array.from(zoneStats.values()).map((z) => z.score), 0);

  // key: fuerza remount del GeoJSON cuando cambian los reportes
  const geoKey = `${reports.length}-${maxScore}`;

  const styleFeature = (feature?: Feature): PathOptions => {
    const id = String(feature?.properties?.id ?? '');
    const stat = zoneStats.get(id);
    const score = stat?.score ?? 0;
    return {
      fillColor: scoreToColor(score, maxScore),
      fillOpacity: 0.65,
      color: '#475569',
      weight: 1.5,
      opacity: 0.8,
    };
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const id = String(feature.properties?.id ?? '');
    const stat = zoneStats.get(id);
    if (!stat) return;

    const tooltipContent = `
      <div style="min-width:170px;font-family:system-ui,sans-serif;font-size:13px">
        <p style="font-weight:700;margin:0 0 6px;color:#0f172a">${stat.name}</p>
        <p style="margin:0;color:#475569">Reportes: <b>${stat.count}</b></p>
        ${stat.count > 0 ? `
          <p style="margin:2px 0;color:#475569">Sin resolver: <b>${stat.unresolvedCount}</b></p>
          <p style="margin:2px 0;color:#475569">Severidad máx: <b>${stat.dominantSeverity ? SEVERITY_LABELS[stat.dominantSeverity] : '—'}</b></p>
          <p style="margin:4px 0 0;color:#64748b;font-size:12px">${colorLabel(stat.score, maxScore)}</p>
        ` : ''}
      </div>`;

    (layer as L.Path).bindTooltip(tooltipContent, {
      sticky: true,
      opacity: 0.97,
      className: 'leaflet-tooltip-slp',
    });

    // Highlight on hover
    (layer as L.Path).on('mouseover', function () {
      (layer as L.Path).setStyle({ weight: 3, fillOpacity: 0.82 });
    });
    (layer as L.Path).on('mouseout', function () {
      (layer as L.Path).setStyle({ weight: 1.5, fillOpacity: 0.65 });
    });
  };

  return (
    <div className="relative">
      <MapContainer
        center={SLP_CENTER}
        zoom={SLP_ZOOM}
        className={`rounded-lg ${className}`}
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          key={geoKey}
          data={geojson}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* Leyenda */}
      <div className="absolute bottom-4 right-4 z-[400] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md text-xs">
        <p className="mb-2 font-semibold text-slate-700">Incidencia</p>
        <div className="space-y-1">
          {[
            { color: '#e5e7eb', label: 'Sin reportes' },
            { color: '#4ade80', label: 'Baja' },
            { color: '#facc15', label: 'Media' },
            { color: '#fb923c', label: 'Alta' },
            { color: '#ef4444', label: 'Crítica' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-5 rounded-sm border border-slate-300"
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
