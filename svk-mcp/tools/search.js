// svk_search — full-text search across all SVK artifacts.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const SCOPE_DIRS = {
  docs: [".docs"],
  audit: [".audit", ".audit-history"],
  decisions: [".docs/DECISIONS"],
  all: [".docs", ".audit", ".audit-history", ".svk"],
};

/**
 * Recursively collect all .md and .json files from a directory.
 */
async function collectFiles(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and other non-SVK directories
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      await collectFiles(fullPath, files);
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Search files for a query string, returning matching excerpts.
 */
function searchContent(content, query, filePath, maxExcerpts = 3) {
  const queryLower = query.toLowerCase();
  const lines = content.split("\n");
  const matches = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(queryLower)) {
      // Get context: 2 lines before and after
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length - 1, i + 2);
      const excerpt = lines.slice(start, end + 1).join("\n");
      matches.push({ line: i + 1, excerpt });
      if (matches.length >= maxExcerpts) break;
    }
  }

  return matches;
}

export async function handleSearch(projectDir, params) {
  const query = params.query;
  if (!query || query.trim().length === 0) {
    return { text: "Search query is required." };
  }

  const scope = params.scope || "all";
  const dirs = SCOPE_DIRS[scope];
  if (!dirs) {
    return { text: `Unknown scope "${scope}". Valid: docs, audit, decisions, all.` };
  }

  // Collect all files from scope directories
  const allFiles = [];
  for (const dir of dirs) {
    await collectFiles(join(projectDir, dir), allFiles);
  }

  if (allFiles.length === 0) {
    return { text: `No SVK artifacts found in scope "${scope}".` };
  }

  // Search each file
  const results = [];
  for (const filePath of allFiles) {
    try {
      const content = await readFile(filePath, "utf-8");
      const matches = searchContent(content, query, filePath);
      if (matches.length > 0) {
        results.push({
          file: relative(projectDir, filePath),
          matches,
        });
      }
    } catch {
      // Skip unreadable files
    }
  }

  if (results.length === 0) {
    return { text: `No results for "${query}" in scope "${scope}".` };
  }

  return {
    query,
    scope,
    total_files_matched: results.length,
    results,
  };
}
