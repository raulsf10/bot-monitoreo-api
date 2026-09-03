import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as sql from "mssql";

const PALABRAS_PROHIBIDAS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "EXECUTE",
  "CALL",
];
const FUENTES_NO_PERMITIDAS =
  /\b(?:OPB_[A-Z0-9_]*|SYS\.|INFORMATION_SCHEMA\b)/i;

@Injectable()
export class InformaticaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InformaticaService.name);
  private pool: sql.ConnectionPool | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.config.get<string>("informatica.host");
    if (!host) {
      this.logger.warn(
        "Repositorio Informatica no configurado (INFORMATICA_HOST vacío). Módulo de workflows deshabilitado.",
      );
      return;
    }

    try {
      this.pool = await new sql.ConnectionPool({
        server: host,
        port: this.config.get<number>("informatica.puerto") ?? 1433,
        database: this.config.get<string>("informatica.base") ?? "",
        user: this.config.get<string>("informatica.usuario") ?? "",
        password: this.config.get<string>("informatica.contrasena") ?? "",
        options: {
          encrypt: this.config.get<boolean>("informatica.encriptar") ?? false,
          trustServerCertificate: true,
        },
        pool: { min: 2, max: 5, idleTimeoutMillis: 60000 },
      }).connect();

      this.logger.log(`Pool Informatica (solo lectura) conectado a ${host}`);
    } catch (error) {
      this.logger.warn(
        `No se pudo conectar al repositorio Informatica: ${(error as Error).message}. Módulo de workflows deshabilitado.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.logger.log("Pool Informatica cerrado.");
    }
  }

  async ejecutarConsulta<T>(
    consulta: string,
    parametros: Record<string, unknown> = {},
  ): Promise<T[]> {
    if (!this.pool) return [];
    this.validarSoloLectura(consulta);

    try {
      const peticion = this.pool.request();
      for (const [nombre, valor] of Object.entries(parametros)) {
        peticion.input(nombre, valor);
      }
      const resultado = await peticion.query(consulta);
      return resultado.recordset as T[];
    } catch (error) {
      this.logger.error(
        `Error consultando repositorio Informatica: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        "Error al consultar el repositorio de Informatica.",
      );
    }
  }

  get disponible(): boolean {
    return this.pool !== null;
  }

  private validarSoloLectura(consulta: string): void {
    const normalizada = consulta.trim().toUpperCase();
    if (!normalizada.startsWith("SELECT") && !normalizada.startsWith("WITH")) {
      throw new InternalServerErrorException(
        "Solo se permiten consultas SELECT en el repositorio de Informatica.",
      );
    }
    const tieneProhibida = PALABRAS_PROHIBIDAS.some((p) =>
      new RegExp(`\\b${p}\\b`).test(normalizada),
    );
    if (tieneProhibida) {
      throw new InternalServerErrorException(
        "La consulta contiene operaciones no permitidas (repositorio solo lectura).",
      );
    }
    if (FUENTES_NO_PERMITIDAS.test(consulta)) {
      throw new InternalServerErrorException(
        "Las consultas al repositorio Informatica deben usar exclusivamente vistas REP_*.",
      );
    }
  }
}
