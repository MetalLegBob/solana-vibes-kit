// svk_get_audit — retrieve SOS audit findings and reports.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const AUDIT_DIRS = {
  sos: { audit: ".audit", history: ".audit-history" },
  db:  { audit: ".bulwark", history: ".bulwark-history" },
};
const DEFAULT_SKILL = "sos";

// Soft limit for response content size (chars). Truncate above this.
const MAX_CONTENT_CHARS = 50_000;

/**
 * Check if a directory exists.
 */
async function dirExists(path) {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolve the audit directory based on the "audit" parameter and optional skill.
 * Returns null if the directory doesn't exist. Validates against path traversal.
 */
async function resolveAuditDir(projectDir, audit, skill) {
  const dirs = AUDIT_DIRS[skill] || AUDIT_DIRS[DEFAULT_SKILL];
  if (!audit || audit === "current") {
    const dir = join(projectDir, dirs.audit);
    return (await dirExists(dir)) ? dir : null;
  }
  if (audit === "previous") {
    const histPath = join(projectDir, dirs.history);
    try {
      const entries = await readdir(histPath, { withFileTypes: true });
      const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
      if (subdirs.length === 0) return null;
      return join(histPath, subdirs[subdirs.length - 1]); // Most recent
    } catch {
      return null;
    }
  }
  // Only allow "current" and "previous" — reject arbitrary paths
  return null;
}

/**
 * Read and return a markdown file, or null.
 */
async function readMd(filePath) {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Parse a markdown document into sections keyed by normalized heading.
 * Returns { sections: Map<slug, { heading, level, content }>, headings: string[] }
 */
function parseSections(markdown) {
  const lines = markdown.split("\n");
  const sections = new Map();
  const headings = [];
  let currentSlug = "_preamble";
  let currentHeading = "";
  let currentLevel = 0;
  let currentLines = [];

  function flush() {
    if (currentLines.length > 0 || currentSlug !== "_preamble") {
      sections.set(currentSlug, {
        heading: currentHeading,
        level: currentLevel,
        content: currentLines.join("\n").trim(),
      });
    }
  }

  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      flush();
      const level = match[1].length;
      const heading = match[2].trim();
      currentSlug = slugify(heading);
      currentHeading = heading;
      currentLevel = level;
      currentLines = [line];
      headings.push(`${"  ".repeat(level - 1)}- ${heading} [${currentSlug}]`);
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return { sections, headings };
}

/**
 * Convert a heading to a URL-like slug for the section parameter.
 */
function slugify(heading) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extract a section from parsed markdown. Supports partial slug matching.
 * Includes all sub-sections under the matched heading.
 */
function extractSection(sections, sectionQuery) {
  const querySlug = slugify(sectionQuery);

  // Try exact match first
  if (sections.has(querySlug)) {
    return collectSectionWithChildren(sections, querySlug);
  }

  // Partial match: find first section whose slug contains the query
  for (const [slug] of sections) {
    if (slug.includes(querySlug)) {
      return collectSectionWithChildren(sections, slug);
    }
  }

  return null;
}

/**
 * Collect a section and all its child sections (deeper heading levels).
 */
function collectSectionWithChildren(sections, parentSlug) {
  const parent = sections.get(parentSlug);
  if (!parent) return null;

  const parts = [parent.content];
  let collecting = false;

  for (const [slug, section] of sections) {
    if (slug === parentSlug) {
      collecting = true;
      continue;
    }
    if (collecting) {
      if (section.level <= parent.level) break; // sibling or higher = stop
      parts.push(section.content);
    }
  }

  return parts.join("\n\n");
}

/**
 * Truncate content with a warning if it exceeds the limit.
 */
function truncateIfNeeded(content, limit = MAX_CONTENT_CHARS) {
  if (content.length <= limit) return content;
  const truncated = content.slice(0, limit);
  // Try to cut at a line boundary
  const lastNewline = truncated.lastIndexOf("\n");
  const cutPoint = lastNewline > limit * 0.8 ? lastNewline : limit;
  return (
    truncated.slice(0, cutPoint) +
    `\n\n--- TRUNCATED (${content.length.toLocaleString()} chars total, showing first ${cutPoint.toLocaleString()}). Use the "section" parameter to retrieve specific sections. ---`
  );
}

/**
 * Get findings from the findings/ directory, with optional filters.
 * Supports "list" mode (titles only) and pagination via offset/limit.
 */
async function getFindings(auditDir, params) {
  const findingsPath = join(auditDir, "findings");
  let entries;
  try {
    entries = await readdir(findingsPath);
  } catch {
    return { text: "No findings directory found." };
  }

  const mdFiles = entries.filter((e) => e.endsWith(".md")).sort();

  // List mode: return just filenames and first-line summaries (lightweight)
  if (params.mode === "list") {
    const list = [];
    for (const file of mdFiles) {
      const content = await readFile(join(findingsPath, file), "utf-8");
      const firstHeading = content.split("\n").find((l) => l.startsWith("#"));
      const title = firstHeading ? firstHeading.replace(/^#+\s*/, "").trim() : file;
      // Extract severity from content if present
      const sevMatch = content.match(/severity:\s*(critical|high|medium|low|informational)/i);
      list.push({
        file,
        title,
        severity: sevMatch ? sevMatch[1].toUpperCase() : null,
      });
    }

    let filtered = list;
    if (params.subsystem) {
      // For list mode, also check file content for subsystem
      const sub = params.subsystem.toLowerCase();
      const fullFindings = [];
      for (const item of list) {
        const content = await readFile(join(findingsPath, item.file), "utf-8");
        if (content.toLowerCase().includes(sub)) fullFindings.push(item);
      }
      filtered = fullFindings;
    }
    if (params.severity) {
      const sev = params.severity.toUpperCase();
      filtered = filtered.filter((f) => f.severity === sev);
    }

    return { mode: "list", count: filtered.length, findings: filtered };
  }

  // Full mode: load content with filters and pagination
  const findings = [];
  for (const file of mdFiles) {
    const content = await readFile(join(findingsPath, file), "utf-8");
    findings.push({ file, content });
  }

  let filtered = findings;

  // Filter by subsystem
  if (params.subsystem) {
    const sub = params.subsystem.toLowerCase();
    filtered = filtered.filter((f) => f.content.toLowerCase().includes(sub));
  }

  // Filter by severity
  if (params.severity) {
    const sev = params.severity.toUpperCase();
    filtered = filtered.filter((f) => f.content.toUpperCase().includes(sev));
  }

  // Pagination
  const offset = Math.max(0, parseInt(params.offset, 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(params.limit, 10) || 10));
  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  // Truncate individual findings if still too large
  const result = paginated.map((f) => ({
    file: f.file,
    content: truncateIfNeeded(f.content, MAX_CONTENT_CHARS / limit),
  }));

  return {
    count: total,
    offset,
    limit,
    showing: result.length,
    has_more: offset + limit < total,
    findings: result,
  };
}

export async function handleGetAudit(projectDir, params) {
  // Support skill parameter: "sos" (default) or "db"
  const skill = params.skill || DEFAULT_SKILL;
  const dirs = AUDIT_DIRS[skill] || AUDIT_DIRS[DEFAULT_SKILL];
  const auditDir = await resolveAuditDir(projectDir, params.audit, skill);

  if (!auditDir) {
    const cmd = skill === "db" ? "/DB:scan" : "/SOS:scan";
    return { text: `No ${skill} audit found. Run ${cmd} to start a security audit.` };
  }

  const type = params.type || "report";

  switch (type) {
    case "report": {
      const content = await readMd(join(auditDir, "FINAL_REPORT.md"));
      if (!content) {
        return { text: "No final report found. The audit may not have reached the report phase yet." };
      }

      // Section extraction mode
      if (params.section) {
        const { sections, headings } = parseSections(content);
        const extracted = extractSection(sections, params.section);
        if (!extracted) {
          return {
            text: `No section matching "${params.section}" found in the report.`,
            available_sections: headings,
          };
        }
        return {
          type: "report",
          section: params.section,
          path: `${dirs.audit}/FINAL_REPORT.md`,
          content: truncateIfNeeded(extracted),
        };
      }

      // Default: return table of contents + executive summary
      const { sections, headings } = parseSections(content);

      // Try to find the executive summary section
      let summary = null;
      for (const [slug, section] of sections) {
        if (slug.includes("executive") || slug.includes("summary")) {
          summary = collectSectionWithChildren(sections, slug);
          break;
        }
      }

      // If no exec summary, take the first ~2000 chars
      if (!summary) {
        summary = content.slice(0, 2000);
        const lastNewline = summary.lastIndexOf("\n");
        if (lastNewline > 1500) summary = summary.slice(0, lastNewline);
        summary += "\n\n--- Use section parameter for more ---";
      }

      return {
        type: "report",
        path: `${dirs.audit}/FINAL_REPORT.md`,
        total_chars: content.length,
        sections: headings,
        executive_summary: truncateIfNeeded(summary),
        hint: 'Use the "section" parameter to retrieve specific sections (e.g., section: "critical-findings", section: "recommendations").',
      };
    }
    case "findings":
      return getFindings(auditDir, params);
    case "architecture": {
      const content = await readMd(join(auditDir, "ARCHITECTURE.md"));
      return content
        ? { type: "architecture", path: `${dirs.audit}/ARCHITECTURE.md`, content: truncateIfNeeded(content) }
        : { text: "No architecture document found." };
    }
    case "strategies": {
      const content = await readMd(join(auditDir, "STRATEGIES.md"));
      return content
        ? { type: "strategies", path: `${dirs.audit}/STRATEGIES.md`, content: truncateIfNeeded(content) }
        : { text: "No strategies document found." };
    }
    default:
      return { text: `Unknown audit type "${type}". Valid: report, findings, architecture, strategies.` };
  }
}
