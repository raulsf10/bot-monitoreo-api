import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as oracledb from 'oracledb';
import * as sql from 'mssql';
import { Repository } from 'typeorm';
import { CifradoConfiguracionService } from './cifrado-configuracion.service';
import { CrearConexionValidacionDto } from './dto/crear-conexion.dto';
import { ActualizarConexionValidacionDto } from './dto/actualizar-conexion.dto';
import { ProbarConexionDto } from './dto/probar-conexion.dto';
import { ConexionValidacion } from './entities/conexion-validacion.entity';

const PALABRAS_PROHIBIDAS = ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXECUTE', 'CALL'];

export interface ResultadoPruebaConexion {
  exitosa: true;
  motor: string;
  latenciaMs: number;
}

@Injectable()
export class ConexionesValidacionService {
  constructor(
    @InjectRepository(ConexionValidacion)
    private readonly conexionRepo: Repository<ConexionValidacion>,
    private readonly cifrado: CifradoConfiguracionService,
  ) {}

  obtenerTodas(): Promise<ConexionValidacion[]> {
    return this.conexionRepo.find({ order: { nombre: 'ASC' } });
  }

  async probar(datos: ProbarConexionDto): Promise<ResultadoPruebaConexion> {
    const inicio = Date.now();
    if (datos.tipo === 'SQLSERVER') {
      const pool = await new sql.ConnectionPool({
        server: datos.host,
        port: datos.puerto,
        database: datos.baseDatos,
        user: datos.usuario,
        password: datos.contrasena,
        options: { encrypt: datos.encriptar ?? false, trustServerCertificate: true },
        connectionTimeout: 8000,
        requestTimeout: 8000,
      }).connect();
      try {
        await pool.request().query('SELECT 1 AS conectado');
      } finally {
        await pool.close();
      }
    } else {
      const conexion = await oracledb.getConnection({
        user: datos.usuario,
        password: datos.contrasena,
        connectString: `${datos.host}:${datos.puerto}/${datos.baseDatos}`,
      });
      try {
        await conexion.execute('SELECT 1 AS conectado FROM DUAL');
      } finally {
        await conexion.close();
      }
    }
    return { exitosa: true, motor: datos.tipo, latenciaMs: Date.now() - inicio };
  }

  async crear(datos: CrearConexionValidacionDto): Promise<ConexionValidacion> {
    try {
      await this.probar(datos);
    } catch (error) {
      throw new ServiceUnavailableException(`La conexión no se guardó porque falló la prueba: ${(error as Error).message}`);
    }
    const { contrasena, ...sinContrasena } = datos;
    const conexion = await this.conexionRepo.save(this.conexionRepo.create({
      ...sinContrasena,
      contrasenaCifrada: this.cifrado.cifrar(contrasena),
      encriptar: datos.encriptar ?? false,
      activo: true,
    }));
    return this.ocultarContrasena(conexion);
  }

  async eliminar(id: string): Promise<{ eliminado: true }> {
    const resultado = await this.conexionRepo.delete(id);
    if (!resultado.affected) throw new NotFoundException('No existe la conexión indicada.');
    return { eliminado: true };
  }

  async actualizar(id: string, dto: ActualizarConexionValidacionDto): Promise<ConexionValidacion> {
    const actual = await this.conexionRepo
      .createQueryBuilder('conexion')
      .addSelect('conexion.contrasenaCifrada')
      .where('conexion.id = :id', { id })
      .getOne();
    if (!actual) throw new NotFoundException('No existe la conexión indicada.');
    const candidato = {
      nombre: dto.nombre ?? actual.nombre, tipo: dto.tipo ?? actual.tipo, host: dto.host ?? actual.host,
      puerto: dto.puerto ?? actual.puerto, baseDatos: dto.baseDatos ?? actual.baseDatos,
      usuario: dto.usuario ?? actual.usuario,
      contrasena: dto.contrasena ?? this.cifrado.descifrar(actual.contrasenaCifrada),
      encriptar: dto.encriptar ?? actual.encriptar,
    } as CrearConexionValidacionDto;
    try { await this.probar(candidato); }
    catch (error) { throw new ServiceUnavailableException(`La conexión no se actualizó porque falló la prueba: ${(error as Error).message}`); }
    Object.assign(actual, candidato, { contrasenaCifrada: this.cifrado.cifrar(candidato.contrasena) });
    return this.ocultarContrasena(await this.conexionRepo.save(actual));
  }

  async ejecutarConsulta<T>(id: string, consulta: string): Promise<T[]> {
    this.validarSoloLectura(consulta);
    const conexion = await this.conexionRepo
      .createQueryBuilder('conexion')
      .addSelect('conexion.contrasenaCifrada')
      .where('conexion.id = :id', { id })
      .andWhere('conexion.activo = :activo', { activo: true })
      .getOne();
    if (!conexion) throw new NotFoundException('La conexión de validación no existe o está inactiva.');

    const contrasena = this.cifrado.descifrar(conexion.contrasenaCifrada);
    try {
      if (conexion.tipo === 'SQLSERVER') {
        const pool = await new sql.ConnectionPool({
          server: conexion.host, port: conexion.puerto, database: conexion.baseDatos,
          user: conexion.usuario, password: contrasena,
          options: { encrypt: conexion.encriptar, trustServerCertificate: true },
          connectionTimeout: 8000, requestTimeout: 15000,
        }).connect();
        try {
          return (await pool.request().query(consulta)).recordset as T[];
        } finally { await pool.close(); }
      }
      const cliente = await oracledb.getConnection({
        user: conexion.usuario, password: contrasena,
        connectString: `${conexion.host}:${conexion.puerto}/${conexion.baseDatos}`,
      });
      try {
        const resultado = await cliente.execute<T>(consulta, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 5000 });
        return resultado.rows ?? [];
      } finally { await cliente.close(); }
    } catch (error) {
      throw new ServiceUnavailableException(`No fue posible ejecutar la validación externa: ${(error as Error).message}`);
    }
  }

  private validarSoloLectura(consulta: string): void {
    const normalizada = consulta.trim().toUpperCase();
    if (!normalizada.startsWith('SELECT') && !normalizada.startsWith('WITH')) {
      throw new ServiceUnavailableException('Las consultas de validación deben ser SELECT o WITH.');
    }
    if (PALABRAS_PROHIBIDAS.some((palabra) => new RegExp(`\\b${palabra}\\b`).test(normalizada))) {
      throw new ServiceUnavailableException('La consulta contiene una operación de escritura no permitida.');
    }
  }

  private ocultarContrasena(conexion: ConexionValidacion): ConexionValidacion {
    delete (conexion as Partial<ConexionValidacion>).contrasenaCifrada;
    return conexion;
  }
}
