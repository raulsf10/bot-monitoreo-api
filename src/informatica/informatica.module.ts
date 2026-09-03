import { Global, Module } from '@nestjs/common';
import { InformaticaService } from './informatica.service';

@Global()
@Module({
  providers: [InformaticaService],
  exports: [InformaticaService],
})
export class InformaticaModule {}
