import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class InterceptorLogging implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    const peticion = contexto.switchToHttp().getRequest<Request>();
    const { method, url } = peticion;
    const inicio = Date.now();

    return siguiente.handle().pipe(
      tap(() => {
        const duracion = Date.now() - inicio;
        this.logger.log(`${method} ${url} - ${duracion}ms`);
      }),
    );
  }
}
