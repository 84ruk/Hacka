import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nodo, EstadoNodo, TipoNodo } from '../entities/nodo.entity';
import { Alerta, TipoAlerta, SeveridadAlerta } from '../entities/alerta.entity';
import { AccionProtocolo } from '../entities/accion-protocolo.entity';
import { LogsService } from '../logs/logs.service';

interface ConfigSede {
  nombre: string;
  prefijo: string;
  rango: string;
  total: number;
  comprometidos: number;
  sospechosos: number;
}

const SEDES: ConfigSede[] = [
  { nombre: 'CDMX-Central', prefijo: 'CDMX', rango: '10.0.1', total: 60, comprometidos: 20, sospechosos: 8 },
  { nombre: 'Jalisco',       prefijo: 'JAL',  rango: '10.0.2', total: 40, comprometidos: 12, sospechosos: 5 },
  { nombre: 'NuevoLeon',     prefijo: 'NL',   rango: '10.0.3', total: 35, comprometidos: 10, sospechosos: 4 },
  { nombre: 'Veracruz',      prefijo: 'VER',  rango: '10.0.4', total: 35, comprometidos:  5, sospechosos: 2 },
  { nombre: 'Monterrey',     prefijo: 'MTY',  rango: '10.0.5', total: 30, comprometidos:  3, sospechosos: 1 },
  { nombre: 'Puebla',        prefijo: 'PUE',  rango: '10.0.6', total: 25, comprometidos:  5, sospechosos: 3 },
  { nombre: 'Chihuahua',     prefijo: 'CHI',  rango: '10.0.7', total: 20, comprometidos:  2, sospechosos: 4 },
  { nombre: 'Tijuana',       prefijo: 'TIJ',  rango: '10.0.8', total: 20, comprometidos:  3, sospechosos: 2 },
  { nombre: 'Merida',        prefijo: 'MER',  rango: '10.0.9', total: 15, comprometidos:  1, sospechosos: 2 },
  { nombre: 'Queretaro',     prefijo: 'QRO',  rango: '10.1.0', total: 15, comprometidos:  0, sospechosos: 3 },
];

// CIFRADO_ARCHIVOS puntúa 70 → un solo evento ya clasifica el nodo como COMPROMETIDO
// ANOMALIA_RED puntúa 5   → clasifica como SOSPECHOSO (umbral: 1–69)
const PUNTAJE_ALERTA: Record<TipoAlerta, number> = {
  [TipoAlerta.CIFRADO_ARCHIVOS]:   70,
  [TipoAlerta.TRAFICO_C2]:         30,
  [TipoAlerta.MOVIMIENTO_LATERAL]: 20,
  [TipoAlerta.SCRIPT_MALICIOSO]:   10,
  [TipoAlerta.ANOMALIA_RED]:        5,
};

function tipoParaIndice(i: number, total: number): TipoNodo {
  const pct = i / total;
  if (pct < 0.60) return TipoNodo.ESTACION_TRABAJO;
  if (pct < 0.85) return TipoNodo.SERVIDOR;
  if (pct < 0.95) return TipoNodo.DISPOSITIVO_RED;
  return TipoNodo.SOPORTE;
}

function prefijoPorTipo(tipo: TipoNodo): string {
  switch (tipo) {
    case TipoNodo.SERVIDOR:        return 'SRV';
    case TipoNodo.DISPOSITIVO_RED: return 'NET';
    case TipoNodo.SOPORTE:         return 'SUP';
    default:                        return 'WS';
  }
}

function fechaHaceMinutos(minutos: number): Date {
  return new Date(Date.now() - minutos * 60 * 1000);
}

@Injectable()
export class SimulacionService {
  constructor(
    @InjectRepository(Nodo)            private nodoRepo: Repository<Nodo>,
    @InjectRepository(Alerta)          private alertaRepo: Repository<Alerta>,
    @InjectRepository(AccionProtocolo) private accionRepo: Repository<AccionProtocolo>,
    private readonly logsService: LogsService,
  ) {}

