'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/arcashield-api';

interface LogEntry {
  id: number;
  tipo: string;
  mensaje: string;
  ipOrigen: string | null;
  ipDestino: string | null;
  archivoAfectado: string | null;
  timestamp: string;
}

interface LogsData {
  nodo: { hostname: string; sede: string; nodoId: number };
  ipOrigenAtaque: string | null;
  totalEventos: number;
  logs: LogEntry[];
}

const COLOR_TIPO: Record<string, string> = {
  ALERT:  'text-red-400',
  EXEC:   'text-yellow-300',
  CIPHER: 'text-orange-400',
  C2:     'text-red-500',
  MOVE:   'text-purple-400',
  PRIV:   'text-pink-400',
};

const FILTROS = ['TODOS', 'ALERT', 'EXEC', 'CIPHER', 'C2', 'MOVE', 'PRIV'] as const;

interface Props {
  nodoId?: number;
  sede?: string;
  hostname: string;
  onClose: () => void;
}

export function LogsTerminal({ nodoId, sede, hostname, onClose }: Props) {
  const [datos, setDatos]           = useState<LogsData | null>(null);
  const [cargando, setCargando]     = useState(true);
  const [filtro, setFiltro]         = useState<string>('TODOS');
  const listaRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCargando(true);
    setDatos(null);
    const peticion = nodoId
      ? api.getLogsNodo(nodoId)
      : sede
        ? api.getLogsSede(sede)
        : Promise.resolve(null);

    peticion
      .then((d) => setDatos(d as LogsData))
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [nodoId, sede]);

  useEffect(() => {
    if (listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight;
    }
  }, [datos, filtro]);

  const logsFiltrados = datos?.logs.filter(
    (l) => filtro === 'TODOS' || l.tipo === filtro,
  ) ?? [];

  const contar = (tipo: string) =>
    datos?.logs.filter((l) => l.tipo === tipo).length ?? 0;

  return (
    <div className="fixed right-0 top-0 h-full w-[900px] bg-[#080c10] border-l border-slate-700 z-[2100] flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 shrink-0 bg-slate-950">
        <div className="flex items-center gap-4">
          <span className="text-green-400 font-mono text-base font-bold tracking-wide">
            LOGS FORENSES — {hostname}
          </span>
          <span className="text-slate-500 font-mono text-sm">
            {datos?.totalEventos ?? 0} eventos
            {sede && (datos as any)?.nodosAfectados?.length > 0 && (
              <span className="text-slate-600 ml-2">· {(datos as any).nodosAfectados.length} nodos</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-6">
          {datos?.ipOrigenAtaque && (
            <span className="text-slate-500 font-mono text-sm">
              origen: <span className="text-red-400 font-bold">{datos.ipOrigenAtaque}</span>
            </span>
          )}
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-sm font-mono px-2 py-1 border border-slate-700 rounded hover:border-slate-500"
          >
            [x]
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 px-6 py-2.5 border-b border-slate-800 flex-wrap shrink-0 bg-slate-950/60">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`text-sm font-mono px-3 py-1 rounded border transition-colors ${
              filtro === f
                ? 'border-green-600 text-green-400 bg-green-950/50'
                : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            {f}
            {f !== 'TODOS' && (
              <span className={`ml-1.5 ${filtro === f ? 'text-green-600' : 'text-slate-700'}`}>({contar(f)})</span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de logs */}
      <div
        ref={listaRef}
        className="flex-1 overflow-y-auto px-6 py-3 font-mono text-sm space-y-1"
      >
        {cargando ? (
          <p className="text-green-600 animate-pulse mt-4">Cargando registros forenses...</p>
        ) : logsFiltrados.length === 0 ? (
          <p className="text-slate-700 mt-4">Sin eventos para este filtro</p>
        ) : (
          logsFiltrados.map((log) => (
            <div
              key={log.id}
              className="flex gap-3 hover:bg-slate-900/50 px-2 py-1 rounded group"
            >
              <span className="text-slate-400 shrink-0 w-28 tabular-nums text-sm font-mono font-semibold">
                {new Date(log.timestamp).toLocaleTimeString('es-MX', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </span>
              <span className={`shrink-0 w-16 font-bold text-sm ${COLOR_TIPO[log.tipo] ?? 'text-slate-500'}`}>
                [{log.tipo}]
              </span>
              <span className="text-slate-200 leading-relaxed min-w-0">
                {log.mensaje}
                {log.ipOrigen && log.tipo !== 'ALERT' && (
                  <span className="text-slate-600 ml-2 text-xs">src={log.ipOrigen}</span>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer resumen */}
      <div className="px-6 py-2.5 border-t border-slate-800 flex gap-6 text-sm font-mono shrink-0 bg-slate-950/60">
        <span className="text-slate-600">ALERT: <span className="text-red-500 font-bold">{contar('ALERT')}</span></span>
        <span className="text-slate-600">CIPHER: <span className="text-orange-500 font-bold">{contar('CIPHER')}</span></span>
        <span className="text-slate-600">C2: <span className="text-red-600 font-bold">{contar('C2')}</span></span>
        <span className="text-slate-600">MOVE: <span className="text-purple-500 font-bold">{contar('MOVE')}</span></span>
        <span className="text-slate-600">EXEC: <span className="text-yellow-500 font-bold">{contar('EXEC')}</span></span>
        <span className="text-slate-600">PRIV: <span className="text-pink-500 font-bold">{contar('PRIV')}</span></span>
      </div>
    </div>
  );
}
