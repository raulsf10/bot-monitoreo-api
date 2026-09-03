import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServidoresController } from './servidores.controller';
import { ServidoresService } from './servidores.service';
import { ServidorMonitoreado } from './entities/servidor-monitoreado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServidorMonitoreado])],
  controllers: [ServidoresController],
  providers: [ServidoresService],
  exports: [ServidoresService],
})
export class ServidoresModule {}
