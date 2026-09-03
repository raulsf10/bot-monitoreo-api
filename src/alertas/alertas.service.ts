import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AlertaMonitoreo, SeveridadAlerta } from './entities/alerta-monitoreo.entity';

interface RegistrarAlerta {
  elementoId?: string | null;
  nombreElemento: string;
  tipo: string;
  severidad: SeveridadAlerta;
  mensaje: string;
  claveDedupe: string;
}

@Injectable()
export class AlertasService {
  constructor(
    @InjectRepository(AlertaMonitoreo)
    private readonly alertaRepo: Repository<AlertaMonitoreo>,
  ) {}

  obtenerPendientes(): Promise<AlertaMonitoreo[]> {
    return this.alertaRepo.find({
      where: { leidaEn: IsNull() },
      order: { creadaEn: 'ASC' },
      take: 100,
    });
  }

  async registrarSiNueva(datos: RegistrarAlerta): Promise<AlertaMonitoreo | null> {
    const existente = await this.alertaRepo.findOne({
      where: { claveDedupe: datos.claveDedupe, resueltaEn: IsNull() },
      order: { creadaEn: 'DESC' },
    });
    if (existente) return null;

    return this.alertaRepo.save(
      this.alertaRepo.create({
        ...datos,
        elementoId: datos.elementoId ?? null,
        leidaEn: null,
        resueltaEn: null,
      }),
    );
  }

  async resolverPorClave(claveDedupe: string): Promise<void> {
    await this.alertaRepo.update(
      { claveDedupe, resueltaEn: IsNull() },
      { resueltaEn: new Date() },
    );
  }

  async marcarLeida(id: string): Promise<void> {
    await this.alertaRepo.update(id, { leidaEn: new Date() });
  }
}
