/**
 * Cliente REST plano para Voyage AI (partner de embeddings recomendado por
 * Anthropic) — no hay SDK propio en el proyecto, y no lo necesita: es una
 * sola llamada HTTP. Sin VOYAGE_API_KEY, devuelve null y quien llama debe
 * responder "RAG no disponible" en vez de fallar (mismo espíritu que el
 * fallback de MCP_DEMO_TOKEN).
 */
const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODELO_EMBEDDING = "voyage-3";

export async function generarEmbedding(
  texto: string,
  inputType: "query" | "document",
): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ input: [texto], model: MODELO_EMBEDDING, input_type: inputType }),
  });

  if (!res.ok) {
    throw new Error(`Voyage AI respondió ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0]?.embedding ?? null;
}
