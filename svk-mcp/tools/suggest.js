// svk_suggest — analyze project state and suggest which SVK skills to run next.

import { scanSkillStates, countAuditHistory } from "../lib/scanner.js";
import { readFile, stat, readdir } from "node:fs/promises";
import { join } from "node:path";

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
 * Check if code files exist in the project (heuristic: look for common source dirs).
 */
async function hasCode(projectDir) {
  const codeDirs = ["programs", "src", "contracts", "app", "lib"];
  for (const dir of codeDirs) {
    if (await dirExists(join(projectDir, dir))) return true;
  }
  return false;
}

/**
 * Check if FINAL_REPORT has unresolved critical/high findings.
 */
async function getUnresolvedFindings(projectDir) {
  const reportPath = join(projectDir, ".audit", "FINAL_REPORT.md");
  try {
    const content = await readFile(reportPath, "utf-8");
    const criticalCount = (content.match(/CRITICAL/gi) || []).length;
    const highCount = (content.match(/\bHIGH\b/gi) || []).length;
    // Check if report mentions unresolved/open status
    const hasUnresolved = /unresolved|open|pending|not\s+fixed/i.test(content);
    return { criticalCount, highCount, hasUnresolved };
  } catch {
    return null;
  }
}

export async function handleSuggest(projectDir) {
  const skills = await scanSkillStates(projectDir);
  const historyCount = await countAuditHistory(projectDir);
  const codeExists = await hasCode(projectDir);

  const skillMap = {};
  for (const s of skills) {
    skillMap[s.skill] = s.state;
  }

  const suggestions = [];

  const hasDocs = await dirExists(join(projectDir, ".docs"));
  const hasAudit = await dirExists(join(projectDir, ".audit"));

  // Rule: Code exists, no docs
  if (codeExists && !hasDocs) {
    suggestions.push({
      suggestion: "Run /GL:survey — no architecture docs found",
      priority: "high",
      reason: "Code exists but no GL documentation has been generated. Architecture docs help all downstream tools (including security audits) work better.",
    });
  }

  // Rule: Docs exist, check if stale (compare .docs/STATE.json updated vs recent git activity)
  if (hasDocs && skillMap["grand-library"]) {
    const glState = skillMap["grand-library"];
    const lastUpdated = new Date(glState.updated || glState.last_updated || 0);
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 7) {
      suggestions.push({
        suggestion: "Docs may be stale — consider /GL:update",
        priority: "medium",
        reason: `GL docs were last updated ${Math.floor(daysSinceUpdate)} days ago. If significant code changes have been made, docs may be out of date.`,
      });
    }
  }

  // Rule: Code exists, no audit
  if (codeExists && !hasAudit) {
    suggestions.push({
      suggestion: "Consider /SOS:scan before deployment",
      priority: "high",
      reason: "No security audit found. Running SOS before deployment catches vulnerabilities early.",
    });
  }

  // Rule: Audit has unresolved critical/high findings
  if (hasAudit) {
    const findings = await getUnresolvedFindings(projectDir);
    if (findings && findings.hasUnresolved && (findings.criticalCount > 0 || findings.highCount > 0)) {
      suggestions.push({
        suggestion: `${findings.criticalCount} CRITICAL + ${findings.highCount} HIGH findings may be unresolved — fix before launch`,
        priority: "critical",
        reason: "The audit report contains unresolved critical or high severity findings.",
      });
    }
  }

  // Rule: Previous audit exists, code changed, no current audit
  if (historyCount > 0 && !hasAudit && codeExists) {
    suggestions.push({
      suggestion: "Codebase changed since last audit — /SOS:scan for delta audit",
      priority: "medium",
      reason: `${historyCount} previous audit(s) archived, but no current audit exists. Code may have changed.`,
    });
  }

  // Rule: Audit complete, no test suite detected
  if (hasAudit && codeExists) {
    const testDirs = ["tests", "test", "__tests__"];
    let hasTests = false;
    for (const dir of testDirs) {
      if (await dirExists(join(projectDir, dir))) { hasTests = true; break; }
    }
    if (!hasTests) {
      suggestions.push({
        suggestion: "Consider test generation for audited code",
        priority: "medium",
        reason: "Security audit exists but no test directory detected. Tests codify invariants the audit identified.",
      });
    }
  }

  // If nothing to suggest
  if (suggestions.length === 0) {
    suggestions.push({
      suggestion: "Project looks solid",
      priority: "info",
      reason: "All expected SVK artifacts are present and no immediate actions detected.",
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, info: 3 };
  suggestions.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  return { suggestions };
}
