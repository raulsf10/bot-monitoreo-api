import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GuardJwt } from '../auth/guards/guard-jwt';
import { ConexionesValidacionService, ResultadoPruebaConexion } from './conexiones-validacion.service';
import { CrearConexionValidacionDto } from './dto/crear-conexion.dto';
import { ActualizarConexionValidacionDto } from './dto/actualizar-conexion.dto';
import { ProbarConexionDto } from './dto/probar-conexion.dto';
import { ConexionValidacion } from './entities/conexion-validacion.entity';

@ApiTags('conexiones-validacion')
@ApiBearerAuth()
@UseGuards(GuardJwt)
@Controller('conexiones-validacion')
export class ConexionesValidacionController {
  constructor(private readonly conexiones: ConexionesValidacionService) {}

  @Get()
  obtenerTodas(): Promise<ConexionValidacion[]> { return this.conexiones.obtenerTodas(); }

  @Post('probar')
  probar(@Body() dto: ProbarConexionDto): Promise<ResultadoPruebaConexion> { return this.conexiones.probar(dto); }

  @Post()
  crear(@Body() dto: CrearConexionValidacionDto): Promise<ConexionValidacion> { return this.conexiones.crear(dto); }

  @Put(':id')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarConexionValidacionDto): Promise<ConexionValidacion> { return this.conexiones.actualizar(id, dto); }

  @Delete(':id')
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<{ eliminado: true }> { return this.conexiones.eliminar(id); }
}
