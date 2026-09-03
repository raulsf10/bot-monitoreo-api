import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuarioAutenticado } from '../../shared/interfaces/modelos';

interface PayloadJwt {
  sub: string;
  nombre: string;
  correo: string;
  departamento: string;
}

@Injectable()
export class EstrategiaJwt extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secreto') ?? '',
    });
  }

  async validate(payload: PayloadJwt): Promise<UsuarioAutenticado> {
    return {
      usuario: payload.sub,
      nombre: payload.nombre,
      correo: payload.correo,
      departamento: payload.departamento,
    };
  }
}
