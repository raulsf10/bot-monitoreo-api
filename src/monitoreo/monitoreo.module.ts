import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElementoMonitoreado } from '../base-conocimiento/entities/elemento-monitoreado.entity';
import { AlertasModule } from '../alertas/alertas.module';
import { ConexionesValidacionModule } from '../conexiones-validacion/conexiones-validacion.module';
import { ServidoresModule } from '../servidores/servidores.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { MonitoreoService } from './monitoreo.service';

// InformaticaModule es @Global(), no necesita importarse aquí.
@Module({
  imports: [
    TypeOrmModule.forFeature([ElementoMonitoreado]),
    NotificacionesModule,
    AlertasModule,
    ConexionesValidacionModule,
    ServidoresModule,
  ],
  providers: [MonitoreoService],
  exports: [MonitoreoService],
})
export class MonitoreoModule {}
