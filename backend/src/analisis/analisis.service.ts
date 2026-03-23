import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Nodo, EstadoNodo } from '../entities/nodo.entity';
import { Alerta, TipoAlerta, SeveridadAlerta } from '../entities/alerta.entity';
import { NodosService } from '../nodos/nodos.service';

// ── Tipos de respuesta ──────────────────────────────────────────────────────

interface FactorRiesgo {
  tipo: string;
  peso: number;
  descripcion: string;
}

interface Recomendacion {
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  accion: string;
  razon?: string;
  fase: 'deteccion' | 'contencion' | 'erradicacion' | 'recuperacion';
}

interface NodoEnRiesgo {
  id: number;
  hostname: string;
  sede: string;
  ip: string;
  estadoActual: string;
  probabilidadInfeccion: number;
  factores: string[];
}

// ── Constantes ──────────────────────────────────────────────────────────────

// Deben coincidir exactamente con los valores de simulacion.service.ts
const PUNTAJE_ALERTA: Record<string, number> = {
  cifrado_archivos:   70,   // un solo evento ya clasifica como comprometido (≥70)
  trafico_c2:         30,
  movimiento_lateral: 20,
  script_malicioso:   10,
  anomalia_red:        5,   // clasifica como sospechoso (1–69)
};

const DESCRIPCION_FACTOR: Record<string, string> = {
  cifrado_archivos:   'Cifrado activo de archivos en el sistema',
  trafico_c2:         'Comunicación con servidor de comando y control',
  movimiento_lateral: 'Intentos de propagación a nodos vecinos',
  script_malicioso:   'Ejecución de scripts maliciosos detectada',
  anomalia_red:       'Anomalía de tráfico de red detectada',
};

const RECOMENDACIONES_POR_NIVEL: Record<string, string[]> = {
  comprometido: [
    'Aislar el nodo de la red SD-WAN de forma inmediata',
    'Bloquear tráfico de salida hacia IPs externas',
    'Iniciar análisis forense del sistema de archivos',
    'Restaurar desde backup verificado',
  ],
  sospechoso: [
    'Incrementar monitoreo de tráfico en este nodo',
    'Verificar integridad de archivos del sistema',
    'Revisar logs de autenticación recientes',
  ],
  normal: [
    'Mantener monitoreo estándar',
    'Verificar actualizaciones de seguridad pendientes',
  ],
};

@Injectable()
export class AnalisisService {
  constructor(
    @InjectRepository(Nodo)   private nodosRepo: Repository<Nodo>,
    @InjectRepository(Alerta) private alertasRepo: Repository<Alerta>,
    private readonly nodosService: NodosService,
  ) {}

  // ── Helpers privados ──────────────────────────────────────────────────────

  private calcularScore(alertas: Alerta[]): number {
    return Math.min(
      100,
      alertas.reduce((total, a) => total + (PUNTAJE_ALERTA[a.tipo] ?? 0), 0),
    );
  }

  private clasificarNivel(score: number): string {
    if (score >= 70) return 'comprometido';
    if (score > 0)   return 'sospechoso';
    return 'normal';
  }

  private generarRecomendaciones(nodos: Nodo[]): Recomendacion[] {
    const recs: Recomendacion[] = [];

    // Regla 1: sede con 5+ comprometidos → aislar sede
    const compPorSede = new Map<string, number>();
    for (const n of nodos) {
      if (n.estado === EstadoNodo.COMPROMETIDO) {
        compPorSede.set(n.sede, (compPorSede.get(n.sede) ?? 0) + 1);
      }
    }
    const sedesOrdenadas = [...compPorSede.entries()]
      .filter(([, c]) => c >= 5)
      .sort(([, a], [, b]) => b - a);

    for (const [sede, cantidad] of sedesOrdenadas) {
      recs.push({
        prioridad: 'CRITICA',
        accion:    `Aislar sede ${sede}`,
        razon:     `${cantidad} nodos comprometidos detectados`,
        fase:      'contencion',
      });
    }

    // Regla 2: tráfico C2 activo → bloquear IPs externas
    const conC2 = nodos.filter((n) =>
      n.alertas?.some((a) => a.tipo === TipoAlerta.TRAFICO_C2),
    );
    if (conC2.length > 0) {
      recs.push({
        prioridad: 'CRITICA',
        accion:    'Bloquear tráfico de salida hacia IPs externas',
        razon:     `${conC2.length} nodos con tráfico C2 activo`,
        fase:      'contencion',
      });
    }

    // Regla 3: nodos sospechosos → monitoreo elevado
    const sospechosos = nodos.filter((n) => n.estado === EstadoNodo.SOSPECHOSO);
    if (sospechosos.length > 0) {
      const sedesSosp = [...new Set(sospechosos.map((n) => n.sede))].join(' y ');
      recs.push({
        prioridad: 'ALTA',
        accion:    `Monitorear sedes ${sedesSosp}`,
        razon:     'Nodos sospechosos con anomalías de red detectadas',
        fase:      'deteccion',
      });
    }

    // Regla 4: nodos contenidos → recuperación lista
    const contenidos = nodos.filter((n) => [EstadoNodo.CONTENIDO, EstadoNodo.RECUPERANDO].includes(n.estado));
    if (contenidos.length > 0) {
      recs.push({
        prioridad: 'MEDIA',
        accion:    `Iniciar recuperación de ${contenidos.length} nodos contenidos`,
        razon:     'Nodos aislados listos para análisis forense y restauración',
        fase:      'recuperacion',
      });
    }

    return recs;
  }

