import { DescripcionEstado } from '../../shared/interfaces/modelos';

export class EstadoWorkflowDto {
  areaAsunto!: string;
  nombreWorkflow!: string;
  idEjecucion!: number;
  fechaInicio!: Date;
  fechaFin!: Date | null;
  codigoEstado!: number;
  descripcionEstado!: DescripcionEstado;
  codigoError!: number | null;
  mensajeError!: string | null;
  progresoPorcentaje!: number;
  dependencias!: string[];
}
