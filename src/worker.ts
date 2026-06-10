declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
  interface ExportedHandler<E = unknown> {
    fetch?(request: Request, env: E, ctx: ExecutionContext): Promise<Response>;
  }
}

import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initClient } from "./api/client.js";
import {
  schema as buscarSchema,
  execute as buscarExecute,
} from "./tools/buscar-oportunidades.js";
import {
  schema as detalleSchema,
  execute as detalleExecute,
} from "./tools/detalle-oportunidad.js";
import { execute as categoriasExecute } from "./tools/listar-categorias.js";
import { execute as provinciasExecute } from "./tools/listar-provincias.js";

interface Env {
  HACESFALTA_API_URL: string;
  HACESFALTA_API_KEY: string;
}

function createServer(env: Env): McpServer {
  initClient({ apiUrl: env.HACESFALTA_API_URL, apiKey: env.HACESFALTA_API_KEY });

  const server = new McpServer({
    name: "hacesfalta",
    version: "1.0.0",
  });

  server.tool(
    "buscar_oportunidades",
    "Busca oportunidades de voluntariado en España. Permite filtrar por provincia, categoría, frecuencia, horario, edad, y más. Devuelve un listado resumido con enlaces de inscripción.",
    buscarSchema.shape,
    async (params) => ({
      content: [{ type: "text", text: await buscarExecute(params) }],
    })
  );

  server.tool(
    "detalle_oportunidad",
    "Obtiene el detalle completo de una oportunidad de voluntariado: descripción, perfil buscado, fechas, horarios, competencias, ODS y enlace de inscripción.",
    detalleSchema.shape,
    async (params) => ({
      content: [{ type: "text", text: await detalleExecute(params) }],
    })
  );

  server.tool(
    "listar_categorias",
    "Lista todas las categorías de voluntariado disponibles (ej: Mayores, Infancia, Medio Ambiente) con el número de oportunidades en cada una.",
    async () => ({
      content: [{ type: "text", text: await categoriasExecute() }],
    })
  );

  server.tool(
    "listar_provincias",
    "Lista todas las provincias españolas con oportunidades de voluntariado y el número de oportunidades en cada una.",
    async () => ({
      content: [{ type: "text", text: await provinciasExecute() }],
    })
  );

  return server;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const server = createServer(env);
    return createMcpHandler(server)(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
