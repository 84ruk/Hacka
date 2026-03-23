'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/arcashield-api';

interface NodoRuta {
  id: number;
  hostname: string;
  sede: string;
  estado: string;
  timestamp: string;
}

interface PacienteCeroData {
  pacienteCero: {
    id: number;
    hostname: string;
    sede: string;
    ip: string;
    tipo: string;
    scoreRiesgo: number;
    tipoAtaqueInicial: string;
    primeraDeteccion: string;
  } | null;
  propagacion: {
    tiempoPropagacion: string;
    sedesAlcanzadas: number;
    sedesAfectadas: string[];
    nodosEnRuta: NodoRuta[];
  };
  resumen: string;
}

const COLOR_ESTADO: Record<string, string> = {
  comprometido: 'bg-red-900 text-red-300',
  sospechoso:   'bg-yellow-900 text-yellow-300',
  contenido:    'bg-slate-700 text-slate-300',
  recuperado:   'bg-blue-900 text-blue-300',
};

interface PacienteCeroCardProps {
  refreshKey?: number;
}

export function PacienteCeroCard({ refreshKey }: PacienteCeroCardProps) {
  const [datos, setDatos]       = useState<PacienteCeroData | null>(null);
  const [visible, setVisible]   = useState(true);

  useEffect(() => {
    api.getPacienteCero()
      .then((d) => setDatos(d as PacienteCeroData))
      .catch(() => {});
  }, [refreshKey]);

  if (!datos?.pacienteCero || !visible) return null;

  const pc = datos.pacienteCero;
  const pr = datos.propagacion;

  return (
    <div className="bg-slate-900 border border-red-800/60 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-red-800 text-white px-2 py-0.5 rounded uppercase tracking-wider">
            Origen del ataque
          </span>
          <span className="text-slate-400 text-xs">Vector de infeccion inicial identificado</span>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          ocultar
        </button>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-2 gap-4">
        {/* Nodo origen */}
        <div>
          <p className="text-slate-400 text-xs mb-1">Nodo origen</p>
          <p className="text-white font-bold text-lg font-mono leading-tight">{pc.hostname}</p>
          <p className="text-slate-300 text-sm">{pc.sede} — {pc.ip}</p>
          <p className="text-red-400 text-xs mt-1">
            {pc.tipoAtaqueInicial.replace(/_/g, ' ')}
          </p>
        </div>

        {/* Propagacion */}
        <div>
          <p className="text-slate-400 text-xs mb-1">Propagacion</p>
          <p className="text-white font-bold text-lg leading-tight">{pr.tiempoPropagacion}</p>
          <p className="text-slate-300 text-sm">
            {pr.sedesAlcanzadas} sede{pr.sedesAlcanzadas !== 1 ? 's' : ''} alcanzada{pr.sedesAlcanzadas !== 1 ? 's' : ''}
          </p>
          <p className="text-slate-400 text-xs mt-1 truncate">
            {pr.sedesAfectadas.join(' — ')}
          </p>
        </div>
      </div>

      {/* Ruta de propagacion */}
      {pr.nodosEnRuta.length > 0 && (
        <div className="pt-3 border-t border-slate-800">
          <p className="text-slate-400 text-xs mb-2">Ruta de propagacion</p>
          <div className="flex items-center gap-1 flex-wrap">
            {pr.nodosEnRuta.slice(0, 5).map((nodo, i) => (
              <span key={nodo.id} className="flex items-center gap-1">
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${COLOR_ESTADO[nodo.estado] ?? 'bg-slate-700 text-slate-300'}`}>
                  {nodo.hostname}
                </span>
                {i < Math.min(pr.nodosEnRuta.length, 5) - 1 && (
                  <span className="text-red-700 text-sm">→</span>
                )}
              </span>
            ))}
            {pr.nodosEnRuta.length > 5 && (
              <span className="text-slate-500 text-xs ml-1">
                +{pr.nodosEnRuta.length - 5} mas
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