  // ── Endpoints ─────────────────────────────────────────────────────────────

  async analizarNodo(id: number): Promise<object> {
    const nodo = await this.nodosRepo.findOne({
      where: { id },
      relations: ['alertas'],
    });
    if (!nodo) throw new NotFoundException(`Nodo ${id} no encontrado`);

    if (nodo.estado === EstadoNodo.RECUPERADO) {
      return {
        nodo: {
          id:           nodo.id,
          hostname:     nodo.hostname,
          sede:         nodo.sede,
          estadoActual: nodo.estado,
        },
        analisis: {
          score: 0,
          nivel: 'normal',
          factoresDetectados: [],
          recomendaciones: ['Nodo recuperado y validado'],
        },
      };
    }

    const alertas  = nodo.alertas ?? [];
    const score    = this.calcularScore(alertas);
    const nivel    = this.clasificarNivel(score);

    // Factores detectados: un factor por tipo de alerta único, ordenado por peso
    const tiposUnicos = [...new Set(alertas.map((a) => a.tipo))];
    const factores: FactorRiesgo[] = tiposUnicos
      .map((tipo) => ({
        tipo,
        peso:        PUNTAJE_ALERTA[tipo] ?? 0,
        descripcion: DESCRIPCION_FACTOR[tipo] ?? tipo,
      }))
      .sort((a, b) => b.peso - a.peso);

    return {
      nodo: {
        id:           nodo.id,
        hostname:     nodo.hostname,
        sede:         nodo.sede,
        estadoActual: nodo.estado,
      },
      analisis: {
        score,
        nivel,
        factoresDetectados: factores,
        recomendaciones:    RECOMENDACIONES_POR_NIVEL[nivel] ?? [],
      },
    };
  }

  async analizarRed(): Promise<object> {
    // Carga todos los nodos con sus alertas
    const nodos = await this.nodosRepo.find({ relations: ['alertas'] });

    let sumScores = 0;
    const scoresPorSede = new Map<string, { suma: number; total: number; comprometidos: number }>();

    for (const nodo of nodos) {
      const score = this.calcularScore(nodo.alertas ?? []);
      sumScores += score;

      if (!scoresPorSede.has(nodo.sede)) {
        scoresPorSede.set(nodo.sede, { suma: 0, total: 0, comprometidos: 0 });
      }
      const entry = scoresPorSede.get(nodo.sede)!;
      entry.suma  += score;
      entry.total += 1;
      if (nodo.estado === EstadoNodo.COMPROMETIDO) entry.comprometidos++;
    }

    const critico    = nodos.filter((n) => n.estado === EstadoNodo.COMPROMETIDO).length;
    const sospechoso = nodos.filter((n) => n.estado === EstadoNodo.SOSPECHOSO).length;
    const normal     = nodos.filter((n) => n.estado === EstadoNodo.NORMAL).length;

    const sedesMasAfectadas = [...scoresPorSede.entries()]
      .map(([sede, v]) => ({
        sede,
        comprometidos:  v.comprometidos,
        scorePromedio:  Math.round((v.suma / v.total) * 10) / 10,
      }))
      .filter((s) => s.comprometidos > 0)
      .sort((a, b) => b.comprometidos - a.comprometidos);

    const recomendaciones = this.generarRecomendaciones(nodos);

    // Alertas principales descriptivas
    const conC2     = nodos.filter((n) => n.alertas?.some((a) => a.tipo === TipoAlerta.TRAFICO_C2));
    const conCifrad = nodos.filter((n) => n.alertas?.some((a) => a.tipo === TipoAlerta.CIFRADO_ARCHIVOS));
    const conMov    = nodos.filter((n) => n.alertas?.some((a) => a.tipo === TipoAlerta.MOVIMIENTO_LATERAL));

    const alertasPrincipales: string[] = [];
    if (conCifrad.length > 0) alertasPrincipales.push(`Cifrado de archivos en progreso en ${conCifrad.length} equipos`);
    if (conC2.length > 0)     alertasPrincipales.push(`Tráfico hacia servidores C2 externos detectado en ${conC2.length} nodos`);
    if (conMov.length > 0)    alertasPrincipales.push(`Propagación lateral activa entre sedes CDMX y Jalisco`);

    return {
      resumenRiesgo: {
        critico,
        sospechoso,
        normal,
        scorePromedioRed: Math.round((sumScores / nodos.length) * 10) / 10,
      },
      sedesMasAfectadas,
      recomendacionesGlobales: recomendaciones,
      alertasPrincipales,
    };
  }

