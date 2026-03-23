'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/arcashield-api';

interface AccionLog {
  id: number;
  fase: string;
  descripcion: string;
  estado: string;
  hora: string;
  creadoEn: string;
}

const ESTILO_FASE: Record<string, { label: string; color: string; fondo: string }> = {
  deteccion:    { label: 'DETECCION',    color: 'text-yellow-400', fondo: 'bg-yellow-900/30' },
  contencion:   { label: 'CONTENCION',   color: 'text-red-400',    fondo: 'bg-red-900/30'    },
  erradicacion: { label: 'ERRADICACION', color: 'text-orange-400', fondo: 'bg-orange-900/30' },
  recuperacion: { label: 'RECUPERACION', color: 'text-blue-400',   fondo: 'bg-blue-900/30'   },
};

export function LogProtocolo() {
  const [acciones, setAcciones] = useState<AccionLog[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    api.getAcciones()
      .then((data) => {
        setAcciones(data as AccionLog[]);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  if (cargando) {
    return <div className="text-center text-slate-500 text-sm py-6">Cargando acciones...</div>;
  }

  if (acciones.length === 0) {
    return (
      <div className="text-center text-slate-500 text-sm py-6">
        Sin acciones registradas. Ejecuta una contencion para ver el log.
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
      {acciones.map((a) => {
        const est = ESTILO_FASE[a.fase] ?? { label: a.fase.toUpperCase(), color: 'text-slate-400', fondo: 'bg-slate-800' };
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 px-3 py-2 rounded-lg ${est.fondo}`}
          >
            <span className="font-mono text-xs text-slate-500 shrink-0 mt-0.5 w-10">{a.hora}</span>
            <span className={`text-[10px] font-bold tracking-wider shrink-0 mt-0.5 w-24 ${est.color}`}>
              {est.label}
            </span>
            <span className="text-xs text-slate-300 leading-snug">{a.descripcion}</span>
          </div>
        );
      })}
    </div>
  );
}
