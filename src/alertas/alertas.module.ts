import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';
import { AlertaMonitoreo } from './entities/alerta-monitoreo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertaMonitoreo])],
  controllers: [AlertasController],
  providers: [AlertasService],
  exports: [AlertasService],
})
export class AlertasModule {}