  async analizarPropagacion(): Promise<object> {
    const nodos = await this.nodosRepo.find({ relations: ['alertas'] });

    // Mapa de comprometidos por sede y por rango IP (/24)
    const compPorSede  = new Map<string, number>();
    const totalPorSede = new Map<string, number>();
    const rangoC2Set   = new Set<string>();

    for (const n of nodos) {
      totalPorSede.set(n.sede, (totalPorSede.get(n.sede) ?? 0) + 1);
      if (n.estado === EstadoNodo.COMPROMETIDO) {
        compPorSede.set(n.sede, (compPorSede.get(n.sede) ?? 0) + 1);
        // Rango /24 = primeros 3 octetos
        const rango = n.ip.split('.').slice(0, 3).join('.');
        rangoC2Set.add(rango);
      }
    }

    // Puntuar solo nodos no comprometidos
    const nodosEnRiesgo: NodoEnRiesgo[] = [];

    for (const nodo of nodos) {
      if (nodo.estado === EstadoNodo.COMPROMETIDO) continue;

      let riesgo = 0;
      const factores: string[] = [];

      // Factor 1: misma sede con comprometidos
      const compEnSede  = compPorSede.get(nodo.sede) ?? 0;
      const totalEnSede = totalPorSede.get(nodo.sede) ?? 1;
      if (compEnSede > 0) {
        const pct = Math.round((compEnSede / totalEnSede) * 100);
        riesgo   += Math.round(40 * (compEnSede / totalEnSede));
        factores.push(`Misma sede que ${compEnSede} nodos comprometidos (${pct}% de la sede afectada)`);
      }

      // Factor 2: mismo rango IP /24
      const rango = nodo.ip.split('.').slice(0, 3).join('.');
      if (rangoC2Set.has(rango)) {
        riesgo += 30;
        factores.push(`IP en el mismo rango ${rango}.x que nodos comprometidos`);
      }

      // Factor 3: tiene alerta de anomalia_red
      const tieneAnomalia = (nodo.alertas ?? []).some((a) => a.tipo === TipoAlerta.ANOMALIA_RED);
      if (tieneAnomalia) {
        riesgo += 20;
        factores.push('Anomalía de red detectada previamente');
      }

      // Factor 4: estado sospechoso
      if (nodo.estado === EstadoNodo.SOSPECHOSO) {
        riesgo += 10;
        factores.push('Nodo clasificado como sospechoso');
      }

      if (riesgo > 0) {
        nodosEnRiesgo.push({
          id:                    nodo.id,
          hostname:              nodo.hostname,
          sede:                  nodo.sede,
          ip:                    nodo.ip,
          estadoActual:          nodo.estado,
          probabilidadInfeccion: Math.min(100, riesgo),
          factores,
        });
      }
    }

    nodosEnRiesgo.sort((a, b) => b.probabilidadInfeccion - a.probabilidadInfeccion);
    const top10 = nodosEnRiesgo.slice(0, 10);

    return {
      nodosEnRiesgo: top10,
      totalEnRiesgo: nodosEnRiesgo.length,
      recomendacion: 'Monitorear estos nodos con prioridad y considerar contención preventiva',
    };
  }

