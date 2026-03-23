'use client';
import { ResumenNodos } from '../../lib/arcashield-api';

type EstadoFase = 'pendiente' | 'activa' | 'completa';

const ESTILOS_ESTADO: Record<EstadoFase, {
  borde: string; fondo: string; texto: string; icono: string; badge: string; badgeColor: string;
}> = {
  pendiente: {
    borde:      'border-slate-600',
    fondo:      'bg-slate-800',
    texto:      'text-slate-400',
    icono:      '⏳',
    badge:      'Pendiente',
    badgeColor: 'bg-slate-700 text-slate-400',
  },
  activa: {
    borde:      'border-yellow-500',
    fondo:      'bg-yellow-950/60',
    texto:      'text-yellow-300',
    icono:      '🔄',
    badge:      'En progreso',
    badgeColor: 'bg-yellow-600 text-white animate-pulse',
  },
  completa: {
    borde:      'border-green-500',
    fondo:      'bg-green-950/60',
    texto:      'text-green-300',
    icono:      '✅',
    badge:      'Completa',
    badgeColor: 'bg-green-600 text-white',
  },
};

interface FaseSpec {
  numero: number;
  nombre: string;
  descripcion: string;
  metrica: (r: ResumenNodos) => string;
}

const FASES: FaseSpec[] = [
  {
    numero: 1,
    nombre: 'Detección',
    descripcion: 'Identificación de nodos comprometidos',
    metrica: (r) => `${r.comprometido + r.contenido + r.recuperado} nodos detectados`,
  },
  {
    numero: 2,
    nombre: 'Contención',
    descripcion: 'Aislamiento de nodos de la red SD-WAN',
    metrica: (r) => `${r.contenido} nodos contenidos`,
  },
  {
    numero: 3,
    nombre: 'Erradicación',
    descripcion: 'Eliminación del malware y análisis forense',
    metrica: (r) => `${r.recuperado} nodos analizados`,
  },
  {
    numero: 4,
    nombre: 'Recuperación',
    descripcion: 'Restauración e integración a la red',
    metrica: (r) => `${r.recuperado} nodos recuperados`,
  },
];

function calcularEstados(resumen: ResumenNodos): EstadoFase[] {
  const estados: EstadoFase[] = ['pendiente', 'pendiente', 'pendiente', 'pendiente'];

  const totalAfectados = resumen.comprometido + resumen.contenido + resumen.recuperado;

  // Fase 1 — Detección
  if (totalAfectados > 0) {
    estados[0] = resumen.comprometido === 0 ? 'completa' : 'activa';
  }

  // Fase 2 — Contención
  if (resumen.contenido > 0 && resumen.comprometido === 0) {
    estados[1] = 'completa';
  } else if (resumen.contenido > 0) {
    estados[1] = 'activa';
  }

  // Fase 3 — Erradicación
  if (resumen.contenido > 0 || resumen.recuperado > 0) {
    estados[2] = resumen.contenido === 0 && resumen.recuperado > 0 ? 'completa' : 'activa';
  }

  // Fase 4 — Recuperación
  if (resumen.recuperado > 0) {
    estados[3] =
      resumen.comprometido === 0 && resumen.contenido === 0 ? 'completa' : 'activa';
  }

  return estados;
}

interface GuiaProtocoloProps {
  resumen: ResumenNodos | null;
}

export function GuiaProtocolo({ resumen }: GuiaProtocoloProps) {
  const estados = resumen ? calcularEstados(resumen) : Array(4).fill('pendiente') as EstadoFase[];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      {/* Título */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Protocolo de Actuación — Ransomware SD-WAN
      </h2>

      {/* Fases */}
      <div className="grid grid-cols-4 gap-0 relative">
        {/* Línea de conexión */}
        <div className="absolute top-6 left-[12.5%] right-[12.5%] h-px bg-slate-600 z-0" />

        {FASES.map((fase, i) => {
          const estado = estados[i] as EstadoFase;
          const est = ESTILOS_ESTADO[estado];

          return (
            <div key={fase.numero} className="flex flex-col items-center gap-2 px-2 relative z-10">
              {/* Círculo numerado */}
              <div
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg shrink-0 ${est.borde} ${est.fondo}`}
              >
                {est.icono}
              </div>

              {/* Contenido */}
              <div className={`w-full border rounded-lg p-3 flex flex-col gap-1.5 ${est.borde} ${est.fondo}`}>
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-xs font-bold text-white">
                    {fase.numero}. {fase.nombre}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${est.badgeColor}`}>
                    {est.badge}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">{fase.descripcion}</p>

                {resumen && (
                  <p className={`text-xs font-semibold mt-0.5 ${est.texto}`}>
                    {fase.metrica(resumen)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
