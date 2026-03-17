import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import type { Report, ReportSeverity } from '@/types/report';

export interface ZoneStat {
  id: string;
  name: string;
  count: number;
  score: number;
  dominantSeverity: ReportSeverity | null;
  unresolvedCount: number;
}

const SEVERITY_WEIGHT: Record<ReportSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

/**
 * Ray-casting point-in-polygon.
 * ring: array of [lon, lat] pairs (GeoJSON coordinate order).
 * point: [lat, lon] (standard JS order).
 */
function raycast(lat: number, lon: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]; // lon
    const yi = ring[i][1]; // lat
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInFeature(
  lat: number,
  lon: number,
  feature: Feature<Polygon | MultiPolygon>,
): boolean {
  const { geometry } = feature;
  if (geometry.type === 'Polygon') {
    return raycast(lat, lon, geometry.coordinates[0] as number[][]);
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as number[][][][]).some((polygon) =>
      raycast(lat, lon, polygon[0]),
    );
  }
  return false;
}

export function computeZoneStats(
  reports: Report[],
  geojson: FeatureCollection,
): Map<string, ZoneStat> {
  const stats = new Map<string, ZoneStat>();

  // Inicializar todas las zonas con valores en cero
  for (const feature of geojson.features) {
    const id = String(feature.properties?.id ?? feature.properties?.name ?? '');
    const name = String(feature.properties?.name ?? id);
    stats.set(id, {
      id,
      name,
      count: 0,
      score: 0,
      dominantSeverity: null,
      unresolvedCount: 0,
    });
  }

  // Asignar cada reporte a su zona (primera que coincide)
  for (const report of reports) {
    for (const feature of geojson.features) {
      const geomType = feature.geometry?.type;
      if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') continue;

      if (
        pointInFeature(
          report.latitude,
          report.longitude,
          feature as Feature<Polygon | MultiPolygon>,
        )
      ) {
        const id = String(feature.properties?.id ?? feature.properties?.name ?? '');
        const stat = stats.get(id);
        if (stat) {
          stat.count += 1;
          stat.score += SEVERITY_WEIGHT[report.severity];
          if (report.status !== 'RESOLVED') stat.unresolvedCount += 1;

          const currentWeight = stat.dominantSeverity
            ? SEVERITY_WEIGHT[stat.dominantSeverity]
            : 0;
          if (SEVERITY_WEIGHT[report.severity] > currentWeight) {
            stat.dominantSeverity = report.severity;
          }
        }
        break; // Cada reporte pertenece a la primera zona que lo contenga
      }
    }
  }

  return stats;
}

export function scoreToColor(score: number, maxScore: number): string {
  if (score === 0) return '#e5e7eb'; // gris — sin reportes
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio < 0.25) return '#4ade80'; // verde
  if (ratio < 0.5) return '#facc15';  // amarillo
  if (ratio < 0.75) return '#fb923c'; // naranja
  return '#ef4444';                   // rojo
}

export function colorLabel(score: number, maxScore: number): string {
  if (score === 0) return 'Sin reportes';
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio < 0.25) return 'Incidencia baja';
  if (ratio < 0.5) return 'Incidencia media';
  if (ratio < 0.75) return 'Incidencia alta';
  return 'Incidencia crítica';
}
