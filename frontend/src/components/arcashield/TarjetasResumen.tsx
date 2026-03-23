import { ResumenNodos } from '../../lib/arcashield-api';

interface TarjetasResumenProps {
  resumen: ResumenNodos | null;
}

export function TarjetasResumen({ resumen }: TarjetasResumenProps) {
  const comprometidos = resumen?.comprometido ?? 0;

  return (
    <div className="grid grid-cols-5 gap-3">
      {/* Total */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Total nodos</p>
        <p className="text-3xl font-bold text-blue-400 mt-1">
          {resumen ? resumen.total : '—'}
        </p>
      </div>

      {/* Comprometidos */}
      <div className="bg-red-950 border border-red-800 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Comprometidos</p>
        <p className={`text-3xl font-bold text-red-400 mt-1 ${comprometidos > 0 ? 'animate-pulse' : ''}`}>
          {resumen ? comprometidos : '—'}
        </p>
      </div>

      {/* Sospechosos */}
      <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Sospechosos</p>
        <p className="text-3xl font-bold text-yellow-400 mt-1">
          {resumen ? resumen.sospechoso : '—'}
        </p>
      </div>

      {/* Contenidos */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Contenidos</p>
        <p className="text-3xl font-bold text-slate-300 mt-1">
          {resumen ? resumen.contenido : '—'}
        </p>
      </div>

      {/* Archivos protegidos */}
      <div className="bg-slate-800 border border-green-800 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Archivos protegidos</p>
        <p className="text-3xl font-bold text-green-400 mt-1">
          {resumen ? (resumen.archivosProtegidos ?? 0).toLocaleString('es-MX') : '—'}
        </p>
        <p className="text-slate-500 text-xs mt-1">estimado</p>
      </div>
    </div>
  );
}
