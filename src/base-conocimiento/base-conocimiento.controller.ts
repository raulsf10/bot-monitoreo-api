import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GuardJwt } from '../auth/guards/guard-jwt';
import { BaseConocimientoService } from './base-conocimiento.service';
import { ActualizarElementoDto } from './dto/actualizar-elemento.dto';
import { CrearElementoDto } from './dto/crear-elemento.dto';
import { ElementoMonitoreado } from './entities/elemento-monitoreado.entity';

@ApiTags('base-conocimiento')
@ApiBearerAuth()
@Controller('base-conocimiento')
@UseGuards(GuardJwt)
export class BaseConocimientoController {
  constructor(private readonly baseConocimientoService: BaseConocimientoService) {}

  @Get()
  obtenerTodos(): Promise<ElementoMonitoreado[]> {
    return this.baseConocimientoService.obtenerTodos();
  }

  @Post()
  registrar(@Body() dto: CrearElementoDto): Promise<ElementoMonitoreado> {
    return this.baseConocimientoService.registrarElemento(dto);
  }

  @Put(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarElementoDto,
  ): Promise<ElementoMonitoreado> {
    return this.baseConocimientoService.actualizarElemento(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<{ eliminado: true }> {
    return this.baseConocimientoService.eliminarElemento(id);
  }
}
