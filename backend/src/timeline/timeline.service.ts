import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alerta } from '../entities/alerta.entity';
import { AccionProtocolo } from '../entities/accion-protocolo.entity';
import { Nodo } from '../entities/nodo.entity';

type TipoEvento =
  | 'primera_infeccion'
  | 'propagacion'
  | 'cifrado_detectado'
  | 'trafico_c2'
  | 'contencion'
  | 'erradicacion'
  | 'recuperacion'
  | 'alerta_critica';

interface EventoTimeline {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  descripcion: string;
  sede: string | null;
  hostname: string | null;
  timestamp: string;
  hora: string;
  severidad: string | null;
  fase: string;
}

function formatHora(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

function formatDuracion(ms: number): string {
  if (ms < 0) ms = 0;
  const s  = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function clasificarAlerta(alerta: Alerta, esPrimera: boolean): TipoEvento {
  if (esPrimera) return 'primera_infeccion';
  if (alerta.tipo === 'movimiento_lateral') return 'propagacion';
  if (alerta.tipo === 'cifrado_archivos')   return 'cifrado_detectado';
  if (alerta.tipo === 'trafico_c2')         return 'trafico_c2';
  return 'alerta_critica';
}

const TITULO_EVENTO: Record<TipoEvento, string> = {
  primera_infeccion: 'Primer nodo comprometido detectado',
  propagacion:       'Propagacion lateral detectada',
  cifrado_detectado: 'Cifrado de archivos detectado',
  trafico_c2:        'Trafico hacia servidor de comando y control',
  contencion:        'Protocolo de contencion ejecutado',
  erradicacion:      'Erradicacion de malware ejecutada',
  recuperacion:      'Recuperacion de nodo ejecutada',
  alerta_critica:    'Alerta critica registrada',
};

const FASE_EVENTO: Record<TipoEvento, string> = {
  primera_infeccion: 'deteccion',
  propagacion:       'deteccion',
  cifrado_detectado: 'deteccion',
  trafico_c2:        'deteccion',
  contencion:        'contencion',
  erradicacion:      'erradicacion',
  recuperacion:      'recuperacion',
  alerta_critica:    'deteccion',
};

@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(Alerta)          private readonly alertasRepo: Repository<Alerta>,
    @InjectRepository(AccionProtocolo) private readonly accionesRepo: Repository<AccionProtocolo>,
    @InjectRepository(Nodo)            private readonly nodosRepo: Repository<Nodo>,
  ) {}

  async getTimeline(limite = 50): Promise<object> {
    const [alertas, acciones] = await Promise.all([
      this.alertasRepo.find({ order: { creadoEn: 'ASC' } }),
      this.accionesRepo.find({ order: { creadoEn: 'ASC' } }),
    ]);

    const eventos: EventoTimeline[] = [];

    // Mapear alertas
    alertas.forEach((alerta, idx) => {
      const esPrimera = idx === 0;
      const tipo = clasificarAlerta(alerta, esPrimera);
      const sede = alerta.nodo?.sede ?? null;
      const hostname = alerta.nodo?.hostname ?? null;

      eventos.push({
        id:          `alerta-${alerta.id}`,
        tipo,
        titulo:      TITULO_EVENTO[tipo],
        descripcion: hostname
          ? `${hostname} — ${alerta.descripcion}`
          : alerta.descripcion,
        sede,
        hostname,
        timestamp:   alerta.creadoEn.toISOString(),
        hora:        formatHora(alerta.creadoEn),
        severidad:   alerta.severidad,
        fase:        FASE_EVENTO[tipo],
      });
    });

    // Mapear acciones del protocolo
    for (const accion of acciones) {
      let tipo: TipoEvento;
      if (accion.fase === 'contencion')   tipo = 'contencion';
      else if (accion.fase === 'erradicacion') tipo = 'erradicacion';
      else tipo = 'recuperacion';

      // Extraer sede de la descripcion si aplica (ej. "Sede Jalisco aislada...")
      let sede: string | null = null;
      const matchSede = accion.descripcion.match(/[Ss]ede\s+(\S+)/);
      if (matchSede) sede = matchSede[1];

      // Hostname del nodo afectado si existe
      let hostname: string | null = null;
      if (accion.nodoAfectadoId) {
        const nodo = await this.nodosRepo.findOne({ where: { id: accion.nodoAfectadoId } });
        if (nodo) hostname = nodo.hostname;
      }

      eventos.push({
        id:          `accion-${accion.id}`,
        tipo,
        titulo:      TITULO_EVENTO[tipo],
        descripcion: accion.descripcion,
        sede,
        hostname,
        timestamp:   accion.creadoEn.toISOString(),
        hora:        formatHora(accion.creadoEn),
        severidad:   null,
        fase:        accion.fase,
      });
    }

    // Ordenar cronologicamente y aplicar limite
    eventos.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const eventosLimitados = eventos.slice(0, limite);

    // Calcular resumen
    const eventosPorFase: Record<string, number> = {};
    for (const e of eventos) {
      eventosPorFase[e.fase] = (eventosPorFase[e.fase] ?? 0) + 1;
    }

    const primerEvento = eventos[0]?.timestamp ?? null;
    const ultimoEvento = eventos[eventos.length - 1]?.timestamp ?? null;
    const duracionTotal =
      primerEvento && ultimoEvento
        ? formatDuracion(new Date(ultimoEvento).getTime() - new Date(primerEvento).getTime())
        : '--:--:--';

    return {
      eventos: eventosLimitados,
      resumen: {
        totalEventos:   eventos.length,
        primerEvento,
        ultimoEvento,
        duracionTotal,
        eventosPorFase,
      },
    };
  }
}
