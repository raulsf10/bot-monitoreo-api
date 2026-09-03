import { DescripcionEstado } from "../interfaces/modelos";

const MAPA_ESTADOS: Record<number, DescripcionEstado> = {
  1: "Exitoso",
  3: "Fallido",
  4: "Abortado",
  5: "Abortado",
  6: "En ejecución",
  8: "Suspendido",
  15: "Fallido",
};

export function mapearEstado(codigoEstado: number): DescripcionEstado {
  return MAPA_ESTADOS[codigoEstado] ?? "En ejecución";
}

export function esEstadoExitoso(codigoEstado: number): boolean {
  return mapearEstado(codigoEstado) === "Exitoso";
}

export function calcularDuracionMinutos(
  fechaInicio: Date | null,
  fechaFin: Date | null,
): number {
  if (!fechaInicio || !fechaFin) {
    return 0;
  }
  const diferenciaMs = fechaFin.getTime() - fechaInicio.getTime();
  return Math.round((diferenciaMs / 60000) * 100) / 100;
}

export function calcularProgreso(codigoEstado: number): number {
  const descripcion = mapearEstado(codigoEstado);
  if (descripcion === "Exitoso") {
    return 100;
  }
  if (descripcion === "En ejecución") {
    return 50;
  }
  return 0;
}

export function normalizarFecha(valor: unknown): Date | null {
  if (valor instanceof Date) {
    return valor;
  }
  if (typeof valor === "string" || typeof valor === "number") {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
  return null;
}

export function aEnteroSeguro(valor: unknown): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}
