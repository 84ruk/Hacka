'use client';
import { Alerta } from '../../lib/arcashield-api';

const SEVERIDAD_ESTILOS: Record<string, { text: string; bg: string; badge: string }> = {
  critica: { text: 'text-red-400',    bg: 'bg-red-950/40',    badge: 'bg-red-800 text-red-100' },
  alta:    { text: 'text-orange-400', bg: 'bg-orange-950/40', badge: 'bg-orange-800 text-orange-100' },
  media:   { text: 'text-yellow-400', bg: 'bg-yellow-950/40', badge: 'bg-yellow-800 text-yellow-100' },
  baja:    { text: 'text-slate-400',  bg: 'bg-slate-800/40',  badge: 'bg-slate-700 text-slate-200' },
};

const TIPO_LABEL: Record<string, string> = {
  cifrado_archivos:   'ENC',
  trafico_c2:         'C2',
  movimiento_lateral: 'LAT',
  script_malicioso:   'SCR',
  anomalia_red:       'NET',
};

interface PanelAlertasProps {
  alertas: Alerta[];
  onAtender: (id: number) => void;
}

function formatHora(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export function PanelAlertas({ alertas, onAtender }: PanelAlertasProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Alertas activas
        </h2>
        <span className="text-xs font-bold bg-red-800 text-red-100 px-2 py-0.5 rounded-full">
          {alertas.length}
        </span>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {alertas.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            Sin alertas activas
          </div>
        ) : (
          alertas.map((alerta) => {
            const e = SEVERIDAD_ESTILOS[alerta.severidad] ?? SEVERIDAD_ESTILOS.baja;
            return (
              <div key={alerta.id} className={`px-3 py-2.5 ${e.bg} hover:brightness-110 transition-all`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 mt-0.5 shrink-0 font-mono">
                      {TIPO_LABEL[alerta.tipo] ?? 'ALR'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${e.badge}`}>
                          {alerta.severidad.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          {alerta.nodo?.hostname ?? '—'} · {alerta.nodo?.sede ?? '—'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${e.text} line-clamp-2`}>
                        {alerta.descripcion}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{formatHora(alerta.creadoEn)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAtender(alerta.id)}
                    className="shrink-0 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    ✓
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
