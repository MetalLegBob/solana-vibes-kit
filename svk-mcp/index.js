#!/usr/bin/env node
// SVK MCP Server — exposes SVK artifacts as queryable tools.
// Design principle: "SVK provides knowledge, not control."

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { handleProjectStatus } from "./tools/status.js";
import { handleGetDoc, handleGetDecisions } from "./tools/docs.js";
import { handleGetAudit } from "./tools/audit.js";
import { handleSearch } from "./tools/search.js";

const PROJECT_DIR = process.env.SVK_PROJECT_DIR || process.cwd();

const server = new McpServer({
  name: "svk",
  version: "1.0.0",
});

// --- Tool: svk_project_status ---
server.tool(
  "svk_project_status",
  "Returns current state of all active SVK skills (audit progress, doc generation status, next steps). Use this to understand what SVK work has been done or is in progress.",
  {},
  async () => {
    const result = await handleProjectStatus(PROJECT_DIR);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// --- Tool: svk_get_doc ---
server.tool(
  "svk_get_doc",
  "Retrieve a GL-generated document by name, or list all available docs. Use when you need architecture docs, data models, security models, or other GL-produced documentation.",
  { name: z.string().optional().describe("Document name or partial match (e.g., 'architecture', 'data-model'). Omit to list all.") },
  async ({ name }) => {
    const result = await handleGetDoc(PROJECT_DIR, { name });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// --- Tool: svk_get_decisions ---
server.tool(
  "svk_get_decisions",
  "Retrieve architectural decisions captured during GL interview. Use when you need rationale for design choices.",
  { topic: z.string().optional().describe("Filter by topic (e.g., 'staking', 'auth', 'token'). Omit for all.") },
  async ({ topic }) => {
    const result = await handleGetDecisions(PROJECT_DIR, { topic });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// --- Tool: svk_get_audit ---
server.tool(
  "svk_get_audit",
  "Retrieve SOS audit findings, reports, architecture docs, or strategies. Use when you need security audit results or want to check for unresolved findings.",
  {
    type: z.enum(["report", "findings", "architecture", "strategies"]).optional().describe("What to retrieve. Defaults to 'report'."),
    subsystem: z.string().optional().describe("Filter findings by subsystem (e.g., 'tax-program', 'staking')."),
    severity: z.string().optional().describe("Filter findings by severity (e.g., 'critical', 'high')."),
    audit: z.string().optional().describe("'current' (default), 'previous', or a specific archive path."),
  },
  async ({ type, subsystem, severity, audit }) => {
    const result = await handleGetAudit(PROJECT_DIR, { type, subsystem, severity, audit });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// --- Tool: svk_search ---
server.tool(
  "svk_search",
  "Full-text search across all SVK artifacts — docs, audit findings, decisions, knowledge bases. Use when you need to find specific information across all SVK outputs.",
  {
    query: z.string().describe("Search string or pattern."),
    scope: z.enum(["docs", "audit", "decisions", "all"]).optional().describe("Limit to specific artifact types. Defaults to 'all'."),
  },
  async ({ query, scope }) => {
    const result = await handleSearch(PROJECT_DIR, { query, scope });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// --- Start server ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is reserved for MCP protocol
  console.error("SVK MCP server running on stdio");
}

main().catch((err) => {
  console.error("SVK MCP fatal error:", err);
  process.exit(1);
});
