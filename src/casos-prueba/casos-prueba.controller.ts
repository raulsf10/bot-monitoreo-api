import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GuardJwt } from '../auth/guards/guard-jwt';
import { CasoPrueba } from '../shared/interfaces/modelos';
import { CASOS_PRECONFIGURADOS } from './datos/casos-preconfigurados';

@ApiTags('casos-prueba')
@ApiBearerAuth()
@Controller('casos-prueba')
@UseGuards(GuardJwt)
export class CasosPruebaController {
  @Get()
  obtenerCasos(): CasoPrueba[] {
    return CASOS_PRECONFIGURADOS;
  }
}
