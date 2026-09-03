import { OmitType } from '@nestjs/mapped-types';
import { CrearConexionValidacionDto } from './crear-conexion.dto';

export class ProbarConexionDto extends OmitType(CrearConexionValidacionDto, ['nombre'] as const) {}
