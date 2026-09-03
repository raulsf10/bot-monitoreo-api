import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('servidores_monitoreados')
export class ServidorMonitoreado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'nvarchar', length: 100, unique: true })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 255 })
  host!: string;

  @Column({ type: 'int', nullable: true })
  puerto!: number | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'bit', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'datetime2' })
  creadoEn!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  actualizadoEn!: Date;
}
