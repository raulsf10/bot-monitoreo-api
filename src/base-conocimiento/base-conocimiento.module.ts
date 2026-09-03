import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseConocimientoController } from './base-conocimiento.controller';
import { BaseConocimientoService } from './base-conocimiento.service';
import { DependenciaElemento } from './entities/dependencia-elemento.entity';
import { ElementoMonitoreado } from './entities/elemento-monitoreado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ElementoMonitoreado, DependenciaElemento])],
  controllers: [BaseConocimientoController],
  providers: [BaseConocimientoService],
  exports: [BaseConocimientoService],
})
export class BaseConocimientoModule {}
