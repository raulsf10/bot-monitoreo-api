import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  ReglaTablaCritica,
  ReglaWorkflowCritico,
} from '../../shared/interfaces/modelos';

export class HistorialMensajeDto {
  @IsIn(['user', 'model'])
  rol!: 'user' | 'model';

  @IsString()
  contenido!: string;
}

export class SolicitudDiagnosticoDto {
  @IsString()
  @IsNotEmpty({ message: 'El mensaje es obligatorio.' })
  mensaje!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistorialMensajeDto)
  historial: HistorialMensajeDto[] = [];

  @IsOptional()
  @IsArray()
  elementosMonitoreados: unknown[] = [];

  @IsOptional()
  @IsArray()
  reglasWorkflows: ReglaWorkflowCritico[] = [];

  @IsOptional()
  @IsArray()
  reglasTablas: ReglaTablaCritica[] = [];
}
