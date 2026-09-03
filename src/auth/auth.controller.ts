import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UsuarioAutenticado } from '../shared/interfaces/modelos';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RespuestaAuthDto } from './dto/respuesta-auth.dto';
import { GuardJwt } from './guards/guard-jwt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  iniciarSesion(@Body() dto: LoginDto): Promise<RespuestaAuthDto> {
    return this.authService.login(dto);
  }

  @Get('perfil')
  @ApiBearerAuth()
  @UseGuards(GuardJwt)
  obtenerPerfil(@Req() peticion: Request): UsuarioAutenticado {
    return peticion.user as UsuarioAutenticado;
  }
}
