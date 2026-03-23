import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Alerta } from './alerta.entity';

export enum EstadoNodo {
  NORMAL       = 'normal',
  SOSPECHOSO   = 'sospechoso',
  COMPROMETIDO = 'comprometido',
  CONTENIDO    = 'contenido',
  RECUPERANDO  = 'recuperando',
  RECUPERADO   = 'recuperado',
}

export enum TipoNodo {
  ESTACION_TRABAJO = 'estacion_trabajo',
  SERVIDOR         = 'servidor',
  DISPOSITIVO_RED  = 'dispositivo_red',
  SOPORTE          = 'soporte',
}

@Entity('nodos')
export class Nodo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  hostname!: string;

  @Column()
  ip!: string;

  @Column()
  sede!: string;

  @Column({ type: 'enum', enum: TipoNodo, default: TipoNodo.ESTACION_TRABAJO })
  tipo!: TipoNodo;

  @Column({ type: 'enum', enum: EstadoNodo, default: EstadoNodo.NORMAL })
  estado!: EstadoNodo;

  @Column({ default: false })
  aislado!: boolean;

  @Column({ default: 0 })
  scoreRiesgo!: number;

  @Column({ nullable: true })
  ultimaActividad!: Date;

  @Column({ nullable: true })
  ultimaProteccion!: Date;

  @Column({ nullable: true })
  ultimoBackup!: Date;

  @Column({ default: false })
  backupVerificado!: boolean;

  @CreateDateColumn()
  creadoEn!: Date;

  @OneToMany(() => Alerta, (alerta) => alerta.nodo)
  alertas!: Alerta[];
}
