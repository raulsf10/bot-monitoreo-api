import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseConocimientoService } from "./base-conocimiento/base-conocimiento.service";
import { MetricasService } from "./metricas/metricas.service";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly baseConocimiento: BaseConocimientoService,
    private readonly metricas: MetricasService,
  ) {}

  async obtenerConfiguracion(): Promise<Record<string, unknown>> {
    const plataformaConfig = this.metricas.obtenerConfiguracionInformatica();

    return {
      estado: "ok",
      tieneApiKey: Boolean(this.config.get<string>("gemini.apiKey")),
      versionPowerCenter: plataformaConfig.version,
      baseConocimiento: {
        plataformaConfig,
        servicios: this.estadoServicios(),
        workflows: await this.listarWorkflows(),
      },
    };
  }

  private async listarWorkflows(): Promise<unknown[]> {
    try {
      return await this.baseConocimiento.obtenerPorTipo("Workflow");
    } catch (error) {
      this.logger.warn(
        `No fue posible leer los workflows de la base de conocimiento: ${(error as Error).message}`,
      );
      return [];
    }
  }

  private estadoServicios(): Record<string, boolean> {
    return {
      repositorioInformatica: Boolean(
        this.config.get<string>("informatica.host"),
      ),
      sqlServer: Boolean(this.config.get<string>("sqlserver.host")),
      ldap: Boolean(this.config.get<string>("ldap.url")),
      smtp: Boolean(this.config.get<string>("smtp.host")),
      gemini: Boolean(this.config.get<string>("gemini.apiKey")),
    };
  }
}
