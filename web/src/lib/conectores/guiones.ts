import type { FinancialDataConnector, PasoGuion } from "./tipos";

const MS = { corto: 900, medio: 1600, largo: 2400 };

/**
 * Paso de OTP: si la fuente lo puede "detectar" solo en el correo autorizado
 * (sección 12 del pedido) es un paso automático breve; si no, el usuario
 * tiene que ingresarlo a mano.
 */
function pasoOtp(fuente: FinancialDataConnector, contexto: "registro" | "recuperacion"): PasoGuion {
  if (fuente.otpAutoDetectable) {
    return {
      kind: "auto",
      estado: "requires_otp",
      mensaje: `${fuente.nombre} envió un código; lo detectamos automáticamente en tu correo autorizado.`,
      duracionMs: MS.medio,
    };
  }
  return {
    kind: "espera_usuario",
    estado: "requires_otp",
    mensaje:
      contexto === "registro"
        ? `${fuente.nombre} envió un código de verificación para tu registro. No pudimos detectarlo — ingrésalo tú.`
        : `${fuente.nombre} envió un código para confirmar la recuperación. No pudimos detectarlo — ingrésalo tú.`,
    accionEsperada: "otp",
  };
}

/**
 * Arma el guion completo de una fuente a partir de su configuración de
 * catálogo. Toda fuente resuelve primero el ciclo de vida de cuenta
 * (registro / recuperar clave / login directo, secciones 9, 10 y 13 del
 * pedido) antes de llegar a la extracción de datos — ninguna lo saltea.
 */
export function construirGuion(fuente: FinancialDataConnector): PasoGuion[] {
  const pasos: PasoGuion[] = [
    {
      kind: "auto",
      estado: "preparing",
      mensaje: `Verificando si ya tienes cuenta en ${fuente.nombre}…`,
      duracionMs: MS.corto,
    },
  ];

  switch (fuente.escenarioCuenta) {
    case "sin_cuenta": {
      pasos.push({
        kind: "espera_usuario",
        estado: "requires_registration",
        mensaje:
          fuente.camposAdicionalesRequeridos.length > 0
            ? `${fuente.nombre} necesita confirmar un dato adicional para crear tu cuenta.`
            : `Creamos tu cuenta en ${fuente.nombre} con los datos de tu perfil de Pa'lante.`,
        accionEsperada: "registro_campos",
      });
      if (fuente.requiereCaptchaRegistro) {
        pasos.push({
          kind: "espera_usuario",
          estado: "requires_captcha",
          mensaje: `${fuente.nombre} pide una verificación adicional para completar el registro.`,
          accionEsperada: "captcha",
        });
      }
      if (fuente.requiereOtpRegistro) {
        pasos.push(pasoOtp(fuente, "registro"));
      }
      pasos.push({
        kind: "auto",
        estado: "processing",
        mensaje: `Cuenta creada en ${fuente.nombre}.`,
        duracionMs: MS.medio,
      });
      break;
    }
    case "cuenta_existente_recuperar_clave": {
      pasos.push({
        kind: "espera_usuario",
        estado: "requires_password_recovery",
        mensaje: `Ya tienes una cuenta en ${fuente.nombre}, pero no conocemos tu contraseña.`,
        accionEsperada: "iniciar_recuperacion",
      });
      if (fuente.requiereCaptchaRecuperacion) {
        pasos.push({
          kind: "espera_usuario",
          estado: "requires_captcha",
          mensaje: `${fuente.nombre} pide una verificación adicional para recuperar el acceso.`,
          accionEsperada: "captcha",
        });
      }
      pasos.push(pasoOtp(fuente, "recuperacion"));
      pasos.push({
        kind: "auto",
        estado: "processing",
        mensaje: `Acceso recuperado en ${fuente.nombre}.`,
        duracionMs: MS.medio,
      });
      break;
    }
    case "cuenta_existente_login_directo": {
      pasos.push({
        kind: "auto",
        estado: "requires_login",
        mensaje: `Iniciando sesión en ${fuente.nombre}…`,
        duracionMs: MS.corto,
      });
      if (fuente.requiereCaptchaLoginDirecto) {
        pasos.push({
          kind: "espera_usuario",
          estado: "requires_captcha",
          mensaje: `${fuente.nombre} pide una verificación adicional.`,
          accionEsperada: "captcha",
        });
      }
      break;
    }
  }

  pasos.push({
    kind: "auto",
    estado: "processing",
    mensaje: `Consultando información en ${fuente.nombre}…`,
    duracionMs: MS.medio,
  });
  pasos.push({
    kind: "auto",
    estado: "extracting",
    mensaje: `Extrayendo y normalizando resultados de ${fuente.nombre}…`,
    duracionMs: MS.largo,
  });

  const final = fuente.resultado;
  pasos.push({ kind: "auto", estado: final.tipo, mensaje: final.resumen, duracionMs: 0 });

  return pasos;
}