  async getRecomendaciones(): Promise<object> {
    const nodos = await this.nodosRepo.find({ relations: ['alertas'] });
    const recs  = this.generarRecomendaciones(nodos);
    return { recomendaciones: recs };
  }

  async escanear(): Promise<object> {
    const inicio = Date.now();
    const nodos  = await this.nodosRepo.find({ relations: ['alertas'] });

    const reglaAplicada: string[] = [];
    let amenazasDetectadas = 0;
    let nodosActualizados  = 0;

    for (const nodo of nodos) {
      // No modificar nodos ya aislados, recuperando o recuperados
      if ([EstadoNodo.CONTENIDO, EstadoNodo.RECUPERANDO, EstadoNodo.RECUPERADO].includes(nodo.estado)) continue;

      const tipos = new Set((nodo.alertas ?? []).map((a) => a.tipo));
      let nuevoEstado  = nodo.estado;
      let nuevoScore   = nodo.scoreRiesgo;
      let razon        = '';

      if (tipos.has(TipoAlerta.CIFRADO_ARCHIVOS) && tipos.has(TipoAlerta.TRAFICO_C2)) {
        nuevoEstado = EstadoNodo.COMPROMETIDO;
        nuevoScore  = 100;
        razon       = 'cifrado activo con comunicacion C2 confirmada';
        amenazasDetectadas++;
      } else if (tipos.has(TipoAlerta.CIFRADO_ARCHIVOS)) {
        nuevoEstado = EstadoNodo.COMPROMETIDO;
        nuevoScore  = Math.max(nuevoScore, 70);
        razon       = 'cifrado de archivos detectado';
        amenazasDetectadas++;
      } else if (tipos.has(TipoAlerta.MOVIMIENTO_LATERAL) && nodo.estado !== EstadoNodo.COMPROMETIDO) {
        nuevoEstado = EstadoNodo.SOSPECHOSO;
        nuevoScore  = Math.max(nuevoScore, 40);
        razon       = 'movimiento lateral detectado';
        amenazasDetectadas++;
      } else if (tipos.has(TipoAlerta.SCRIPT_MALICIOSO) && nodo.estado === EstadoNodo.NORMAL) {
        nuevoEstado = EstadoNodo.SOSPECHOSO;
        nuevoScore  = Math.max(nuevoScore, 30);
        razon       = 'ejecucion de script no autorizado';
        amenazasDetectadas++;
      } else if (tipos.has(TipoAlerta.ANOMALIA_RED) && nodo.estado === EstadoNodo.NORMAL) {
        nuevoEstado = EstadoNodo.SOSPECHOSO;
        nuevoScore  = Math.max(nuevoScore, 10);
        razon       = 'comportamiento de red inusual';
        amenazasDetectadas++;
      }

      if (nuevoEstado !== nodo.estado || nuevoScore !== nodo.scoreRiesgo) {
        nodo.estado      = nuevoEstado;
        nodo.scoreRiesgo = nuevoScore;
        await this.nodosRepo.save(nodo);
        nodosActualizados++;
        reglaAplicada.push(`${nodo.hostname} (${nodo.sede}): ${razon} — ${nuevoEstado}`);
      }
    }

    const duracion = Date.now() - inicio;

    // Contar estado actual post-escaneo
    const totalComprometidos = nodos.filter((n) => n.estado === EstadoNodo.COMPROMETIDO).length;
    const totalSospechosos   = nodos.filter((n) => n.estado === EstadoNodo.SOSPECHOSO).length;
    const totalNormales      = nodos.filter((n) => n.estado === EstadoNodo.NORMAL).length;
    const sospechososDetectados = reglaAplicada.filter((r) => r.includes('sospechoso')).length;

    return {
      nodosEscaneados:     nodos.length,
      amenazasDetectadas,
      sospechososDetectados,
      nodosActualizados,
      reglaAplicada,
      estadoActual: {
        comprometidos: totalComprometidos,
        sospechosos:   totalSospechosos,
        normales:      totalNormales,
      },
      duracion:  `${duracion}ms`,
      mensaje:   nodosActualizados > 0
        ? `Escaneo completado: ${amenazasDetectadas} comprometidos y ${sospechososDetectados} sospechosos detectados — ${nodosActualizados} nodos actualizados en ${duracion}ms`
        : `Escaneo completado: ${nodos.length} nodos verificados — red en estado confirmado`,
    };
  }

