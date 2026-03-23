import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoLogForense {
  CONEXION_ENTRANTE    = 'ALERT',
  COMANDO_EXEC         = 'EXEC',
  CIFRADO_ARCHIVO      = 'CIPHER',
  CONEXION_C2          = 'C2',
  MOVIMIENTO_LATERAL   = 'MOVE',
  ESCALADA_PRIVILEGIOS = 'PRIV',
}

@Entity('logs_forenses')
export class LogForense {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: TipoLogForense })
  tipo!: TipoLogForense;

  @Column()
  mensaje!: string;

  @Column({ nullable: true })
  ipOrigen!: string;

  @Column({ nullable: true })
  ipDestino!: string;

  @Column({ nullable: true })
  archivoAfectado!: string;

  @Column()
  nodoId!: number;

  @Column()
  hostname!: string;

  @Column()
  sede!: string;

  @CreateDateColumn()
  timestamp!: Date;
}
