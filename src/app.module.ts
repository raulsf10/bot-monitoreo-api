import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AlertasModule } from './alertas/alertas.module';
import { AlertaMonitoreo } from './alertas/entities/alerta-monitoreo.entity';
import { BaseConocimientoModule } from './base-conocimiento/base-conocimiento.module';
import { DependenciaElemento } from './base-conocimiento/entities/dependencia-elemento.entity';
import { ElementoMonitoreado } from './base-conocimiento/entities/elemento-monitoreado.entity';
import { ConexionesValidacionModule } from './conexiones-validacion/conexiones-validacion.module';
import { ConexionValidacion } from './conexiones-validacion/entities/conexion-validacion.entity';
import { CasosPruebaModule } from './casos-prueba/casos-prueba.module';
import { configuracionesCompletas } from './config/configuracion';
import { esquemaValidacionEnv } from './config/validacion-env';
import { DiagnosticoModule } from './diagnostico/diagnostico.module';
import { MetricasModule } from './metricas/metricas.module';
import { MonitoreoModule } from './monitoreo/monitoreo.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { InformaticaModule } from './informatica/informatica.module';
import { ServidoresModule } from './servidores/servidores.module';
import { ServidorMonitoreado } from './servidores/entities/servidor-monitoreado.entity';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: configuracionesCompletas,
      validationSchema: esquemaValidacionEnv,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mssql',
        host: config.get<string>('sqlserver.host'),
        port: config.get<number>('sqlserver.puerto'),
        username: config.get<string>('sqlserver.usuario'),
        password: config.get<string>('sqlserver.contrasena'),
        database: config.get<string>('sqlserver.base'),
        entities: [
          ElementoMonitoreado,
          DependenciaElemento,
          AlertaMonitoreo,
          ConexionValidacion,
          ServidorMonitoreado,
        ],
        // El esquema de SQL Server se gestiona con scripts manuales (ver carpeta sql/).
        synchronize: false,
        options: {
          encrypt: config.get<boolean>('sqlserver.encriptar'),
          trustServerCertificate: true,
        },
      }),
    }),
    InformaticaModule,
    AlertasModule,
    ConexionesValidacionModule,
    ServidoresModule,
    AuthModule,
    WorkflowsModule,
    DiagnosticoModule,
    BaseConocimientoModule,
    NotificacionesModule,
    MetricasModule,
    CasosPruebaModule,
    MonitoreoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
