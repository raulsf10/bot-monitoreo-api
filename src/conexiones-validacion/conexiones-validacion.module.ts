import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CifradoConfiguracionService } from './cifrado-configuracion.service';
import { ConexionesValidacionController } from './conexiones-validacion.controller';
import { ConexionesValidacionService } from './conexiones-validacion.service';
import { ConexionValidacion } from './entities/conexion-validacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConexionValidacion])],
  controllers: [ConexionesValidacionController],
  providers: [ConexionesValidacionService, CifradoConfiguracionService],
  exports: [ConexionesValidacionService],
})
export class ConexionesValidacionModule {}
