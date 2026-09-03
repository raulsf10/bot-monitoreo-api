import { CasoPrueba } from '../../shared/interfaces/modelos';

export const CASOS_PRECONFIGURADOS: CasoPrueba[] = [
  {
    id: 'caso-01-excepcion-lunes',
    nombre: 'Cierre dominical FACT_VENTAS',
    categoria: 'Excepción Lunes',
    descripcion:
      'Validación de la regla volumétrica cuando el volumen baja por cierre de fin de semana en día lunes.',
    diaSemana: 'Monday',
    horaSimulada: '03:15',
    prompt:
      'Es lunes 03:15. El workflow wf_load_fact_ventas cargó 70,000 registros en FACT_VENTAS. ¿Cómo clasificas esta situación?',
  },
  {
    id: 'caso-02-alerta-martes',
    nombre: 'Caída volumétrica en martes',
    categoria: 'Alerta Martes',
    descripcion:
      'Validación de alerta crítica cuando el volumen cae por debajo del umbral en un día distinto a lunes.',
    diaSemana: 'Tuesday',
    horaSimulada: '02:40',
    prompt:
      'Es martes 02:40. FACT_VENTAS registró 85,000 filas en la última corrida de wf_load_fact_ventas. Evalúa la severidad.',
  },
  {
    id: 'caso-03-base-datos',
    nombre: 'Lentitud en workflows de dimensiones',
    categoria: 'Base de Datos',
    descripcion:
      'Diagnóstico de degradación de rendimiento sostenida en la carga de dimensiones.',
    diaSemana: 'Wednesday',
    horaSimulada: '01:20',
    prompt:
      'El workflow wf_load_dim_producto lleva tres noches consecutivas duplicando su tiempo de ejecución. Da un diagnóstico y la acción correctiva a nivel de base de datos.',
  },
  {
    id: 'caso-04-seguridad',
    nombre: 'Reinicio seguro de workflow',
    categoria: 'Seguridad',
    descripcion:
      'Validación del manejo de credenciales y parámetros correctos para comandos pmcmd.',
    diaSemana: 'Thursday',
    horaSimulada: '04:05',
    prompt:
      'Necesito reiniciar el workflow wf_load_stg_clientes desde línea de comandos. Genera el comando pmcmd correspondiente.',
  },
  {
    id: 'caso-05-impacto-cascada',
    nombre: 'Simulación de impacto en cascada',
    categoria: 'Impacto Cascada',
    descripcion:
      'Simulación de riesgo por falla de un workflow raíz y su impacto en dependencias descendentes.',
    diaSemana: 'Friday',
    horaSimulada: '00:50',
    prompt:
      'Simula el riesgo si wf_load_stg_clientes falla y no completa antes de las 05:00, considerando los workflows y tablas que dependen de él.',
  },
];
