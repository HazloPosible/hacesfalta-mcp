import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
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

const apiUrl = process.env.HACESFALTA_API_URL;
const apiKey = process.env.HACESFALTA_API_KEY;

if (!apiUrl || !apiKey) {
  console.error("Missing HACESFALTA_API_URL or HACESFALTA_API_KEY in .env");
  process.exit(1);
}

initClient({ apiUrl, apiKey });

function createMcpServer(): McpServer {
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

// --- Stdio transport (local: Claude Desktop, MCP Inspector) ---

async function startStdio() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// --- Streamable HTTP transport (remote: ChatGPT, Claude web/mobile, etc.) ---

async function startHttp() {
  const PORT = parseInt(process.env.PORT || "3000", 10);

  const transports = new Map<string, StreamableHTTPServerTransport>();

  function parseBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch {
          reject(new Error("Invalid JSON"));
        }
      });
      req.on("error", reject);
    });
  }

  function sendJson(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }

  function jsonrpcError(res: ServerResponse, status: number, code: number, message: string) {
    sendJson(res, status, { jsonrpc: "2.0", error: { code, message }, id: null });
  }

  const httpServer = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url !== "/mcp") {
      if (req.url === "/health") {
        sendJson(res, 200, { status: "ok" });
        return;
      }
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    try {
      if (req.method === "POST") {
        const body = await parseBody(req);

        if (sessionId && transports.has(sessionId)) {
          await transports.get(sessionId)!.handleRequest(req, res, body);
          return;
        }

        if (!sessionId && isInitializeRequest(body)) {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              transports.set(sid, transport);
            },
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid) transports.delete(sid);
          };

          const server = createMcpServer();
          await server.connect(transport);
          await transport.handleRequest(req, res, body);
          return;
        }

        jsonrpcError(res, 400, -32000, "Bad Request: No valid session ID provided");
        return;
      }

      if (req.method === "GET") {
        if (!sessionId || !transports.has(sessionId)) {
          jsonrpcError(res, 400, -32000, "Bad Request: No valid session ID");
          return;
        }
        await transports.get(sessionId)!.handleRequest(req, res);
        return;
      }

      if (req.method === "DELETE") {
        if (!sessionId || !transports.has(sessionId)) {
          jsonrpcError(res, 400, -32000, "Bad Request: No valid session ID");
          return;
        }
        await transports.get(sessionId)!.handleRequest(req, res);
        return;
      }

      res.writeHead(405);
      res.end("Method not allowed");
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        jsonrpcError(res, 500, -32603, "Internal server error");
      }
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`HaceFalta MCP server (Streamable HTTP) listening on port ${PORT}`);
    console.log(`  POST/GET/DELETE http://localhost:${PORT}/mcp`);
    console.log(`  Health check:   http://localhost:${PORT}/health`);
  });

  process.on("SIGINT", async () => {
    for (const transport of transports.values()) {
      await transport.close();
    }
    httpServer.close();
    process.exit(0);
  });
}

// --- Selector de transporte ---

const transport = process.env.TRANSPORT || "stdio";

if (transport === "http") {
  await startHttp();
} else {
  await startStdio();
}
