# team-35 Platanus Hack 26: Bogotá Project

**Current project logo:** project-logo.png

<img src="./project-logo.png" alt="Project Logo" width="200" />

Track: 🔑 Access

team-35

- Ivan Santiago Lastra ([@ivan140809](https://github.com/ivan140809))
- Salomon Alfredo Avila Larrotta ([@salomonavila](https://github.com/salomonavila))
- Adrian Ruiz ([@adrianrrruiz](https://github.com/adrianrrruiz))
- David Felipe Vargas Cardenas ([@davidvargas-ctrl](https://github.com/davidvargas-ctrl))

## Qué es Pa'lante

**Infraestructura de datos financieros personales.** El contexto financiero de una persona existe, pero está atrapado en correos bancarios, PDFs con clave y portales de entidades — Pa'lante lo extrae, lo normaliza a un modelo único y trazable, y lo distribuye por API y por servidor MCP con permiso explícito del dueño.

Descripción completa: [`project-description.md`](./project-description.md) · Deploy: <https://pa-lante-web.vercel.app>

### Dos frentes, un solo modelo de datos

| Frente | Qué es | Dónde vive |
|---|---|---|
| **Web app** | Registro, verificación de identidad, onboarding conversacional por voz, portal donde el usuario ve su cobertura y administra accesos | [`web/`](./web) |
| **Servidor MCP** | Expone el perfil financiero normalizado como tools para agentes de IA externos, con Bearer token propio y bitácora de accesos | [`mcp/`](./mcp) |
| **Base de datos** | Esquema versionado (Supabase/Postgres + RLS), cuenta semilla de demo | [`supabase/`](./supabase) |

La fuente de verdad de la arquitectura, decisiones y restricciones del producto es [`CLAUDE.md`](./CLAUDE.md).

### Correr en local

```bash
bun install
bunx supabase link --project-ref <tu-ref> && bunx supabase db push   # o pegar migrations/ en el SQL Editor
bun run dev       # web app en :3000
bun run mcp:dev   # servidor MCP en :3333
```

Variables de entorno: ver [`.env.example`](./.env.example).

## ⚠️ Deploying & integrations (Vercel, Render, etc.)

Deploy platforms like **Vercel**, **Render** or **Netlify** can only connect to
repositories **you own** — they can't be granted access to this organization repo.
To deploy (or add any integration) while keeping your commits here, mirror your
code to a personal repo:

1. Create a **personal** repository on your own GitHub account.
2. Point your local `origin` at **both** repos, so a single `git push` updates each one:

   ```bash
   # this org repo (keep it as a push target)...
   git remote set-url --add --push origin https://github.com/platanus-hack/platanus-hack-26-co-team-35.git
   # ...and your personal repo
   git remote set-url --add --push origin https://github.com/<your-user>/<your-repo>.git
   ```

   From now on `git push` sends every commit to **both** repositories.
3. Connect your deploy service (Vercel, Render, …) to your **personal** repo and deploy from there.

Your commits stay mirrored here for judging, while the deploy runs from the repo you control.

Have fun! 🚀