  private async limpiarAtaque(): Promise<void> {
    await this.alertaRepo.createQueryBuilder().delete().where('id > 0').execute();
    await this.accionRepo.createQueryBuilder().delete().where('id > 0').execute();
    await this.nodoRepo
      .createQueryBuilder()
      .update()
      .set({
        estado: EstadoNodo.NORMAL,
        scoreRiesgo: 0,
        aislado: false,
        ultimaActividad: null as any,
      })
      .where('1=1')
      .execute();
  }

  private async limpiarTodo(): Promise<void> {
    await this.alertaRepo.createQueryBuilder().delete().where('id > 0').execute();
    await this.accionRepo.createQueryBuilder().delete().where('id > 0').execute();
    await this.nodoRepo.createQueryBuilder().delete().where('id > 0').execute();
  }

  async resetAtaque(): Promise<{ mensaje: string; nodosReseteados: number }> {
    await this.limpiarAtaque();
    return {
      mensaje: 'Estado del ataque limpiado. Los nodos permanecen en la red.',
      nodosReseteados: await this.nodoRepo.count(),
    };
  }

  async iniciarLimpio(): Promise<{ mensaje: string; totalNodos: number; pacienteCero: string[] }> {
    await this.limpiarTodo();
    await this.logsService.limpiar();

    const nodosData: Partial<Nodo>[] = [];

    for (const sede of SEDES) {
      for (let i = 0; i < sede.total; i++) {
        const tipo     = tipoParaIndice(i, sede.total);
        const sufijo   = prefijoPorTipo(tipo);
        const num      = String(i + 1).padStart(3, '0');
        const hostname = `${sede.prefijo}-${sufijo}-${num}`;
        const octeto   = (i % 254) + 1;
        const ip       = `${sede.rango}.${octeto}`;

        nodosData.push({
          hostname,
          ip,
          sede:            sede.nombre,
          tipo,
          estado:          EstadoNodo.NORMAL,
          aislado:         false,
          scoreRiesgo:     0,
          ultimaActividad: new Date(),
        });
      }
    }

    const nodosSaved = await this.nodoRepo.save(nodosData as Nodo[]);

    // Comprometer los primeros 3 nodos de CDMX — paciente cero
    const nodosCDMX = nodosSaved
      .filter((n) => n.sede === 'CDMX-Central')
      .slice(0, 3);

    const alertasData: Partial<Alerta>[] = nodosCDMX.map((nodo) => ({
      tipo:        TipoAlerta.CIFRADO_ARCHIVOS,
      severidad:   SeveridadAlerta.CRITICA,
      descripcion: `Cifrado masivo detectado en ${nodo.hostname} — origen del ataque`,
      atendida:    false,
      nodo,
      creadoEn:    fechaHaceMinutos(30),
    }));

    // Las alertas existen pero los nodos permanecen en NORMAL
    // El escaneo de red es quien las detecta y cambia el estado (deteccion temprana)
    const alertasGuardadas = await this.alertaRepo.save(alertasData as Alerta[]);

    // Pre-generar logs forenses para que esten listos cuando el escaneo los detecte
    for (let i = 0; i < nodosCDMX.length; i++) {
      await this.logsService.generarLogsParaNodo(nodosCDMX[i], [alertasGuardadas[i]]);
    }

    return {
      mensaje:      `Red inicializada — ${nodosData.length} nodos normales. 3 nodos CDMX con malware latente. Ejecuta Escanear red para detectarlos.`,
      totalNodos:   nodosData.length,
      pacienteCero: nodosCDMX.map((n) => n.hostname),
    };
  }

