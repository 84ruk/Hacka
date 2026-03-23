'use client';

interface ResultadoEscaneo {
  nodosEscaneados: number;
  amenazasDetectadas: number;
  sospechososDetectados?: number;
  nodosActualizados: number;
  reglaAplicada: string[];
  duracion: string;
  mensaje: string;
  estadoActual?: { comprometidos: number; sospechosos: number; normales: number };
}

interface Props {
  resultado: ResultadoEscaneo;
  onClose: () => void;
}

export function ResultadoEscaneoModal({ resultado, onClose }: Props) {
  const sinCambios   = resultado.nodosActualizados === 0;
  const hayAmenazas  = resultado.amenazasDetectadas > 0 || (resultado.sospechososDetectados ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          hayAmenazas ? 'bg-cyan-950/60 border-cyan-800/40' : 'bg-slate-800 border-slate-700'
        }`}>
          <div>
            <h2 className="text-white font-bold text-base">Escaneo de red completado</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {resultado.nodosEscaneados} nodos analizados en {resultado.duracion}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-lg leading-none">
            x
          </button>
        </div>

        {/* Metricas del escaneo */}
        <div className="grid grid-cols-3 gap-3 px-6 pt-5">
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white font-mono">{resultado.nodosEscaneados}</div>
            <div className="text-xs text-slate-400 mt-0.5">escaneados</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold font-mono ${resultado.amenazasDetectadas > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {resultado.amenazasDetectadas}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">comprometidos</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold font-mono ${(resultado.sospechososDetectados ?? 0) > 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
              {resultado.sospechososDetectados ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">sospechosos</div>
          </div>
        </div>

        {/* Estado actual de la red post-escaneo */}
        {resultado.estadoActual && (
          <div className="px-6 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Estado actual de la red
            </p>
            <div className="flex gap-3">
              {[
                { label: 'Normales',      value: resultado.estadoActual.normales,      color: 'text-green-400' },
                { label: 'Sospechosos',   value: resultado.estadoActual.sospechosos,   color: 'text-yellow-400' },
                { label: 'Comprometidos', value: resultado.estadoActual.comprometidos, color: 'text-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex-1 bg-slate-800 rounded-lg p-2.5 text-center">
                  <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detecciones */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {sinCambios ? 'Verificacion de red' : 'Nodos detectados'}
          </p>

          {sinCambios ? (
            <p className="text-sm text-green-400 border-l-2 border-green-700 pl-3 py-1">
              {resultado.estadoActual && resultado.estadoActual.comprometidos > 0
                ? `${resultado.estadoActual.comprometidos} nodos comprometidos confirmados — sin nuevas amenazas`
                : 'Red verificada — todos los nodos dentro de parametros normales'
              }
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {resultado.reglaAplicada.map((linea, i) => {
                const esComprometido = linea.includes('comprometido');
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 border-l-2 pl-3 py-1 ${
                      esComprometido ? 'border-red-700' : 'border-yellow-700'
                    }`}
                  >
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                      esComprometido ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'
                    }`}>
                      {esComprometido ? 'COMP' : 'SOSP'}
                    </span>
                    <p className={`text-xs leading-snug ${esComprometido ? 'text-red-300' : 'text-yellow-300'}`}>
                      {linea}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
