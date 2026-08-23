/**
 * Ingesta única del conocimiento documental semilla (RAG, Fase 1) desde
 * fixtures/conocimiento/*.md hacia documentos_conocimiento(_chunks).
 *
 * Uso: bun run --cwd web rag:ingest
 * Requiere SUPABASE_SERVICE_ROLE_KEY y VOYAGE_API_KEY en el entorno.
 *
 * Es un script administrativo de una sola vez (igual que correr
 * supabase/seed.sql a mano), no un endpoint de la app — por eso es de los
 * pocos lugares fuera de mcp/src/lib/auth.ts que usa la clave de servicio.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { generarEmbedding } from "../src/lib/inteligencia/rag/embeddings";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARPETA_FIXTURES = join(__dirname, "..", "..", "fixtures", "conocimiento");

// Todos tier "C": son explicaciones redactadas por el equipo (contexto
// curado), no el documento oficial en sí — ver web/src/lib/inteligencia/
// trust/tiers.ts para el criterio de tiers.
const TIER_POR_DEFECTO = "C";

function extraerTitulo(contenido: string, archivo: string): string {
  const primeraLinea = contenido.split("\n").find((l) => l.startsWith("# "));
  return primeraLinea ? primeraLinea.replace(/^#\s+/, "").trim() : archivo;
}

/** Trocea por párrafos, uniendo párrafos muy cortos para no generar chunks diminutos. */
function trocear(contenido: string): string[] {
  const parrafos = contenido
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let actual = "";
  for (const parrafo of parrafos) {
    if (actual.length > 0 && actual.length + parrafo.length > 800) {
      chunks.push(actual);
      actual = parrafo;
    } else {
      actual = actual ? `${actual}\n\n${parrafo}` : parrafo;
    }
  }
  if (actual) chunks.push(actual);
  return chunks;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  if (!process.env.VOYAGE_API_KEY) throw new Error("Falta VOYAGE_API_KEY.");

  const supabase = createClient(url, secret, { auth: { persistSession: false } });
  const archivos = readdirSync(CARPETA_FIXTURES).filter((f) => f.endsWith(".md"));

  console.log(`Encontrados ${archivos.length} documentos en ${CARPETA_FIXTURES}`);

  for (const archivo of archivos) {
    const contenido = readFileSync(join(CARPETA_FIXTURES, archivo), "utf-8");
    const titulo = extraerTitulo(contenido, archivo);

    // Idempotente: si ya existe un documento con este título, se reemplaza
    // (borra sus chunks y se re-inserta), así se puede correr el script
    // varias veces sin duplicar contenido.
    const { data: existente } = await supabase
      .from("documentos_conocimiento")
      .select("id")
      .eq("titulo", titulo)
      .maybeSingle();

    if (existente) {
      await supabase.from("documentos_conocimiento_chunks").delete().eq("documento_id", existente.id);
      await supabase.from("documentos_conocimiento").delete().eq("id", existente.id);
    }

    const { data: documento, error: errorDocumento } = await supabase
      .from("documentos_conocimiento")
      .insert({ titulo, fuente_url: null, tier: TIER_POR_DEFECTO })
      .select("id")
      .single();

    if (errorDocumento || !documento) {
      console.error(`No se pudo crear el documento "${titulo}": ${errorDocumento?.message}`);
      continue;
    }

    const chunks = trocear(contenido);
    console.log(`"${titulo}" → ${chunks.length} chunk(s)`);

    for (const [orden, chunk] of chunks.entries()) {
      const embedding = await generarEmbedding(chunk, "document");
      if (!embedding) {
        console.error("generarEmbedding devolvió null pese a tener VOYAGE_API_KEY — revisa la API key.");
        continue;
      }

      const { error: errorChunk } = await supabase.from("documentos_conocimiento_chunks").insert({
        documento_id: documento.id,
        contenido: chunk,
        embedding,
        orden,
      });
      if (errorChunk) console.error(`No se pudo insertar el chunk ${orden} de "${titulo}": ${errorChunk.message}`);
    }
  }

  console.log("Listo.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
