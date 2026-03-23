import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Nodo, EstadoNodo } from '../entities/nodo.entity';
import { Alerta } from '../entities/alerta.entity';
import { AccionProtocolo, FaseProtocolo, EstadoAccion } from '../entities/accion-protocolo.entity';

const PASOS_RECUPERACION = [
  { orden: 1, descripcion: 'Análisis forense del sistema comprometido', fase: FaseProtocolo.ERRADICACION },
  { orden: 2, descripcion: 'Identificación y eliminación del malware', fase: FaseProtocolo.ERRADICACION },
  { orden: 3, descripcion: 'Verificación de integridad del backup disponible', fase: FaseProtocolo.RECUPERACION },
  { orden: 4, descripcion: 'Restauración del sistema desde backup verificado', fase: FaseProtocolo.RECUPERACION },
  { orden: 5, descripcion: 'Validación de integridad post-restauración', fase: FaseProtocolo.RECUPERACION },
  { orden: 6, descripcion: 'Reintegración del nodo a la red SD-WAN', fase: FaseProtocolo.RECUPERACION },
];

function elapsed(desde: Date): string {
  const ms = Date.now() - desde.getTime();
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

@Injectable()
export class RecuperacionService {
  constructor(
    @InjectRepository(Nodo)       private readonly nodosRepo: Repository<Nodo>,
    @InjectRepository(Alerta)     private readonly alertasRepo: Repository<Alerta>,
    @InjectRepository(AccionProtocolo) private readonly accionesRepo: Repository<AccionProtocolo>,
  ) {}

  // GET /recuperacion/nodos-contenidos
  async getNodosContenidos() {
    const nodos = await this.nodosRepo.find({
      where: { estado: In([EstadoNodo.CONTENIDO, EstadoNodo.RECUPERANDO]) },
    });
    return nodos.map((n) => ({
      id: n.id,
      hostname: n.hostname,
      ip: n.ip,
      sede: n.sede,
      tipo: n.tipo,
      scoreRiesgo: n.scoreRiesgo,
      estado: n.estado,
      tiempoContenido: n.ultimaActividad ? elapsed(n.ultimaActividad) : '00:00:00',
    }));
  }

  // GET /recuperacion/checklist/:nodoId
  async getChecklist(nodoId: number) {
    const nodo = await this.nodosRepo.findOne({ where: { id: nodoId } });
    if (!nodo) throw new NotFoundException(`Nodo ${nodoId} no encontrado`);

    const acciones = await this.accionesRepo.find({ where: { nodoAfectadoId: nodoId } });

    const completadosOrden = PASOS_RECUPERACION
      .filter((paso) => acciones.some((a) => a.descripcion === paso.descripcion && a.estado === EstadoAccion.COMPLETADA))
      .map((paso) => paso.orden);
    const maxCompletado = completadosOrden.length ? Math.max(...completadosOrden) : 0;

    const pasos = PASOS_RECUPERACION.map((paso) => {
      const accion = acciones.find((a) => a.descripcion === paso.descripcion);
      const completado = accion?.estado === EstadoAccion.COMPLETADA;
      const estado = completado
        ? 'completado'
        : paso.orden === maxCompletado + 1
          ? 'actual'
          : 'pendiente';
      return {
        orden: paso.orden,
        descripcion: paso.descripcion,
        fase: paso.fase,
        completado,
        completadoEn: accion?.completadoEn ?? null,
        estado,
      };
    });

    const completados = pasos.filter((p) => p.completado).length;
    return {
      nodo: { id: nodo.id, hostname: nodo.hostname, sede: nodo.sede, estado: nodo.estado },
      pasos,
      progreso: { completados, total: PASOS_RECUPERACION.length },
    };
  }

  // PATCH /recuperacion/checklist/:nodoId/paso/:orden
  async completarPaso(nodoId: number, orden: number) {
    const nodo = await this.nodosRepo.findOne({ where: { id: nodoId } });
    if (!nodo) throw new NotFoundException(`Nodo ${nodoId} no encontrado`);

    if (nodo.estado === EstadoNodo.RECUPERADO) {
      throw new BadRequestException('El nodo ya fue recuperado');
    }

    const pasoSpec = PASOS_RECUPERACION.find((p) => p.orden === orden);
    if (!pasoSpec) throw new NotFoundException(`Paso ${orden} no existe`);

    if (orden === 1) {
      if (![EstadoNodo.CONTENIDO, EstadoNodo.RECUPERANDO].includes(nodo.estado)) {
        throw new BadRequestException('El nodo debe estar contenido para iniciar recuperacion');
      }
      if (nodo.estado === EstadoNodo.CONTENIDO) {
        nodo.estado = EstadoNodo.RECUPERANDO;
        await this.nodosRepo.save(nodo);
      }
    } else if (nodo.estado !== EstadoNodo.RECUPERANDO) {
      throw new BadRequestException('El nodo debe estar en estado RECUPERANDO');
    }

    const acciones = await this.accionesRepo.find({ where: { nodoAfectadoId: nodoId } });
    if (orden > 1) {
      const pasoPrev = PASOS_RECUPERACION.find((p) => p.orden === orden - 1);
      const prevOk = acciones.some(
        (a) => a.descripcion === pasoPrev?.descripcion && a.estado === EstadoAccion.COMPLETADA,
      );
      if (!prevOk) {
        throw new BadRequestException('Debes completar el paso anterior');
      }
    }

    // Upsert: find or create the AccionProtocolo for this step
    let accion = await this.accionesRepo.findOne({
      where: { nodoAfectadoId: nodoId, descripcion: pasoSpec.descripcion },
    });

    if (accion?.estado === EstadoAccion.COMPLETADA) {
      return {
        paso: orden,
        completado: true,
        nodoRecuperado: orden === 6,
        nodo: { id: nodo.id, hostname: nodo.hostname, estado: nodo.estado },
      };
    }

    if (!accion) {
      accion = this.accionesRepo.create({
        fase: pasoSpec.fase,
        descripcion: pasoSpec.descripcion,
        nodoAfectadoId: nodoId,
        estado: EstadoAccion.PENDIENTE,
      });
    }

    accion.estado = EstadoAccion.COMPLETADA;
    accion.completadoEn = new Date();
    await this.accionesRepo.save(accion);

    if (orden === 3 && (!nodo.ultimoBackup || !nodo.backupVerificado)) {
      nodo.ultimoBackup = nodo.ultimoBackup ?? new Date();
      nodo.backupVerificado = true;
      await this.nodosRepo.save(nodo);
    }

    // Auto-recover on step 6
    if (orden === 6) {
      nodo.estado = EstadoNodo.RECUPERADO;
      nodo.aislado = false;
      nodo.scoreRiesgo = 0;
      nodo.ultimaActividad = new Date();
      await this.nodosRepo.save(nodo);
    }

    return {
      paso: orden,
      completado: true,
      nodoRecuperado: orden === 6,
      nodo: { id: nodo.id, hostname: nodo.hostname, estado: nodo.estado },
    };
  }

  // GET /recuperacion/metricas
  async getMetricas() {
    const acciones = await this.accionesRepo.find({ where: { estado: EstadoAccion.COMPLETADA } });

    const porFase: Record<string, { count: number; duracionMs: number[] }> = {};
    for (const a of acciones) {
      if (!porFase[a.fase]) porFase[a.fase] = { count: 0, duracionMs: [] };
      porFase[a.fase].count++;
      if (a.completadoEn) {
        porFase[a.fase].duracionMs.push(a.completadoEn.getTime() - a.creadoEn.getTime());
      }
    }

    const fases = Object.entries(porFase).map(([fase, data]) => ({
      fase,
      accionesCompletadas: data.count,
      duracionPromedioMs:
        data.duracionMs.length > 0
          ? Math.round(data.duracionMs.reduce((s, v) => s + v, 0) / data.duracionMs.length)
          : 0,
    }));

    const nodosRecuperados = await this.nodosRepo.count({ where: { estado: EstadoNodo.RECUPERADO } });
    const nodosContenidos  = await this.nodosRepo.count({
      where: { estado: In([EstadoNodo.CONTENIDO, EstadoNodo.RECUPERANDO]) },
    });

    return {
      nodosRecuperados,
      nodosContenidos,
      accionesTotales: acciones.length,
      fases,
    };
  }

  // GET /recuperacion/reporte
  async getReporte() {
    const [nodos, alertas, acciones] = await Promise.all([
      this.nodosRepo.find(),
      this.alertasRepo.find(),
      this.accionesRepo.find(),
    ]);

    const conteo = {
      normal:       nodos.filter((n) => n.estado === EstadoNodo.NORMAL).length,
      sospechoso:   nodos.filter((n) => n.estado === EstadoNodo.SOSPECHOSO).length,
      comprometido: nodos.filter((n) => n.estado === EstadoNodo.COMPROMETIDO).length,
      contenido:    nodos.filter((n) => [EstadoNodo.CONTENIDO, EstadoNodo.RECUPERANDO].includes(n.estado)).length,
      recuperado:   nodos.filter((n) => n.estado === EstadoNodo.RECUPERADO).length,
    };

    const alertasPorTipo: Record<string, number> = {};
    for (const a of alertas) {
      alertasPorTipo[a.tipo] = (alertasPorTipo[a.tipo] ?? 0) + 1;
    }

    const accionesPorFase: Record<string, number> = {};
    for (const a of acciones) {
      accionesPorFase[a.fase] = (accionesPorFase[a.fase] ?? 0) + 1;
    }

    const accionesEjecutadas = [...acciones]
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime())
      .map((a) => ({
        id:          a.id,
        fase:        a.fase,
        descripcion: a.descripcion,
        estado:      a.estado,
        creadoEn:    a.creadoEn.toISOString(),
        hora:        a.creadoEn.toTimeString().slice(0, 5),
      }));

    return {
      generadoEn: new Date().toISOString(),
      resumenNodos: { total: nodos.length, ...conteo },
      alertas: { total: alertas.length, porTipo: alertasPorTipo },
      acciones: { total: acciones.length, porFase: accionesPorFase },
      accionesEjecutadas,
      nodosAfectados: nodos
        .filter((n) => n.estado !== EstadoNodo.NORMAL)
        .map((n) => ({
          id: n.id,
          hostname: n.hostname,
          sede: n.sede,
          estado: n.estado,
          scoreRiesgo: n.scoreRiesgo,
        })),
    };
  }
}
