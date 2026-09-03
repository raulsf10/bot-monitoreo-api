export type TipoAlerta =
  | "WORKFLOW_FALLIDO"
  | "WORKFLOW_ABORTADO"
  | "WORKFLOW_SUSPENDIDO"
  | "WORKFLOW_NO_INICIADO"
  | "DEPENDENCIA_NO_CUMPLIDA"
  | "SLA_EN_RIESGO"
  | "SLA_EXCEDIDO"
  | "ANOMALIA_VOLUMETRICA"
  | "VALIDACION_SQL"
  | "SERVIDOR_NO_DISPONIBLE";

export interface DatosAlertaWorkflow {
  tipoAlerta: TipoAlerta;
  nombreElemento: string;
  tipoElemento: "Workflow" | "Servidor" | "Validación";
  horaEvento: string;
  mensajeError: string | null;
  detalleAdicional?: string;
  urlDashboard: string;
}

const ETIQUETAS: Record<TipoAlerta, { titulo: string; color: string }> = {
  WORKFLOW_FALLIDO: { titulo: "Workflow fallido", color: "#c0392b" },
  WORKFLOW_ABORTADO: { titulo: "Workflow abortado", color: "#c0392b" },
  WORKFLOW_SUSPENDIDO: { titulo: "Workflow suspendido", color: "#d68910" },
  WORKFLOW_NO_INICIADO: { titulo: "Workflow no iniciado", color: "#c0392b" },
  DEPENDENCIA_NO_CUMPLIDA: {
    titulo: "Dependencia de workflow no cumplida",
    color: "#c0392b",
  },
  SLA_EN_RIESGO: { titulo: "SLA en riesgo", color: "#d68910" },
  SLA_EXCEDIDO: { titulo: "SLA Excedido", color: "#d68910" },
  ANOMALIA_VOLUMETRICA: { titulo: "Anomalía Volumétrica", color: "#8e44ad" },
  VALIDACION_SQL: { titulo: "Validación SQL crítica", color: "#8e44ad" },
  SERVIDOR_NO_DISPONIBLE: {
    titulo: "Servidor no disponible",
    color: "#c0392b",
  },
};

export function asuntoAlerta(datos: DatosAlertaWorkflow): string {
  const etiqueta = ETIQUETAS[datos.tipoAlerta];
  return `[Bot Monitoreo] ${etiqueta.titulo}: ${datos.nombreElemento}`;
}

export function plantillaAlertaWorkflow(datos: DatosAlertaWorkflow): string {
  const etiqueta = ETIQUETAS[datos.tipoAlerta];
  const filaError = datos.mensajeError
    ? `<tr><td style="padding:8px 0;color:#555;">Mensaje de error</td><td style="padding:8px 0;font-family:monospace;color:#c0392b;">${escapar(datos.mensajeError)}</td></tr>`
    : "";
  const filaDetalle = datos.detalleAdicional
    ? `<tr><td style="padding:8px 0;color:#555;">Detalle</td><td style="padding:8px 0;">${escapar(datos.detalleAdicional)}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.1);">
        <tr><td style="background:#8B0000;padding:20px 32px;">
          <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">SuKarne</span>
          <span style="color:#f0c0c0;font-size:13px;display:block;margin-top:4px;">Bot de Monitoreo · Informatica PowerCenter v10.5</span>
        </td></tr>
        <tr><td style="padding:12px 32px;background:${etiqueta.color};">
          <span style="color:#ffffff;font-size:16px;font-weight:bold;">${etiqueta.titulo}</span>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;color:#333;font-size:15px;">Se detectó un evento que requiere atención del operador nocturno.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#555;width:160px;">${escapar(datos.tipoElemento)}</td><td style="padding:8px 0;font-weight:bold;">${escapar(datos.nombreElemento)}</td></tr>
            <tr><td style="padding:8px 0;color:#555;">Hora del evento</td><td style="padding:8px 0;">${escapar(datos.horaEvento)}</td></tr>
            ${filaError}
            ${filaDetalle}
          </table>
          <div style="margin-top:28px;text-align:center;">
            <a href="${datos.urlDashboard}" style="background:#8B0000;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:bold;display:inline-block;">Abrir Dashboard</a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#fafafa;border-top:1px solid #eee;">
          <span style="color:#999;font-size:12px;">Mensaje automático generado por el Bot de Monitoreo. No responder a este correo.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
