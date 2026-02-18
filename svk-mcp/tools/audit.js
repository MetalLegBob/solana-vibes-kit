// svk_get_audit — retrieve SOS audit findings and reports.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const AUDIT_DIRS = {
  sos: { audit: ".audit", history: ".audit-history" },
  db:  { audit: ".bulwark", history: ".bulwark-history" },
};
const DEFAULT_SKILL = "sos";

/**
 * Resolve the audit directory based on the "audit" parameter and optional skill.
 */
async function resolveAuditDir(projectDir, audit, skill) {
  const dirs = AUDIT_DIRS[skill] || AUDIT_DIRS[DEFAULT_SKILL];
  if (!audit || audit === "current") {
    return join(projectDir, dirs.audit);
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
  // Treat as explicit path
  return join(projectDir, audit);
}

/**
 * Read and return a markdown file, or an error message.
 */
async function readMd(filePath) {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Get findings from the findings/ directory, with optional filters.
 */
async function getFindings(auditDir, params) {
  const findingsPath = join(auditDir, "findings");
  let entries;
  try {
    entries = await readdir(findingsPath);
  } catch {
    return { text: "No findings directory found." };
  }

  const mdFiles = entries.filter((e) => e.endsWith(".md"));
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

  return { count: filtered.length, findings: filtered };
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
      return content
        ? { type: "report", path: `${dirs.audit}/FINAL_REPORT.md`, content }
        : { text: "No final report found. The audit may not have reached the report phase yet." };
    }
    case "findings":
      return getFindings(auditDir, params);
    case "architecture": {
      const content = await readMd(join(auditDir, "ARCHITECTURE.md"));
      return content
        ? { type: "architecture", path: `${dirs.audit}/ARCHITECTURE.md`, content }
        : { text: "No architecture document found." };
    }
    case "strategies": {
      const content = await readMd(join(auditDir, "STRATEGIES.md"));
      return content
        ? { type: "strategies", path: `${dirs.audit}/STRATEGIES.md`, content }
        : { text: "No strategies document found." };
    }
    default:
      return { text: `Unknown audit type "${type}". Valid: report, findings, architecture, strategies.` };
  }
}
