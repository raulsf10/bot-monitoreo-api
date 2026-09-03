import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActualizarElementoDto } from './dto/actualizar-elemento.dto';
import { CrearElementoDto } from './dto/crear-elemento.dto';
import { DependenciaElemento } from './entities/dependencia-elemento.entity';
import {
  ElementoMonitoreado,
  TipoElemento,
} from './entities/elemento-monitoreado.entity';

@Injectable()
export class BaseConocimientoService {
  constructor(
    @InjectRepository(ElementoMonitoreado)
    private readonly elementoRepo: Repository<ElementoMonitoreado>,
    @InjectRepository(DependenciaElemento)
    private readonly dependenciaRepo: Repository<DependenciaElemento>,
  ) {}

  obtenerTodos(): Promise<ElementoMonitoreado[]> {
    return this.elementoRepo.find({ order: { creadoEn: 'DESC' } });
  }

  obtenerPorTipo(tipo: TipoElemento): Promise<ElementoMonitoreado[]> {
    return this.elementoRepo.find({ where: { tipo } });
  }

  async obtenerPorId(id: string): Promise<ElementoMonitoreado> {
    const elemento = await this.elementoRepo.findOne({ where: { id } });
    if (!elemento) {
      throw new NotFoundException(`No existe el elemento monitoreado con id ${id}.`);
    }
    return elemento;
  }

  registrarElemento(dto: CrearElementoDto): Promise<ElementoMonitoreado> {
    const elemento = this.elementoRepo.create({
      ...dto,
      dependencias: (dto.dependencias ?? []).map((dependencia) =>
        this.dependenciaRepo.create(dependencia),
      ),
    });
    return this.elementoRepo.save(elemento);
  }

  async actualizarElemento(
    id: string,
    dto: ActualizarElementoDto,
  ): Promise<ElementoMonitoreado> {
    const elemento = await this.obtenerPorId(id);
    const { dependencias, ...resto } = dto;
    Object.assign(elemento, resto);

    if (dependencias) {
      elemento.dependencias = dependencias.map((dependencia) =>
        this.dependenciaRepo.create(dependencia),
      );
    }

    return this.elementoRepo.save(elemento);
  }

  async eliminarElemento(id: string): Promise<{ eliminado: true }> {
    const resultado = await this.elementoRepo.delete(id);
    if (!resultado.affected) {
      throw new NotFoundException(`No existe el elemento monitoreado con id ${id}.`);
    }
    return { eliminado: true };
  }
}
