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
import { z } from "zod";
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

  const textOutputSchema = { result: z.string() };

  server.registerTool(
    "buscar_oportunidades",
    {
      title: "Search Volunteer Opportunities",
      description: "Busca oportunidades de voluntariado en España. Permite filtrar por provincia, categoría, frecuencia, horario, edad, y más. Devuelve un listado resumido con enlaces de inscripción.",
      inputSchema: buscarSchema.shape,
      outputSchema: textOutputSchema,
      annotations: { title: "Search Volunteer Opportunities", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (params) => {
      const result = await buscarExecute(params);
      return { structuredContent: { result }, content: [{ type: "text", text: result }] };
    }
  );

  server.registerTool(
    "detalle_oportunidad",
    {
      title: "Get Opportunity Details",
      description: "Obtiene el detalle completo de una oportunidad de voluntariado: descripción, perfil buscado, fechas, horarios, competencias, ODS y enlace de inscripción.",
      inputSchema: detalleSchema.shape,
      outputSchema: textOutputSchema,
      annotations: { title: "Get Opportunity Details", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (params) => {
      const result = await detalleExecute(params);
      return { structuredContent: { result }, content: [{ type: "text", text: result }] };
    }
  );

  server.registerTool(
    "listar_categorias",
    {
      title: "List Volunteer Categories",
      description: "Lista todas las categorías de voluntariado disponibles (ej: Mayores, Infancia, Medio Ambiente) con el número de oportunidades en cada una.",
      outputSchema: textOutputSchema,
      annotations: { title: "List Volunteer Categories", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      const result = await categoriasExecute();
      return { structuredContent: { result }, content: [{ type: "text", text: result }] };
    }
  );

  server.registerTool(
    "listar_provincias",
    {
      title: "List Spanish Provinces",
      description: "Lista todas las provincias españolas con oportunidades de voluntariado y el número de oportunidades en cada una.",
      outputSchema: textOutputSchema,
      annotations: { title: "List Spanish Provinces", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      const result = await provinciasExecute();
      return { structuredContent: { result }, content: [{ type: "text", text: result }] };
    }
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

    if (url.pathname === "/.well-known/openai-apps-challenge") {
      return new Response("HetFE7DOXpsqNytnjBXivUQYSX-5aS8IUE0Tsv8IHXQ", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    const server = createServer(env);
    return createMcpHandler(server)(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
