import { Injectable } from "@nestjs/common";
import { InformaticaService } from "../informatica/informatica.service";
import {
  aEnteroSeguro,
  calcularDuracionMinutos,
  calcularProgreso,
  mapearEstado,
  normalizarFecha,
} from "../shared/utils/formateadores";
import { EstadoWorkflowDto } from "./dto/estado-workflow.dto";
import { HistorialEjecucionDto } from "./dto/historial-ejecucion.dto";
import { TareaWorkflowDto } from "./dto/tarea-workflow.dto";

interface FilaEstado {
  areaAsunto: string;
  nombreWorkflow: string;
  idEjecucion: number;
  fechaInicio: unknown;
  fechaFin: unknown;
  codigoEstado: number;
  codigoError: number | null;
  mensajeError: string | null;
}

interface FilaTarea {
  areaAsunto: string;
  nombreWorkflow: string;
  nombreInstancia: string;
  tipoTarea: string;
  fechaInicio: unknown;
  fechaFin: unknown;
  codigoEstado: number;
  codigoError: number | null;
  mensajeError: string | null;
  filasOrigen: number;
  filasCargadas: number;
  filasRechazadas: number;
}

interface FilaHistorial {
  idEjecucion: number;
  fechaInicio: unknown;
  fechaFin: unknown;
  codigoEstado: number;
  filasTotal: number;
}

export interface WorkflowCatalogo {
  nombreWorkflow: string;
  areaAsunto: string;
  promedioDuracionMinutos: number | null;
  ultimaEjecucion: Date | null;
}

@Injectable()
export class WorkflowsService {
  private catalogoCache: WorkflowCatalogo[] | null = null;
  private catalogoExpiraEn = 0;

  constructor(private readonly informatica: InformaticaService) {}

  async obtenerEstadoWorkflows(fecha?: string): Promise<EstadoWorkflowDto[]> {
    // Sin fecha: usa GETDATE() del servidor SQL para evitar desfase de zona horaria
    const [sql, parametros] = fecha
      ? [
          `SELECT SUBJECT_AREA      AS areaAsunto,
                  WORKFLOW_NAME     AS nombreWorkflow,
                  WORKFLOW_RUN_ID   AS idEjecucion,
                  START_TIME        AS fechaInicio,
                  END_TIME          AS fechaFin,
                  RUN_STATUS_CODE   AS codigoEstado,
                  RUN_ERR_CODE      AS codigoError,
                  RUN_ERR_MSG       AS mensajeError
           FROM REP_WFLOW_RUN
           WHERE START_TIME >= CAST(@fecha AS date)
             AND START_TIME < DATEADD(day, 1, CAST(@fecha AS date))
           ORDER BY START_TIME DESC`,
          { fecha },
        ]
      : [
          `SELECT SUBJECT_AREA      AS areaAsunto,
                  WORKFLOW_NAME     AS nombreWorkflow,
                  WORKFLOW_RUN_ID   AS idEjecucion,
                  START_TIME        AS fechaInicio,
                  END_TIME          AS fechaFin,
                  RUN_STATUS_CODE   AS codigoEstado,
                  RUN_ERR_CODE      AS codigoError,
                  RUN_ERR_MSG       AS mensajeError
           FROM REP_WFLOW_RUN
           WHERE START_TIME >= DATEADD(day, DATEDIFF(day, 0, GETDATE()), 0)
             AND START_TIME < DATEADD(day, DATEDIFF(day, 0, GETDATE()) + 1, 0)
           ORDER BY START_TIME DESC`,
          {},
        ];

    const filas = await this.informatica.ejecutarConsulta<FilaEstado>(
      sql,
      parametros,
    );

    return filas.map((fila) => this.mapearEstado(fila));
  }

