import { OmitType } from '@nestjs/mapped-types';
import { CrearServidorDto } from './crear-servidor.dto';

export class ProbarServidorDto extends OmitType(CrearServidorDto, ['nombre'] as const) {}
