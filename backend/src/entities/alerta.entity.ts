import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Nodo } from './nodo.entity';

export enum TipoAlerta {
  CIFRADO_ARCHIVOS   = 'cifrado_archivos',
  TRAFICO_C2         = 'trafico_c2',
  MOVIMIENTO_LATERAL = 'movimiento_lateral',
  SCRIPT_MALICIOSO   = 'script_malicioso',
  ANOMALIA_RED       = 'anomalia_red',
}

export enum SeveridadAlerta {
  BAJA    = 'baja',
  MEDIA   = 'media',
  ALTA    = 'alta',
  CRITICA = 'critica',
}

@Entity('alertas')
export class Alerta {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: TipoAlerta })
  tipo!: TipoAlerta;

  @Column({ type: 'enum', enum: SeveridadAlerta, default: SeveridadAlerta.MEDIA })
  severidad!: SeveridadAlerta;

  @Column()
  descripcion!: string;

  @Column({ default: false })
  atendida!: boolean;

  @ManyToOne(() => Nodo, (nodo) => nodo.alertas, { eager: true })
  nodo!: Nodo;

  @CreateDateColumn()
  creadoEn!: Date;
}
