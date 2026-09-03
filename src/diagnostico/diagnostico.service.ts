import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Content, GoogleGenerativeAI } from '@google/generative-ai';
import { RespuestaDiagnosticoDto } from './dto/respuesta-diagnostico.dto';
import { SolicitudDiagnosticoDto } from './dto/solicitud-diagnostico.dto';
import { construirInstruccionSistema } from './prompt-sistema';

const CONFIRMACION_SISTEMA =
  'Entendido. Sonda de Monitoreo Pasiva activa. Listo para diagnóstico.';

@Injectable()
export class DiagnosticoService {
  private readonly logger = new Logger(DiagnosticoService.name);
  private readonly cliente: GoogleGenerativeAI | null;
  private readonly modelo: string;
  private readonly temperatura: number;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('gemini.apiKey');
    this.cliente = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.modelo = this.config.get<string>('GEMINI_MODELO')?.trim() || 'gemini-1.5-flash';
    this.temperatura = Number(this.config.get('GEMINI_TEMPERATURA')) || 0.1;
  }

  async procesarDiagnostico(
    solicitud: SolicitudDiagnosticoDto,
  ): Promise<RespuestaDiagnosticoDto> {
    if (!this.cliente) {
      throw new ServiceUnavailableException(
        'El servicio de diagnóstico no está configurado (falta GEMINI_API_KEY).',
      );
    }

    const instruccionSistema = construirInstruccionSistema(
      solicitud.elementosMonitoreados,
      solicitud.reglasWorkflows,
      solicitud.reglasTablas,
    );

    const historial: Content[] = [
      { role: 'user', parts: [{ text: instruccionSistema }] },
      { role: 'model', parts: [{ text: CONFIRMACION_SISTEMA }] },
      ...solicitud.historial.map<Content>((mensaje) => ({
        role: mensaje.rol,
        parts: [{ text: mensaje.contenido }],
      })),
    ];

    const modeloGenerativo = this.cliente.getGenerativeModel({ model: this.modelo });
    const chat = modeloGenerativo.startChat({
      history: historial,
      generationConfig: { temperature: this.temperatura },
    });

    try {
      const resultado = await chat.sendMessage(solicitud.mensaje);
      return { respuesta: resultado.response.text() };
    } catch (error) {
      const causa = (error as Error).message ?? String(error);
      this.logger.error(`Error Gemini [modelo=${this.modelo}]: ${causa}`);
      throw new ServiceUnavailableException(
        `No fue posible obtener respuesta del modelo de diagnóstico. Causa: ${causa}`,
      );
    }
  }

  // Añade esto temporalmente a tu servicio y llámalo al iniciar
  async debugModels() {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.get('GEMINI_API_KEY')}`);
      const data = await response.json();
      console.log('Modelos disponibles para tu API Key:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Error listando modelos:', e);
    }
  }

}
