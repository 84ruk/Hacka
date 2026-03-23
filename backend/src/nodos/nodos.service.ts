import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Nodo, EstadoNodo } from '../entities/nodo.entity';
import { AccionProtocolo, FaseProtocolo, EstadoAccion } from '../entities/accion-protocolo.entity';

export interface ResumenRed {
  total: number;
  normal: number;
  sospechoso: number;
  comprometido: number;
  contenido: number;
  recuperando: number;
  recuperado: number;
  aislado: number;
  archivosProtegidos: number;
  porSede: { sede: string; comprometidos: number; total: number }[];
}

@Injectable()
export class NodosService {
  constructor(
    @InjectRepository(Nodo)
    private nodosRepo: Repository<Nodo>,
    @InjectRepository(AccionProtocolo)
    private accionRepo: Repository<AccionProtocolo>,
  ) {}

  findAll(estado?: EstadoNodo, sede?: string): Promise<Nodo[]> {
    const where: Partial<Nodo> = {};
    if (estado) where.estado = estado;
    if (sede)   where.sede   = sede;
    return this.nodosRepo.find({ where });
  }

  async getResumen(): Promise<ResumenRed> {
    // Fetch all nodes (200 max en el demo) y agrupamos en memoria — simple y confiable
    const todos = await this.nodosRepo.find();

    const count = (estado: EstadoNodo) => todos.filter((n) => n.estado === estado).length;
    const recuperando = count(EstadoNodo.RECUPERANDO);
    const contenidos  = count(EstadoNodo.CONTENIDO) + recuperando;

    const sedesMap = new Map<string, { comprometidos: number; total: number }>();
    for (const n of todos) {
      if (!sedesMap.has(n.sede)) sedesMap.set(n.sede, { comprometidos: 0, total: 0 });
      const entry = sedesMap.get(n.sede)!;
      entry.total++;
      if (n.estado === 'comprometido') entry.comprometidos++;
    }

    const ARCHIVOS_POR_TIPO: Record<string, number> = {
      servidor:         2000,
      estacion_trabajo:  500,
      dispositivo_red:   100,
      soporte:           200,
    };
    const archivosProtegidos = todos
      .filter((n) => (
        n.estado === EstadoNodo.CONTENIDO ||
        n.estado === EstadoNodo.RECUPERANDO ||
        n.estado === EstadoNodo.RECUPERADO
      ))
      .reduce((sum, n) => sum + (ARCHIVOS_POR_TIPO[n.tipo] ?? 500), 0);

    return {
      total:        todos.length,
      normal:       count(EstadoNodo.NORMAL),
      sospechoso:   count(EstadoNodo.SOSPECHOSO),
      comprometido: count(EstadoNodo.COMPROMETIDO),
      contenido:    contenidos,
      recuperando,
      recuperado:   count(EstadoNodo.RECUPERADO),
      aislado:      todos.filter((n) => n.aislado).length,
      archivosProtegidos,
      porSede:      [...sedesMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sede, v]) => ({ sede, ...v })),
    };
  }

  async findOne(id: number): Promise<object> {
    const nodo = await this.nodosRepo.findOne({
      where: { id },
      relations: ['alertas'],
    });
    if (!nodo) throw new NotFoundException(`Nodo ${id} no encontrado`);

    // Elimina el campo 'nodo' anidado dentro de cada alerta (redundante con eager: true)
    const alertas = (nodo.alertas ?? []).map(({ nodo: _n, ...rest }) => rest);
    return { ...nodo, alertas };
  }

  async contener(id: number): Promise<{ mensaje: string; nodo: Nodo }> {
    const nodo = await this.nodosRepo.findOne({ where: { id } });
    if (!nodo) throw new NotFoundException(`Nodo ${id} no encontrado`);

    nodo.estado  = EstadoNodo.CONTENIDO;
    nodo.aislado = true;
    await this.nodosRepo.save(nodo);

    await this.accionRepo.save({
      fase:           FaseProtocolo.CONTENCION,
      descripcion:    `Nodo ${nodo.hostname} aislado de la red SD-WAN`,
      nodoAfectadoId: nodo.id,
      estado:         EstadoAccion.COMPLETADA,
    } as AccionProtocolo);

    return { mensaje: `Nodo ${nodo.hostname} contenido exitosamente`, nodo };
  }

  async contenerSede(sede: string): Promise<{ mensaje: string; nodosContenidos: number }> {
    const nodos = await this.nodosRepo.find({
      where: { sede, estado: EstadoNodo.COMPROMETIDO },
    });

    if (nodos.length === 0) {
      return { mensaje: `No hay nodos comprometidos en ${sede}`, nodosContenidos: 0 };
    }

    const actualizados = nodos.map((n) => ({
      ...n,
      estado:  EstadoNodo.CONTENIDO,
      aislado: true,
    }));
    await this.nodosRepo.save(actualizados);

    await this.accionRepo.save({
      fase:        FaseProtocolo.CONTENCION,
      descripcion: `Sede ${sede} aislada: ${nodos.length} nodos contenidos`,
      estado:      EstadoAccion.COMPLETADA,
    } as AccionProtocolo);

    return { mensaje: `Sede ${sede} contenida: ${nodos.length} nodos aislados`, nodosContenidos: nodos.length };
  }

  async recuperar(id: number): Promise<{ mensaje: string; nodo: Nodo }> {
    const nodo = await this.nodosRepo.findOne({ where: { id } });
    if (!nodo) throw new NotFoundException(`Nodo ${id} no encontrado`);

    nodo.estado          = EstadoNodo.RECUPERADO;
    nodo.aislado         = false;
    nodo.scoreRiesgo     = 0;
    nodo.ultimaActividad = new Date();
    await this.nodosRepo.save(nodo);

    await this.accionRepo.save({
      fase:           FaseProtocolo.RECUPERACION,
      descripcion:    `Nodo ${nodo.hostname} recuperado y reintegrado a la red SD-WAN`,
      nodoAfectadoId: nodo.id,
      estado:         EstadoAccion.COMPLETADA,
      completadoEn:   new Date(),
    } as AccionProtocolo);

    return { mensaje: `Nodo ${nodo.hostname} recuperado exitosamente`, nodo };
  }

  async recuperarSede(sede: string): Promise<{ mensaje: string; nodosRecuperados: number }> {
    const nodos = await this.nodosRepo.find({
      where: { sede, estado: In([EstadoNodo.CONTENIDO, EstadoNodo.RECUPERANDO]) },
    });

    if (nodos.length === 0) {
      return { mensaje: `No hay nodos contenidos en ${sede}`, nodosRecuperados: 0 };
    }

    const actualizados = nodos.map((n) => ({
      ...n,
      estado:          EstadoNodo.RECUPERADO,
      aislado:         false,
      scoreRiesgo:     0,
      ultimaActividad: new Date(),
    }));
    await this.nodosRepo.save(actualizados);

    await this.accionRepo.save({
      fase:         FaseProtocolo.RECUPERACION,
      descripcion:  `Sede ${sede} recuperada: ${nodos.length} nodos reintegrados a la red SD-WAN`,
      estado:       EstadoAccion.COMPLETADA,
      completadoEn: new Date(),
    } as AccionProtocolo);

    return { mensaje: `Sede ${sede} recuperada: ${nodos.length} nodos reintegrados`, nodosRecuperados: nodos.length };
  }

  async proteger(id: number): Promise<{ mensaje: string; nodo: Nodo }> {
    const nodo = await this.nodosRepo.findOne({ where: { id } });
    if (!nodo) throw new NotFoundException(`Nodo ${id} no encontrado`);

    if (![EstadoNodo.CONTENIDO, EstadoNodo.RECUPERANDO].includes(nodo.estado)) {
      throw new BadRequestException('El nodo debe estar contenido para aplicar proteccion');
    }

    nodo.ultimaProteccion = new Date();
    await this.nodosRepo.save(nodo);

    await this.accionRepo.save({
      fase:           FaseProtocolo.ERRADICACION,
      descripcion:    `Proteccion aplicada en ${nodo.hostname} (hardening preventivo)`,
      nodoAfectadoId: nodo.id,
      estado:         EstadoAccion.COMPLETADA,
      completadoEn:   new Date(),
    } as AccionProtocolo);

    return { mensaje: `Proteccion aplicada en ${nodo.hostname}`, nodo };
  }

  async generarBackup(id: number): Promise<{ mensaje: string; nodo: Nodo }> {
    const nodo = await this.nodosRepo.findOne({ where: { id } });
    if (!nodo) throw new NotFoundException(`Nodo ${id} no encontrado`);

    if (![EstadoNodo.CONTENIDO, EstadoNodo.RECUPERANDO].includes(nodo.estado)) {
      throw new BadRequestException('El nodo debe estar contenido para generar backup');
    }

    nodo.ultimoBackup = new Date();
    nodo.backupVerificado = true;
    await this.nodosRepo.save(nodo);

    await this.accionRepo.save({
      fase:           FaseProtocolo.RECUPERACION,
      descripcion:    `Backup verificado disponible para ${nodo.hostname}`,
      nodoAfectadoId: nodo.id,
      estado:         EstadoAccion.COMPLETADA,
      completadoEn:   new Date(),
    } as AccionProtocolo);

    return { mensaje: `Backup generado para ${nodo.hostname}`, nodo };
  }
}
