// Convention-based SVK artifact scanner.
// Scans for .*/STATE.json files containing a "skill" field.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename, dirname } from "node:path";

/**
 * Scan a project directory for SVK state files.
 * Returns an array of { skill, dir, state } objects.
 */
export async function scanSkillStates(projectDir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(projectDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(".")) continue;
    const stateFile = join(projectDir, entry.name, "STATE.json");
    try {
      const raw = await readFile(stateFile, "utf-8");
      const state = JSON.parse(raw);
      if (state.skill) {
        results.push({
          skill: state.skill,
          dir: join(projectDir, entry.name),
          state,
        });
      }
    } catch {
      // Not a valid SVK state file — skip
    }
  }

  return results;
}

/**
 * Count directories in .audit-history/ and .bulwark-history/
 */
export async function countAuditHistory(projectDir) {
  let count = 0;
  for (const histName of [".audit-history", ".bulwark-history"]) {
    const histDir = join(projectDir, histName);
    try {
      const entries = await readdir(histDir, { withFileTypes: true });
      count += entries.filter((e) => e.isDirectory()).length;
    } catch {
      // Directory doesn't exist — skip
    }
  }
  return count;
}