  async obtenerCatalogo(): Promise<WorkflowCatalogo[]> {
    if (this.catalogoCache && Date.now() < this.catalogoExpiraEn) {
      return this.catalogoCache;
    }

    const filas = await this.informatica.ejecutarConsulta<WorkflowCatalogo>(
      `WITH catalogo AS (
         SELECT WORKFLOW_NAME,
                MAX(SUBJECT_AREA) AS areaAsunto,
                MAX(START_TIME) AS ultimaEjecucion
         FROM REP_WFLOW_RUN
         WHERE START_TIME >= DATEADD(day, -90, GETDATE())
         GROUP BY WORKFLOW_NAME
       ), duraciones AS (
         SELECT WORKFLOW_NAME,
                AVG(CASE WHEN END_TIME IS NOT NULL
                  THEN CAST(DATEDIFF(second, START_TIME, END_TIME) AS float) / 60.0 END) AS promedioDuracionMinutos
         FROM REP_WFLOW_RUN
         WHERE START_TIME >= DATEADD(day, -15, GETDATE())
         GROUP BY WORKFLOW_NAME
       )
       SELECT c.WORKFLOW_NAME AS nombreWorkflow,
              c.areaAsunto,
              CAST(d.promedioDuracionMinutos AS decimal(10, 2)) AS promedioDuracionMinutos,
              c.ultimaEjecucion
       FROM catalogo c
       LEFT JOIN duraciones d ON d.WORKFLOW_NAME = c.WORKFLOW_NAME
       ORDER BY c.WORKFLOW_NAME`,
    );
    const catalogo = filas.map((fila) => ({
      ...fila,
      promedioDuracionMinutos:
        fila.promedioDuracionMinutos === null
          ? null
          : Number(fila.promedioDuracionMinutos),
      ultimaEjecucion: fila.ultimaEjecucion
        ? new Date(fila.ultimaEjecucion)
        : null,
    }));
    this.catalogoCache = catalogo;
    this.catalogoExpiraEn = Date.now() + 15 * 60_000;
    return catalogo;
  }

  async obtenerHistorial(
    nombre: string,
    dias = 15,
  ): Promise<HistorialEjecucionDto[]> {
    const sql = `
      WITH ejecuciones AS (
        SELECT WORKFLOW_RUN_ID,
               START_TIME,
               END_TIME,
               RUN_STATUS_CODE
        FROM REP_WFLOW_RUN
        WHERE WORKFLOW_NAME = @nombre
          AND START_TIME >= DATEADD(day, -@dias, GETDATE())
      ), registros AS (
        SELECT log.WORKFLOW_RUN_ID,
               SUM(ISNULL(log.SUCCESSFUL_ROWS, 0)) AS filasTotal
        FROM REP_SESS_LOG log
        INNER JOIN ejecuciones r ON r.WORKFLOW_RUN_ID = log.WORKFLOW_RUN_ID
        GROUP BY log.WORKFLOW_RUN_ID
      )
      SELECT r.WORKFLOW_RUN_ID AS idEjecucion,
             r.START_TIME      AS fechaInicio,
             r.END_TIME        AS fechaFin,
             r.RUN_STATUS_CODE AS codigoEstado,
             ISNULL(registros.filasTotal, 0) AS filasTotal
      FROM ejecuciones r
      LEFT JOIN registros ON registros.WORKFLOW_RUN_ID = r.WORKFLOW_RUN_ID
      ORDER BY r.START_TIME DESC`;

    const filas = await this.informatica.ejecutarConsulta<FilaHistorial>(sql, {
      nombre,
      dias,
    });

    return filas.map((fila) => this.mapearHistorial(fila));
  }

