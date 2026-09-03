import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'ldapts';

@Injectable()
export class LdapService {
  constructor(private readonly config: ConfigService) {}

  async autenticar(usuario: string, contrasena: string): Promise<void> {
    const url = this.config.get<string>('ldap.url') ?? '';
    const dominio = this.config.get<string>('ldap.dominio') ?? '';
    const upn = `${usuario}@${dominio}`;

    const cliente = new Client({
      url,
      timeout: 5000,
      connectTimeout: 5000,
    });

    try {
      await cliente.bind(upn, contrasena);
    } catch (err) {
      throw this.mapearError(err as Error & { code?: number });
    } finally {
      await cliente.unbind().catch(() => undefined);
    }
  }

  private mapearError(err: Error & { code?: number }): Error {
    if (err.name === 'InvalidCredentialsError' || err.code === 49) {
      return new UnauthorizedException('Usuario o contraseña incorrectos.');
    }
    return new ServiceUnavailableException('Servicio de autenticación no disponible.');
  }
}
