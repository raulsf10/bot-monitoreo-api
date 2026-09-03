import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GuardJwt } from '../auth/guards/guard-jwt';
import { DiagnosticoService } from './diagnostico.service';
import { RespuestaDiagnosticoDto } from './dto/respuesta-diagnostico.dto';
import { SolicitudDiagnosticoDto } from './dto/solicitud-diagnostico.dto';

@ApiTags('diagnostico')
@ApiBearerAuth()
@Controller('diagnostico')
@UseGuards(GuardJwt)
export class DiagnosticoController {
  constructor(private readonly diagnosticoService: DiagnosticoService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  procesar(@Body() dto: SolicitudDiagnosticoDto): Promise<RespuestaDiagnosticoDto> {
    return this.diagnosticoService.procesarDiagnostico(dto);
  }
}
