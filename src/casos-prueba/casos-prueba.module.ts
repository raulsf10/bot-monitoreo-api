import { Module } from '@nestjs/common';
import { CasosPruebaController } from './casos-prueba.controller';

@Module({
  controllers: [CasosPruebaController],
})
export class CasosPruebaModule {}
