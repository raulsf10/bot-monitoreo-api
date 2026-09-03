export type DescripcionEstado =
  | 'Exitoso'
  | 'Fallido'
  | 'En ejecución'
  | 'Abortado'
  | 'Suspendido';

export interface EstadoWorkflow {
  areaAsunto: string;
  nombreWorkflow: string;
  idEjecucion: number;
  fechaInicio: Date;
  fechaFin: Date | null;
  codigoEstado: number;
  descripcionEstado: DescripcionEstado;
  codigoError: number | null;
  mensajeError: string | null;
  progresoPorcentaje: number;
  dependencias: string[];
}

export interface TareaWorkflow {
  areaAsunto: string;
  nombreWorkflow: string;
  nombreInstancia: string;
  tipoTarea: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  codigoEstado: number;
  codigoError: number | null;
  mensajeError: string | null;
  filasOrigen: number;
  filasCargadas: number;
  filasRechazadas: number;
}

export interface HistorialEjecucion {
  idEjecucion: number;
  fechaInicio: Date;
  fechaFin: Date;
  duracionMinutos: number;
  codigoEstado: number;
  descripcionEstado: string;
  filasTotal: number;
}

export interface ConfiguracionPlataforma {
  version: string;
  jvmHeap: string;
  limiteSO: string;
  tamanoPaqueteRed: number;
  rangoBloqueDTM: string;
  rangoBufferDTM: string;
}

export interface ReglaWorkflowCritico {
  nombreWorkflow: string;
  limiteSLA: string;
  volumenMinimo: number | null;
  descripcion: string;
}

export interface ReglaTablaCritica {
  nombreTabla: string;
  esquemaDWH: string;
  registrosEsperados: number | null;
  descripcion: string;
}

export interface MensajeChat {
  id: string;
  rol: 'user' | 'model';
  contenido: string;
  timestamp: Date;
  esCasoPrueba: boolean;
  nombreCasoPrueba: string | null;
}

export interface HistorialMensaje {
  rol: 'user' | 'model';
  contenido: string;
}

export interface CasoPrueba {
  id: string;
  nombre: string;
  categoria:
    | 'Excepción Lunes'
    | 'Alerta Martes'
    | 'Base de Datos'
    | 'Seguridad'
    | 'Impacto Cascada';
  descripcion: string;
  diaSemana: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  horaSimulada: string;
  prompt: string;
}

export interface ReporteSimulacionRiesgo {
  resumen: string;
  nivelRiesgo: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  elementosAfectados: {
    nombre: string;
    tipo: 'workflow' | 'table';
    limiteSLA: string;
    estadoActual: string;
    razon: string;
  }[];
  impactoTecnico: string;
  accionOperadorRequerida: string;
}

export interface UsuarioAutenticado {
  nombre: string;
  correo: string;
  departamento: string;
  usuario: string;
}
