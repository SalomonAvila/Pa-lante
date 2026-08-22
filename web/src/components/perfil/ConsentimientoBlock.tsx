import { Card } from "@/components/ui/Card";
import type { TipoConsentimiento } from "@/lib/perfil/consentimientos";

type TextoConsentimiento = {
  titulo: string;
  texto: string;
  finalidades: string[];
  checkboxLabel: string;
  opcional?: boolean;
};

export const TEXTOS_CONSENTIMIENTO: Record<TipoConsentimiento, TextoConsentimiento> = {
  tratamiento_basico: {
    titulo: "Autorización para el tratamiento de información",
    texto:
      "Al continuar, autorizas a la plataforma a recolectar, consultar, procesar, organizar y almacenar la información que proporciones directamente y aquella que autorices obtener de fuentes externas, con la finalidad exclusiva de construir, actualizar y analizar tu perfil financiero y proporcionarte herramientas relacionadas con tu situación y objetivos financieros.\n\nLa información será tratada de acuerdo con la política de privacidad y las normas aplicables de protección de datos personales. No venderemos tus datos personales ni los utilizaremos para finalidades diferentes de las informadas sin una nueva autorización cuando esta sea necesaria.\n\nAlgunas funcionalidades pueden requerir que proveedores tecnológicos procesen información únicamente para prestar el servicio autorizado. Podrás conocer, actualizar, rectificar y, cuando corresponda, solicitar la eliminación de tu información o revocar autorizaciones otorgadas.",
    finalidades: ["recoleccion", "almacenamiento", "analisis_perfil_financiero"],
    checkboxLabel: "He leído y autorizo el tratamiento de mis datos personales.",
  },
  perfil_financiero: {
    titulo: "Construcción del perfil financiero",
    texto:
      "Autorizas a Pa'lante a combinar la información que proporciones con la que obtengamos de las fuentes que actives, para construir un perfil financiero único y mantenerlo actualizado.",
    finalidades: ["combinar_fuentes", "normalizacion_perfil"],
    checkboxLabel: "Autorizo la construcción de mi perfil financiero a partir de varias fuentes.",
  },
  conexion_externa: {
    titulo: "Conexión con entidades externas",
    texto:
      "Autorizas a Pa'lante a iniciar, en tu nombre, el proceso de consulta ante las entidades que actives en el siguiente paso (DataCrédito, DIAN, Colpensiones, RUNT, entre otras). Cada entidad autorizada queda registrada individualmente y puedes desconectarla cuando quieras desde Configuración → Privacidad.",
    finalidades: ["consulta_entidades_externas"],
    checkboxLabel: "Autorizo la conexión con las entidades externas que seleccione.",
  },
  lectura_correo_otp: {
    titulo: "Verificación automática de códigos (opcional)",
    texto:
      "Puedes permitir que Pa'lante identifique automáticamente correos de verificación relacionados con las conexiones que estás realizando. El permiso se usa únicamente para localizar los códigos o enlaces necesarios para completar esas verificaciones — nunca para leer correos no relacionados, analizar tus conversaciones, ni enviar o eliminar mensajes.",
    finalidades: ["deteccion_otp_conexiones"],
    checkboxLabel: "Autorizo la detección automática de códigos de verificación en mi correo.",
    opcional: true,
  },
  procesamiento_documentos: {
    titulo: "Procesamiento de documentos financieros",
    texto:
      "Autorizas a Pa'lante a procesar (mediante extracción automática y revisión posterior tuya) los documentos de identidad y financieros que subas, con el único fin de construir tu perfil financiero.",
    finalidades: ["ocr_documentos", "extraccion_datos_financieros"],
    checkboxLabel: "Autorizo el procesamiento de los documentos que suba.",
  },
};

type Props = {
  tipo: TipoConsentimiento;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ConsentimientoBlock({ tipo, checked, onChange }: Props) {
  const contenido = TEXTOS_CONSENTIMIENTO[tipo];

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-on-surface">{contenido.titulo}</h3>
        {contenido.opcional && <span className="label-sm text-on-surface-variant">Opcional</span>}
      </div>
      <p className="whitespace-pre-line body-md text-on-surface-variant">{contenido.texto}</p>
      <label className="flex items-start gap-2 body-md text-on-surface">
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={!contenido.opcional}
        />
        {contenido.checkboxLabel}
      </label>
      {tipo === "tratamiento_basico" && (
        <div className="flex gap-4 text-sm">
          <a href="/legal/tratamiento-de-datos" className="text-primary underline" target="_blank" rel="noreferrer">
            Ver política de tratamiento de datos
          </a>
          <a href="/legal/terminos" className="text-primary underline" target="_blank" rel="noreferrer">
            Ver términos y condiciones
          </a>
        </div>
      )}
    </Card>
  );
}
