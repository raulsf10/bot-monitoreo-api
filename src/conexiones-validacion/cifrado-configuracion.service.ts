import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class CifradoConfiguracionService {
  constructor(private readonly config: ConfigService) {}

  cifrar(valor: string): string {
    const iv = randomBytes(12);
    const cifrador = createCipheriv('aes-256-gcm', this.obtenerLlave(), iv);
    const contenido = Buffer.concat([cifrador.update(valor, 'utf8'), cifrador.final()]);
    return [iv.toString('base64'), cifrador.getAuthTag().toString('base64'), contenido.toString('base64')].join('.');
  }

  descifrar(valor: string): string {
    const [ivBase64, tagBase64, contenidoBase64] = valor.split('.');
    if (!ivBase64 || !tagBase64 || !contenidoBase64) {
      throw new BadRequestException('La credencial de la conexión no tiene un formato válido.');
    }
    const descifrador = createDecipheriv('aes-256-gcm', this.obtenerLlave(), Buffer.from(ivBase64, 'base64'));
    descifrador.setAuthTag(Buffer.from(tagBase64, 'base64'));
    return Buffer.concat([descifrador.update(Buffer.from(contenidoBase64, 'base64')), descifrador.final()]).toString('utf8');
  }

  private obtenerLlave(): Buffer {
    const secreto = this.config.get<string>('seguridad.cifradoConfiguracion');
    if (!secreto || secreto.length < 32) {
      throw new BadRequestException('Falta CIFRADO_CONFIG_SECRET (mínimo 32 caracteres) para guardar conexiones.');
    }
    return createHash('sha256').update(secreto).digest();
  }
}
