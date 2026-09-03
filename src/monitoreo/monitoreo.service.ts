import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AlertasService } from "../alertas/alertas.service";
import {
  CriterioMonitoreo,
  ElementoMonitoreado,
} from "../base-conocimiento/entities/elemento-monitoreado.entity";
import { ConexionesValidacionService } from "../conexiones-validacion/conexiones-validacion.service";
import { InformaticaService } from "../informatica/informatica.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { ServidoresService } from "../servidores/servidores.service";
import { esEstadoExitoso, mapearEstado } from "../shared/utils/formateadores";

interface FilaEjecucion {
  idEjecucion: number;
  codigoEstado: number;
  mensajeError: string | null;
  fechaInicio: Date;
  fechaFin: Date | null;
  duracionMinutos: number;
}

interface FilaDependenciaWorkflow {
  codigoEstado: number;
}

@Injectable()
export class MonitoreoService {
  private readonly logger = new Logger(MonitoreoService.name);
  private readonly ultimaRevision = new Map<string, number>();
  private readonly ciclosFinalizados = new Set<string>();
  private ultimaRevisionServidores = 0;

  constructor(
    @InjectRepository(ElementoMonitoreado)
    private readonly elementoRepo: Repository<ElementoMonitoreado>,
    private readonly informatica: InformaticaService,
    private readonly conexiones: ConexionesValidacionService,
    private readonly alertas: AlertasService,
    private readonly notificaciones: NotificacionesService,
    private readonly servidores: ServidoresService,
    private readonly config: ConfigService,
  ) {}

  @Interval(30_000)
  async evaluarReglas(): Promise<void> {
    await this.evaluarServidores();
    if (!this.informatica.disponible) return;
    const reglas = await this.elementoRepo
      .find({ where: { activo: true } })
      .catch((error) => {
        this.logger.warn(
          `No se pudieron leer las reglas activas: ${(error as Error).message}`,
        );
        return [];
      });

    for (const regla of reglas) {
      if (!this.debeRevisarAhora(regla)) continue;
      await this.evaluarRegla(regla);
    }
  }

  private async evaluarServidores(): Promise<void> {
    if (Date.now() - this.ultimaRevisionServidores < 300_000) return;
    this.ultimaRevisionServidores = Date.now();
    const servidores = await this.servidores.obtenerActivos();
    for (const servidor of servidores) {
      const resultado = await this.servidores.probar(servidor);
      const clave = `SERVIDOR:${servidor.id}:NO_DISPONIBLE`;
      if (resultado.disponible) {
        await this.alertas.resolverPorClave(clave);
        continue;
      }
      const alerta = await this.alertas.registrarSiNueva({
        nombreElemento: servidor.nombre,
        tipo: "SERVIDOR_NO_DISPONIBLE",
        severidad: "CRITICA",
        mensaje: `El servidor ${servidor.host}${servidor.puerto ? `:${servidor.puerto}` : ""} no responde a ping ni TCP.`,
        claveDedupe: clave,
      });
      if (alerta) {
        await this.notificaciones.notificarAlerta(this.destinatarios(), {
          tipoAlerta: "SERVIDOR_NO_DISPONIBLE",
          nombreElemento: servidor.nombre,
          tipoElemento: "Servidor",
          horaEvento: this.horaActual(),
          mensajeError: null,
          detalleAdicional: alerta.mensaje,
        });
      }
    }
  }

  private async evaluarRegla(regla: ElementoMonitoreado): Promise<void> {
    try {
      if (regla.tipo === "Workflow") {
        await this.evaluarWorkflow(regla);
      } else if (regla.consultaValidacion && this.inicioEsperado(regla)) {
        await this.evaluarConsultaValidacion(regla, undefined);
      }
    } catch (error) {
      this.logger.warn(
        `Error al evaluar "${regla.nombre}": ${(error as Error).message}`,
      );
    }
  }

