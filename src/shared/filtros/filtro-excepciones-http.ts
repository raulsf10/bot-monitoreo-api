import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class FiltroExcepcionesHttp implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcepcionesHttp.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const respuesta = contexto.getResponse<Response>();
    const peticion = contexto.getRequest<Request>();

    const estado =
      excepcion instanceof HttpException
        ? excepcion.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const mensaje = this.obtenerMensaje(excepcion);

    if (estado >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${peticion.method} ${peticion.url} -> ${estado}: ${mensaje}`,
        excepcion instanceof Error ? excepcion.stack : undefined,
      );
    } else {
      this.logger.warn(`${peticion.method} ${peticion.url} -> ${estado}: ${mensaje}`);
    }

    respuesta.status(estado).json({
      estado,
      mensaje,
      ruta: peticion.url,
      timestamp: new Date().toISOString(),
    });
  }

  private obtenerMensaje(excepcion: unknown): string {
    if (excepcion instanceof HttpException) {
      const respuesta = excepcion.getResponse();
      if (typeof respuesta === 'string') {
        return respuesta;
      }
      const cuerpo = respuesta as Record<string, unknown>;
      const mensaje = cuerpo['message'];
      if (Array.isArray(mensaje)) {
        return mensaje.join(', ');
      }
      if (typeof mensaje === 'string') {
        return mensaje;
      }
    }
    if (excepcion instanceof Error) {
      return excepcion.message;
    }
    return 'Error interno del servidor';
  }
}
