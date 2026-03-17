'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Report } from '@/types/report';
import { SEVERITY_COLORS, SEVERITY_LABELS, STATUS_LABELS } from '@/types/report';

// Fix: Leaflet + webpack pierde los íconos por defecto. Los servimos desde CDN.
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function makeColoredIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z"
        fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

// Subcomponente: captura clicks en el mapa para seleccionar ubicación.
function LocationPicker({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface ReportMapProps {
  // Modo visualización: lista de reportes con marcadores
  reports?: Report[];
  // Modo selección: un único pin movible
  selectable?: boolean;
  selectedLat?: number;
  selectedLng?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [23.6345, -102.5528]; // Centro de México
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 14;

export default function ReportMap({
  reports = [],
  selectable = false,
  selectedLat,
  selectedLng,
  onLocationSelect,
  className = 'h-64 w-full',
}: ReportMapProps) {
  const fixedRef = useRef(false);

  useEffect(() => {
    if (!fixedRef.current) {
      fixLeafletIcons();
      fixedRef.current = true;
    }
  }, []);

  const center: [number, number] =
    selectable && selectedLat !== undefined && selectedLng !== undefined
      ? [selectedLat, selectedLng]
      : reports.length > 0
        ? [reports[0].latitude, reports[0].longitude]
        : DEFAULT_CENTER;

  const zoom =
    selectable && selectedLat !== undefined ? SELECTED_ZOOM :
    reports.length === 1 ? SELECTED_ZOOM : DEFAULT_ZOOM;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={`rounded-lg ${className}`}
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {selectable && onLocationSelect && (
        <LocationPicker onSelect={onLocationSelect} />
      )}

      {selectable && selectedLat !== undefined && selectedLng !== undefined && (
        <Marker position={[selectedLat, selectedLng]} />
      )}

      {!selectable &&
        reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={makeColoredIcon(SEVERITY_COLORS[report.severity])}
          >
            <Popup>
              <div className="min-w-[160px] space-y-1">
                <p className="font-semibold text-slate-900">{report.title}</p>
                <p className="text-xs text-slate-500">
                  Severidad: {SEVERITY_LABELS[report.severity]}
                </p>
                <p className="text-xs text-slate-500">
                  Estado: {STATUS_LABELS[report.status]}
                </p>
                {report.address && (
                  <p className="text-xs text-slate-400">{report.address}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
