'use client';

interface ResultadoContencion {
  accionesEjecutadas: number;
  nodosAislados: number;
  sedesAisladas: number;
  propagacionDetenida: boolean;
  tiempoRespuesta: string;
  razonamiento: string[];
  mensaje: string;
}

interface Props {
  resultado: ResultadoContencion;
  onClose: () => void;
}

export function ResultadoContencionModal({ resultado, onClose }: Props) {
  const sinAcciones = resultado.accionesEjecutadas === 0;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${sinAcciones ? 'bg-slate-800' : 'bg-purple-950/60 border-b border-purple-800/40'}`}>
          <div>
            <h2 className="text-white font-bold text-base">Contencion automatica</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {sinAcciones ? 'Sin amenazas activas' : `Protocolo ejecutado en ${resultado.tiempoRespuesta}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-lg leading-none"
          >
            x
          </button>
        </div>

        {/* Metricas */}
        {!sinAcciones && (
          <div className="grid grid-cols-3 gap-3 px-6 pt-5">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{resultado.accionesEjecutadas}</div>
              <div className="text-xs text-slate-400 mt-0.5">acciones</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{resultado.nodosAislados}</div>
              <div className="text-xs text-slate-400 mt-0.5">nodos aislados</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-400">{resultado.sedesAisladas}</div>
              <div className="text-xs text-slate-400 mt-0.5">sedes aisladas</div>
            </div>
          </div>
        )}

        {/* Razonamiento */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Razonamiento del protocolo
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {resultado.razonamiento.map((linea, i) => {
              const esSede       = linea.includes('sede aislada');
              const esC2         = linea.includes('C2');
              const esPreventivo = linea.includes('preventiva');
              const esSinAmenaza = linea.includes('bajo monitoreo');

              let colorBorde = 'border-slate-600';
              let colorTexto = 'text-slate-300';
              let etiqueta   = 'NODO';
              let colorEtiq  = 'bg-slate-700 text-slate-300';

              if (esSinAmenaza) {
                colorBorde = 'border-green-800';
                colorTexto = 'text-green-300';
                etiqueta   = 'OK';
                colorEtiq  = 'bg-green-900 text-green-300';
              } else if (esSede) {
                colorBorde = 'border-red-800';
                colorTexto = 'text-red-300';
                etiqueta   = 'SEDE';
                colorEtiq  = 'bg-red-900 text-red-300';
              } else if (esC2) {
                colorBorde = 'border-orange-800';
                colorTexto = 'text-orange-300';
                etiqueta   = 'C2';
                colorEtiq  = 'bg-orange-900 text-orange-300';
              } else if (esPreventivo) {
                colorBorde = 'border-yellow-800';
                colorTexto = 'text-yellow-300';
                etiqueta   = 'PREV';
                colorEtiq  = 'bg-yellow-900 text-yellow-300';
              } else {
                colorBorde = 'border-red-900';
                colorTexto = 'text-slate-300';
                etiqueta   = 'NODO';
                colorEtiq  = 'bg-slate-700 text-slate-300';
              }

              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 border-l-2 pl-3 py-1 ${colorBorde}`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${colorEtiq}`}>
                    {etiqueta}
                  </span>
                  <p className={`text-xs leading-snug ${colorTexto}`}>{linea}</p>
                </div>
              );
            })}
          </div>
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
