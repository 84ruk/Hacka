'use client';
import { useEffect, useState } from 'react';
import { api, Recomendacion } from '../../lib/arcashield-api';

export function BannerIA() {
  const [recs, setRecs] = useState<Recomendacion[]>([]);

  useEffect(() => {
    const cargar = () =>
      api.getRecomendaciones()
        .then((d) => setRecs(d.recomendaciones))
        .catch(() => {});

    cargar();
    const t = setInterval(cargar, 10_000);
    return () => clearInterval(t);
  }, []);

  const primera = recs[0];

  if (!primera) {
    return (
      <div className="bg-green-950 border border-green-800 rounded-xl px-5 py-3 flex items-center gap-3">
        <span className="text-green-400 text-lg">✅</span>
        <p className="text-green-300 text-sm font-medium">
          Sin amenazas activas detectadas por el motor de análisis
        </p>
      </div>
    );
  }

  const estilos: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    CRITICA: { bg: 'bg-red-950', border: 'border-red-700', text: 'text-red-200', badge: 'bg-red-700 text-white' },
    ALTA:    { bg: 'bg-orange-950', border: 'border-orange-700', text: 'text-orange-200', badge: 'bg-orange-700 text-white' },
    MEDIA:   { bg: 'bg-yellow-950', border: 'border-yellow-700', text: 'text-yellow-200', badge: 'bg-yellow-700 text-white' },
    BAJA:    { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-300', badge: 'bg-slate-600 text-white' },
  };

  const e = estilos[primera.prioridad] ?? estilos.MEDIA;

  return (
    <div className={`${e.bg} border ${e.border} rounded-xl px-5 py-3 flex items-center gap-4`}>
      <span className="text-xl">🤖</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.badge}`}>
            {primera.prioridad}
          </span>
          <span className="text-xs text-slate-400 uppercase tracking-wider">IA · Recomendación principal</span>
        </div>
        <p className={`text-sm font-semibold ${e.text}`}>
          ⚠️ ACCIÓN RECOMENDADA: {primera.accion}
          {primera.razon && <span className="font-normal text-slate-400"> — {primera.razon}</span>}
        </p>
      </div>
      <div className="text-xs text-slate-500 shrink-0">
        {recs.length} recomendaciones activas
      </div>
    </div>
  );
}
