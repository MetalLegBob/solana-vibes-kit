// svk_suggest — analyze project state and suggest which SVK skills to run next.

import { scanSkillStates, countAuditHistory } from "../lib/scanner.js";
import { readFile, stat, readdir } from "node:fs/promises";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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
 * Check if a file exists.
 */
async function fileExists(path) {
  try {
    const s = await stat(path);
    return s.isFile();
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
 * Count findings by severity from the findings/ directory.
 * More reliable than regex-counting words in the full report text.
 */
async function countFindingsBySeverity(auditDir) {
  const findingsPath = join(auditDir, "findings");
  let entries;
  try {
    entries = await readdir(findingsPath);
  } catch {
    return null;
  }

  const mdFiles = entries.filter((e) => e.endsWith(".md"));
  if (mdFiles.length === 0) return null;

  const counts = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };

  for (const file of mdFiles) {
    try {
      const content = await readFile(join(findingsPath, file), "utf-8");
      // Match severity from structured finding metadata (e.g., "Severity: CRITICAL" or "severity: high")
      const sevMatch = content.match(/severity:\s*(critical|high|medium|low|informational)/i);
      if (sevMatch) {
        const sev = sevMatch[1].toLowerCase();
        if (sev in counts) counts[sev]++;
      }
    } catch {}
  }

  return counts;
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
    const counts = await countFindingsBySeverity(join(projectDir, ".audit"));
    if (counts && (counts.critical > 0 || counts.high > 0)) {
      suggestions.push({
        suggestion: `${counts.critical} CRITICAL + ${counts.high} HIGH findings — fix before launch`,
        priority: "critical",
        reason: "The audit contains critical or high severity findings that should be addressed.",
      });
    }
  }

  // Rule: Code exists, no off-chain audit
  const hasBulwark = await dirExists(join(projectDir, ".bulwark"));
  if (codeExists && !hasBulwark) {
    const offChainIndicators = ["package.json", "requirements.txt", "Pipfile", "pyproject.toml"];
    let hasOffChain = false;
    for (const indicator of offChainIndicators) {
      if (await fileExists(join(projectDir, indicator))) {
        hasOffChain = true;
        break;
      }
    }
    if (hasOffChain) {
      suggestions.push({
        suggestion: "Off-chain code detected — consider /DB:scan",
        priority: "high",
        reason: "Project has off-chain code (backends, APIs, bots) but no Dinh's Bulwark audit. Off-chain vulnerabilities are a common attack vector.",
      });
    }
  }

  // Rule: SOS audit exists but no DB audit
  if (hasAudit && !hasBulwark && codeExists) {
    suggestions.push({
      suggestion: "SOS covers on-chain — add /DB:scan for off-chain coverage",
      priority: "medium",
      reason: "On-chain audit exists but off-chain code hasn't been audited. Attack chains often cross the on-chain/off-chain boundary.",
    });
  }

  // Rule: DB audit has unresolved findings
  if (hasBulwark) {
    const counts = await countFindingsBySeverity(join(projectDir, ".bulwark"));
    if (counts && (counts.critical > 0 || counts.high > 0)) {
      suggestions.push({
        suggestion: `DB audit: ${counts.critical} CRITICAL + ${counts.high} HIGH findings`,
        priority: "critical",
        reason: "The Dinh's Bulwark audit contains critical or high severity findings.",
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

  // Rule: BOK — math-heavy code without verification
  const hasBok = await dirExists(join(projectDir, ".bok"));
  if (codeExists && !hasBok) {
    // Check for Solana programs with math signals
    const programsDir = join(projectDir, "programs");
    if (await dirExists(programsDir)) {
      try {
        const { stdout } = await execAsync(
          `grep -rl 'checked_mul\\|checked_add\\|as u64\\|as u128\\|fee\\|swap\\|reward\\|stake\\|liquidity\\|price' "${programsDir}" --include="*.rs" 2>/dev/null | wc -l`,
          { encoding: "utf-8", timeout: 5000 }
        );
        if (parseInt(stdout.trim(), 10) > 3) {
          suggestions.push({
            suggestion: "Math-heavy code detected — consider /BOK:scan for formal verification",
            priority: "medium",
            reason: "Found arithmetic and DeFi math patterns that benefit from formal verification with Kani, LiteSVM, and Proptest.",
          });
        }
      } catch {}
    }
  }

  // Rule: BOK found verification failures
  if (hasBok) {
    try {
      const bokState = JSON.parse(await readFile(join(projectDir, ".bok", "STATE.json"), "utf-8"));
      if (bokState.phases?.execute?.failed > 0) {
        suggestions.push({
          suggestion: `BOK found ${bokState.phases.execute.failed} verification failures — review /BOK:report`,
          priority: "high",
          reason: "Math violations detected that may indicate bugs or exploitable conditions.",
        });
      }
    } catch {}
  }

  // Rule: SOS flagged arithmetic, no BOK
  if (hasAudit && !hasBok && codeExists) {
    try {
      const auditReport = await readFile(join(projectDir, ".audit", "FINAL_REPORT.md"), "utf-8");
      const hasArithmetic = /arithmetic|overflow|underflow|precision|rounding|division.by.zero/i.test(auditReport);
      if (hasArithmetic) {
        suggestions.push({
          suggestion: "SOS flagged arithmetic concerns — /BOK:scan can formally verify",
          priority: "medium",
          reason: "BOK can confirm or refute SOS arithmetic findings with formal proofs.",
        });
      }
    } catch {}
  }

  // Rule: .forge state exists but no recent activity — remind to continue
  const hasForge = await dirExists(join(projectDir, ".forge"));
  if (hasForge) {
    suggestions.push({
      suggestion: "Forge build in progress — check /Forge:validate or resume where you left off",
      priority: "medium",
      reason: "A .forge/STATE.json exists, indicating an in-progress skill build. Continue or clean up.",
    });
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
