'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/arcashield-api';

/* ── Tipos ────────────────────────────────────────────────────────────────── */

interface ReporteData {
  generadoEn: string;
  resumenNodos: {
    total: number; normal: number; sospechoso: number;
    comprometido: number; contenido: number; recuperado: number;
  };
  alertas: { total: number; porTipo: Record<string, number> };
  acciones: { total: number; porFase: Record<string, number> };
  accionesEjecutadas: {
    id: number; fase: string; descripcion: string;
    estado: string; hora: string; creadoEn: string;
  }[];
  nodosAfectados: {
    id: number; hostname: string; sede: string;
    estado: string; scoreRiesgo: number;
  }[];
}

interface PacienteData {
  pacienteCero?: {
    hostname: string; sede: string; ip: string;
    tipoAtaqueInicial: string; primeraDeteccion: string;
  };
  propagacion?: {
    tiempoPropagacion: string; sedesAlcanzadas: number; sedesAfectadas: string[];
  };
}

interface LogsResumen {
  totalLogs: number; nodosConLogs: number;
  ipsC2Detectadas: string[]; archivosCifrados: number;
  comandosEjecutados: number; movimientosLaterales: number;
}

interface LogEntry {
  id: number; tipo: string; mensaje: string;
  ipOrigen: string | null; ipDestino: string | null;
  archivoAfectado: string | null; hostname: string;
  sede: string; timestamp: string;
}

interface LogsTodos { total: number; logs: LogEntry[] }

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const TIPO_ALERTA_LABEL: Record<string, string> = {
  cifrado_archivos:   'Cifrado de archivos',
  trafico_c2:         'Trafico C&C',
  movimiento_lateral: 'Movimiento lateral',
  script_malicioso:   'Script malicioso',
  anomalia_red:       'Anomalia de red',
};

const FASE_COLOR: Record<string, string> = {
  contencion:   'text-red-400',
  erradicacion: 'text-orange-400',
  recuperacion: 'text-blue-400',
  deteccion:    'text-yellow-400',
};

const FASE_LABEL: Record<string, string> = {
  contencion: 'Contencion', erradicacion: 'Erradicacion',
  recuperacion: 'Recuperacion', deteccion: 'Deteccion',
};

/* ── Generador PDF ───────────────────────────────────────────────────────── */

const COLOR_TIPO_RGB: Record<string, [number, number, number]> = {
  ALERT:  [239, 68,  68],
  EXEC:   [202, 138, 4],
  CIPHER: [249, 115, 22],
  C2:     [220, 38,  38],
  MOVE:   [168, 85,  247],
  PRIV:   [236, 72,  153],
};

