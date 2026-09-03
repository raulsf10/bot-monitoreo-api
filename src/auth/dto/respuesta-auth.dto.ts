export class RespuestaAuthDto {
  token!: string;
  expiraEn!: string;
  usuario!: {
    nombre: string;
    correo: string;
  };
}
