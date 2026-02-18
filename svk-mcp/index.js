#!/usr/bin/env node
// SVK MCP Server — exposes SVK artifacts as queryable tools.
// Design principle: "SVK provides knowledge, not control."

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { handleProjectStatus } from "./tools/status.js";

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
