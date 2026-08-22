import { getGmailClient } from "@/lib/gmail/client";

// Dominios conocidos de los bancos que menciona CLAUDE.MD. Son los dominios
// públicos reales de cada entidad, pero el remitente exacto de notificación
// (buzón específico) varía y debe verificarse contra correos reales de
// prueba antes de confiar en este filtro para producción.
const BANK_DOMAINS = [
  "bancolombia.com.co",
  "davivienda.com",
  "nequi.com.co",
  "daviplata.com",
];

export type RawEmail = {
  id: string;
  subject: string;
  from: string;
  date: string;
  bodyText: string;
};

function decodeBody(payload: {
  body?: { data?: string | null } | null;
  parts?: { mimeType?: string | null; body?: { data?: string | null } | null }[] | null;
}): string {
  const partText = payload.parts?.find((p) => p.mimeType === "text/plain");
  const data = partText?.body?.data ?? payload.body?.data;
  if (!data) return "";
  return Buffer.from(data, "base64url").toString("utf-8");
}

export async function listBankMessages(
  accessToken: string,
  options: { max?: number } = {},
): Promise<RawEmail[]> {
  const gmail = getGmailClient(accessToken);
  const query = BANK_DOMAINS.map((domain) => `from:${domain}`).join(" OR ");

  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: options.max ?? 5,
  });

  const messages = list.data.messages ?? [];

  const full = await Promise.all(
    messages.map((m) =>
      gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "full",
      }),
    ),
  );

  return full.map((res) => {
    const headers = res.data.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value ?? "";

    return {
      id: res.data.id ?? "",
      subject: getHeader("Subject"),
      from: getHeader("From"),
      date: getHeader("Date"),
      bodyText: res.data.payload ? decodeBody(res.data.payload) : "",
    };
  });
}
