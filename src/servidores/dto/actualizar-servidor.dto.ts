import { PartialType } from '@nestjs/mapped-types';
import { CrearServidorDto } from './crear-servidor.dto';

export class ActualizarServidorDto extends PartialType(CrearServidorDto) {}