  private async evaluarWorkflow(regla: ElementoMonitoreado): Promise<void> {
    const inicioEsperado = this.inicioEsperado(regla);
    if (!inicioEsperado) return;
    const criterio = this.criterios(regla);
    const inicioClave = inicioEsperado.toISOString().slice(0, 16);
    const claveCiclo = `${regla.id}:${inicioClave}`;
    if (this.ciclosFinalizados.has(claveCiclo)) return;
    const filas = await this.informatica.ejecutarConsulta<FilaEjecucion>(
      `SELECT TOP 1
         WORKFLOW_RUN_ID AS idEjecucion,
         RUN_STATUS_CODE AS codigoEstado,
         RUN_ERR_MSG AS mensajeError,
         START_TIME AS fechaInicio,
         END_TIME AS fechaFin,
         DATEDIFF(minute, START_TIME, ISNULL(END_TIME, GETDATE())) AS duracionMinutos
       FROM REP_WFLOW_RUN
       WHERE WORKFLOW_NAME = @nombre AND START_TIME >= @inicioEsperado
       ORDER BY START_TIME DESC`,
      { nombre: regla.nombre, inicioEsperado },
    );

    const claveNoInicio = `${regla.id}:NO_INICIADO:${inicioClave}`;
    if (!filas.length) {
      if (criterio.includes("ESTADO_FINAL")) {
        await this.emitir(
          regla,
          "NO_INICIADO",
          "CRITICA",
          `El workflow no inició a la hora programada (${regla.horaInicioEjecucion}).`,
          claveNoInicio,
        );
      }
      return;
    }

    await this.alertas.resolverPorClave(claveNoInicio);
    const ejecucion = filas[0];
    const sufijo = `${ejecucion.idEjecucion}`;
    const limite = this.limiteDuracion(regla);

    await this.evaluarDependenciasWorkflow(regla, ejecucion);

    const finalizado = ejecucion.fechaFin !== null;
    const exitoso = finalizado && esEstadoExitoso(ejecucion.codigoEstado);
    const estado = mapearEstado(ejecucion.codigoEstado);

    if (criterio.includes("ESTADO_FINAL") && finalizado && !exitoso) {
      const tipo = this.tipoAlertaEstado(estado);
      await this.emitir(
        regla,
        tipo,
        "CRITICA",
        ejecucion.mensajeError || `El workflow finalizó en estado ${estado}.`,
        `${regla.id}:${tipo}:${sufijo}`,
      );
    }

    if (
      criterio.includes("DURACION") &&
      limite &&
      !finalizado &&
      ejecucion.duracionMinutos > limite
    ) {
      await this.emitir(
        regla,
        "SLA_EN_RIESGO",
        "ALTA",
        `Sigue en ejecución ${ejecucion.duracionMinutos} min; duración esperada: ${limite} min.`,
        `${regla.id}:EN_RIESGO:${sufijo}`,
      );
    }

    if (
      criterio.includes("DURACION") &&
      limite &&
      exitoso &&
      ejecucion.duracionMinutos > limite
    ) {
      await this.emitir(
        regla,
        "SLA_EXCEDIDO",
        "ALTA",
        `Finalizó en ${ejecucion.duracionMinutos} min; duración esperada: ${limite} min.`,
        `${regla.id}:SLA:${sufijo}`,
      );
    }

    if (finalizado) {
      await this.alertas.resolverPorClave(`${regla.id}:EN_RIESGO:${sufijo}`);
    }

    if (exitoso && criterio.includes("REGISTROS")) {
      await this.evaluarRegistrosWorkflow(regla, ejecucion.idEjecucion);
    }
    if (exitoso && criterio.includes("CONSULTA_SQL")) {
      await this.evaluarConsultaValidacion(regla, ejecucion.idEjecucion);
    }
    if (finalizado) {
      this.ciclosFinalizados.add(claveCiclo);
      this.limpiarCiclosAnteriores();
    }
  }

  private async evaluarRegistrosWorkflow(
    regla: ElementoMonitoreado,
    idEjecucion: number,
  ): Promise<void> {
    if (!regla.registrosEsperados) return;
    const filas = await this.informatica.ejecutarConsulta<{ filas: number }>(
      `SELECT ISNULL(SUM(ISNULL(SUCCESSFUL_ROWS, 0)), 0) AS filas
       FROM REP_SESS_LOG
       WHERE WORKFLOW_RUN_ID = @idEjecucion`,
      { idEjecucion },
    );
    const filasAfectadas = Number(filas[0]?.filas ?? 0);
    if (filasAfectadas < regla.registrosEsperados) {
      await this.emitir(
        regla,
        "VOLUMEN_BAJO",
        "CRITICA",
        `Filas afectadas: ${filasAfectadas.toLocaleString("es-MX")}; mínimo esperado: ${regla.registrosEsperados.toLocaleString("es-MX")}.`,
        `${regla.id}:VOLUMEN:${idEjecucion}`,
      );
    }
  }

