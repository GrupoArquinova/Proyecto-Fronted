/** Respuesta de GET /api/admin/metricas?desde=&hasta= (administrador y comercial). */
export interface Metricas {
  periodo: { desde: string; hasta: string };
  solicitudes: {
    total: number;
    porSemana: { semana: string; inicio: string; total: number }[];
    porProyecto: { proyectoId: number; proyecto: string; total: number }[];
    porEstado: { estado: string; total: number }[];
  };
  lotes: {
    porEstado: { estado: string; total: number }[];
    porProyecto: { proyectoId: number; proyecto: string; disponibles: number; reservados: number; vendidos: number; total: number }[];
  };
  analitica: {
    visitasPorProyecto: { proyectoId: number; proyecto: string; vistas: number }[];
    eventosPorTipo: { tipo: string; total: number }[];
    visitasPorDia: { fecha: string; total: number }[];
    embudo: { vistasProyecto: number; clicksWhatsapp: number; formulariosEnviados: number; descargasBrochure: number };
  };
  chat: {
    totalPreguntas: number;
    temas: { tema: string; total: number }[];
    /** Solo viene lleno para el administrador. */
    recientes: { fecha: string; pregunta: string; tema: string }[];
  };
}

/** Lo que se pide al backend: fechas locales en formato YYYY-MM-DD. */
export interface PeriodoMetricas {
  desde: string;
  hasta: string;
}
