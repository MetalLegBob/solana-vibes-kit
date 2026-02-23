// svk_search — full-text search across all SVK artifacts.

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const SCOPE_DIRS = {
  docs: [".docs"],
  audit: [".audit", ".audit-history", ".bulwark", ".bulwark-history", ".bok"],
  decisions: [".docs/DECISIONS"],
  all: [".docs", ".audit", ".audit-history", ".bulwark", ".bulwark-history", ".bok", ".forge", ".svk"],
};

const MAX_RESULTS = 20;
const MAX_EXCERPTS_PER_FILE = 3;

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
 * Tokenize a query string into search terms.
 * Supports quoted phrases: "exact phrase" single terms
 */
function tokenizeQuery(query) {
  const terms = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match;
  while ((match = regex.exec(query)) !== null) {
    terms.push((match[1] || match[2]).toLowerCase());
  }
  return terms;
}

/**
 * Search a file's content with tokenized multi-term matching.
 * - File matches if ALL terms appear somewhere in its content (AND logic).
 * - Excerpts are extracted for lines where ANY term appears.
 * - Results are scored by how many distinct terms appear on matching lines.
 */
function searchFile(content, terms, maxExcerpts = MAX_EXCERPTS_PER_FILE) {
  const contentLower = content.toLowerCase();

  // File-level AND gate: every term must appear somewhere in the file
  for (const term of terms) {
    if (!contentLower.includes(term)) return null;
  }

  // Extract matching lines with context
  const lines = content.split("\n");
  const matches = [];
  const usedLines = new Set(); // avoid overlapping excerpts

  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;
    const lineLower = lines[i].toLowerCase();
    const matchingTerms = terms.filter((t) => lineLower.includes(t));
    if (matchingTerms.length === 0) continue;

    // Get context: 2 lines before and after
    const start = Math.max(0, i - 2);
    const end = Math.min(lines.length - 1, i + 2);
    const excerpt = lines.slice(start, end + 1).join("\n");

    // Mark these lines as used to avoid overlap
    for (let j = start; j <= end; j++) usedLines.add(j);

    matches.push({
      line: i + 1,
      matched_terms: matchingTerms,
      excerpt,
    });
    if (matches.length >= maxExcerpts) break;
  }

  // Score: count of distinct terms that matched across all excerpts
  const allMatchedTerms = new Set(matches.flatMap((m) => m.matched_terms));

  return {
    score: allMatchedTerms.size,
    matches,
  };
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

  const terms = tokenizeQuery(query);
  if (terms.length === 0) {
    return { text: "Search query is required." };
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
      const result = searchFile(content, terms);
      if (result) {
        results.push({
          file: relative(projectDir, filePath),
          score: result.score,
          matches: result.matches,
        });
      }
    } catch {
      // Skip unreadable files
    }
  }

  if (results.length === 0) {
    return { text: `No results for "${query}" in scope "${scope}".` };
  }

  // Sort by score descending, then by file path
  results.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));

  // Cap results
  const truncated = results.length > MAX_RESULTS;
  const capped = results.slice(0, MAX_RESULTS);

  return {
    query,
    terms,
    scope,
    total_files_matched: results.length,
    results: capped,
    ...(truncated && { note: `Showing top ${MAX_RESULTS} of ${results.length} matches.` }),
  };
}
