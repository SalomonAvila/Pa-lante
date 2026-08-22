import { auth } from "@/auth";
import { listBankMessages } from "@/lib/gmail/listBankMessages";
import { ProgressPath } from "@/components/dashboard/ProgressPath";
import { MascotFeedback } from "@/components/shared/MascotFeedback";
import { Card } from "@/components/ui/Card";

async function GmailCheck() {
  const session = await auth();

  if (!session?.accessToken) {
    return null;
  }

  let emails: Awaited<ReturnType<typeof listBankMessages>> | null = null;
  let failed = false;

  try {
    emails = await listBankMessages(session.accessToken, { max: 5 });
  } catch {
    failed = true;
  }

  return (
    <Card elevated className="w-full max-w-md">
      <p className="label-sm uppercase text-on-surface-variant">
        Verificación de Gmail
      </p>
      {failed && (
        <p className="mt-2 body-md text-debt">
          No pudimos leer tu Gmail todavía. Intenta conectar de nuevo desde
          /intake.
        </p>
      )}
      {!failed && emails?.length === 0 && (
        <p className="mt-2 body-md text-on-surface-variant">
          Tu Gmail está conectado, pero no encontramos correos bancarios
          todavía (revisa los dominios filtrados en listBankMessages).
        </p>
      )}
      {!failed && emails && emails.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {emails.map((email) => (
            <li key={email.id} className="body-md text-on-surface">
              {email.subject || "(sin asunto)"}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function JourneyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <MascotFeedback mood="ahorrando" size={96} housed />
        <h1 className="headline-md text-on-surface">Tu camino</h1>
        <p className="max-w-md body-md text-on-surface-variant">
          Cada paso de tu plan te acerca a tu meta. Los nodos se van
          completando a medida que avanzas.
        </p>
      </div>
      <GmailCheck />
      <ProgressPath
        steps={[
          { label: "Diagnóstico", status: "done" },
          { label: "Primer aporte", status: "done" },
          { label: "Mes 2", status: "current" },
          { label: "Mes 3", status: "upcoming" },
          { label: "Meta", status: "upcoming" },
        ]}
      />
    </div>
  );
}
