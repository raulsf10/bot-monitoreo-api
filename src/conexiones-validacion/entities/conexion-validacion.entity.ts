import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TipoConexionValidacion = 'SQLSERVER' | 'ORACLE';

@Entity('conexiones_validacion')
export class ConexionValidacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'nvarchar', length: 100, unique: true })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 20 })
  tipo!: TipoConexionValidacion;

  @Column({ type: 'nvarchar', length: 255 })
  host!: string;

  @Column({ type: 'int' })
  puerto!: number;

  @Column({ type: 'nvarchar', length: 255 })
  baseDatos!: string;

  @Column({ type: 'nvarchar', length: 255 })
  usuario!: string;

  @Column({ type: 'nvarchar', length: 'MAX', select: false })
  contrasenaCifrada!: string;

  @Column({ type: 'bit', default: false })
  encriptar!: boolean;

  @Column({ type: 'bit', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'datetime2' })
  creadoEn!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  actualizadoEn!: Date;
}
