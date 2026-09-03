export class TareaWorkflowDto {
  areaAsunto!: string;
  nombreWorkflow!: string;
  nombreInstancia!: string;
  tipoTarea!: string;
  fechaInicio!: Date;
  fechaFin!: Date | null;
  codigoEstado!: number;
  codigoError!: number | null;
  mensajeError!: string | null;
  filasOrigen!: number;
  filasCargadas!: number;
  filasRechazadas!: number;
}
