import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GuardJwt } from './auth/guards/guard-jwt';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('salud')
  salud(): { estado: string; servicio: string } {
    return { estado: 'ok', servicio: 'bot-monitoreo-api' };
  }

  @Get('configuracion')
  @ApiBearerAuth()
  @UseGuards(GuardJwt)
  obtenerConfiguracion(): Promise<Record<string, unknown>> {
    return this.appService.obtenerConfiguracion();
  }
}
