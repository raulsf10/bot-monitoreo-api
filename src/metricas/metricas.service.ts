import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { InformaticaService } from "../informatica/informatica.service";
import { ConfiguracionPlataforma } from "../shared/interfaces/modelos";

export const CONFIG_PLATAFORMA_INFORMATICA: ConfiguracionPlataforma = {
  version: "10.5",
  jvmHeap: "1024MB",
  limiteSO: "32,000 archivos abiertos",
  tamanoPaqueteRed: 32767,
  rangoBloqueDTM: "1MB - 2MB",
  rangoBufferDTM: "256MB - 1GB",
};

export interface MetricasIpc {
  informatica: ConfiguracionPlataforma;
  repositorio: Record<string, unknown>;
  sqlServer: Record<string, unknown>;
}

@Injectable()
export class MetricasService {
  private readonly logger = new Logger(MetricasService.name);

  constructor(
    private readonly informaticaService: InformaticaService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  obtenerConfiguracionInformatica(): ConfiguracionPlataforma {
    return CONFIG_PLATAFORMA_INFORMATICA;
  }

  async obtenerMetricasIpc(): Promise<MetricasIpc> {
    const [repositorio, sqlServer] = await Promise.all([
      this.obtenerMetricasRepositorio(),
      this.obtenerMetricasSqlServer(),
    ]);

    return {
      informatica: CONFIG_PLATAFORMA_INFORMATICA,
      repositorio,
      sqlServer,
    };
  }

  private async obtenerMetricasRepositorio(): Promise<Record<string, unknown>> {
    if (!this.informaticaService.disponible) {
      return { disponible: false };
    }

    const consulta = `
      SELECT COUNT(*) AS ejecucionesUltimas24Horas,
             MAX(START_TIME) AS ultimaEjecucion
      FROM REP_WFLOW_RUN
      WHERE START_TIME >= DATEADD(hour, -24, GETDATE())`;

    try {
      const filas =
        await this.informaticaService.ejecutarConsulta<Record<string, unknown>>(
          consulta,
        );
      return { disponible: true, ...(filas[0] ?? {}) };
    } catch (error) {
      this.logger.warn(
        `Métricas repositorio Informatica no disponibles: ${(error as Error).message}`,
      );
      return { disponible: false };
    }
  }

  private async obtenerMetricasSqlServer(): Promise<Record<string, unknown>> {
    try {
      if (!this.dataSource.isInitialized) {
        return { disponible: false };
      }
      const resultado = await this.dataSource.query(
        "SELECT @@VERSION AS version, DB_NAME() AS base",
      );
      const fila = Array.isArray(resultado) ? resultado[0] : {};
      return { disponible: true, ...fila };
    } catch (error) {
      this.logger.warn(
        `Métricas SQL Server no disponibles: ${(error as Error).message}`,
      );
      return { disponible: false };
    }
  }
}
