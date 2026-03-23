import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alerta, SeveridadAlerta, TipoAlerta } from '../entities/alerta.entity';

export interface ResumenAlertas {
  total: number;
  criticas: number;
  altas: number;
  medias: number;
  bajas: number;
  atendidas: number;
  pendientes: number;
  porTipo: { tipo: string; total: number }[];
}

export interface FiltrosAlertas {
  atendida?: boolean;
  severidad?: SeveridadAlerta;
  sede?: string;
  limite?: number;
}

@Injectable()
export class AlertasService {
  constructor(
    @InjectRepository(Alerta)
    private alertasRepo: Repository<Alerta>,
  ) {}

  async findAll(filtros: FiltrosAlertas): Promise<Alerta[]> {
    const qb = this.alertasRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.nodo', 'nodo')
      .orderBy('a.creadoEn', 'DESC')
      .take(filtros.limite ?? 100);

    if (filtros.atendida !== undefined) {
      qb.andWhere('a.atendida = :atendida', { atendida: filtros.atendida });
    }
    if (filtros.severidad) {
      qb.andWhere('a.severidad = :severidad', { severidad: filtros.severidad });
    }
    if (filtros.sede) {
      qb.andWhere('nodo.sede = :sede', { sede: filtros.sede });
    }

    const alertas = await qb.getMany();

    // Devuelve solo los campos relevantes del nodo para no exponer datos innecesarios
    return alertas.map((a) => ({
      ...a,
      nodo: a.nodo
        ? {
            id:          a.nodo.id,
            hostname:    a.nodo.hostname,
            sede:        a.nodo.sede,
            estado:      a.nodo.estado,
            scoreRiesgo: a.nodo.scoreRiesgo,
          }
        : null,
    })) as Alerta[];
  }

  async getResumen(): Promise<ResumenAlertas> {
    // Carga todas las alertas (80 en el demo) y agrupa en memoria
    const todas = await this.alertasRepo.find();

    const count = (sev: string) => todas.filter((a) => a.severidad === sev).length;

    const porTipoMap = new Map<string, number>();
    for (const a of todas) {
      porTipoMap.set(a.tipo, (porTipoMap.get(a.tipo) ?? 0) + 1);
    }

    const ORDEN_TIPOS: TipoAlerta[] = [
      TipoAlerta.CIFRADO_ARCHIVOS,
      TipoAlerta.TRAFICO_C2,
      TipoAlerta.MOVIMIENTO_LATERAL,
      TipoAlerta.SCRIPT_MALICIOSO,
      TipoAlerta.ANOMALIA_RED,
    ];

    return {
      total:     todas.length,
      criticas:  count(SeveridadAlerta.CRITICA),
      altas:     count(SeveridadAlerta.ALTA),
      medias:    count(SeveridadAlerta.MEDIA),
      bajas:     count(SeveridadAlerta.BAJA),
      atendidas: todas.filter((a) => a.atendida).length,
      pendientes: todas.filter((a) => !a.atendida).length,
      porTipo:   ORDEN_TIPOS
        .filter((t) => porTipoMap.has(t))
        .map((t) => ({ tipo: t, total: porTipoMap.get(t)! })),
    };
  }

  async findOne(id: number): Promise<Alerta> {
    const alerta = await this.alertasRepo.findOne({ where: { id } });
    if (!alerta) throw new NotFoundException(`Alerta ${id} no encontrada`);
    return alerta;
  }

  async atender(id: number): Promise<{ mensaje: string; alerta: Alerta }> {
    const alerta = await this.alertasRepo.findOne({ where: { id } });
    if (!alerta) throw new NotFoundException(`Alerta ${id} no encontrada`);

    alerta.atendida = true;
    await this.alertasRepo.save(alerta);

    return { mensaje: 'Alerta marcada como atendida', alerta };
  }

  async atenderSede(sede: string): Promise<{ mensaje: string; alertasAtendidas: number }> {
    // Cargamos con join para filtrar por sede del nodo
    const pendientes = await this.alertasRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.nodo', 'nodo')
      .where('a.atendida = false')
      .andWhere('nodo.sede = :sede', { sede })
      .getMany();

    if (pendientes.length === 0) {
      return { mensaje: `No hay alertas pendientes en ${sede}`, alertasAtendidas: 0 };
    }

    await this.alertasRepo.save(pendientes.map((a) => ({ ...a, atendida: true })));

    return {
      mensaje:          `${pendientes.length} alertas de ${sede} marcadas como atendidas`,
      alertasAtendidas: pendientes.length,
    };
  }
}
