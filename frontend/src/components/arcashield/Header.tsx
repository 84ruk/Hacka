'use client';

interface HeaderProps {
  onIniciarSimulacion: () => Promise<void>;
  onIniciarLimpio: () => Promise<void>;
  onResetSimulacion: () => void;
  simulando: boolean;
  comprometidos: number;
  contenidos: number;
  onAbrirTimeline: () => void;
  modoAtaque: boolean;
  onToggleModoAtaque: () => void;
  onContenerAutomatico: () => Promise<void>;
  conteniendo: boolean;
  onEscanear: () => Promise<void>;
  escaneando: boolean;
}

export function Header({
  onIniciarSimulacion,
  onIniciarLimpio,
  onResetSimulacion,
  simulando,
  comprometidos,
  contenidos,
  onAbrirTimeline,
  modoAtaque,
  onToggleModoAtaque,
  onContenerAutomatico,
  conteniendo,
  onEscanear,
  escaneando,
}: HeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
      {/* Marca */}
      <div className="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">RedGuardian</h1>
          <p className="text-xs text-slate-400">Sistema de Respuesta a Incidentes SD-WAN · SICT</p>
        </div>
      </div>

      {/* Contadores en vivo */}
      <div className="flex items-center gap-4">
        {comprometidos > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold text-red-400">{comprometidos}</span>
            <span className="text-xs text-slate-400">comprometidos</span>
          </div>
        )}
        {contenidos > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-sm font-bold text-slate-300">{contenidos}</span>
            <span className="text-xs text-slate-400">contenidos</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-slate-400">En vivo</span>
        </div>

        <button
          onClick={onAbrirTimeline}
          className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 transition-colors"
        >
          Timeline
        </button>

        <button
          onClick={onEscanear}
          disabled={escaneando}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
        >
          {escaneando ? 'Escaneando...' : 'Escanear red'}
        </button>

        <button
          onClick={onContenerAutomatico}
          disabled={conteniendo}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-700 hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
        >
          {conteniendo ? 'Ejecutando contencion...' : 'Contencion automatica'}
        </button>

        <button
          onClick={onToggleModoAtaque}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            modoAtaque
              ? 'bg-red-700 hover:bg-red-800 text-white ring-2 ring-red-500'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
        >
          {modoAtaque ? 'Detener propagacion' : 'Simular propagacion'}
        </button>

        <button
          onClick={onResetSimulacion}
          className="text-slate-400 hover:text-red-400 border border-slate-600 hover:border-red-600 text-sm px-3 py-1 rounded transition-colors"
        >
          Limpiar simulacion
        </button>

        <button
          onClick={onIniciarLimpio}
          disabled={simulando}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
        >
          {simulando ? 'Iniciando...' : 'Modo progresivo'}
        </button>

        <button
          onClick={onIniciarSimulacion}
          disabled={simulando}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2"
        >
          {simulando ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Iniciando...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Iniciar Simulacion</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
