import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import {
  asuntoAlerta,
  DatosAlertaWorkflow,
  plantillaAlertaWorkflow,
} from "./plantillas/alerta-workflow";

export type DatosNotificacion = Omit<DatosAlertaWorkflow, "urlDashboard">;

@Injectable()
export class NotificacionesService implements OnModuleInit {
  private readonly logger = new Logger(NotificacionesService.name);
  private transporte: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>("smtp.host");
    if (!host) {
      this.logger.warn(
        "SMTP no configurado; las notificaciones quedan deshabilitadas.",
      );
      return;
    }

    const puerto = this.config.get<number>("smtp.puerto") ?? 587;
    const usuario = this.config.get<string>("smtp.usuario");
    const contrasena = this.config.get<string>("smtp.contrasena");

    this.transporte = nodemailer.createTransport({
      host,
      port: puerto,
      secure: puerto === 465,
      auth: usuario ? { user: usuario, pass: contrasena } : undefined,
    });
  }

  async notificarAlerta(
    destinatarios: string[],
    datos: DatosNotificacion,
  ): Promise<void> {
    await this.enviarAlerta(destinatarios, {
      ...datos,
      urlDashboard: this.urlDashboard(),
    });
  }

  private async enviarAlerta(
    destinatarios: string[],
    datos: DatosAlertaWorkflow,
  ): Promise<void> {
    if (!this.transporte || destinatarios.length === 0) {
      this.logger.warn(
        `Alerta ${datos.tipoAlerta} de ${datos.nombreElemento} no enviada (SMTP inactivo o sin destinatarios).`,
      );
      return;
    }

    try {
      await this.transporte.sendMail({
        from: this.config.get<string>("smtp.remitente"),
        to: destinatarios.join(", "),
        subject: asuntoAlerta(datos),
        html: plantillaAlertaWorkflow(datos),
      });
      this.logger.log(
        `Alerta ${datos.tipoAlerta} enviada para ${datos.nombreElemento}.`,
      );
    } catch (error) {
      this.logger.error(
        `Error enviando alerta ${datos.tipoAlerta}: ${(error as Error).message}`,
      );
    }
  }

  private urlDashboard(): string {
    return (
      this.config.get<string>("servidor.urlDashboard") ??
      "http://localhost:3000"
    );
  }
}
