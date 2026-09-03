import { Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GuardJwt } from '../auth/guards/guard-jwt';
import { AlertasService } from './alertas.service';
import { AlertaMonitoreo } from './entities/alerta-monitoreo.entity';

@ApiTags('alertas')
@ApiBearerAuth()
@UseGuards(GuardJwt)
@Controller('alertas')
export class AlertasController {
  constructor(private readonly alertas: AlertasService) {}

  @Get('pendientes')
  obtenerPendientes(): Promise<AlertaMonitoreo[]> {
    return this.alertas.obtenerPendientes();
  }

  @Patch(':id/leida')
  async marcarLeida(@Param('id', ParseUUIDPipe) id: string): Promise<{ leida: true }> {
    await this.alertas.marcarLeida(id);
    return { leida: true };
  }
}