  async obtenerTareas(
    nombre: string,
    fechaEjecucion?: string,
  ): Promise<TareaWorkflowDto[]> {
    const fechaConsulta = fechaEjecucion ?? this.fechaHoy();
    const sql = `
      SELECT ti.SUBJECT_AREA    AS areaAsunto,
             ti.WORKFLOW_NAME   AS nombreWorkflow,
             ti.INSTANCE_NAME   AS nombreInstancia,
             ti.TASK_TYPE_NAME  AS tipoTarea,
             ti.START_TIME      AS fechaInicio,
             ti.END_TIME        AS fechaFin,
             ti.RUN_STATUS_CODE AS codigoEstado,
             ti.RUN_ERR_CODE    AS codigoError,
             ti.RUN_ERR_MSG     AS mensajeError,
             ISNULL(tl.FILAS_ORIGEN, 0)     AS filasOrigen,
             ISNULL(tl.FILAS_CARGADAS, 0)   AS filasCargadas,
             ISNULL(tl.FILAS_RECHAZADAS, 0) AS filasRechazadas
      FROM REP_TASK_INST_RUN ti
      LEFT JOIN (
        SELECT WORKFLOW_RUN_ID,
               INSTANCE_ID,
               SUM(ISNULL(SUCCESSFUL_SOURCE_ROWS, 0)) AS FILAS_ORIGEN,
               SUM(ISNULL(SUCCESSFUL_ROWS, 0)) AS FILAS_CARGADAS,
               SUM(ISNULL(FAILED_ROWS, 0)) AS FILAS_RECHAZADAS
        FROM REP_SESS_LOG
        GROUP BY WORKFLOW_RUN_ID, INSTANCE_ID
      ) tl
        ON tl.WORKFLOW_RUN_ID = ti.WORKFLOW_RUN_ID
       AND tl.INSTANCE_ID = ti.INSTANCE_ID
      WHERE ti.WORKFLOW_NAME = @nombre
        AND ti.START_TIME >= CAST(@fecha AS date)
        AND ti.START_TIME < DATEADD(day, 1, CAST(@fecha AS date))
      ORDER BY ti.START_TIME`;

    const filas = await this.informatica.ejecutarConsulta<FilaTarea>(sql, {
      nombre,
      fecha: fechaConsulta,
    });

    return filas.map((fila) => this.mapearTarea(fila));
  }

  private mapearEstado(fila: FilaEstado): EstadoWorkflowDto {
    return {
      areaAsunto: fila.areaAsunto,
      nombreWorkflow: fila.nombreWorkflow,
      idEjecucion: aEnteroSeguro(fila.idEjecucion),
      fechaInicio: normalizarFecha(fila.fechaInicio) ?? new Date(0),
      fechaFin: normalizarFecha(fila.fechaFin),
      codigoEstado: aEnteroSeguro(fila.codigoEstado),
      descripcionEstado: mapearEstado(aEnteroSeguro(fila.codigoEstado)),
      codigoError: fila.codigoError ?? null,
      mensajeError: fila.mensajeError ?? null,
      progresoPorcentaje: calcularProgreso(aEnteroSeguro(fila.codigoEstado)),
      dependencias: [],
    };
  }

  private mapearTarea(fila: FilaTarea): TareaWorkflowDto {
    return {
      areaAsunto: fila.areaAsunto,
      nombreWorkflow: fila.nombreWorkflow,
      nombreInstancia: fila.nombreInstancia,
      tipoTarea: fila.tipoTarea,
      fechaInicio: normalizarFecha(fila.fechaInicio) ?? new Date(0),
      fechaFin: normalizarFecha(fila.fechaFin),
      codigoEstado: aEnteroSeguro(fila.codigoEstado),
      codigoError: fila.codigoError ?? null,
      mensajeError: fila.mensajeError ?? null,
      filasOrigen: aEnteroSeguro(fila.filasOrigen),
      filasCargadas: aEnteroSeguro(fila.filasCargadas),
      filasRechazadas: aEnteroSeguro(fila.filasRechazadas),
    };
  }

  private mapearHistorial(fila: FilaHistorial): HistorialEjecucionDto {
    const fechaInicio = normalizarFecha(fila.fechaInicio) ?? new Date(0);
    const fechaFin = normalizarFecha(fila.fechaFin) ?? fechaInicio;
    const codigoEstado = aEnteroSeguro(fila.codigoEstado);
    return {
      idEjecucion: aEnteroSeguro(fila.idEjecucion),
      fechaInicio,
      fechaFin,
      duracionMinutos: calcularDuracionMinutos(fechaInicio, fechaFin),
      codigoEstado,
      descripcionEstado: mapearEstado(codigoEstado),
      filasTotal: aEnteroSeguro(fila.filasTotal),
    };
  }

  private fechaHoy(): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    const d = String(hoy.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}
