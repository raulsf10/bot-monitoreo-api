import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GuardJwt } from '../auth/guards/guard-jwt';
import { EstadoWorkflowDto } from './dto/estado-workflow.dto';
import { HistorialEjecucionDto } from './dto/historial-ejecucion.dto';
import { TareaWorkflowDto } from './dto/tarea-workflow.dto';
import { WorkflowsService } from './workflows.service';

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows')
@UseGuards(GuardJwt)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('catalogo')
  obtenerCatalogo() {
    return this.workflowsService.obtenerCatalogo();
  }

  @Get()
  obtenerEstado(@Query('fecha') fecha?: string): Promise<EstadoWorkflowDto[]> {
    return this.workflowsService.obtenerEstadoWorkflows(fecha);
  }

  @Get(':nombre/historial')
  obtenerHistorial(
    @Param('nombre') nombre: string,
    @Query('dias', new ParseIntPipe({ optional: true })) dias?: number,
  ): Promise<HistorialEjecucionDto[]> {
    return this.workflowsService.obtenerHistorial(nombre, dias ?? 15);
  }

  @Get(':nombre/tareas')
  obtenerTareas(
    @Param('nombre') nombre: string,
    @Query('fechaEjecucion') fechaEjecucion?: string,
  ): Promise<TareaWorkflowDto[]> {
    return this.workflowsService.obtenerTareas(nombre, fechaEjecucion);
  }
}
