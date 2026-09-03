import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DependenciaElemento } from './dependencia-elemento.entity';

export type TipoElemento =
  | 'Workflow'
  | 'Tabla'
  | 'Sesión'
  | 'Query'
  | 'Objeto'
  | 'Otro';

export const CRITERIOS_MONITOREO = [
  'ESTADO_FINAL',
  'DURACION',
  'REGISTROS',
  'CONSULTA_SQL',
] as const;

export type CriterioMonitoreo = (typeof CRITERIOS_MONITOREO)[number];

@Entity('elementos_monitoreados')
export class ElementoMonitoreado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'nvarchar', length: 255 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 50 })
  tipo!: TipoElemento;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  esquemaDWH!: string | null;

  @Column({ type: 'int', nullable: true })
  registrosEsperados!: number | null;

  @Column({ type: 'simple-json' })
  columnasAgrupacion!: string[];

  @Column({ type: 'float', default: 0 })
  promedioHistorico!: number;

  @Column({ type: 'int', nullable: true })
  duracionMaximaManual!: number | null;

  @Column({ type: 'nvarchar', length: 'MAX' })
  queRevisa!: string;

  @Column({ type: 'simple-json', default: '[]' })
  criteriosMonitoreo!: CriterioMonitoreo[];

  @Column({ type: 'nvarchar', length: 255, default: 'Automático' })
  frecuenciaRevision!: string;

  @Column({ type: 'bit', default: true })
  activo!: boolean;

  @OneToMany(() => DependenciaElemento, (dependencia) => dependencia.elemento, {
    cascade: true,
    eager: true,
    orphanedRowAction: 'delete',
  })
  dependencias!: DependenciaElemento[];

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  consultaValidacion!: string | null;

  // Hora esperada de arranque. La vigilancia continúa hasta recibir un estado terminal.
  @Column({ type: 'nvarchar', length: 5, nullable: true })
  horaInicioEjecucion!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  conexionValidacionId!: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  destinatariosAlerta!: string[];

  @CreateDateColumn({ type: 'datetime2' })
  creadoEn!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  actualizadoEn!: Date;
}
