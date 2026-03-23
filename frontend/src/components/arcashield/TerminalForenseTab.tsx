'use client';

import { useEffect, useRef, useState } from 'react';
import { api, Nodo } from '../../lib/arcashield-api';

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

const ESTADO_COLOR: Record<string, string> = {
  comprometido: 'text-red-400',
  contenido:    'text-slate-300',
  recuperando:  'text-blue-300',
  sospechoso:   'text-yellow-400',
};

const FILTROS = ['TODOS', 'ALERT', 'EXEC', 'CIPHER', 'C2', 'MOVE', 'PRIV'] as const;

interface Props {
  nodos: Nodo[];
}

export function TerminalForenseTab({ nodos }: Props) {
  const nodosInfectados = nodos.filter(
    (n) => n.estado === 'comprometido' || n.estado === 'contenido' || n.estado === 'recuperando',
  );

  const [nodoSeleccionado, setNodoSeleccionado] = useState<number | null>(null);
  const [datos, setDatos]     = useState<LogsData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro]   = useState<string>('TODOS');
  const listaRef = useRef<HTMLDivElement>(null);

  // Auto-seleccionar primer nodo infectado
  useEffect(() => {
    if (nodosInfectados.length > 0 && nodoSeleccionado === null) {
      setNodoSeleccionado(nodosInfectados[0].id);
    }
  }, [nodosInfectados.length]); // eslint-disable-line

  // Cargar logs al seleccionar nodo
  useEffect(() => {
    if (nodoSeleccionado === null) return;
    setCargando(true);
    setDatos(null);
    api.getLogsNodo(nodoSeleccionado)
      .then((d) => setDatos(d as LogsData))
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [nodoSeleccionado]);

  // Auto-scroll al final
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

  if (nodosInfectados.length === 0) {
    return (
      <div className="bg-black border border-slate-800 rounded-xl flex items-center justify-center h-64">
        <p className="text-slate-600 font-mono text-sm">
          Sin nodos comprometidos — inicia la simulacion para ver logs forenses
        </p>
      </div>
    );
  }

  return (
    <div className="bg-black border border-slate-800 rounded-xl flex overflow-hidden" style={{ height: 540 }}>

      {/* Lista lateral de nodos infectados */}
      <div className="w-52 border-r border-slate-900 flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-slate-900 shrink-0">
          <span className="text-slate-500 font-mono text-xs uppercase tracking-wider">
            Nodos infectados ({nodosInfectados.length})
          </span>
        </div>
        <div className="overflow-y-auto flex-1">
          {nodosInfectados.map((n) => (
            <button
              key={n.id}
              onClick={() => { setNodoSeleccionado(n.id); setFiltro('TODOS'); }}
              className={`w-full text-left px-3 py-2.5 border-b border-slate-900/60 transition-colors ${
                nodoSeleccionado === n.id ? 'bg-slate-900' : 'hover:bg-slate-950'
              }`}
            >
              <div className={`text-xs font-mono font-bold ${ESTADO_COLOR[n.estado] ?? 'text-slate-400'}`}>
                {n.hostname}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">{n.sede}</div>
              <div className="text-xs text-slate-700 mt-0.5">{n.ip}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel terminal derecho */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-900 shrink-0">
          <div>
            <span className="text-green-400 font-mono text-sm font-bold">
              LOGS FORENSES — {datos?.nodo.hostname ?? nodos.find(n => n.id === nodoSeleccionado)?.hostname ?? '...'}
            </span>
            <span className="text-slate-600 font-mono text-xs ml-3">
              {datos?.totalEventos ?? 0} eventos
            </span>
          </div>
          {datos?.ipOrigenAtaque && (
            <span className="text-slate-600 font-mono text-xs">
              origen ataque: <span className="text-red-400 font-bold">{datos.ipOrigenAtaque}</span>
            </span>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-1.5 px-4 py-2 border-b border-slate-900 flex-wrap shrink-0">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors ${
                filtro === f
                  ? 'border-green-600 text-green-400 bg-green-950/50'
                  : 'border-slate-800 text-slate-600 hover:text-slate-400'
              }`}
            >
              {f}
              {f !== 'TODOS' && (
                <span className="ml-1 text-slate-700">({contar(f)})</span>
              )}
            </button>
          ))}
        </div>

        {/* Logs */}
        <div
          ref={listaRef}
          className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5"
        >
          {cargando ? (
            <p className="text-green-600 animate-pulse">Cargando registros forenses...</p>
          ) : logsFiltrados.length === 0 ? (
            <p className="text-slate-700">Sin eventos para este filtro</p>
          ) : (
            logsFiltrados.map((log) => (
              <div
                key={log.id}
                className="flex gap-2 hover:bg-slate-900/40 px-1 py-0.5 rounded"
              >
                <span className="text-slate-700 shrink-0 w-20 tabular-nums">
                  {new Date(log.timestamp).toLocaleTimeString('es-MX', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </span>
                <span className={`shrink-0 w-14 font-bold ${COLOR_TIPO[log.tipo] ?? 'text-slate-500'}`}>
                  [{log.tipo}]
                </span>
                <span className="text-slate-300 break-all leading-relaxed">
                  {log.mensaje}
                  {log.ipOrigen && log.tipo !== 'ALERT' && (
                    <span className="text-slate-600 ml-1">src={log.ipOrigen}</span>
                  )}
                  {log.archivoAfectado && (
                    <span className="text-slate-500 ml-1 block">archivo: {log.archivoAfectado}</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer conteo */}
        <div className="px-4 py-2 border-t border-slate-900 flex gap-4 text-xs font-mono text-slate-700 shrink-0">
          <span>ALERT: <span className="text-red-700">{contar('ALERT')}</span></span>
          <span>PRIV: <span className="text-pink-800">{contar('PRIV')}</span></span>
          <span>EXEC: <span className="text-yellow-800">{contar('EXEC')}</span></span>
          <span>CIPHER: <span className="text-orange-700">{contar('CIPHER')}</span></span>
          <span>C2: <span className="text-red-800">{contar('C2')}</span></span>
          <span>MOVE: <span className="text-purple-800">{contar('MOVE')}</span></span>
        </div>
      </div>
    </div>
  );
}
