import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GuardJwt } from '../auth/guards/guard-jwt';
import { CrearServidorDto } from './dto/crear-servidor.dto';
import { ActualizarServidorDto } from './dto/actualizar-servidor.dto';
import { ProbarServidorDto } from './dto/probar-servidor.dto';
import { ServidorMonitoreado } from './entities/servidor-monitoreado.entity';
import { ResultadoPruebaServidor, ServidoresService } from './servidores.service';

@ApiTags('servidores')
@ApiBearerAuth()
@UseGuards(GuardJwt)
@Controller('servidores')
export class ServidoresController {
  constructor(private readonly servidores: ServidoresService) {}

  @Get()
  obtenerTodos(): Promise<ServidorMonitoreado[]> { return this.servidores.obtenerTodos(); }

  @Post('probar')
  probar(@Body() dto: ProbarServidorDto): Promise<ResultadoPruebaServidor> { return this.servidores.probar(dto); }

  @Post()
  crear(@Body() dto: CrearServidorDto): Promise<ServidorMonitoreado> { return this.servidores.crear(dto); }

  @Put(':id')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarServidorDto): Promise<ServidorMonitoreado> { return this.servidores.actualizar(id, dto); }

  @Delete(':id')
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<{ eliminado: true }> { return this.servidores.eliminar(id); }
}