async function generarPDF(
  reporte: ReporteData,
  paciente: PacienteData | null,
  logsRes: LogsResumen | null,
  logsTodos: LogsTodos | null,
) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210; // ancho A4
  const ML = 15;  // margen izquierdo
  const MR = 15;  // margen derecho
  const CW = PW - ML - MR; // ancho util

  const fechaStr = new Date(reporte.generadoEn).toLocaleString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  let y = 0;

  // ── Cabecera ──────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);           // slate-950
  doc.rect(0, 0, PW, 32, 'F');

  doc.setFontSize(18);
  doc.setTextColor(248, 250, 252);
  doc.setFont('helvetica', 'bold');
  doc.text('ARCASHIELD', ML, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Sistema de Respuesta a Incidentes SD-WAN  ·  SICT', ML, 20);
  doc.text('REPORTE FINAL DE INCIDENTE', ML, 26);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(fechaStr, PW - MR, 26, { align: 'right' });

  y = 40;

  // ── Función helpers de sección ────────────────────────────────────────────
  const seccion = (titulo: string) => {
    if (y > 260) { doc.addPage(); y = 15; }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(99, 102, 241); // indigo-500
    doc.text(titulo.toUpperCase(), ML, y);
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.3);
    doc.line(ML, y + 1, ML + CW, y + 1);
    y += 7;
  };

  const campo = (label: string, valor: string, color?: [number,number,number]) => {
    if (y > 270) { doc.addPage(); y = 15; }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label + ':', ML, y);
    doc.setFont('helvetica', 'bold');
    if (color) doc.setTextColor(...color);
    else doc.setTextColor(30, 41, 59);
    doc.text(valor, ML + 52, y);
    doc.setTextColor(30, 41, 59);
    y += 5.5;
  };

  // ── 1. Resumen ejecutivo ──────────────────────────────────────────────────
  seccion('1. Resumen Ejecutivo');

  const sedesAfectadas = [...new Set(reporte.nodosAfectados.map((n) => n.sede))];
  const pctRecuperado = reporte.resumenNodos.total > 0
    ? Math.round((reporte.resumenNodos.recuperado / reporte.resumenNodos.total) * 100)
    : 0;

  // Cuadros de métricas
  const metricas = [
    { label: 'Total nodos',      valor: String(reporte.resumenNodos.total),       fill: [30, 41, 59] },
    { label: 'Comprometidos',    valor: String(reporte.resumenNodos.comprometido), fill: [127, 29, 29] },
    { label: 'Contenidos',       valor: String(reporte.resumenNodos.contenido),    fill: [51, 65, 85] },
    { label: 'Recuperados',      valor: String(reporte.resumenNodos.recuperado),   fill: [30, 58, 138] },
    { label: 'Sedes afectadas',  valor: String(sedesAfectadas.length),            fill: [124, 45, 18] },
    { label: '% Recuperado',     valor: `${pctRecuperado}%`,                       fill: [20, 83, 45] },
  ] as { label: string; valor: string; fill: [number,number,number] }[];

  const boxW = (CW - 8) / 3;
  let bx = ML;
  let by = y;
  metricas.forEach((m, i) => {
    doc.setFillColor(...m.fill);
    doc.roundedRect(bx, by, boxW, 16, 2, 2, 'F');
    doc.setTextColor(248, 250, 252);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(m.valor, bx + boxW / 2, by + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(203, 213, 225);
    doc.text(m.label, bx + boxW / 2, by + 13, { align: 'center' });
    bx += boxW + 4;
    if (i === 2) { bx = ML; by += 20; }
  });
  y = by + 20;

  // ── 2. Vector de infeccion ────────────────────────────────────────────────
  if (paciente?.pacienteCero) {
    seccion('2. Vector de Infeccion — Paciente Cero');
    const pc = paciente.pacienteCero;
    campo('Hostname', pc.hostname);
    campo('Sede de origen', pc.sede);
    campo('Direccion IP', pc.ip);
    campo('Tipo de ataque', pc.tipoAtaqueInicial, [185, 28, 28]);
    if (paciente.propagacion) {
      campo('Tiempo de propagacion', paciente.propagacion.tiempoPropagacion, [194, 65, 12]);
      campo('Sedes alcanzadas', String(paciente.propagacion.sedesAlcanzadas));
      if (paciente.propagacion.sedesAfectadas?.length > 0) {
        campo('Ruta de propagacion', paciente.propagacion.sedesAfectadas.join(' → '));
      }
    }
    y += 3;
  }

  // ── 3. Alertas detectadas ─────────────────────────────────────────────────
  seccion('3. Alertas Detectadas');
  const alertaRows = Object.entries(reporte.alertas.porTipo).map(([tipo, count]) => [
    TIPO_ALERTA_LABEL[tipo] ?? tipo,
    String(count),
  ]);
  alertaRows.push(['TOTAL', String(reporte.alertas.total)]);

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [['Tipo de alerta', 'Cantidad']],
    body: alertaRows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── 4. Hallazgos forenses ─────────────────────────────────────────────────
  if (logsRes && logsRes.totalLogs > 0) {
    if (y > 220) { doc.addPage(); y = 15; }
    seccion('4. Hallazgos Forenses');

    campo('Total eventos forenses',   String(logsRes.totalLogs));
    campo('Nodos con logs',           String(logsRes.nodosConLogs));
    campo('Archivos cifrados',        String(logsRes.archivosCifrados),     [185, 28, 28]);
    campo('Comandos ejecutados',      String(logsRes.comandosEjecutados),   [161, 98, 7]);
    campo('Movimientos laterales',    String(logsRes.movimientosLaterales), [109, 40, 217]);

    if (logsRes.ipsC2Detectadas.length > 0) {
      y += 2;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('IPs de servidores C&C detectados:', ML, y);
      y += 4;
      logsRes.ipsC2Detectadas.forEach((ip) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(185, 28, 28);
        doc.setFontSize(8);
        doc.text(`  •  ${ip}`, ML, y);
        y += 4.5;
      });
    }
    y += 3;
  }

  // ── 5. Acciones de respuesta ──────────────────────────────────────────────
  if (y > 210) { doc.addPage(); y = 15; }
  seccion('5. Acciones de Respuesta Ejecutadas');

  const accionRows = reporte.accionesEjecutadas.slice(0, 40).map((a) => [
    FASE_LABEL[a.fase] ?? a.fase,
    a.descripcion,
    a.hora,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [['Fase', 'Descripcion', 'Hora']],
    body: accionRows,
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 14, halign: 'center' },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── 6. Estado final de la red ─────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 15; }
  seccion('6. Estado Final de la Red');

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [['Estado', 'Nodos', '% del total']],
    body: [
      ['Normal',       reporte.resumenNodos.normal,       `${Math.round(reporte.resumenNodos.normal / reporte.resumenNodos.total * 100)}%`],
      ['Sospechoso',   reporte.resumenNodos.sospechoso,   `${Math.round(reporte.resumenNodos.sospechoso / reporte.resumenNodos.total * 100)}%`],
      ['Comprometido', reporte.resumenNodos.comprometido, `${Math.round(reporte.resumenNodos.comprometido / reporte.resumenNodos.total * 100)}%`],
      ['Contenido',    reporte.resumenNodos.contenido,    `${Math.round(reporte.resumenNodos.contenido / reporte.resumenNodos.total * 100)}%`],
      ['Recuperado',   reporte.resumenNodos.recuperado,   `${Math.round(reporte.resumenNodos.recuperado / reporte.resumenNodos.total * 100)}%`],
      ['TOTAL',        reporte.resumenNodos.total,        '100%'],
    ].map((r) => r.map(String)),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Sedes afectadas (tabla) ───────────────────────────────────────────────
  if (sedesAfectadas.length > 0) {
    if (y > 220) { doc.addPage(); y = 15; }
    seccion('7. Sedes Afectadas');

    const sedeRows = sedesAfectadas.map((sede) => {
      const nodosSede = reporte.nodosAfectados.filter((n) => n.sede === sede);
      const comp  = nodosSede.filter((n) => n.estado === 'comprometido').length;
      const cont  = nodosSede.filter((n) => n.estado === 'contenido' || n.estado === 'recuperando').length;
      const recup = nodosSede.filter((n) => n.estado === 'recuperado').length;
      return [sede, String(comp), String(cont), String(recup)];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [['Sede', 'Comprometidos', 'Contenidos', 'Recuperados']],
      body: sedeRows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── 8. Logs forenses completos ────────────────────────────────────────────
  if (logsTodos && logsTodos.logs.length > 0) {
    doc.addPage();
    y = 15;
    seccion('8. Logs Forenses — Cadena de Ataque Completa');

    // Agrupar por nodo para sub-encabezados
    const porNodo = new Map<string, LogEntry[]>();
    for (const log of logsTodos.logs) {
      const key = `${log.hostname}|||${log.sede}`;
      if (!porNodo.has(key)) porNodo.set(key, []);
      porNodo.get(key)!.push(log);
    }

    for (const [key, logs] of porNodo) {
      const [hostname, sede] = key.split('|||');

      if (y > 250) { doc.addPage(); y = 15; }

      // Sub-cabecera del nodo
      doc.setFillColor(15, 23, 42);
      doc.rect(ML, y - 3, CW, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(99, 102, 241);
      doc.text(hostname, ML + 2, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(sede, ML + 2 + doc.getTextWidth(hostname) + 4, y + 3);
      y += 10;

      // Tabla de logs del nodo
      const logRows = logs.map((l) => [
        new Date(l.timestamp).toLocaleTimeString('es-MX', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
        l.tipo,
        l.mensaje.length > 80 ? l.mensaje.slice(0, 80) + '...' : l.mensaje,
        l.ipOrigen ?? l.ipDestino ?? '',
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        head: [['Hora', 'Tipo', 'Evento', 'IP']],
        body: logRows,
        styles: { fontSize: 6.5, cellPadding: 1.8, font: 'courier' },
        headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontSize: 7, fontStyle: 'bold', font: 'helvetica' },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center' },
          1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: CW - 18 - 16 - 30 },
          3: { cellWidth: 30 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const tipo = String(data.cell.raw);
            const rgb = COLOR_TIPO_RGB[tipo];
            if (rgb) data.cell.styles.textColor = rgb;
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    }
  }

  // ── Pie de pagina en todas las páginas ────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `RedGuardian v1.0 — SICT SD-WAN Incident Response  |  Confidencial  |  Pagina ${i} de ${totalPages}`,
      PW / 2, 292, { align: 'center' },
    );
  }

  // ── Descargar ──────────────────────────────────────────────────────────────
  const fecha = new Date().toISOString().slice(0, 10);
  doc.save(`RedGuardian_Reporte_Incidente_${fecha}.pdf`);
}

/* ── Componente ──────────────────────────────────────────────────────────── */

interface Props { onClose: () => void }

export function ReporteModal({ onClose }: Props) {
  const [reporte, setReporte]       = useState<ReporteData | null>(null);
  const [paciente, setPaciente]     = useState<PacienteData | null>(null);
  const [logsRes, setLogsRes]       = useState<LogsResumen | null>(null);
  const [logsTodos, setLogsTodos]   = useState<LogsTodos | null>(null);
  const [cargando, setCargando]     = useState(true);
  const [generando, setGenerando]   = useState(false);

  useEffect(() => {
    Promise.all([
      api.getReporte(),
      api.getPacienteCero().catch(() => null),
      api.getLogsResumen().catch(() => null),
      api.getLogsTodos().catch(() => null),
    ]).then(([r, p, l, lt]) => {
      setReporte(r as ReporteData);
      setPaciente(p as PacienteData);
      setLogsRes(l as LogsResumen);
      setLogsTodos(lt as LogsTodos);
    }).finally(() => setCargando(false));
  }, []);

  const handleDescargar = async () => {
    if (!reporte) return;
    setGenerando(true);
    try {
      await generarPDF(reporte, paciente, logsRes, logsTodos);
    } finally {
      setGenerando(false);
    }
  };

  const sedesAfectadas = reporte
    ? [...new Set(reporte.nodosAfectados.map((n) => n.sede))]
    : [];

  const fechaGenerado = reporte
    ? new Date(reporte.generadoEn).toLocaleString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  const pctRecuperado = reporte && reporte.resumenNodos.total > 0
    ? Math.round((reporte.resumenNodos.recuperado / reporte.resumenNodos.total) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-950 border-b border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl">
          <div>
            <h1 className="text-xl font-bold text-white font-mono">
              REPORTE FINAL DE INCIDENTE
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              RedGuardian — SD-WAN SICT · {fechaGenerado}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDescargar}
              disabled={cargando || generando}
              className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg font-medium transition-colors"
            >
              {generando ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl leading-none px-2"
            >
              x
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="p-16 text-center text-slate-400 font-mono animate-pulse">
            Cargando datos del incidente...
          </div>
        ) : (
          <div className="p-8 space-y-8">

            {/* 1. Resumen ejecutivo */}
            <section>
              <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-800">
                1. Resumen Ejecutivo
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total nodos monitoreados', value: reporte?.resumenNodos.total ?? 0, color: 'text-white' },
                  { label: 'Nodos comprometidos', value: reporte?.resumenNodos.comprometido ?? 0, color: 'text-red-400' },
                  { label: 'Nodos contenidos', value: reporte?.resumenNodos.contenido ?? 0, color: 'text-slate-400' },
                  { label: 'Nodos recuperados', value: reporte?.resumenNodos.recuperado ?? 0, color: 'text-blue-400' },
                  { label: 'Sedes afectadas', value: sedesAfectadas.length, color: 'text-orange-400' },
                  { label: 'Porcentaje recuperado', value: `${pctRecuperado}%`, color: 'text-green-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-900 rounded-xl px-4 py-3 border border-slate-800">
                    <div className={`text-3xl font-bold font-mono ${color}`}>{value}</div>
                    <div className="text-xs text-slate-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Vector de infeccion */}
            {paciente?.pacienteCero && (
              <section>
                <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-800">
                  2. Vector de Infeccion — Paciente Cero
                </h2>
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 font-mono text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-2">
                    {[
                      { l: 'Hostname', v: paciente.pacienteCero.hostname, c: 'text-white font-bold' },
                      { l: 'Sede de origen', v: paciente.pacienteCero.sede, c: 'text-white' },
                      { l: 'Direccion IP', v: paciente.pacienteCero.ip, c: 'text-white' },
                      { l: 'Tipo de ataque', v: paciente.pacienteCero.tipoAtaqueInicial, c: 'text-red-400' },
                      ...(paciente.propagacion ? [
                        { l: 'Tiempo de propagacion', v: paciente.propagacion.tiempoPropagacion, c: 'text-orange-400' },
                        { l: 'Sedes alcanzadas', v: String(paciente.propagacion.sedesAlcanzadas), c: 'text-white' },
                      ] : []),
                    ].map(({ l, v, c }) => (
                      <div key={l}>
                        <span className="text-slate-500">{l}: </span>
                        <span className={c}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {paciente.propagacion?.sedesAfectadas && (
                    <div className="pt-3 border-t border-slate-800">
                      <span className="text-slate-500">Ruta de propagacion: </span>
                      <span className="text-yellow-400">{paciente.propagacion.sedesAfectadas.join(' → ')}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 3. Alertas */}
            <section>
              <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-800">
                3. Alertas Detectadas
              </h2>
              <div className="space-y-1.5">
                {Object.entries(reporte?.alertas.porTipo ?? {}).map(([tipo, count]) => (
                  <div key={tipo} className="flex items-center justify-between bg-slate-900 rounded-lg px-4 py-2.5 border border-slate-800">
                    <span className="text-sm text-slate-300">{TIPO_ALERTA_LABEL[tipo] ?? tipo}</span>
                    <span className="text-sm font-bold font-mono text-red-400">{count}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="text-sm font-bold font-mono text-white">{reporte?.alertas.total ?? 0}</span>
                </div>
              </div>
            </section>

            {/* 4. Hallazgos forenses */}
            {logsRes && logsRes.totalLogs > 0 && (
              <section>
                <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-800">
                  4. Hallazgos Forenses
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Indicadores de compromiso</div>
                    <div className="space-y-2 font-mono text-sm">
                      {[
                        { l: 'Eventos forenses', v: logsRes.totalLogs, c: 'text-white' },
                        { l: 'Nodos con logs', v: logsRes.nodosConLogs, c: 'text-white' },
                        { l: 'Archivos cifrados', v: logsRes.archivosCifrados, c: 'text-red-400' },
                        { l: 'Comandos ejecutados', v: logsRes.comandosEjecutados, c: 'text-yellow-400' },
                        { l: 'Movimientos laterales', v: logsRes.movimientosLaterales, c: 'text-purple-400' },
                      ].map(({ l, v, c }) => (
                        <div key={l} className="flex justify-between">
                          <span className="text-slate-400">{l}</span>
                          <span className={`font-bold ${c}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Servidores C&C detectados</div>
                    <div className="space-y-1.5 font-mono text-xs">
                      {logsRes.ipsC2Detectadas.length === 0 ? (
                        <p className="text-slate-600">Sin conexiones C2 detectadas</p>
                      ) : logsRes.ipsC2Detectadas.map((ip) => (
                        <div key={ip} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          <span className="text-red-300">{ip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 5. Acciones */}
            <section>
              <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-800">
                5. Acciones de Respuesta Ejecutadas ({reporte?.accionesEjecutadas.length ?? 0})
              </h2>
              {(reporte?.accionesEjecutadas.length ?? 0) === 0 ? (
                <p className="text-slate-600 text-sm">Sin acciones registradas</p>
              ) : (
                <div className="space-y-1">
                  {(reporte?.accionesEjecutadas ?? []).slice(0, 25).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 bg-slate-900 rounded-lg px-4 py-2 border border-slate-800/50">
                      <span className={`text-xs font-bold font-mono mt-0.5 shrink-0 w-24 ${FASE_COLOR[a.fase] ?? 'text-slate-400'}`}>
                        {FASE_LABEL[a.fase] ?? a.fase}
                      </span>
                      <span className="text-sm text-slate-300 flex-1">{a.descripcion}</span>
                      <span className="text-xs text-slate-600 font-mono shrink-0">{a.hora}</span>
                    </div>
                  ))}
                  {(reporte?.accionesEjecutadas.length ?? 0) > 25 && (
                    <p className="text-xs text-slate-600 px-4 pt-1">
                      ... y {(reporte?.accionesEjecutadas.length ?? 0) - 25} acciones adicionales incluidas en el PDF
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 6. Estado final */}
            <section>
              <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-800">
                6. Estado Final de la Red
              </h2>
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <div className="grid grid-cols-5 gap-3 text-center font-mono">
                  {[
                    { label: 'Normal',       value: reporte?.resumenNodos.normal ?? 0,       color: 'text-green-400' },
                    { label: 'Sospechoso',   value: reporte?.resumenNodos.sospechoso ?? 0,   color: 'text-yellow-400' },
                    { label: 'Comprometido', value: reporte?.resumenNodos.comprometido ?? 0, color: 'text-red-400' },
                    { label: 'Contenido',    value: reporte?.resumenNodos.contenido ?? 0,    color: 'text-slate-400' },
                    { label: 'Recuperado',   value: reporte?.resumenNodos.recuperado ?? 0,   color: 'text-blue-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className={`text-3xl font-bold ${color}`}>{value}</div>
                      <div className="text-xs text-slate-500 mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Logs forenses preview */}
            {logsTodos && logsTodos.logs.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-800">
                  8. Logs Forenses — Cadena de Ataque ({logsTodos.total} eventos en PDF completo)
                </h2>
                <div className="bg-black rounded-xl border border-slate-800 overflow-hidden">
                  {/* Mini-terminal preview */}
                  <div className="px-4 py-2 border-b border-slate-900 flex items-center gap-2">
                    <span className="text-green-500 font-mono text-xs font-bold">TERMINAL FORENSE</span>
                    <span className="text-slate-600 font-mono text-xs">— mostrando ultimos 30 eventos · {logsTodos.total} totales incluidos en PDF</span>
                  </div>
                  <div className="p-3 font-mono text-xs space-y-0.5 max-h-64 overflow-y-auto">
                    {logsTodos.logs.slice(-30).map((log) => (
                      <div key={log.id} className="flex gap-2 hover:bg-slate-900/30 px-1 py-0.5 rounded">
                        <span className="text-slate-700 shrink-0 w-16 tabular-nums">
                          {new Date(log.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-slate-500 shrink-0 w-20 text-right">{log.hostname}</span>
                        <span className={`shrink-0 w-14 font-bold ${
                          log.tipo === 'ALERT'  ? 'text-red-400'    :
                          log.tipo === 'EXEC'   ? 'text-yellow-300' :
                          log.tipo === 'CIPHER' ? 'text-orange-400' :
                          log.tipo === 'C2'     ? 'text-red-500'    :
                          log.tipo === 'MOVE'   ? 'text-purple-400' :
                          log.tipo === 'PRIV'   ? 'text-pink-400'   : 'text-slate-500'
                        }`}>[{log.tipo}]</span>
                        <span className="text-slate-300 break-all">{log.mensaje}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Pie */}
            <div className="border-t border-slate-800 pt-4 text-center">
              <p className="text-xs text-slate-600 font-mono">
                RedGuardian v1.0 — SICT SD-WAN Incident Response System — Confidencial
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
