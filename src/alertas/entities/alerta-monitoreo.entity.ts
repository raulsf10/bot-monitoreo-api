import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type SeveridadAlerta = 'CRITICA' | 'ALTA' | 'MEDIA';

@Entity('alertas_monitoreo')
@Index(['leidaEn', 'creadaEn'])
export class AlertaMonitoreo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  elementoId!: string | null;

  @Column({ type: 'nvarchar', length: 255 })
  nombreElemento!: string;

  @Column({ type: 'nvarchar', length: 50 })
  tipo!: string;

  @Column({ type: 'nvarchar', length: 20 })
  severidad!: SeveridadAlerta;

  @Column({ type: 'nvarchar', length: 'MAX' })
  mensaje!: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  claveDedupe!: string | null;

  @Column({ type: 'datetime2', nullable: true })
  leidaEn!: Date | null;

  @Column({ type: 'datetime2', nullable: true })
  resueltaEn!: Date | null;

  @CreateDateColumn({ type: 'datetime2' })
  creadaEn!: Date;
}
