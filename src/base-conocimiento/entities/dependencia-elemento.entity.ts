import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ElementoMonitoreado } from './elemento-monitoreado.entity';

@Entity('dependencias_elemento')
export class DependenciaElemento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'nvarchar', length: 255 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 100 })
  tipo!: string;

  @Column({ type: 'nvarchar', length: 255 })
  accion!: string;

  @ManyToOne(() => ElementoMonitoreado, (elemento) => elemento.dependencias, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'elementoId' })
  elemento!: ElementoMonitoreado;
}