  async iniciar(): Promise<{
    mensaje: string;
    resumen: {
      totalNodos: number;
      comprometidos: number;
      sospechosos: number;
      normales: number;
      totalAlertas: number;
    };
  }> {
    await this.limpiarTodo();

    // ── 1. Crear nodos ──────────────────────────────────────────────────────
    const nodosData: Partial<Nodo>[] = [];
    const planEstado: ('comprometido' | 'sospechoso' | 'normal')[] = [];

    for (const sede of SEDES) {
      for (let i = 0; i < sede.total; i++) {
        const tipo      = tipoParaIndice(i, sede.total);
        const sufijo    = prefijoPorTipo(tipo);
        const num       = String(i + 1).padStart(3, '0');
        const hostname  = `${sede.prefijo}-${sufijo}-${num}`;
        const octeto    = (i % 254) + 1;
        const ip        = `${sede.rango}.${octeto}`;

        const esComprometido = i < sede.comprometidos;
        const esSospechoso   = !esComprometido && i < sede.comprometidos + sede.sospechosos;

        planEstado.push(
          esComprometido ? 'comprometido' : esSospechoso ? 'sospechoso' : 'normal',
        );

        const ultimaActividad = esComprometido
          ? fechaHaceMinutos(120 + (i % 5) * 60)  // 2-6 h atrás
          : fechaHaceMinutos(i % 30);              // 0-30 min atrás

        nodosData.push({
          hostname,
          ip,
          sede:            sede.nombre,
          tipo,
          estado:          EstadoNodo.NORMAL,
          aislado:         false,
          scoreRiesgo:     0,
          ultimaActividad,
        });
      }
    }

    const nodosSaved = await this.nodoRepo.save(nodosData as Nodo[]);

    // ── 2. Crear alertas ────────────────────────────────────────────────────
    // Comprometidos: 1 alerta CIFRADO (score 70 → COMPROMETIDO)
    //                + 1 alerta TRAFICO_C2 extra cada 5 nodos (score ≤ 100)
    // Sospechosos:  1 alerta ANOMALIA_RED (score 5 → SOSPECHOSO)
    // Normales:     sin alertas
    //
    // Conteo: 50 comprometidos × 1 + 10 extras + 20 sospechosos × 1 = 80 alertas
    const alertasData: Partial<Alerta>[] = [];
    let compIdx = 0; // índice global de nodos comprometidos para calcular el bono

    for (let idx = 0; idx < nodosSaved.length; idx++) {
      const nodo  = nodosSaved[idx];
      const plan  = planEstado[idx];

      if (plan === 'comprometido') {
        // compIdx=0 tiene el timestamp MAS ANTIGUO → es el paciente cero
        // compIdx aumenta → timestamps mas recientes (la infeccion se propago despues)
        const minutosAtras = 60 - compIdx; // 60 min atrás el primero, ~10 min el último
        alertasData.push({
          tipo:        TipoAlerta.CIFRADO_ARCHIVOS,
          severidad:   SeveridadAlerta.CRITICA,
          descripcion: `Cifrado masivo de archivos detectado en ${nodo.hostname}`,
          atendida:    false,
          nodo,
          creadoEn:    fechaHaceMinutos(minutosAtras),
        });

        // Cada 5to comprometido recibe una segunda alerta (10 extras = 80 total)
        if (compIdx % 5 === 0) {
          alertasData.push({
            tipo:        TipoAlerta.TRAFICO_C2,
            severidad:   SeveridadAlerta.CRITICA,
            descripcion: `Trafico hacia servidor C&C externo desde ${nodo.hostname}`,
            atendida:    false,
            nodo,
            creadoEn:    fechaHaceMinutos(minutosAtras - 2),
          });
        }
        compIdx++;
      } else if (plan === 'sospechoso') {
        alertasData.push({
          tipo:        TipoAlerta.ANOMALIA_RED,
          severidad:   SeveridadAlerta.MEDIA,
          descripcion: `Comportamiento de red inusual en ${nodo.hostname}`,
          atendida:    false,
          nodo,
          creadoEn:    fechaHaceMinutos(5 + (idx % 30)),
        });
      }
    }

    await this.alertaRepo.save(alertasData as Alerta[]);

    // ── 3. Calcular score y actualizar estado ───────────────────────────────
    const scoreMap = new Map<number, number>();
    for (const alerta of alertasData as Alerta[]) {
      const nodoId = alerta.nodo.id;
      scoreMap.set(nodoId, (scoreMap.get(nodoId) ?? 0) + PUNTAJE_ALERTA[alerta.tipo]);
    }

    const actualizaciones: Partial<Nodo>[] = nodosSaved.map((nodo) => {
      const score = Math.min(100, scoreMap.get(nodo.id) ?? 0);
      let estado: EstadoNodo;
      if (score >= 70)    estado = EstadoNodo.COMPROMETIDO;
      else if (score > 0) estado = EstadoNodo.SOSPECHOSO;
      else                estado = EstadoNodo.NORMAL;
      return { id: nodo.id, scoreRiesgo: score, estado };
    });

    await this.nodoRepo.save(actualizaciones as Nodo[]);

    // ── 4. Logs forenses para nodos comprometidos ───────────────────────────
    await this.logsService.limpiar();
    const nodosComprometidos = await this.nodoRepo.find({
      where: { estado: EstadoNodo.COMPROMETIDO },
      relations: ['alertas'],
    });
    for (const nodo of nodosComprometidos) {
      await this.logsService.generarLogsParaNodo(nodo, nodo.alertas ?? []);
    }

    // ── 5. Resumen ──────────────────────────────────────────────────────────
    const comprometidos = actualizaciones.filter((n) => n.estado === EstadoNodo.COMPROMETIDO).length;
    const sospechosos   = actualizaciones.filter((n) => n.estado === EstadoNodo.SOSPECHOSO).length;
    const normales      = actualizaciones.filter((n) => n.estado === EstadoNodo.NORMAL).length;

    return {
      mensaje: 'Simulacion iniciada correctamente',
      resumen: {
        totalNodos:   nodosSaved.length,
        comprometidos,
        sospechosos,
        normales,
        totalAlertas: alertasData.length,
      },
    };
  }

