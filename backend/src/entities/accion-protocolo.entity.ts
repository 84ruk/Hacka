import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum FaseProtocolo {
  DETECCION    = 'deteccion',
  CONTENCION   = 'contencion',
  ERRADICACION = 'erradicacion',
  RECUPERACION = 'recuperacion',
}

export enum EstadoAccion {
  PENDIENTE  = 'pendiente',
  EN_PROCESO = 'en_proceso',
  COMPLETADA = 'completada',
  FALLIDA    = 'fallida',
}

@Entity('acciones_protocolo')
export class AccionProtocolo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: FaseProtocolo })
  fase!: FaseProtocolo;

  @Column()
  descripcion!: string;

  @Column({ nullable: true })
  nodoAfectadoId!: number;

  @Column({ type: 'enum', enum: EstadoAccion, default: EstadoAccion.PENDIENTE })
  estado!: EstadoAccion;

  @Column({ nullable: true })
  ejecutadoPor!: string;

  @Column({ nullable: true })
  notas!: string;

  @CreateDateColumn()
  creadoEn!: Date;

  @Column({ nullable: true })
  completadoEn!: Date;
}
