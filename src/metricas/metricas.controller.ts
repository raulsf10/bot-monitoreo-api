import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GuardJwt } from '../auth/guards/guard-jwt';
import { MetricasIpc, MetricasService } from './metricas.service';

@ApiTags('metricas')
@ApiBearerAuth()
@Controller('metricas-ipc')
@UseGuards(GuardJwt)
export class MetricasController {
  constructor(private readonly metricasService: MetricasService) {}

  @Get()
  obtenerMetricas(): Promise<MetricasIpc> {
    return this.metricasService.obtenerMetricasIpc();
  }
}