  async pacienteCero(): Promise<object> {
    // QueryBuilder evita el bug de In() + relations + findOne en TypeORM 0.3
    const primeraAlerta = await this.alertasRepo
      .createQueryBuilder('alerta')
      .leftJoinAndSelect('alerta.nodo', 'nodo')
      .where('alerta.severidad IN (:...severidades)', {
        severidades: [SeveridadAlerta.CRITICA, SeveridadAlerta.ALTA],
      })
      .orderBy('alerta.creadoEn', 'ASC')
      .getOne();

    if (!primeraAlerta?.nodo) {
      return { pacienteCero: null, mensaje: 'No se ha detectado ningun incidente activo' };
    }

    const origen = primeraAlerta.nodo;

    // Ruta de propagacion: afectados ordenados por creadoEn de su primera alerta
    const rutaNodos = await this.nodosRepo
      .createQueryBuilder('nodo')
      .where('nodo.estado IN (:...estados)', {
        estados: [EstadoNodo.COMPROMETIDO, EstadoNodo.SOSPECHOSO, EstadoNodo.CONTENIDO, EstadoNodo.RECUPERANDO],
      })
      .orderBy('nodo.ultimaActividad', 'ASC')
      .take(8)
      .getMany();

    const nodosEnRuta = rutaNodos.map((n) => ({
      id:        n.id,
      hostname:  n.hostname,
      sede:      n.sede,
      estado:    n.estado,
      timestamp: n.ultimaActividad
        ? new Date(n.ultimaActividad).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : '--:--',
    }));

    // Tiempo de propagacion: primera alerta → ultima alerta
    const ultimaAlerta = await this.alertasRepo
      .createQueryBuilder('alerta')
      .orderBy('alerta.creadoEn', 'DESC')
      .getOne();

    const tiempoPropagacionMs = ultimaAlerta
      ? new Date(ultimaAlerta.creadoEn).getTime() - new Date(primeraAlerta.creadoEn).getTime()
      : 0;
    const minutos  = Math.floor(tiempoPropagacionMs / 60000);
    const segundos = Math.floor((tiempoPropagacionMs % 60000) / 1000);
    const tiempoPropagacion = `${minutos}m ${segundos}s`;

    const sedesAfectadasList = [...new Set(rutaNodos.map((n) => n.sede))];

    return {
      pacienteCero: {
        id:                origen.id,
        hostname:          origen.hostname,
        sede:              origen.sede,
        ip:                origen.ip,
        tipo:              origen.tipo,
        scoreRiesgo:       origen.scoreRiesgo,
        tipoAtaqueInicial: primeraAlerta.tipo,
        primeraDeteccion:  primeraAlerta.creadoEn,
      },
      propagacion: {
        tiempoPropagacion,
        sedesAlcanzadas: sedesAfectadasList.length,
        sedesAfectadas:  sedesAfectadasList,
        nodosEnRuta,
      },
      resumen:
        `El ataque inicio en ${origen.hostname} (${origen.sede}) ` +
        `mediante ${primeraAlerta.tipo.replace(/_/g, ' ')} ` +
        `y se propago a ${sedesAfectadasList.length} sede(s) en ${tiempoPropagacion}`,
    };
  }

