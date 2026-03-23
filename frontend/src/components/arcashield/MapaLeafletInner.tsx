'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Nodo } from '../../lib/arcashield-api';

// Fix para iconos de Leaflet en Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export const COORDENADAS_SEDES: Record<string, [number, number]> = {
  'CDMX-Central': [19.4326,  -99.1332],
  'Jalisco':      [20.6597, -104.5000],
  'NuevoLeon':    [26.0000,  -99.8000],
  'Veracruz':     [19.8000,  -95.2000],
  'Monterrey':    [25.6750, -100.3200],
  'Puebla':       [18.5000,  -98.5000],
  'Chihuahua':    [28.6353, -106.0889],
  'Tijuana':      [32.5149, -117.0382],
  'Merida':       [20.9674,  -89.5926],
  'Queretaro':    [20.8000, -100.3000],
};

// Topologia SD-WAN: CDMX es el hub principal
const CONEXIONES: [string, string][] = [
  ['CDMX-Central', 'Queretaro'],
  ['CDMX-Central', 'Puebla'],
  ['CDMX-Central', 'Veracruz'],
  ['CDMX-Central', 'Jalisco'],
  ['CDMX-Central', 'NuevoLeon'],
  ['Queretaro',    'Jalisco'],
  ['Queretaro',    'NuevoLeon'],
  ['NuevoLeon',    'Monterrey'],
  ['NuevoLeon',    'Chihuahua'],
  ['Jalisco',      'Tijuana'],
  ['Jalisco',      'Chihuahua'],
  ['Veracruz',     'Merida'],
];

function estadoSede(sede: string, nodos: Nodo[]): 'comprometido' | 'sospechoso' | 'contenido' | 'normal' {
  const ns = nodos.filter((n) => n.sede === sede);
  if (ns.some((n) => n.estado === 'comprometido')) return 'comprometido';
  if (ns.some((n) => n.estado === 'sospechoso'))   return 'sospechoso';
  if (ns.some((n) => n.estado === 'contenido' || n.estado === 'recuperando')) return 'contenido';
  return 'normal';
}

function colorLinea(a: string, b: string, nodos: Nodo[]): { color: string; weight: number; opacity: number; dashArray?: string } {
  const ea = estadoSede(a, nodos);
  const eb = estadoSede(b, nodos);
  if (ea === 'comprometido' || eb === 'comprometido') {
    return { color: '#ef4444', weight: 2.5, opacity: 0.85, dashArray: '6 4' };
  }
  if (ea === 'sospechoso' || eb === 'sospechoso') {
    return { color: '#facc15', weight: 1.5, opacity: 0.7 };
  }
  if (ea === 'contenido' || eb === 'contenido') {
    return { color: '#6b7280', weight: 1, opacity: 0.5 };
  }
  return { color: '#334155', weight: 1, opacity: 0.4 };
}