  private async evaluarDependenciasWorkflow(
    regla: ElementoMonitoreado,
    ejecucion: FilaEjecucion,
  ): Promise<void> {
    const dependencias = regla.dependencias.filter(
      (dependencia) => dependencia.tipo === "Workflow",
    );

    for (const dependencia of dependencias) {
      const clave = `${regla.id}:DEPENDENCIA:${dependencia.nombre}:${ejecucion.idEjecucion}`;
      const filas =
        await this.informatica.ejecutarConsulta<FilaDependenciaWorkflow>(
          `SELECT TOP 1 RUN_STATUS_CODE AS codigoEstado
           FROM REP_WFLOW_RUN
           WHERE WORKFLOW_NAME = @nombre
             AND END_TIME IS NOT NULL
             AND END_TIME <= @inicioWorkflow
             AND START_TIME >= DATEADD(hour, -24, @inicioWorkflow)
           ORDER BY END_TIME DESC`,
          {
            nombre: dependencia.nombre,
            inicioWorkflow: ejecucion.fechaInicio,
          },
        );

      const estado = filas[0]
        ? mapearEstado(Number(filas[0].codigoEstado))
        : null;
      if (estado && esEstadoExitoso(Number(filas[0].codigoEstado))) {
        await this.alertas.resolverPorClave(clave);
        continue;
      }

      const mensaje = estado
        ? `La dependencia ${dependencia.nombre} finalizó con estado ${estado} antes del inicio de este workflow.`
        : `La dependencia ${dependencia.nombre} no registró una ejecución exitosa durante las 24 horas previas al inicio de este workflow.`;
      await this.emitir(
        regla,
        "DEPENDENCIA_NO_CUMPLIDA",
        "CRITICA",
        mensaje,
        clave,
      );
    }
  }

  private async evaluarConsultaValidacion(
    regla: ElementoMonitoreado,
    idEjecucion?: number,
  ): Promise<void> {
    if (!regla.consultaValidacion) return;
    const filas = regla.conexionValidacionId
      ? await this.conexiones.ejecutarConsulta<Record<string, unknown>>(
          regla.conexionValidacionId,
          regla.consultaValidacion,
        )
      : await this.informatica.ejecutarConsulta<Record<string, unknown>>(
          regla.consultaValidacion,
        );
    const valor = Number(Object.values(filas[0] ?? {})[0]);
    if (!Number.isFinite(valor)) return;

    const claveBase = `${regla.id}:CONSULTA:${idEjecucion ?? this.fechaOperacion()}`;
    if (regla.registrosEsperados && valor < regla.registrosEsperados) {
      await this.emitir(
        regla,
        "CONSULTA_CRITICA",
        "CRITICA",
        `La consulta de validación devolvió ${valor.toLocaleString("es-MX")}; mínimo esperado: ${regla.registrosEsperados.toLocaleString("es-MX")}.`,
        claveBase,
      );
    } else if (
      regla.promedioHistorico > 0 &&
      valor < regla.promedioHistorico * 0.8
    ) {
      await this.emitir(
        regla,
        "TENDENCIA_BAJA",
        "MEDIA",
        `La consulta devolvió ${valor.toLocaleString("es-MX")}; promedio histórico: ${Math.round(regla.promedioHistorico).toLocaleString("es-MX")}.`,
        claveBase,
      );
    }
  }

  private async emitir(
    regla: ElementoMonitoreado,
    tipo: string,
    severidad: "CRITICA" | "ALTA" | "MEDIA",
    mensaje: string,
    claveDedupe: string,
  ): Promise<void> {
    const alerta = await this.alertas.registrarSiNueva({
      elementoId: regla.id,
      nombreElemento: regla.nombre,
      tipo,
      severidad,
      mensaje,
      claveDedupe,
    });
    if (!alerta) return;

    const destinatarios = this.destinatarios(regla);
    await this.notificaciones.notificarAlerta(destinatarios, {
      tipoAlerta: this.tipoCorreo(tipo),
      nombreElemento: regla.nombre,
      tipoElemento:
        tipo.includes("CONSULTA") || tipo === "TENDENCIA_BAJA"
          ? "Validación"
          : "Workflow",
      horaEvento: this.horaActual(),
      mensajeError: this.esErrorWorkflow(tipo) ? mensaje : null,
      detalleAdicional: this.esErrorWorkflow(tipo) ? undefined : mensaje,
    });
  }

