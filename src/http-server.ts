#!/usr/bin/env node

/**
 * HTTP Server Entry Point for Docker Deployment
 *
 * Provides Streamable HTTP transport for remote MCP clients.
 * Use src/index.ts for local stdio-based usage.
 *
 * Endpoints:
 *   GET  /health  — liveness probe
 *   POST /mcp     — MCP Streamable HTTP (session-aware)
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  searchDecisions,
  getDecision,
  searchGuidelines,
  getGuideline,
  listTopics,
  getDataFreshness,
} from "./db.js";
import { buildCitation } from "./citation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);
const SERVER_NAME = "french-data-protection-mcp";

let pkgVersion = "0.1.0";
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ) as { version: string };
  pkgVersion = pkg.version;
} catch {
  // fallback
}

// --- Tool definitions (shared with index.ts) ---------------------------------

const TOOLS = [
  {
    name: "fr_dp_search_decisions",
    description:
      "Full-text search across CNIL decisions (deliberations, sanctions, mises en demeure). Returns matching decisions with reference, entity name, fine amount, and GDPR articles cited.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (e.g., 'consentement cookies', 'Google')" },
        type: {
          type: "string",
          enum: ["sanction", "mise_en_demeure", "deliberation", "avis"],
          description: "Filter by decision type. Optional.",
        },
        topic: { type: "string", description: "Filter by topic ID. Optional." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
      required: ["query"],
    },
  },
  {
    name: "fr_dp_get_decision",
    description:
      "Get a specific CNIL decision by reference number (e.g., 'SAN-2022-009').",
    inputSchema: {
      type: "object" as const,
      properties: {
        reference: { type: "string", description: "CNIL decision reference (e.g., 'SAN-2022-009')" },
      },
      required: ["reference"],
    },
  },
  {
    name: "fr_dp_search_guidelines",
    description:
      "Search CNIL guidance documents: guides, recommandations, referentiels, and FAQs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        type: {
          type: "string",
          enum: ["guide", "recommandation", "referentiel", "FAQ"],
          description: "Filter by guidance type. Optional.",
        },
        topic: { type: "string", description: "Filter by topic ID. Optional." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
      required: ["query"],
    },
  },
  {
    name: "fr_dp_get_guideline",
    description: "Get a specific CNIL guidance document by its database ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Guideline database ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "fr_dp_list_topics",
    description: "List all covered data protection topics with French and English names.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "fr_dp_about",
    description: "Return metadata about this MCP server: version, data source, coverage, and tool list.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "fr_dp_list_sources",
    description: "List all data sources used by this MCP server with provenance, license, and update schedule.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "fr_dp_check_data_freshness",
    description: "Check when the database was last updated and report data coverage statistics (record counts, newest dates).",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
];

// --- Zod schemas -------------------------------------------------------------

const SearchDecisionsArgs = z.object({
  query: z.string().min(1),
  type: z.enum(["sanction", "mise_en_demeure", "deliberation", "avis"]).optional(),
  topic: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const GetDecisionArgs = z.object({
  reference: z.string().min(1),
});

const SearchGuidelinesArgs = z.object({
  query: z.string().min(1),
  type: z.enum(["guide", "recommandation", "referentiel", "FAQ"]).optional(),
  topic: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const GetGuidelineArgs = z.object({
  id: z.number().int().positive(),
});

// --- MCP server factory ------------------------------------------------------

function createMcpServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: pkgVersion },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    function textContent(data: unknown) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }

    function errorContent(message: string) {
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true as const,
      };
    }

    function metaBlock() {
      return {
        disclaimer:
          "This is a research tool, not regulatory or legal advice. Verify all references against official CNIL publications before making compliance decisions.",
        data_age:
          "Periodic updates; may lag official CNIL publications. Use fr_dp_check_data_freshness for current status.",
        copyright:
          "Data sourced from CNIL (Commission nationale de l'informatique et des libertés) — official French data protection authority.",
        source_url: "https://www.cnil.fr/",
      };
    }

    try {
      switch (name) {
        case "fr_dp_search_decisions": {
          const parsed = SearchDecisionsArgs.parse(args);
          const results = searchDecisions({
            query: parsed.query,
            type: parsed.type,
            topic: parsed.topic,
            limit: parsed.limit,
          });
          return textContent({ results, count: results.length, _meta: metaBlock() });
        }

        case "fr_dp_get_decision": {
          const parsed = GetDecisionArgs.parse(args);
          const decision = getDecision(parsed.reference);
          if (!decision) {
            return errorContent(`Decision not found: ${parsed.reference}`);
          }
          const decisionRecord = decision as Record<string, unknown>;
          return textContent({
            ...decisionRecord,
            _citation: buildCitation(
              String(decisionRecord.reference ?? parsed.reference),
              String(decisionRecord.title ?? decisionRecord.reference ?? parsed.reference),
              "fr_dp_get_decision",
              { reference: parsed.reference },
              decisionRecord.url as string | undefined,
            ),
            _meta: metaBlock(),
          });
        }

        case "fr_dp_search_guidelines": {
          const parsed = SearchGuidelinesArgs.parse(args);
          const results = searchGuidelines({
            query: parsed.query,
            type: parsed.type,
            topic: parsed.topic,
            limit: parsed.limit,
          });
          return textContent({ results, count: results.length, _meta: metaBlock() });
        }

        case "fr_dp_get_guideline": {
          const parsed = GetGuidelineArgs.parse(args);
          const guideline = getGuideline(parsed.id);
          if (!guideline) {
            return errorContent(`Guideline not found: id=${parsed.id}`);
          }
          const guidelineRecord = guideline as Record<string, unknown>;
          return textContent({
            ...guidelineRecord,
            _citation: buildCitation(
              String(guidelineRecord.reference ?? guidelineRecord.id ?? parsed.id),
              String(guidelineRecord.title ?? guidelineRecord.reference ?? `Guideline ${parsed.id}`),
              "fr_dp_get_guideline",
              { id: String(parsed.id) },
              guidelineRecord.url as string | undefined,
            ),
            _meta: metaBlock(),
          });
        }

        case "fr_dp_list_topics": {
          const topics = listTopics();
          return textContent({ topics, count: topics.length, _meta: metaBlock() });
        }

        case "fr_dp_about": {
          return textContent({
            name: SERVER_NAME,
            version: pkgVersion,
            description:
              "CNIL (Commission Nationale de l'Informatique et des Libertés) MCP server. Provides access to French data protection authority decisions, sanctions, mises en demeure, and official guidance documents.",
            data_source: "CNIL (https://www.cnil.fr/)",
            coverage: {
              decisions: "CNIL deliberations, sanctions, and mises en demeure",
              guidelines: "CNIL guides, recommandations, referentiels, and FAQs",
              topics: "Consent, cookies, transfers, DPIA, breach notification, privacy by design, employee monitoring, health data, children",
            },
            tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
            _meta: metaBlock(),
          });
        }

        case "fr_dp_list_sources": {
          return textContent({
            sources: [
              {
                id: "cnil_decisions",
                name: "CNIL Deliberations and Sanctions",
                authority: "Commission nationale de l'informatique et des libertés (CNIL)",
                url: "https://www.cnil.fr/fr/deliberations",
                license: "Etalab Open License / Open Government Licence France",
                coverage: "CNIL decisions, sanctions, and mises en demeure",
                update_frequency: "Periodic",
                language: "fr",
              },
              {
                id: "cnil_guidelines",
                name: "CNIL Guidance Documents",
                authority: "Commission nationale de l'informatique et des libertés (CNIL)",
                url: "https://www.cnil.fr/fr/les-guides-de-la-cnil",
                license: "Etalab Open License / Open Government Licence France",
                coverage: "Guides pratiques, recommandations, référentiels, and FAQs",
                update_frequency: "Periodic",
                language: "fr",
              },
            ],
            _meta: metaBlock(),
          });
        }

        case "fr_dp_check_data_freshness": {
          const freshness = getDataFreshness();
          return textContent({ ...freshness, _meta: metaBlock() });
        }

        default:
          return errorContent(`Unknown tool: ${name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return errorContent(`Error executing ${name}: ${message}`);
    }
  });

  return server;
}

// --- HTTP server -------------------------------------------------------------

async function main(): Promise<void> {
  const sessions = new Map<
    string,
    { transport: StreamableHTTPServerTransport; server: Server }
  >();

  const httpServer = createServer((req, res) => {
    handleRequest(req, res, sessions).catch((err) => {
      console.error(`[${SERVER_NAME}] Unhandled error:`, err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
  });

  async function handleRequest(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    activeSessions: Map<
      string,
      { transport: StreamableHTTPServerTransport; server: Server }
    >,
  ): Promise<void> {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: SERVER_NAME, version: pkgVersion }));
      return;
    }

    if (url.pathname === "/mcp") {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId)!;
        await session.transport.handleRequest(req, res);
        return;
      }

      const mcpServer = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK type mismatch with exactOptionalPropertyTypes
      await mcpServer.connect(transport as any);

      transport.onclose = () => {
        if (transport.sessionId) {
          activeSessions.delete(transport.sessionId);
        }
        mcpServer.close().catch(() => {});
      };

      await transport.handleRequest(req, res);

      if (transport.sessionId) {
        activeSessions.set(transport.sessionId, { transport, server: mcpServer });
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }

  httpServer.listen(PORT, () => {
    console.error(`${SERVER_NAME} v${pkgVersion} (HTTP) listening on port ${PORT}`);
    console.error(`MCP endpoint:  http://localhost:${PORT}/mcp`);
    console.error(`Health check:  http://localhost:${PORT}/health`);
  });

  process.on("SIGTERM", () => {
    console.error("Received SIGTERM, shutting down...");
    httpServer.close(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
