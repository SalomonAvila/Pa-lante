/**
 * Entre `signUp` y la verificación del correo, Supabase todavía no da
 * sesión — así que los datos del formulario viajan en sessionStorage y se
 * envían a `/api/perfil/persona` recién cuando `verifyOtp` la establece.
 */
export const CLAVE_SESSION_REGISTRO = "palante_registro_datos";

export type DatosRegistro = {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaExpedicion: string;
  fechaNacimiento: string;
  direccion: string;
  departamento: string;
  municipio: string;
  celular: string;
  correo: string;
  tipoPersona: "natural" | "juridica";
  sexo: string;
  identidadGenero: string;
};
