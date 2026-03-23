'use client';
import { useMemo } from 'react';
import { Nodo } from '../../lib/arcashield-api';

interface GraficaSedesProps {
  porSede: { sede: string; comprometidos: number; total: number }[];
  nodos: Nodo[];
}

interface BarraSede {
  sede: string;
  total: number;
  comprometidos: number;
  sospechosos: number;
  contenidos: number;
  recuperados: number;
  normales: number;
}

export function GraficaSedes({ porSede, nodos }: GraficaSedesProps) {
  const barras = useMemo<BarraSede[]>(() => {
    return porSede.map(({ sede, total }) => {
      const nodosSede = nodos.filter((n) => n.sede === sede);
      return {
        sede,
        total,
        comprometidos: nodosSede.filter((n) => n.estado === 'comprometido').length,
        sospechosos:   nodosSede.filter((n) => n.estado === 'sospechoso').length,
        contenidos:    nodosSede.filter((n) => n.estado === 'contenido' || n.estado === 'recuperando').length,
        recuperados:   nodosSede.filter((n) => n.estado === 'recuperado').length,
        normales:      nodosSede.filter((n) => n.estado === 'normal').length,
      };
    });
  }, [porSede, nodos]);

  if (barras.length === 0) return null;

  const pct = (n: number, total: number) => total === 0 ? 0 : (n / total) * 100;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Distribucion por sede
      </h2>

      <div className="space-y-3">
        {barras.map((b) => (
          <div key={b.sede} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-28 shrink-0 truncate">{b.sede}</span>
            <div className="flex-1 flex h-5 rounded overflow-hidden bg-slate-800">
              {b.comprometidos > 0 && (
                <div
                  style={{ width: `${pct(b.comprometidos, b.total)}%` }}
                  className="bg-red-600 transition-all duration-500"
                  title={`${b.comprometidos} comprometidos`}
                />
              )}
              {b.sospechosos > 0 && (
                <div
                  style={{ width: `${pct(b.sospechosos, b.total)}%` }}
                  className="bg-yellow-400 transition-all duration-500"
                  title={`${b.sospechosos} sospechosos`}
                />
              )}
              {b.contenidos > 0 && (
                <div
                  style={{ width: `${pct(b.contenidos, b.total)}%` }}
                  className="bg-slate-500 transition-all duration-500"
                  title={`${b.contenidos} contenidos`}
                />
              )}
              {b.recuperados > 0 && (
                <div
                  style={{ width: `${pct(b.recuperados, b.total)}%` }}
                  className="bg-blue-500 transition-all duration-500"
                  title={`${b.recuperados} recuperados`}
                />
              )}
              {b.normales > 0 && (
                <div
                  style={{ width: `${pct(b.normales, b.total)}%` }}
                  className="bg-green-600 transition-all duration-500"
                  title={`${b.normales} normales`}
                />
              )}
            </div>
            <span className="text-xs text-slate-500 w-8 text-right shrink-0">{b.total}</span>
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-4 pt-3 border-t border-slate-700/50">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-red-600 rounded" />
          Comprometido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-yellow-400 rounded" />
          Sospechoso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-slate-500 rounded" />
          Contenido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-blue-500 rounded" />
          Recuperado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-green-600 rounded" />
          Normal
        </span>
      </div>
    </div>
  );
}