  private inicioEsperado(regla: ElementoMonitoreado): Date | null {
    if (!regla.horaInicioEjecucion)
      return new Date(new Date().setHours(0, 0, 0, 0));
    const [hora, minuto] = regla.horaInicioEjecucion.split(":").map(Number);
    if (!Number.isInteger(hora) || !Number.isInteger(minuto)) return null;
    const ahora = new Date();
    const inicio = new Date(ahora);
    inicio.setHours(hora, minuto, 0, 0);
    if (ahora < inicio) inicio.setDate(inicio.getDate() - 1);
    return inicio;
  }

  private debeRevisarAhora(regla: ElementoMonitoreado): boolean {
    const inicio = this.inicioEsperado(regla);
    if (!inicio || Date.now() < inicio.getTime()) return false;
    const intervalo = this.intervaloRegla(regla);
    const ultima = this.ultimaRevision.get(regla.id) ?? 0;
    if (Date.now() - ultima < intervalo) return false;
    this.ultimaRevision.set(regla.id, Date.now());
    return true;
  }

  private intervaloRegla(regla: ElementoMonitoreado): number {
    const minutos = this.limiteDuracion(regla) ?? 30;
    if (minutos <= 10) return 30_000;
    if (minutos <= 60) return 60_000;
    if (minutos <= 180) return 180_000;
    return 300_000;
  }

  private limiteDuracion(regla: ElementoMonitoreado): number | null {
    const valor = regla.duracionMaximaManual ?? regla.promedioHistorico;
    return valor > 0 ? Math.ceil(valor) : null;
  }

  private criterios(regla: ElementoMonitoreado): CriterioMonitoreo[] {
    return regla.criteriosMonitoreo?.length
      ? regla.criteriosMonitoreo
      : ["ESTADO_FINAL", "DURACION"];
  }

  private destinatarios(
    regla?: Pick<ElementoMonitoreado, "destinatariosAlerta">,
  ): string[] {
    if (regla?.destinatariosAlerta?.length) return regla.destinatariosAlerta;
    return (
      this.config.get<string>("servidor.alertaDestinatariosDefault") ?? ""
    )
      .split(",")
      .map((correo) => correo.trim())
      .filter(Boolean);
  }

  private fechaOperacion(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private tipoAlertaEstado(estado: string): string {
    if (estado === "Abortado") return "WORKFLOW_ABORTADO";
    if (estado === "Suspendido") return "WORKFLOW_SUSPENDIDO";
    return "WORKFLOW_FALLIDO";
  }

  private tipoCorreo(tipo: string) {
    if (tipo === "NO_INICIADO") return "WORKFLOW_NO_INICIADO" as const;
    if (tipo === "WORKFLOW_ABORTADO") return "WORKFLOW_ABORTADO" as const;
    if (tipo === "WORKFLOW_SUSPENDIDO") return "WORKFLOW_SUSPENDIDO" as const;
    if (tipo === "WORKFLOW_FALLIDO") return "WORKFLOW_FALLIDO" as const;
    if (tipo === "DEPENDENCIA_NO_CUMPLIDA") {
      return "DEPENDENCIA_NO_CUMPLIDA" as const;
    }
    if (tipo === "SLA_EN_RIESGO") return "SLA_EN_RIESGO" as const;
    if (tipo === "SLA_EXCEDIDO") return "SLA_EXCEDIDO" as const;
    if (tipo.includes("VOLUMEN")) return "ANOMALIA_VOLUMETRICA" as const;
    return "VALIDACION_SQL" as const;
  }

  private esErrorWorkflow(tipo: string): boolean {
    return (
      tipo === "WORKFLOW_FALLIDO" ||
      tipo === "WORKFLOW_ABORTADO" ||
      tipo === "WORKFLOW_SUSPENDIDO"
    );
  }

  private horaActual(): string {
    return new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  private limpiarCiclosAnteriores(): void {
    if (this.ciclosFinalizados.size < 200) return;
    this.ciclosFinalizados.clear();
  }
}
