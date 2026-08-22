import type { TipoHallazgo } from "@/types/finance";

/**
 * Estados de una conexión a una fuente externa. Ninguna fuente salta directo
 * a extraer datos: siempre resuelve primero si el usuario ya tiene cuenta
 * ahí (registro, recuperación de clave, o login directo) antes de continuar.
 */
export type EstadoConexion =
  | "pending"
  | "preparing"
  | "requires_registration"
  | "requires_login"
  | "requires_password_recovery"
  | "requires_user_action"
  | "requires_captcha"
  | "requires_otp"
  | "processing"
  | "extracting"
  | "completed"
  | "completed_no_data"
  | "failed"
  | "temporarily_unavailable";

export const ESTADOS_TERMINALES: readonly EstadoConexion[] = [
  "completed",
  "completed_no_data",
  "failed",
  "temporarily_unavailable",
];

export type AccionEsperada = "registro_campos" | "captcha" | "otp" | "iniciar_recuperacion";

export type PasoAutomatico = {
  kind: "auto";
  estado: EstadoConexion;
  mensaje: string;
  duracionMs: number;
};

export type PasoEsperaUsuario = {
  kind: "espera_usuario";
  estado: EstadoConexion;
  mensaje: string;
  accionEsperada: AccionEsperada;
};

export type PasoGuion = PasoAutomatico | PasoEsperaUsuario;

export type CampoAdicional = {
  clave: string;
  etiqueta: string;
};

export type CategoriaFuente =
  | "credito"
  | "tributario"
  | "pension"
  | "salud"
  | "vehiculos"
  | "propiedades"
  | "legal"
  | "empresarial";

export type EscenarioCuenta =
  | "sin_cuenta"
  | "cuenta_existente_login_directo"
  | "cuenta_existente_recuperar_clave";

export type HallazgoFixture = {
  tipo: TipoHallazgo;
  periodo?: string;
  datos: Record<string, unknown>;
  confianza: number;
};

export type ResultadoConector =
  | { tipo: "completed"; resumen: string; hallazgos: HallazgoFixture[] }
  | { tipo: "completed_no_data"; resumen: string }
  | { tipo: "failed"; resumen: string };

/**
 * Contrato común a toda fuente del catálogo (sección 8/30 del pedido). Cada
 * entrada describe el ciclo de vida de cuenta y el resultado simulado; el
 * guion completo lo arma `construirGuion` a partir de estos datos, así que
 * agregar una fuente nueva es solo agregar una entrada al catálogo.
 */
export type FinancialDataConnector = {
  id: string;
  nombre: string;
  categoria: CategoriaFuente;
  descripcion: string;
  escenarioCuenta: EscenarioCuenta;
  camposAdicionalesRequeridos: CampoAdicional[];
  requiereCaptchaRegistro: boolean;
  requiereOtpRegistro: boolean;
  requiereCaptchaRecuperacion: boolean;
  requiereCaptchaLoginDirecto: boolean;
  /** Si el OTP se "detecta" solo desde el correo autorizado o exige entrada manual. */
  otpAutoDetectable: boolean;
  resultado: ResultadoConector;
};

export type CampoSolicitado = {
  campos: CampoAdicional[];
  valores?: Record<string, string>;
  guardarEnPerfil?: boolean;
};

/** Fila de `conexiones_fuente`, en camelCase para el resto de la app. */
export type ConexionFuente = {
  id: string;
  userId: string;
  fuenteId: string;
  estado: EstadoConexion;
  pasoActual: number;
  mensaje: string | null;
  campoSolicitado: CampoSolicitado | null;
  resultadoResumen: Record<string, unknown> | null;
  iniciadoEn: string;
  actualizadoEn: string;
  completadoEn: string | null;
};
