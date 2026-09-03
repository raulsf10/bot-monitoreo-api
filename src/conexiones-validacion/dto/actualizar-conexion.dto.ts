import { PartialType } from '@nestjs/mapped-types';
import { CrearConexionValidacionDto } from './crear-conexion.dto';

export class ActualizarConexionValidacionDto extends PartialType(CrearConexionValidacionDto) {}
