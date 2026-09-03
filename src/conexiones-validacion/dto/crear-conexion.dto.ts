import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { TipoConexionValidacion } from '../entities/conexion-validacion.entity';

export class CrearConexionValidacionDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsIn(['SQLSERVER', 'ORACLE'])
  tipo!: TipoConexionValidacion;

  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  puerto!: number;

  @IsString()
  @IsNotEmpty()
  baseDatos!: string;

  @IsString()
  @IsNotEmpty()
  usuario!: string;

  @IsString()
  @IsNotEmpty()
  contrasena!: string;

  @IsOptional()
  @IsBoolean()
  encriptar?: boolean;
}
