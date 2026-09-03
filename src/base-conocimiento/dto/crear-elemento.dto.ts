import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CRITERIOS_MONITOREO,
  CriterioMonitoreo,
  TipoElemento,
} from '../entities/elemento-monitoreado.entity';

const TIPOS_VALIDOS: TipoElemento[] = [
  'Workflow',
  'Tabla',
  'Sesión',
  'Query',
  'Objeto',
  'Otro',
];

export class DependenciaElementoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @IsString()
  @IsNotEmpty()
  accion!: string;
}

export class CrearElementoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsIn(TIPOS_VALIDOS)
  tipo!: TipoElemento;

  @IsOptional()
  @IsString()
  esquemaDWH?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  registrosEsperados?: number | null;

  @IsArray()
  @IsString({ each: true })
  columnasAgrupacion: string[] = [];

  @IsOptional()
  @IsNumber()
  @Min(0)
  promedioHistorico?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  duracionMaximaManual?: number | null;

  @IsString()
  @IsNotEmpty()
  queRevisa!: string;

  @IsArray()
  @IsIn(CRITERIOS_MONITOREO, { each: true })
  criteriosMonitoreo: CriterioMonitoreo[] = ['ESTADO_FINAL', 'DURACION'];

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DependenciaElementoDto)
  dependencias?: DependenciaElementoDto[];

  @IsOptional()
  @IsString()
  consultaValidacion?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaInicioEjecucion debe tener formato HH:mm (ej. "02:30")' })
  horaInicioEjecucion?: string | null;

  @IsOptional()
  @IsString()
  conexionValidacionId?: string | null;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  destinatariosAlerta?: string[];
}
