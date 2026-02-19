// svk_project_status — returns current state of all active SVK skills.

import { scanSkillStates, countAuditHistory } from "../lib/scanner.js";

/**
 * Format the current phase info for a skill state object.
 */
function getCurrentPhase(state) {
  if (!state.phases) return { phase: "unknown", status: "unknown" };

  const phaseNames = Object.keys(state.phases);
  let currentPhase = null;
  let currentStatus = null;

  for (const name of phaseNames) {
    const s = state.phases[name]?.status;
    if (s === "in_progress") {
      return { phase: name, status: "in_progress" };
    }
    if (s === "complete") {
      currentPhase = name;
      currentStatus = s;
    }
  }

  if (currentPhase) return { phase: currentPhase, status: currentStatus };
  return { phase: phaseNames[0] || "unknown", status: "pending" };
}

/**
 * Build a status summary for one skill.
 */
function formatSkillStatus(skillState) {
  const { skill, state } = skillState;
  const { phase, status } = getCurrentPhase(state);
  const updated = (state.updated || state.last_updated || "unknown").split("T")[0];

  const info = { skill, phase, status, updated };

  if (skill === "grand-library") {
    info.project_name = state.project_name || "unnamed";
    if (phase === "interview" && status === "in_progress") {
      info.progress = `${state.phases.interview.topics_completed || 0}/${state.phases.interview.topics_total || 0} topics`;
    }
    if (phase === "draft" && status === "in_progress") {
      info.progress = `wave ${state.phases.draft.current_wave || 0}/${state.phases.draft.waves_total || 0}`;
    }
  }

  if (skill === "stronghold-of-security") {
    info.audit_number = state.audit_number || 1;
    info.tier = state.config?.tier || "standard";
    if (phase === "investigate" && status === "in_progress") {
      info.progress = `${state.phases.investigate?.batches_completed || 0}/${state.phases.investigate?.batches_total || 0} batches`;
    }
  }

  if (skill === "dinhs-bulwark") {
    info.audit_number = state.audit_number || 1;
    info.tier = state.config?.tier || "standard";
    if (phase === "investigate" && status === "in_progress") {
      info.progress = `${state.phases.investigate?.batches_completed || 0}/${state.phases.investigate?.batches_total || 0} batches`;
    }
  }

  if (skill === "book-of-knowledge" || skill === "BOK") {
    info.kani_available = state.kani_available || false;
    info.degraded_mode = state.degraded_mode || false;
    if (phase === "execute" && (status === "complete" || status === "in_progress")) {
      info.progress = {
        proven: state.phases.execute?.proven || 0,
        stress_tested: state.phases.execute?.stress_tested || 0,
        failed: state.phases.execute?.failed || 0,
        inconclusive: state.phases.execute?.inconclusive || 0,
      };
    }
    if (phase === "analyze" && status === "complete") {
      info.invariants_proposed = state.phases.analyze?.invariants_proposed || 0;
    }
  }

  return info;
}

/**
 * Build next-step suggestion for a skill.
 */
function getNextStep(skill, phase, status) {
  if (status === "in_progress") {
    if (skill === "grand-library") {
      const cmds = { survey: "/GL:survey", interview: "/GL:interview --resume", draft: "/GL:draft", reconcile: "/GL:reconcile" };
      return cmds[phase] ? `Resume: ${cmds[phase]}` : null;
    }
    if (skill === "stronghold-of-security") {
      return `Resume: /SOS:${phase} (auto-resumes)`;
    }
    return null;
  }

  if (status === "complete") {
    if (skill === "grand-library") {
      const next = { survey: "/GL:interview", interview: "/GL:draft", draft: "/GL:reconcile" };
      return next[phase] ? `Next: /clear then ${next[phase]}` : null;
    }
    if (skill === "stronghold-of-security") {
      const next = { scan: "/SOS:analyze", analyze: "/SOS:strategize", strategize: "/SOS:investigate", investigate: "/SOS:report", report: "/SOS:verify" };
      return next[phase] ? `Next: /clear then ${next[phase]}` : null;
    }
    if (skill === "dinhs-bulwark") {
      if (status === "in_progress") {
        return `Resume: /DB:${phase} (auto-resumes)`;
      }
      const next = { scan: "/DB:analyze", analyze: "/DB:strategize", strategize: "/DB:investigate", investigate: "/DB:report", report: "/DB:verify" };
      return next[phase] ? `Next: /clear then ${next[phase]}` : null;
    }
    if (skill === "book-of-knowledge" || skill === "BOK") {
      if (status === "in_progress") {
        return `Resume: /BOK:${phase}`;
      }
      const next = { scan: "/BOK:analyze", analyze: "/BOK:confirm", confirm: "/BOK:generate", generate: "/BOK:execute", execute: "/BOK:report" };
      return next[phase] ? `Next: /clear then ${next[phase]}` : "Verification complete";
    }
  }
  return null;
}

export async function handleProjectStatus(projectDir) {
  const skills = await scanSkillStates(projectDir);
  const historyCount = await countAuditHistory(projectDir);

  if (skills.length === 0 && historyCount === 0) {
    return { text: "No SVK state found in this project." };
  }

  const statuses = skills.map((s) => {
    const info = formatSkillStatus(s);
    const nextStep = getNextStep(s.skill, info.phase, info.status);
    return { ...info, next: nextStep };
  });

  const result = {
    skills: statuses,
    audit_history_count: historyCount,
  };

  // Also provide a human-readable summary
  const lines = statuses.map((s) => {
    let line = `▸ ${s.skill} — ${s.phase} (${s.status})`;
    if (s.progress) line += ` — ${s.progress}`;
    line += ` — updated ${s.updated}`;
    if (s.next) line += `\n  ${s.next}`;
    return line;
  });

  if (historyCount > 0) {
    lines.push(`\nHistory: ${historyCount} previous SOS audit(s) in .audit-history/`);
  }

  result.summary = lines.join("\n");
  return result;
}
