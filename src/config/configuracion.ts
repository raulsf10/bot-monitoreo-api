import { registerAs } from '@nestjs/config';

export const configServidor = registerAs('servidor', () => ({
  puerto: parseInt(process.env.PUERTO ?? '3001', 10),
  host: process.env.HOST_API ?? '127.0.0.1',
  entorno: process.env.NODE_ENV ?? 'development',
  urlDashboard: process.env.URL_DASHBOARD ?? 'http://localhost:3000',
  alertaDestinatariosDefault: process.env.ALERTA_DESTINATARIOS_DEFAULT ?? '',
}));

export const configSeguridad = registerAs('seguridad', () => ({
  cifradoConfiguracion: process.env.CIFRADO_CONFIG_SECRET ?? '',
}));

export const configSqlServer = registerAs('sqlserver', () => ({
  host: process.env.SQLSERVER_HOST ?? 'localhost',
  puerto: parseInt(process.env.SQLSERVER_PORT ?? '1433', 10),
  base: process.env.SQLSERVER_DATABASE ?? 'BotMonitoreo',
  usuario: process.env.SQLSERVER_USERNAME ?? '',
  contrasena: process.env.SQLSERVER_PASSWORD ?? '',
  encriptar: process.env.SQLSERVER_ENCRYPT === 'true',
}));

export const configInformatica = registerAs('informatica', () => ({
  host: process.env.INFORMATICA_HOST ?? '',
  puerto: parseInt(process.env.INFORMATICA_PORT ?? '1433', 10),
  base: process.env.INFORMATICA_DATABASE ?? '',
  usuario: process.env.INFORMATICA_USERNAME ?? '',
  contrasena: process.env.INFORMATICA_PASSWORD ?? '',
  encriptar: process.env.INFORMATICA_ENCRYPT === 'true',
  poolMinimo: parseInt(process.env.INFORMATICA_POOL_MIN ?? '2', 10),
  poolMaximo: parseInt(process.env.INFORMATICA_POOL_MAX ?? '50', 10),
  poolInactividadMs: parseInt(
    process.env.INFORMATICA_POOL_IDLE_TIMEOUT_MS ?? '60000',
    10,
  ),
}));

export const configLdap = registerAs('ldap', () => ({
  url: process.env.AD_URL ?? '',
  dominio: process.env.AD_DOMINIO ?? '',
}));

export const configJwt = registerAs('jwt', () => ({
  secreto: process.env.JWT_SECRET ?? '',
  expiracion: process.env.JWT_EXPIRACION ?? '8h',
}));

export const configGemini = registerAs('gemini', () => ({
  apiKey: process.env.GEMINI_API_KEY ?? '',
  modelo: process.env.GEMINI_MODELO ?? 'gemini-pro',
  temperatura: parseFloat(process.env.GEMINI_TEMPERATURA ?? '0.1'),
}));

export const configSmtp = registerAs('smtp', () => ({
  host: process.env.SMTP_HOST ?? '',
  puerto: parseInt(process.env.SMTP_PORT ?? '587', 10),
  usuario: process.env.SMTP_USUARIO ?? '',
  contrasena: process.env.SMTP_PASSWORD ?? '',
  remitente: process.env.SMTP_REMITENTE ?? 'botmonitoreo@sukarne.com',
}));

export const configPolling = registerAs('polling', () => ({
  intervaloSegundos: parseInt(process.env.INTERVALO_POLLING_SEGUNDOS ?? '30', 10),
}));

export const configuracionesCompletas = [
  configServidor,
  configSeguridad,
  configSqlServer,
  configInformatica,
  configLdap,
  configJwt,
  configGemini,
  configSmtp,
  configPolling,
];
