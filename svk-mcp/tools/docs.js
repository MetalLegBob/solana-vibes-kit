// svk_get_doc — retrieve GL-generated documents.
// svk_get_decisions — retrieve architectural decisions from GL interview.

import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";

const DOCS_DIR = ".docs";

/**
 * List all available GL docs with one-line descriptions.
 */
async function listDocs(projectDir) {
  const docsPath = join(projectDir, DOCS_DIR);
  let entries;
  try {
    entries = await readdir(docsPath);
  } catch {
    return { text: "No GL documentation found. Run /GL:survey to generate docs." };
  }

  const docs = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const filePath = join(docsPath, entry);
    try {
      const content = await readFile(filePath, "utf-8");
      // Extract first heading or first non-empty line as description
      const firstLine = content.split("\n").find((l) => l.trim().length > 0) || "";
      const desc = firstLine.replace(/^#+\s*/, "").trim();
      docs.push({ name: entry.replace(".md", ""), path: `${DOCS_DIR}/${entry}`, description: desc });
    } catch {
      docs.push({ name: entry.replace(".md", ""), path: `${DOCS_DIR}/${entry}`, description: "" });
    }
  }

  return { documents: docs };
}

/**
 * Get a specific doc by name (exact or partial match).
 */
async function getDoc(projectDir, name) {
  const docsPath = join(projectDir, DOCS_DIR);
  let entries;
  try {
    entries = await readdir(docsPath);
  } catch {
    return { text: "No GL documentation found. Run /GL:survey to generate docs." };
  }

  const mdFiles = entries.filter((e) => e.endsWith(".md"));
  const nameLower = name.toLowerCase();

  // Try exact match first
  let match = mdFiles.find((f) => f.replace(".md", "").toLowerCase() === nameLower);
  // Then partial match
  if (!match) {
    match = mdFiles.find((f) => f.toLowerCase().includes(nameLower));
  }

  if (!match) {
    return {
      text: `No document matching "${name}" found.`,
      available: mdFiles.map((f) => f.replace(".md", "")),
    };
  }

  const content = await readFile(join(docsPath, match), "utf-8");
  return { name: match.replace(".md", ""), path: `${DOCS_DIR}/${match}`, content };
}

export async function handleGetDoc(projectDir, params) {
  if (params.name) {
    return getDoc(projectDir, params.name);
  }
  return listDocs(projectDir);
}

/**
 * Get decisions, optionally filtered by topic.
 */
export async function handleGetDecisions(projectDir, params) {
  const decisionsPath = join(projectDir, DOCS_DIR, "DECISIONS");
  let entries;
  try {
    entries = await readdir(decisionsPath);
  } catch {
    return { text: "No decisions found. Decisions are captured during /GL:interview." };
  }

  const mdFiles = entries.filter((e) => e.endsWith(".md"));

  if (mdFiles.length === 0) {
    return { text: "No decisions found. Decisions are captured during /GL:interview." };
  }

  const decisions = [];
  for (const file of mdFiles) {
    const content = await readFile(join(decisionsPath, file), "utf-8");
    decisions.push({ name: file.replace(".md", ""), path: `${DOCS_DIR}/DECISIONS/${file}`, content });
  }

  // Filter by topic if specified
  if (params.topic) {
    const topicLower = params.topic.toLowerCase();
    const filtered = decisions.filter(
      (d) => d.name.toLowerCase().includes(topicLower) || d.content.toLowerCase().includes(topicLower)
    );
    if (filtered.length === 0) {
      return {
        text: `No decisions matching topic "${params.topic}".`,
        available_topics: decisions.map((d) => d.name),
      };
    }
    return { decisions: filtered };
  }

  return { decisions };
}
