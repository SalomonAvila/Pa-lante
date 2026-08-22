export default function TerminosPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6 py-16">
      <h1 className="headline-md text-on-surface">Términos y condiciones</h1>
      <p className="body-md text-on-surface-variant">
        Pa&apos;lante es una herramienta de diagnóstico, organización y seguimiento financiero. No
        constituye asesoría de inversión ni recomienda productos financieros específicos.
      </p>
      <p className="body-md text-on-surface-variant">
        Las conexiones con fuentes externas y la extracción de documentos se realizan únicamente con
        tu autorización explícita, y puedes revocarlas en cualquier momento desde Configuración →
        Privacidad.
      </p>
      <p className="text-sm text-on-surface-variant">
        Documento de referencia para la hackathon — no reemplaza términos y condiciones legales
        completos.
      </p>
    </div>
  );
}
