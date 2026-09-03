import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { execFile } from "child_process";
import { Socket } from "net";
import { promisify } from "util";
import { Repository } from "typeorm";
import { CrearServidorDto } from "./dto/crear-servidor.dto";
import { ActualizarServidorDto } from "./dto/actualizar-servidor.dto";
import { ServidorMonitoreado } from "./entities/servidor-monitoreado.entity";

const ejecutarArchivo = promisify(execFile);

export interface ResultadoPruebaServidor {
  disponible: boolean;
  ping: boolean;
  tcp: boolean | null;
  latenciaMs: number;
  detalle: string;
}

@Injectable()
export class ServidoresService {
  constructor(
    @InjectRepository(ServidorMonitoreado)
    private readonly servidorRepo: Repository<ServidorMonitoreado>,
  ) {}

  obtenerTodos(): Promise<ServidorMonitoreado[]> {
    return this.servidorRepo.find({ order: { nombre: "ASC" } });
  }

  obtenerActivos(): Promise<ServidorMonitoreado[]> {
    return this.servidorRepo.find({
      where: { activo: true },
      order: { nombre: "ASC" },
    });
  }

  async probar(
    datos: Pick<CrearServidorDto, "host" | "puerto">,
  ): Promise<ResultadoPruebaServidor> {
    const inicio = Date.now();
    const ping = await this.probarPing(datos.host);
    const tcp = datos.puerto
      ? await this.probarTcp(datos.host, datos.puerto)
      : null;
    const disponible = datos.puerto ? tcp === true : ping;
    return {
      disponible,
      ping,
      tcp,
      latenciaMs: Date.now() - inicio,
      detalle: disponible
        ? "Host alcanzable."
        : datos.puerto
          ? "El host no acepta conexión TCP en el puerto configurado."
          : "No se obtuvo respuesta ICMP del servidor.",
    };
  }

  async crear(dto: CrearServidorDto): Promise<ServidorMonitoreado> {
    const prueba = await this.probar(dto);
    if (!prueba.disponible)
      throw new BadRequestException(
        `El servidor no se guardó: ${prueba.detalle}`,
      );
    return this.servidorRepo.save(
      this.servidorRepo.create({ ...dto, activo: dto.activo ?? true }),
    );
  }

  async eliminar(id: string): Promise<{ eliminado: true }> {
    const resultado = await this.servidorRepo.delete(id);
    if (!resultado.affected)
      throw new NotFoundException("No existe el servidor indicado.");
    return { eliminado: true };
  }

  async actualizar(
    id: string,
    dto: ActualizarServidorDto,
  ): Promise<ServidorMonitoreado> {
    const actual = await this.servidorRepo.findOneBy({ id });
    if (!actual) throw new NotFoundException("No existe el servidor indicado.");
    const candidato = { ...actual, ...dto };
    const prueba = await this.probar(candidato);
    if (!prueba.disponible)
      throw new BadRequestException(
        `El servidor no se actualizó: ${prueba.detalle}`,
      );
    Object.assign(actual, dto);
    return this.servidorRepo.save(actual);
  }

  private async probarPing(host: string): Promise<boolean> {
    try {
      await ejecutarArchivo("ping", ["-n", "1", "-w", "2000", host], {
        windowsHide: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  private probarTcp(host: string, puerto: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new Socket();
      const finalizar = (resultado: boolean) => {
        socket.destroy();
        resolve(resultado);
      };
      socket.setTimeout(2500);
      socket.once("connect", () => finalizar(true));
      socket.once("timeout", () => finalizar(false));
      socket.once("error", () => finalizar(false));
      socket.connect(puerto, host);
    });
  }
}
