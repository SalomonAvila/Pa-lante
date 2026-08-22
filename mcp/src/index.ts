import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetTransacciones } from "./tools/getTransacciones.js";

const server = new McpServer({
  name: "palante-mcp",
  version: "0.1.0",
});

registerGetTransacciones(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Error iniciando el servidor MCP de Pa'lante:", error);
  process.exit(1);
});
