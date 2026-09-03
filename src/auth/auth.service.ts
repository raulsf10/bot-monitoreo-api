import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsuarioAutenticado } from '../shared/interfaces/modelos';
import { LoginDto } from './dto/login.dto';
import { RespuestaAuthDto } from './dto/respuesta-auth.dto';
import { LdapService } from './ldap.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly ldapService: LdapService,
  ) {}

  async login(dto: LoginDto): Promise<RespuestaAuthDto> {
    await this.ldapService.autenticar(dto.usuario, dto.contrasena);

    const usuario: UsuarioAutenticado = {
      usuario: dto.usuario,
      nombre: dto.usuario,
      correo: '',
      departamento: '',
    };

    return this.generarRespuestaAuth(usuario);
  }

  async generarRespuestaAuth(usuario: UsuarioAutenticado): Promise<RespuestaAuthDto> {
    const payload = {
      sub: usuario.usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      departamento: usuario.departamento,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      expiraEn: this.config.get<string>('jwt.expiracion') ?? '8h',
      usuario: {
        nombre: usuario.nombre,
        correo: usuario.correo,
      },
    };
  }
}
