'use client';
import { useState } from 'react';
import { Nodo } from '../../lib/arcashield-api';

const COLOR_ESTADO: Record<string, string> = {
  normal:       'bg-green-500',
  sospechoso:   'bg-yellow-400',
  comprometido: 'bg-red-500 animate-pulse',
  contenido:    'bg-slate-400',
  recuperando:  'bg-blue-400 animate-pulse',
  recuperado:   'bg-blue-500',
};

const LABEL_ESTADO: Record<string, string> = {
  normal:       'Normal',
  sospechoso:   'Sospechoso',
  comprometido: 'Comprometido',
  contenido:    'Contenido',
  recuperando:  'Recuperando',
  recuperado:   'Recuperado',
};

const ORDEN_SEDES = ['CDMX-Central', 'Jalisco', 'NuevoLeon', 'Veracruz', 'Monterrey', 'Puebla', 'Chihuahua', 'Tijuana', 'Merida', 'Queretaro'];

interface MapaRedProps {
  nodos: Nodo[];
  onNodoClick: (id: number) => void;
  onContenerSede: (sede: string) => Promise<void>;
  onRecuperarSede: (sede: string) => Promise<void>;
}

interface SedeCardProps {
  sede: string;
  nodos: Nodo[];
  onNodoClick: (id: number) => void;
  onContenerSede: (sede: string) => Promise<void>;
  onRecuperarSede: (sede: string) => Promise<void>;
}

