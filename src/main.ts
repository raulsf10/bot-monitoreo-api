import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { FiltroExcepcionesHttp } from './shared/filtros/filtro-excepciones-http';
import { InterceptorLogging } from './shared/interceptores/interceptor-logging';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const entorno = config.get<string>('servidor.entorno');

  app.setGlobalPrefix('api');

  app.enableCors({
    origin:
      entorno === 'production'
        ? config.get<string>('servidor.urlDashboard')
        : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new FiltroExcepcionesHttp());
  app.useGlobalInterceptors(new InterceptorLogging());

  const configSwagger = new DocumentBuilder()
    .setTitle('Bot de Monitoreo API')
    .setDescription(
      'API del Bot de Monitoreo de procesos ETL de Informatica PowerCenter v10.5.',
    )
    .setVersion('1.0')
    .addServer('/api')
    .addBearerAuth()
    .build();
  const documento = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('docs', app, documento, {
    swaggerOptions: { persistAuthorization: true },
  });

  const puerto = config.get<number>('servidor.puerto') ?? 3001;
  const host = config.get<string>('servidor.host') ?? '127.0.0.1';
  await app.listen(puerto, host);

  Logger.log(`bot-monitoreo-api escuchando en http://${host}:${puerto}/api`, 'Bootstrap');
  Logger.log(`Swagger UI disponible en http://${host}:${puerto}/docs`, 'Bootstrap');
}

bootstrap().catch((error) => {
  Logger.error(`Fallo al iniciar la aplicación: ${(error as Error).message}`, 'Bootstrap');
  process.exit(1);
});