function crearIconoSede(sede: string, nodos: Nodo[]): L.DivIcon {
  const nodosSede     = nodos.filter((n) => n.sede === sede);
  const total         = nodosSede.length;
  const comprometidos = nodosSede.filter((n) => n.estado === 'comprometido').length;
  const contenidos    = nodosSede.filter((n) => n.estado === 'contenido' || n.estado === 'recuperando').length;
  const sospechosos   = nodosSede.filter((n) => n.estado === 'sospechoso').length;
  const recuperados   = nodosSede.filter((n) => n.estado === 'recuperado').length;
  const afectados     = comprometidos + contenidos + sospechosos;

  let colorPrincipal = '#22c55e';
  if (comprometidos > 0)    colorPrincipal = '#ef4444';
  else if (contenidos > 0)  colorPrincipal = '#6b7280';
  else if (sospechosos > 0) colorPrincipal = '#facc15';
  else if (recuperados > 0) colorPrincipal = '#3b82f6';

  const tamanioPx = Math.max(60, Math.min(90, total * 1.2));
  const radio     = tamanioPx / 2;

  const porcentajeAfectado = total > 0 ? afectados / total : 0;
  const circunferencia     = 2 * Math.PI * (radio - 4);
  const dashOffset         = circunferencia * (1 - porcentajeAfectado);

  const numeroCentro = comprometidos > 0 ? comprometidos : total;
  const labelCentro  = comprometidos > 0 ? 'comp.' : 'nodos';

  // Anillo de progreso de infeccion
  const anilloProgreso = porcentajeAfectado > 0 ? `
    <circle cx="${radio}" cy="${radio}" r="${radio - 4}"
      fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="4"
      stroke-dasharray="${circunferencia}" stroke-dashoffset="${dashOffset}"
      transform="rotate(-90 ${radio} ${radio})"
    />` : '';

  // Anillo pulsante exterior para sedes comprometidas
  const anilloPulso = comprometidos > 0 ? `
    <circle cx="${radio}" cy="${radio}" r="${radio - 2}"
      fill="none" stroke="#ef4444" stroke-width="3"
    >
      <animate attributeName="r"
        values="${radio - 2};${radio + 10};${radio - 2}"
        dur="2s" repeatCount="indefinite"/>
      <animate attributeName="stroke-opacity"
        values="0.9;0;0.9"
        dur="2s" repeatCount="indefinite"/>
    </circle>` : '';

  // Pulso de opacidad del circulo principal cuando comprometido
  const animacionFill = comprometidos > 0
    ? `<animate attributeName="fill-opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite"/>`
    : '';

  const numFontSize = tamanioPx > 70 ? 22 : 18;
  const labelFontSize = 9;

  const html = `
    <div style="position:relative;width:${tamanioPx}px;height:${tamanioPx}px;display:flex;flex-direction:column;align-items:center;">
      <svg width="${tamanioPx}" height="${tamanioPx}" style="position:absolute;top:0;left:0;overflow:visible;">
        ${anilloPulso}
        <circle cx="${radio}" cy="${radio}" r="${radio - 4}"
          fill="${colorPrincipal}" fill-opacity="0.9"
          stroke="rgba(0,0,0,0.3)" stroke-width="2"
        >${animacionFill}</circle>
        ${anilloProgreso}
        <!-- Circulo oscuro interior para contraste del numero -->
        <circle cx="${radio}" cy="${radio - 3}" r="${radio * 0.44}"
          fill="rgba(0,0,0,0.45)"
        />
        <!-- Numero principal con stroke para maximo contraste -->
        <text
          x="${radio}" y="${radio - 3}"
          text-anchor="middle" dominant-baseline="central"
          font-size="${numFontSize}" font-weight="900"
          fill="white"
          stroke="rgba(0,0,0,0.7)" stroke-width="3" paint-order="stroke fill"
          font-family="system-ui, -apple-system, sans-serif"
          letter-spacing="-0.5"
        >${numeroCentro}</text>
        <!-- Etiqueta inferior -->
        <text
          x="${radio}" y="${radio + numFontSize * 0.65}"
          text-anchor="middle" dominant-baseline="central"
          font-size="${labelFontSize}" font-weight="700"
          fill="rgba(255,255,255,0.95)"
          stroke="rgba(0,0,0,0.6)" stroke-width="2" paint-order="stroke fill"
          font-family="system-ui, -apple-system, sans-serif"
          letter-spacing="0.3"
        >${labelCentro}</text>
      </svg>
      <div style="position:absolute;bottom:-24px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(2,6,23,0.95);color:#f1f5f9;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;pointer-events:none;border:1px solid rgba(51,65,85,0.8);box-shadow:0 2px 6px rgba(0,0,0,0.6);">
        ${sede}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className:   '',
    iconSize:    [tamanioPx, tamanioPx],
    iconAnchor:  [radio, radio],
    popupAnchor: [0, -(radio + 12)],
  });
}

interface Props {
  nodos: Nodo[];
  onContenerSede: (sede: string) => Promise<void>;
  onVerLogsSede: (sede: string) => void;
}

export default function MapaLeafletInner({ nodos, onContenerSede, onVerLogsSede }: Props) {
  return (
    <MapContainer
      center={[23.6345, -102.5528]}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Lineas de conexion SD-WAN entre sedes */}
      {CONEXIONES.map(([sedeA, sedeB]) => {
        const coordA = COORDENADAS_SEDES[sedeA];
        const coordB = COORDENADAS_SEDES[sedeB];
        if (!coordA || !coordB) return null;
        const estilo = colorLinea(sedeA, sedeB, nodos);
        return (
          <Polyline
            key={`${sedeA}-${sedeB}`}
            positions={[coordA, coordB]}
            pathOptions={estilo}
          />
        );
      })}

      {/* Marcadores de sedes */}
      {Object.entries(COORDENADAS_SEDES).map(([sede, coords]) => {
        const nodosSede     = nodos.filter((n) => n.sede === sede);
        const comprometidos = nodosSede.filter((n) => n.estado === 'comprometido').length;
        const sospechosos   = nodosSede.filter((n) => n.estado === 'sospechoso').length;
        const contenidos    = nodosSede.filter((n) => n.estado === 'contenido' || n.estado === 'recuperando').length;
        const recuperados   = nodosSede.filter((n) => n.estado === 'recuperado').length;
        const normales      = nodosSede.filter((n) => n.estado === 'normal').length;
        const porcentaje    = nodosSede.length > 0
          ? Math.round(((comprometidos + sospechosos) / nodosSede.length) * 100)
          : 0;

        return (
          <Marker
            key={sede}
            position={coords}
            icon={crearIconoSede(sede, nodos)}
          >
            <Popup minWidth={200}>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '6px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
                  {sede}
                </div>
                <div>Total nodos: <strong>{nodosSede.length}</strong></div>
                {comprometidos > 0 && (
                  <div style={{ color: '#ef4444' }}>Comprometidos: <strong>{comprometidos}</strong></div>
                )}
                {sospechosos > 0 && (
                  <div style={{ color: '#facc15' }}>Sospechosos: <strong>{sospechosos}</strong></div>
                )}
                {contenidos > 0 && (
                  <div style={{ color: '#9ca3af' }}>Contenidos: <strong>{contenidos}</strong></div>
                )}
                {recuperados > 0 && (
                  <div style={{ color: '#3b82f6' }}>Recuperados: <strong>{recuperados}</strong></div>
                )}
                <div style={{ color: '#22c55e' }}>Normales: <strong>{normales}</strong></div>
                {porcentaje > 0 && (
                  <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px solid #334155', color: '#f87171' }}>
                    Nivel de infeccion: <strong>{porcentaje}%</strong>
                  </div>
                )}
                {comprometidos > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <button
                      onClick={() => onContenerSede(sede)}
                      style={{
                        width: '100%', padding: '5px 0',
                        background: '#7f1d1d', color: 'white', border: 'none',
                        borderRadius: 4, cursor: 'pointer', fontSize: 12,
                      }}
                    >
                      Contener sede
                    </button>
                    <button
                      onClick={() => onVerLogsSede(sede)}
                      style={{
                        width: '100%', padding: '5px 0',
                        background: '#0f172a', color: '#4ade80',
                        border: '1px solid #1e3a2f',
                        borderRadius: 4, cursor: 'pointer', fontSize: 12,
                        fontFamily: 'monospace',
                      }}
                    >
                      Ver logs forenses
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
