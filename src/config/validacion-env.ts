import * as Joi from 'joi';

export const esquemaValidacionEnv = Joi.object({
  PUERTO: Joi.number().default(3001),
  HOST_API: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).default('127.0.0.1'),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  URL_DASHBOARD: Joi.string().uri().optional().allow(''),
  ALERTA_DESTINATARIOS_DEFAULT: Joi.string().allow('').optional(),
  CIFRADO_CONFIG_SECRET: Joi.string().min(32).allow('').optional(),

  SQLSERVER_HOST: Joi.string().default('localhost'),
  SQLSERVER_PORT: Joi.number().default(1433),
  SQLSERVER_DATABASE: Joi.string().required(),
  SQLSERVER_USERNAME: Joi.string().allow('').optional(),
  SQLSERVER_PASSWORD: Joi.string().allow('').optional(),
  SQLSERVER_ENCRYPT: Joi.string().valid('true', 'false').default('false'),

  INFORMATICA_HOST: Joi.string().allow('').optional(),
  INFORMATICA_PORT: Joi.number().default(1433),
  INFORMATICA_DATABASE: Joi.string().allow('').optional(),
  INFORMATICA_USERNAME: Joi.string().allow('').optional(),
  INFORMATICA_PASSWORD: Joi.string().allow('').optional(),
  INFORMATICA_ENCRYPT: Joi.string().valid('true', 'false').default('false'),

  AD_URL: Joi.string().allow('').optional(),
  AD_DOMINIO: Joi.string().allow('').optional(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRACION: Joi.string().default('8h'),

  GEMINI_API_KEY: Joi.string().allow('').optional(),
  GEMINI_MODELO: Joi.string().default('gemini-pro'),
  GEMINI_TEMPERATURA: Joi.number().min(0).max(1).default(0.1),

  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USUARIO: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),
  SMTP_REMITENTE: Joi.string().default('botmonitoreo@sukarne.com'),

  INTERVALO_POLLING_SEGUNDOS: Joi.number().default(30),
});
