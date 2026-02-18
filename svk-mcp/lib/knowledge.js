// lib/knowledge.js — Knowledge base registry and access functions.
// Hardcoded roots, dynamic content enumeration.

import { readdir, readFile, stat, access } from "node:fs/promises";
import { join, resolve, relative, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SVK_REPO = resolve(__dirname, "..", "..");

const KNOWLEDGE_SOURCES = [
  {
    id: "stronghold-of-security",
    name: "Stronghold of Security (SOS)",
    description: "128 exploit patterns for Solana security auditing",
    basePath: "stronghold-of-security/knowledge-base",
    primaryIndex: "PATTERNS_INDEX.md",
  },
  {
    id: "grand-library",
    name: "Grand Library (GL)",
    description: "Documentation resources, domain packs, and templates",
    basePath: "grand-library/resources",
    primaryIndex: "INDEX.md",
  },
  {
    id: "dinhs-bulwark",
    name: "Dinh's Bulwark (DB)",
    description: "312 off-chain exploit patterns and 168 AI-generated code pitfalls for off-chain security auditing",
    basePath: "dinhs-bulwark/knowledge-base",
    primaryIndex: "PATTERNS_INDEX.md",
  },
  {
    id: "svk",
    name: "SVK Core",
    description: "Skill foundation patterns, vision, and goals",
    basePath: "Documents",
    primaryIndex: null,
    staticFiles: ["Skill_Foundation.md", "VISION.md", "Goals.md"],
  },
];

/** Return the SVK repo root path. */
export function getSvkRepoPath() {
  return SVK_REPO;
}

/** Return the raw registry array. */
export function getKnowledgeSources() {
  return KNOWLEDGE_SOURCES;
}

/** Count .md files recursively in a directory. */
async function countMdFiles(dir) {
  let count = 0;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += await countMdFiles(join(dir, entry.name));
    } else if (entry.name.endsWith(".md")) {
      count++;
    }
  }
  return count;
}

/** List .md filenames (non-recursive) in a directory. */
async function listMdFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

/** List subdirectory names in a directory. */
async function listSubdirs(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

/** Check if a file exists. */
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Enumerate a single knowledge base in detail.
 * Returns category breakdown with subcategories, files, and counts.
 */
async function enumerateDetailed(source) {
  const absBase = join(SVK_REPO, source.basePath);

  // SVK Core: static file list
  if (source.staticFiles) {
    const existing = [];
    for (const f of source.staticFiles) {
      if (await fileExists(join(absBase, f))) existing.push(f);
    }
    return {
      skill: source.id,
      name: source.name,
      primary_index: source.primaryIndex,
      files: existing,
      total_files: existing.length,
    };
  }

  const categories = {};
  const topDirs = await listSubdirs(absBase);

  for (const dirName of topDirs) {
    const dirPath = join(absBase, dirName);

    // Check for sub-subdirectories (e.g., patterns/access-control/)
    const subdirs = await listSubdirs(dirPath);
    if (subdirs.length > 0) {
      const fileCount = await countMdFiles(dirPath);
      categories[dirName] = { subcategories: subdirs, file_count: fileCount };
    } else {
      const files = await listMdFiles(dirPath);
      categories[dirName] = { files, file_count: files.length };
    }
  }

  // GL-specific: discover domain packs
  let domainPacks;
  const packsDir = join(absBase, "domain-packs");
  const packNames = await listSubdirs(packsDir);
  if (packNames.length > 0) {
    domainPacks = [];
    for (const packName of packNames) {
      const packDir = join(packsDir, packName);
      const packFileCount = await countMdFiles(packDir);
      const hasIndex = await fileExists(join(packDir, "INDEX.md"));
      domainPacks.push({
        name: packName,
        index: hasIndex ? `domain-packs/${packName}/INDEX.md` : null,
        file_count: packFileCount,
      });
    }
  }

  // Count top-level .md files (not in subdirectories)
  const topFiles = await listMdFiles(absBase);
  const totalFiles = (await countMdFiles(absBase));

  const result = {
    skill: source.id,
    name: source.name,
    primary_index: source.primaryIndex,
    categories,
    total_files: totalFiles,
  };

  if (domainPacks) result.domain_packs = domainPacks;

  return result;
}

/**
 * List knowledge bases. If skillId is provided, returns detailed view of that skill.
 * If no skillId, returns overview of all knowledge bases.
 */
export async function listKnowledgeBase(skillId) {
  if (skillId) {
    const source = KNOWLEDGE_SOURCES.find((s) => s.id === skillId);
    if (!source) {
      return {
        error: `Unknown knowledge base: ${skillId}`,
        available: KNOWLEDGE_SOURCES.map((s) => s.id),
      };
    }
    return enumerateDetailed(source);
  }

  // Overview mode: lighter enumeration for all sources
  const bases = [];
  for (const source of KNOWLEDGE_SOURCES) {
    const absBase = join(SVK_REPO, source.basePath);

    if (source.staticFiles) {
      const existing = [];
      for (const f of source.staticFiles) {
        if (await fileExists(join(absBase, f))) existing.push(f);
      }
      bases.push({
        skill: source.id,
        name: source.name,
        description: source.description,
        files: existing,
      });
      continue;
    }

    const fileCount = await countMdFiles(absBase);
    const topDirs = await listSubdirs(absBase);
    const entry = {
      skill: source.id,
      name: source.name,
      description: source.description,
      primary_index: source.primaryIndex,
      categories: topDirs,
      file_count: fileCount,
    };

    // Discover domain packs for overview
    const packsDir = join(absBase, "domain-packs");
    const packNames = await listSubdirs(packsDir);
    if (packNames.length > 0) {
      entry.domain_packs = [];
      for (const packName of packNames) {
        const packDir = join(packsDir, packName);
        const packFileCount = await countMdFiles(packDir);
        entry.domain_packs.push({
          name: packName,
          index: `domain-packs/${packName}/INDEX.md`,
          file_count: packFileCount,
        });
      }
    }

    bases.push(entry);
  }

  return { knowledge_bases: bases };
}

/**
 * Read a knowledge file. If no relativePath, returns the primary index.
 * Path-validated to prevent directory traversal.
 */
export async function readKnowledgeFile(skillId, relativePath) {
  const source = KNOWLEDGE_SOURCES.find((s) => s.id === skillId);
  if (!source) {
    return {
      error: `Unknown knowledge base: ${skillId}`,
      available: KNOWLEDGE_SOURCES.map((s) => s.id),
    };
  }

  const absBase = resolve(SVK_REPO, source.basePath);

  // No path: return primary index (or error for SVK Core)
  if (!relativePath) {
    if (!source.primaryIndex) {
      return {
        error: `${source.name} has no primary index. Specify a file path.`,
        files: source.staticFiles || [],
      };
    }
    relativePath = source.primaryIndex;
  }

  // Path traversal protection
  const normalizedPath = normalize(relativePath);
  if (normalizedPath.startsWith("..") || normalizedPath.includes("/../")) {
    return { error: "Invalid path" };
  }

  const absFile = resolve(absBase, normalizedPath);
  if (!absFile.startsWith(absBase)) {
    return { error: "Invalid path" };
  }

  try {
    const content = await readFile(absFile, "utf-8");
    return {
      skill: source.id,
      path: normalizedPath,
      content,
    };
  } catch {
    return {
      error: `File not found: ${normalizedPath}`,
      hint: "Use svk_list_knowledge to browse available files",
    };
  }
}