  async contenerAutomatico(): Promise<object> {
    const inicio = Date.now();

    const acciones:     object[]  = [];
    const razonamiento: string[]  = [];

    // Sets para evitar duplicados — critico para no recontener el mismo nodo/sede
    const sedesContenidas  = new Set<string>();
    const nodosContenidos  = new Set<number>();

    const nodos = await this.nodosRepo.find({
      where: { estado: In([EstadoNodo.COMPROMETIDO, EstadoNodo.SOSPECHOSO]) },
      relations: ['alertas'],
    });

    const comprometidos = nodos.filter((n) => n.estado === EstadoNodo.COMPROMETIDO);
    const sospechosos   = nodos.filter((n) => n.estado === EstadoNodo.SOSPECHOSO);

    // ── REGLA 1: Sede con 3+ comprometidos → aislar sede completa ────────────
    const comprometidosPorSede: Record<string, number> = {};
    for (const n of comprometidos) {
      comprometidosPorSede[n.sede] = (comprometidosPorSede[n.sede] ?? 0) + 1;
    }

    for (const [sede, cantidad] of Object.entries(comprometidosPorSede)) {
      if (cantidad >= 3 && !sedesContenidas.has(sede)) {
        const resultado = await this.nodosService.contenerSede(sede);
        sedesContenidas.add(sede);

        // Marcar todos los nodos de la sede como procesados
        comprometidos.filter((n) => n.sede === sede).forEach((n) => nodosContenidos.add(n.id));
        sospechosos.filter((n) => n.sede === sede).forEach((n) => nodosContenidos.add(n.id));

        acciones.push({
          tipo:           'contener_sede',
          sede,
          nodosAfectados: resultado.nodosContenidos,
        });
        razonamiento.push(
          `${sede}: ${cantidad} nodos comprometidos — umbral superado, sede aislada completamente`,
        );
      }
    }

    // ── REGLA 2: Nodo con trafico C2 activo → aislar individualmente ─────────
    const conC2 = comprometidos.filter(
      (n) =>
        !sedesContenidas.has(n.sede) &&
        !nodosContenidos.has(n.id) &&
        (n.alertas ?? []).some((a) => a.tipo === TipoAlerta.TRAFICO_C2),
    );

    for (const nodo of conC2) {
      await this.nodosService.contener(nodo.id);
      nodosContenidos.add(nodo.id);
      acciones.push({
        tipo:           'contener_nodo',
        sede:           nodo.sede,
        hostname:       nodo.hostname,
        nodosAfectados: 1,
      });
      razonamiento.push(
        `${nodo.hostname} (${nodo.sede}): trafico activo hacia servidor C2 externo — nodo aislado`,
      );
    }

    // ── REGLA 3: Comprometido restante → aislar individualmente ──────────────
    const comprometidosSinCubrir = comprometidos.filter(
      (n) => !sedesContenidas.has(n.sede) && !nodosContenidos.has(n.id),
    );

    for (const nodo of comprometidosSinCubrir) {
      await this.nodosService.contener(nodo.id);
      nodosContenidos.add(nodo.id);
      acciones.push({
        tipo:           'contener_nodo',
        sede:           nodo.sede,
        hostname:       nodo.hostname,
        nodosAfectados: 1,
      });
      razonamiento.push(
        `${nodo.hostname} (${nodo.sede}): estado comprometido confirmado; score ${nodo.scoreRiesgo}/100 — nodo aislado`,
      );
    }

    // ── REGLA 4: Sospechosos con score >= 50 en sedes con amenaza activa ─────
    const sedesConAmenaza = new Set(comprometidos.map((n) => n.sede));

    const sospechososEnRiesgo = sospechosos.filter(
      (n) =>
        sedesConAmenaza.has(n.sede) &&
        !sedesContenidas.has(n.sede) &&
        !nodosContenidos.has(n.id) &&
        n.scoreRiesgo >= 50,
    );

    for (const nodo of sospechososEnRiesgo) {
      await this.nodosService.contener(nodo.id);
      nodosContenidos.add(nodo.id);
      acciones.push({
        tipo:           'contener_preventivo',
        sede:           nodo.sede,
        hostname:       nodo.hostname,
        nodosAfectados: 1,
      });
      razonamiento.push(
        `${nodo.hostname} (${nodo.sede}): sospechoso con score ${nodo.scoreRiesgo}/100 en sede comprometida — contencion preventiva`,
      );
    }

    const nodosAislados   = nodosContenidos.size;
    const sedesAisladas   = sedesContenidas.size;
    const tiempoRespuesta = Date.now() - inicio;

    if (acciones.length === 0) {
      return {
        accionesEjecutadas:   0,
        nodosAislados:        0,
        sedesAisladas:        0,
        propagacionDetenida:  false,
        tiempoRespuesta:      `${tiempoRespuesta}ms`,
        razonamiento:         ['Sin amenazas activas detectadas. Red bajo monitoreo.'],
        mensaje:              'Red bajo control — sin acciones requeridas',
      };
    }

    return {
      accionesEjecutadas:  acciones.length,
      acciones,
      nodosAislados,
      sedesAisladas,
      propagacionDetenida: true,
      tiempoRespuesta:     `${tiempoRespuesta}ms`,
      razonamiento,
      mensaje:             `Protocolo ejecutado: ${acciones.length} acciones, ${nodosAislados} nodos aislados en ${tiempoRespuesta}ms`,
    };
  }
}
