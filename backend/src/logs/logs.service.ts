import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogForense, TipoLogForense } from '../entities/log-forense.entity';
import { Nodo } from '../entities/nodo.entity';
import { Alerta, TipoAlerta } from '../entities/alerta.entity';

const IPS_C2 = [
  '185.220.101.45',
  '194.165.16.158',
  '45.142.212.100',
  '91.219.236.166',
  '185.220.100.240',
];

const IPS_ORIGEN_ATAQUE = [
  '185.220.101.45',
  '194.165.16.158',
  '91.219.236.166',
];

function aleatorio(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function elegir<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generarArchivosSimulados(sede: string): string[] {
  const sedeLower = sede.toLowerCase().replace(/[^a-z]/g, '_');
  const archivos = [
    `C:\\Users\\admin\\Documents\\presupuesto_${sedeLower}_2026.xlsx`,
    `C:\\Users\\admin\\Documents\\contrato_SICT_${aleatorio(1, 999)}.pdf`,
    `C:\\Datos\\infraestructura\\red_${sedeLower}.visio`,
    `C:\\Datos\\personal\\nomina_Q1_2026.xlsx`,
    `C:\\Sistemas\\backup\\config_${sedeLower}.tar.gz`,
    `C:\\Datos\\operaciones\\rutas_${sedeLower}.xlsx`,
    `C:\\Usuarios\\Director\\acuerdos_confidenciales.pdf`,
  ];
  return archivos.slice(0, aleatorio(2, 4));
}

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LogForense)
    private logsRepo: Repository<LogForense>,
  ) {}

  async generarLogsParaNodo(nodo: Nodo, alertas: Alerta[]): Promise<void> {
    const logs: Partial<LogForense>[] = [];
    const tipos    = new Set(alertas.map((a) => a.tipo));
    const ipC2     = elegir(IPS_C2);
    const ipOrigen = elegir(IPS_ORIGEN_ATAQUE);

    const baseTime = new Date(nodo.ultimaActividad ?? new Date());
    baseTime.setMinutes(baseTime.getMinutes() - 45);
    let offsetMs = 0;

    const agregar = (
      tipo: TipoLogForense,
      mensaje: string,
      extra: Partial<LogForense> = {},
    ) => {
      offsetMs += aleatorio(1000, 9000);
      logs.push({
        tipo,
        mensaje,
        nodoId:   nodo.id,
        hostname: nodo.hostname,
        sede:     nodo.sede,
        timestamp: new Date(baseTime.getTime() + offsetMs),
        ...extra,
      });
    };

    // Conexion inicial — siempre presente
    agregar(
      TipoLogForense.CONEXION_ENTRANTE,
      `Conexion entrante sospechosa desde ${ipOrigen}:${aleatorio(1024, 60000)}`,
      { ipOrigen, ipDestino: nodo.ip },
    );

    // Escalada de privilegios
    agregar(
      TipoLogForense.ESCALADA_PRIVILEGIOS,
      `Escalada de privilegios detectada: SYSTEM -> Administrator en ${nodo.hostname}`,
      { ipOrigen },
    );

    // Reconocimiento inicial
    agregar(
      TipoLogForense.COMANDO_EXEC,
      `cmd.exe /c whoami /all && net localgroup administrators`,
      { ipOrigen },
    );

    // Descarga del payload
    const hash = Math.random().toString(36).slice(2, 10);
    agregar(
      TipoLogForense.COMANDO_EXEC,
      `powershell -enc JABjAD0ATgBlAHcALQBPAGIAagBlAGMAdAAgAFMAeQBzAHQAZQBtAC4ATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAA= -OutFile C:\\Windows\\Temp\\svc${hash}.exe`,
      { ipOrigen },
    );

    // Logs de cifrado
    if (tipos.has(TipoAlerta.CIFRADO_ARCHIVOS)) {
      const archivos = generarArchivosSimulados(nodo.sede);
      for (const archivo of archivos) {
        agregar(
          TipoLogForense.CIFRADO_ARCHIVO,
          `Cifrado: ${archivo} -> ${archivo}.locked`,
          { archivoAfectado: archivo },
        );
      }
      agregar(
        TipoLogForense.COMANDO_EXEC,
        `vssadmin.exe delete shadows /all /quiet`,
        { ipOrigen },
      );
    }

    // Conexion C2
    if (tipos.has(TipoAlerta.TRAFICO_C2)) {
      agregar(
        TipoLogForense.CONEXION_C2,
        `Beacon HTTP POST hacia ${ipC2}:443 — intervalo 60s — User-Agent: Mozilla/5.0`,
        { ipOrigen: nodo.ip, ipDestino: ipC2 },
      );
      agregar(
        TipoLogForense.CONEXION_C2,
        `Exfiltracion de datos hacia ${ipC2}:443 — ${aleatorio(1, 9)}.${aleatorio(1, 9)} MB transferidos`,
        { ipOrigen: nodo.ip, ipDestino: ipC2 },
      );
    }

    // Movimiento lateral
    if (tipos.has(TipoAlerta.MOVIMIENTO_LATERAL)) {
      const subred = nodo.ip.split('.').slice(0, 3).join('.');
      agregar(
        TipoLogForense.MOVIMIENTO_LATERAL,
        `Escaneo SMB interno: ${subred}.1-254 (puerto 445)`,
        { ipOrigen: nodo.ip },
      );
      const ipVictima1 = `${subred}.${aleatorio(2, 50)}`;
      agregar(
        TipoLogForense.MOVIMIENTO_LATERAL,
        `Intento de autenticacion fallido en ${ipVictima1}:445`,
        { ipOrigen: nodo.ip, ipDestino: ipVictima1 },
      );
      const ipVictima2 = `${subred}.${aleatorio(51, 100)}`;
      agregar(
        TipoLogForense.MOVIMIENTO_LATERAL,
        `Autenticacion exitosa via pass-the-hash en ${ipVictima2}`,
        { ipOrigen: nodo.ip, ipDestino: ipVictima2 },
      );
    }

    // Script malicioso
    if (tipos.has(TipoAlerta.SCRIPT_MALICIOSO)) {
      const scriptName = `update_${Math.random().toString(36).slice(2, 8)}`;
      agregar(
        TipoLogForense.COMANDO_EXEC,
        `wscript.exe C:\\Windows\\Temp\\${scriptName}.vbs`,
        { ipOrigen },
      );
    }

    await this.logsRepo.save(logs as LogForense[]);
  }

  async limpiar(): Promise<void> {
    await this.logsRepo.createQueryBuilder().delete().where('id > 0').execute();
  }

  async getLogsNodo(nodoId: number): Promise<object> {
    const logs = await this.logsRepo.find({
      where: { nodoId },
      order: { timestamp: 'ASC' },
    });

    const ipOrigenAtaque = logs.find(
      (l) => l.tipo === TipoLogForense.CONEXION_ENTRANTE,
    )?.ipOrigen ?? null;

    return {
      nodo: logs.length > 0
        ? { hostname: logs[0].hostname, sede: logs[0].sede, nodoId }
        : { nodoId },
      ipOrigenAtaque,
      totalEventos: logs.length,
      logs: logs.map((l) => ({
        id:              l.id,
        tipo:            l.tipo,
        mensaje:         l.mensaje,
        ipOrigen:        l.ipOrigen ?? null,
        ipDestino:       l.ipDestino ?? null,
        archivoAfectado: l.archivoAfectado ?? null,
        timestamp:       l.timestamp,
      })),
    };
  }

  async getResumen(): Promise<object> {
    const todos = await this.logsRepo.find();

    const nodosConLogs  = new Set(todos.map((l) => l.nodoId)).size;
    const ipsC2         = [...new Set(
      todos.filter((l) => l.tipo === TipoLogForense.CONEXION_C2 && l.ipDestino)
           .map((l) => l.ipDestino),
    )];
    const archivosCifrados     = todos.filter((l) => l.tipo === TipoLogForense.CIFRADO_ARCHIVO).length;
    const comandosEjecutados   = todos.filter((l) => l.tipo === TipoLogForense.COMANDO_EXEC).length;
    const movimientosLaterales = todos.filter((l) => l.tipo === TipoLogForense.MOVIMIENTO_LATERAL).length;

    return {
      totalLogs:            todos.length,
      nodosConLogs,
      ipsC2Detectadas:      ipsC2,
      archivosCifrados,
      comandosEjecutados,
      movimientosLaterales,
    };
  }

  async getLogsPorSede(sede: string): Promise<object> {
    const logs = await this.logsRepo.find({
      where: { sede },
      order: { timestamp: 'ASC' },
    });

    const ipOrigenAtaque = logs.find(
      (l) => l.tipo === TipoLogForense.CONEXION_ENTRANTE,
    )?.ipOrigen ?? null;

    const nodosUnicos = [...new Set(logs.map((l) => l.hostname))];

    return {
      sede,
      ipOrigenAtaque,
      totalEventos: logs.length,
      nodosAfectados: nodosUnicos,
      logs: logs.map((l) => ({
        id:              l.id,
        tipo:            l.tipo,
        mensaje:         l.mensaje,
        ipOrigen:        l.ipOrigen ?? null,
        ipDestino:       l.ipDestino ?? null,
        archivoAfectado: l.archivoAfectado ?? null,
        hostname:        l.hostname,
        timestamp:       l.timestamp,
      })),
    };
  }

  async getTodos(): Promise<object> {
    const logs = await this.logsRepo.find({ order: { timestamp: 'ASC' } });
    return {
      total: logs.length,
      logs: logs.map((l) => ({
        id:              l.id,
        tipo:            l.tipo,
        mensaje:         l.mensaje,
        ipOrigen:        l.ipOrigen ?? null,
        ipDestino:       l.ipDestino ?? null,
        archivoAfectado: l.archivoAfectado ?? null,
        hostname:        l.hostname,
        sede:            l.sede,
        timestamp:       l.timestamp,
      })),
    };
  }

  async getLogsC2(): Promise<object> {
    const logs = await this.logsRepo.find({
      where: { tipo: TipoLogForense.CONEXION_C2 },
      order: { timestamp: 'DESC' },
    });
    return { total: logs.length, logs };
  }
}
