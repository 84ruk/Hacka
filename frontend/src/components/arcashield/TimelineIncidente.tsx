'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/arcashield-api';

type TipoEvento =
  | 'primera_infeccion'
  | 'propagacion'
  | 'cifrado_detectado'
  | 'trafico_c2'
  | 'contencion'
  | 'erradicacion'
  | 'recuperacion'
  | 'alerta_critica';

interface Evento {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  descripcion: string;
  sede: string | null;
  hostname: string | null;
  timestamp: string;
  hora: string;
  severidad: string | null;
  fase: string;
}

interface Resumen {
  totalEventos: number;
  primerEvento: string | null;
  ultimoEvento: string | null;
  duracionTotal: string;
  eventosPorFase: Record<string, number>;
}

interface TimelineData {
  eventos: Evento[];
  resumen: Resumen;
}

const ESTILOS_EVENTO: Record<TipoEvento, { color: string; borde: string; label: string }> = {
  primera_infeccion: { color: 'text-red-400',    borde: 'border-l-4 border-red-600',    label: 'PRIMERA INFECCION'  },
  propagacion:       { color: 'text-orange-300',  borde: 'border-l-4 border-orange-500', label: 'PROPAGACION LATERAL'},
  cifrado_detectado: { color: 'text-red-300',     borde: 'border-l-4 border-red-500',    label: 'CIFRADO DETECTADO'  },
  trafico_c2:        { color: 'text-red-300',     borde: 'border-l-4 border-red-500',    label: 'TRAFICO C2'         },
  contencion:        { color: 'text-slate-300',   borde: 'border-l-4 border-slate-500',  label: 'CONTENCION'         },
  erradicacion:      { color: 'text-yellow-300',  borde: 'border-l-4 border-yellow-600', label: 'ERRADICACION'       },
  recuperacion:      { color: 'text-blue-300',    borde: 'border-l-4 border-blue-600',   label: 'RECUPERACION'       },
  alerta_critica:    { color: 'text-red-200',     borde: 'border-l-4 border-red-400',    label: 'ALERTA CRITICA'     },
};

interface TimelineIncidenteProps {
  onClose: () => void;
}

export function TimelineIncidente({ onClose }: TimelineIncidenteProps) {
  const [data, setData]       = useState<TimelineData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    setCargando(true);
    setError(false);
    api.getTimeline(100)
      .then((d) => { setData(d as TimelineData); setCargando(false); })
      .catch(() => { setError(true); setCargando(false); });
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Cabecera */}
      <div className="shrink-0 border-b border-slate-700 px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Timeline del Incidente
          </h2>
          {data && (
            <p className="text-xs text-slate-400 mt-0.5">
              {data.resumen.totalEventos} eventos · {data.resumen.duracionTotal}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-lg leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
        >
          X
        </button>
      </div>

      {/* Resumen por fase */}
      {data && (
        <div className="shrink-0 border-b border-slate-700 px-5 py-3 grid grid-cols-2 gap-x-6 gap-y-1">
          {Object.entries(data.resumen.eventosPorFase).map(([fase, count]) => (
            <div key={fase} className="flex justify-between text-xs">
              <span className="text-slate-400 uppercase">{fase}</span>
              <span className="text-slate-300 font-medium">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lista de eventos */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {cargando && (
          <div className="text-center text-slate-500 text-sm py-12">Cargando timeline...</div>
        )}
        {error && (
          <div className="text-center text-red-400 text-sm py-12">
            Error al cargar. Inicia la simulacion primero.
          </div>
        )}
        {data && data.eventos.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-12">
            Sin eventos. Inicia la simulacion para generar datos.
          </div>
        )}
        {data?.eventos.map((evento) => {
          const est = ESTILOS_EVENTO[evento.tipo] ?? ESTILOS_EVENTO.alerta_critica;
          return (
            <div
              key={evento.id}
              className={`${est.borde} bg-slate-800/50 rounded-r px-3 py-2.5`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[10px] font-bold tracking-wider ${est.color}`}>
                  {est.label}
                </span>
                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                  {evento.hora}
                </span>
              </div>
              {(evento.hostname || evento.sede) && (
                <p className="text-xs text-slate-300 mt-0.5">
                  {[evento.hostname, evento.sede].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                {evento.descripcion}
              </p>
            </div>
          );
        })}
      </div>

      {/* Pie */}
      {data && (
        <div className="shrink-0 border-t border-slate-700 px-5 py-3 text-xs text-slate-500">
          Duracion total: <span className="text-slate-300 font-mono">{data.resumen.duracionTotal}</span>
        </div>
      )}
    </div>
  );
}