function SedeCard({ sede, nodos, onNodoClick, onContenerSede, onRecuperarSede }: SedeCardProps) {
  const [conteniendo, setConteniendo] = useState(false);
  const [recuperando, setRecuperando] = useState(false);

  const comprometidos = nodos.filter((n) => n.estado === 'comprometido').length;
  const sospechosos   = nodos.filter((n) => n.estado === 'sospechoso').length;
  const contenidos    = nodos.filter((n) => n.estado === 'contenido' || n.estado === 'recuperando').length;
  const recuperados   = nodos.filter((n) => n.estado === 'recuperado').length;
  const normales      = nodos.filter((n) => n.estado === 'normal').length;
  const pctInfectado  = nodos.length > 0 ? Math.round(((comprometidos + sospechosos) / nodos.length) * 100) : 0;

  const nivelThreat =
    comprometidos > 10 ? 'critical' :
    comprometidos > 0  ? 'high' :
    sospechosos > 0    ? 'medium' :
    contenidos > 0     ? 'contained' :
                         'clean';

  const borderColor =
    nivelThreat === 'critical'  ? 'border-red-600' :
    nivelThreat === 'high'      ? 'border-red-800' :
    nivelThreat === 'medium'    ? 'border-yellow-700' :
    nivelThreat === 'contained' ? 'border-slate-600' :
                                  'border-slate-700';

  const bgColor =
    nivelThreat === 'critical'  ? 'bg-red-950/40' :
    nivelThreat === 'high'      ? 'bg-red-950/20' :
    nivelThreat === 'medium'    ? 'bg-yellow-950/20' :
                                  'bg-slate-900';

  const leftAccent =
    nivelThreat === 'critical'  ? 'before:bg-red-500' :
    nivelThreat === 'high'      ? 'before:bg-red-700' :
    nivelThreat === 'medium'    ? 'before:bg-yellow-500' :
    nivelThreat === 'contained' ? 'before:bg-slate-500' :
                                  'before:bg-green-600';

  const handleContenerSede = async () => {
    setConteniendo(true);
    await onContenerSede(sede);
    setConteniendo(false);
  };

  const handleRecuperarSede = async () => {
    setRecuperando(true);
    await onRecuperarSede(sede);
    setRecuperando(false);
  };

  return (
    <div className={`border rounded-xl flex flex-col gap-2.5 relative overflow-hidden ${borderColor} ${bgColor} before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 ${leftAccent}`}>
      {/* Header */}
      <div className="px-3 pt-3 flex items-start justify-between gap-1">
        <div className="min-w-0">
          <h3 className="font-bold text-white text-sm leading-tight truncate">{sede}</h3>
          <p className="text-slate-500 text-xs mt-0.5">{nodos.length} nodos total</p>
        </div>
        {nivelThreat !== 'clean' && nivelThreat !== 'contained' && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
            nivelThreat === 'critical' ? 'bg-red-600 text-white' :
            nivelThreat === 'high'     ? 'bg-red-800 text-red-200' :
                                         'bg-yellow-800 text-yellow-200'
          }`}>
            {pctInfectado}%
          </span>
        )}
      </div>

      {/* Stats */}
      {(comprometidos > 0 || sospechosos > 0 || contenidos > 0 || recuperados > 0) && (
        <div className="px-3 flex flex-wrap gap-x-3 gap-y-0.5">
          {comprometidos > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              <span className="text-red-400 text-xs font-semibold">{comprometidos} comp.</span>
            </div>
          )}
          {sospechosos > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
              <span className="text-yellow-400 text-xs font-semibold">{sospechosos} sosp.</span>
            </div>
          )}
          {contenidos > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
              <span className="text-slate-400 text-xs">{contenidos} cont.</span>
            </div>
          )}
          {recuperados > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              <span className="text-blue-400 text-xs">{recuperados} recup.</span>
            </div>
          )}
        </div>
      )}

      {/* Barra de estado de infeccion */}
      {pctInfectado > 0 && (
        <div className="px-3">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                comprometidos > 0 ? 'bg-red-500' : 'bg-yellow-400'
              }`}
              style={{ width: `${pctInfectado}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid de nodos */}
      <div className="px-3 flex flex-wrap gap-[3px]">
        {nodos.map((nodo) => (
          <button
            key={nodo.id}
            onClick={() => onNodoClick(nodo.id)}
            title={`${nodo.hostname} · ${LABEL_ESTADO[nodo.estado]} · Score: ${nodo.scoreRiesgo}`}
            className={`w-2.5 h-2.5 rounded-full transition-transform hover:scale-150 hover:z-10 relative ${COLOR_ESTADO[nodo.estado] ?? 'bg-slate-600'}`}
          />
        ))}
      </div>

      {/* Acciones */}
      <div className="px-3 pb-3 flex flex-col gap-1.5">
        {comprometidos > 0 && (
          <button
            onClick={handleContenerSede}
            disabled={conteniendo}
            className="text-xs px-2 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-red-100 font-semibold transition-colors w-full border border-red-800"
          >
            {conteniendo ? 'Conteniendo...' : `Contener sede`}
          </button>
        )}
        {contenidos > 0 && normales + comprometidos + sospechosos === 0 && (
          <button
            onClick={handleRecuperarSede}
            disabled={recuperando}
            className="text-xs px-2 py-1.5 rounded-lg bg-blue-900/80 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-blue-100 font-semibold transition-colors w-full border border-blue-800"
          >
            {recuperando ? 'Recuperando...' : 'Recuperar sede'}
          </button>
        )}
      </div>
    </div>
  );
}

export function MapaRed({ nodos, onNodoClick, onContenerSede, onRecuperarSede }: MapaRedProps) {
  const nodosPorSede = ORDEN_SEDES.reduce<Record<string, Nodo[]>>((acc, sede) => {
    acc[sede] = nodos.filter((n) => n.sede === sede);
    return acc;
  }, {});

  if (nodos.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 min-h-64">
        <p className="text-slate-400 text-sm">Sin datos — Inicia la simulacion</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      {/* Titulo + leyenda */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
          Red SD-WAN — {nodos.length} nodos
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {Object.entries(COLOR_ESTADO).map(([estado, color]) => (
            <span key={estado} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-slate-400">{LABEL_ESTADO[estado]}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2.5 mb-2.5">
        {ORDEN_SEDES.slice(0, 5).map((sede) => (
          <SedeCard
            key={sede}
            sede={sede}
            nodos={nodosPorSede[sede] ?? []}
            onNodoClick={onNodoClick}
            onContenerSede={onContenerSede}
            onRecuperarSede={onRecuperarSede}
          />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2.5">
        {ORDEN_SEDES.slice(5).map((sede) => (
          <SedeCard
            key={sede}
            sede={sede}
            nodos={nodosPorSede[sede] ?? []}
            onNodoClick={onNodoClick}
            onContenerSede={onContenerSede}
            onRecuperarSede={onRecuperarSede}
          />
        ))}
      </div>
    </div>
  );
}