  async propagar(): Promise<{ propagado: boolean; nodo: object | null; mensaje: string }> {
    // Paso 1: convertir un nodo sospechoso en comprometido
    const sospechosos = await this.nodoRepo.find({
      where: { estado: EstadoNodo.SOSPECHOSO },
      relations: ['alertas'],
    });

    if (sospechosos.length > 0) {
      const nodo = sospechosos[Math.floor(Math.random() * sospechosos.length)];

      const alerta = this.alertaRepo.create({
        tipo:        TipoAlerta.MOVIMIENTO_LATERAL,
        severidad:   SeveridadAlerta.ALTA,
        descripcion: `Propagacion lateral activa detectada en ${nodo.hostname}`,
        nodo,
      });
      await this.alertaRepo.save(alerta);

      const todasAlertas = [...(nodo.alertas ?? []), alerta];
      const nuevoScore = Math.min(
        100,
        todasAlertas.reduce((sum, a) => sum + (PUNTAJE_ALERTA[a.tipo] ?? 0), 0),
      );

      nodo.scoreRiesgo     = nuevoScore;
      nodo.estado          = EstadoNodo.COMPROMETIDO;
      nodo.ultimaActividad = new Date();
      await this.nodoRepo.save(nodo);

      return {
        propagado: true,
        nodo:      { id: nodo.id, hostname: nodo.hostname, sede: nodo.sede },
        mensaje:   `Propagacion detectada: ${nodo.hostname} comprometido en ${nodo.sede}`,
      };
    }

    // Paso 2: si no hay sospechosos, convertir un normal en sospechoso
    const normales = await this.nodoRepo.find({ where: { estado: EstadoNodo.NORMAL } });

    if (normales.length > 0) {
      const nodo = normales[Math.floor(Math.random() * normales.length)];

      const alerta = this.alertaRepo.create({
        tipo:        TipoAlerta.ANOMALIA_RED,
        severidad:   SeveridadAlerta.MEDIA,
        descripcion: `Comportamiento anomalo detectado en ${nodo.hostname}`,
        nodo,
      });
      await this.alertaRepo.save(alerta);

      nodo.scoreRiesgo     = 5;
      nodo.estado          = EstadoNodo.SOSPECHOSO;
      nodo.ultimaActividad = new Date();
      await this.nodoRepo.save(nodo);

      return {
        propagado: true,
        nodo:      { id: nodo.id, hostname: nodo.hostname, sede: nodo.sede },
        mensaje:   `Nodo sospechoso detectado: ${nodo.hostname} en ${nodo.sede}`,
      };
    }

    return {
      propagado: false,
      nodo:      null,
      mensaje:   'Sin nodos susceptibles de infeccion',
    };
  }
}
