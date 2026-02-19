#!/usr/bin/env bash
# SVK SessionStart Hook — scans for active SVK skill state and injects status context.
# Outputs JSON with additionalContext for Claude Code's SessionStart hook protocol.
# If no SVK state exists, outputs nothing (zero context cost).

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
cd "$PROJECT_DIR"

STATUS_LINES=()

# Scan for SVK state files: any .*/STATE.json with a "skill" field
for state_file in .*/STATE.json; do
  [ -f "$state_file" ] || continue
  SKILL=$(jq -r '.skill // empty' "$state_file" 2>/dev/null) || continue
  [ -z "$SKILL" ] && continue

  UPDATED=$(jq -r '.updated // .last_updated // "unknown"' "$state_file" 2>/dev/null)
  # Trim to date only
  UPDATED_SHORT="${UPDATED%%T*}"

  case "$SKILL" in
    grand-library)
      PROJECT_NAME=$(jq -r '.project_name // "unnamed"' "$state_file" 2>/dev/null)

      # Find current phase
      CURRENT_PHASE=""
      CURRENT_STATUS=""
      for phase in survey interview draft reconcile; do
        PHASE_STATUS=$(jq -r ".phases.${phase}.status // \"pending\"" "$state_file" 2>/dev/null)
        if [ "$PHASE_STATUS" = "in_progress" ]; then
          CURRENT_PHASE="$phase"
          CURRENT_STATUS="in_progress"
          break
        elif [ "$PHASE_STATUS" = "complete" ]; then
          CURRENT_PHASE="$phase"
          CURRENT_STATUS="complete"
        fi
      done

      # Build progress detail
      DETAIL=""
      if [ "$CURRENT_PHASE" = "interview" ] && [ "$CURRENT_STATUS" = "in_progress" ]; then
        TOPICS_DONE=$(jq -r '.phases.interview.topics_completed // 0' "$state_file" 2>/dev/null)
        TOPICS_TOTAL=$(jq -r '.phases.interview.topics_total // 0' "$state_file" 2>/dev/null)
        DETAIL=" — ${TOPICS_DONE}/${TOPICS_TOTAL} topics"
      elif [ "$CURRENT_PHASE" = "draft" ] && [ "$CURRENT_STATUS" = "in_progress" ]; then
        WAVE=$(jq -r '.phases.draft.current_wave // 0' "$state_file" 2>/dev/null)
        WAVES_TOTAL=$(jq -r '.phases.draft.waves_total // 0' "$state_file" 2>/dev/null)
        DETAIL=" — wave ${WAVE}/${WAVES_TOTAL}"
      fi

      # Determine next step
      NEXT=""
      if [ "$CURRENT_STATUS" = "in_progress" ]; then
        case "$CURRENT_PHASE" in
          survey)    NEXT="  Next: /GL:survey (resume)" ;;
          interview) NEXT="  Next: /GL:interview --resume" ;;
          draft)     NEXT="  Next: /GL:draft (resume)" ;;
          reconcile) NEXT="  Next: /GL:reconcile (resume)" ;;
        esac
      elif [ "$CURRENT_STATUS" = "complete" ]; then
        case "$CURRENT_PHASE" in
          survey)    NEXT="  Next: /GL:interview" ;;
          interview) NEXT="  Next: /GL:draft" ;;
          draft)     NEXT="  Next: /GL:reconcile" ;;
          reconcile) NEXT="" ;;  # All done
        esac
      fi

      LINE="▸ GL Docs \"${PROJECT_NAME}\" — ${CURRENT_PHASE} (${CURRENT_STATUS})${DETAIL} — updated ${UPDATED_SHORT}"
      STATUS_LINES+=("$LINE")
      [ -n "$NEXT" ] && STATUS_LINES+=("$NEXT")
      ;;

    stronghold-of-security)
      AUDIT_NUM=$(jq -r '.audit_number // 1' "$state_file" 2>/dev/null)
      TIER=$(jq -r '.config.tier // "standard"' "$state_file" 2>/dev/null)

      # Find current phase
      CURRENT_PHASE=""
      CURRENT_STATUS=""
      for phase in scan analyze strategize investigate report verify; do
        PHASE_STATUS=$(jq -r ".phases.${phase}.status // \"pending\"" "$state_file" 2>/dev/null)
        if [ "$PHASE_STATUS" = "in_progress" ]; then
          CURRENT_PHASE="$phase"
          CURRENT_STATUS="in_progress"
          break
        elif [ "$PHASE_STATUS" = "complete" ]; then
          CURRENT_PHASE="$phase"
          CURRENT_STATUS="complete"
        fi
      done

      # Build progress detail for investigate phase
      DETAIL=""
      if [ "$CURRENT_PHASE" = "investigate" ] && [ "$CURRENT_STATUS" = "in_progress" ]; then
        BATCHES_DONE=$(jq -r '.phases.investigate.batches_completed // 0' "$state_file" 2>/dev/null)
        BATCHES_TOTAL=$(jq -r '.phases.investigate.batches_total // 0' "$state_file" 2>/dev/null)
        [ "$BATCHES_TOTAL" != "0" ] && [ "$BATCHES_TOTAL" != "null" ] && DETAIL=" — ${BATCHES_DONE}/${BATCHES_TOTAL} batches"
      fi

      # Determine next step
      NEXT=""
      if [ "$CURRENT_STATUS" = "in_progress" ]; then
        NEXT="  Next: /SOS:${CURRENT_PHASE} (auto-resumes)"
      elif [ "$CURRENT_STATUS" = "complete" ]; then
        case "$CURRENT_PHASE" in
          scan)        NEXT="  Next: /clear then /SOS:analyze" ;;
          analyze)     NEXT="  Next: /clear then /SOS:strategize" ;;
          strategize)  NEXT="  Next: /clear then /SOS:investigate" ;;
          investigate) NEXT="  Next: /clear then /SOS:report" ;;
          report)      NEXT="  Next: /SOS:verify to confirm fixes" ;;
          verify)      NEXT="" ;;  # All done
        esac
      fi

      LINE="▸ SOS Audit #${AUDIT_NUM} (${TIER}) — ${CURRENT_PHASE} (${CURRENT_STATUS})${DETAIL} — updated ${UPDATED_SHORT}"
      STATUS_LINES+=("$LINE")
      [ -n "$NEXT" ] && STATUS_LINES+=("$NEXT")
      ;;

    dinhs-bulwark)
      AUDIT_NUM=$(jq -r '.audit_number // 1' "$state_file" 2>/dev/null)
      TIER=$(jq -r '.config.tier // "standard"' "$state_file" 2>/dev/null)

      # Find current phase
      CURRENT_PHASE=""
      CURRENT_STATUS=""
      for phase in scan analyze strategize investigate report verify; do
        PHASE_STATUS=$(jq -r ".phases.${phase}.status // \"pending\"" "$state_file" 2>/dev/null)
        if [ "$PHASE_STATUS" = "in_progress" ]; then
          CURRENT_PHASE="$phase"
          CURRENT_STATUS="in_progress"
          break
        elif [ "$PHASE_STATUS" = "complete" ]; then
          CURRENT_PHASE="$phase"
          CURRENT_STATUS="complete"
        fi
      done

      # Build progress detail for investigate phase
      DETAIL=""
      if [ "$CURRENT_PHASE" = "investigate" ] && [ "$CURRENT_STATUS" = "in_progress" ]; then
        BATCHES_DONE=$(jq -r '.phases.investigate.batches_completed // 0' "$state_file" 2>/dev/null)
        BATCHES_TOTAL=$(jq -r '.phases.investigate.batches_total // 0' "$state_file" 2>/dev/null)
        [ "$BATCHES_TOTAL" != "0" ] && [ "$BATCHES_TOTAL" != "null" ] && DETAIL=" — ${BATCHES_DONE}/${BATCHES_TOTAL} batches"
      fi

      # Determine next step
      NEXT=""
      if [ "$CURRENT_STATUS" = "in_progress" ]; then
        NEXT="  Next: /DB:${CURRENT_PHASE} (auto-resumes)"
      elif [ "$CURRENT_STATUS" = "complete" ]; then
        case "$CURRENT_PHASE" in
          scan)        NEXT="  Next: /clear then /DB:analyze" ;;
          analyze)     NEXT="  Next: /clear then /DB:strategize" ;;
          strategize)  NEXT="  Next: /clear then /DB:investigate" ;;
          investigate) NEXT="  Next: /clear then /DB:report" ;;
          report)      NEXT="  Next: /DB:verify to confirm fixes" ;;
          verify)      NEXT="" ;;  # All done
        esac
      fi

      LINE="▸ DB Audit #${AUDIT_NUM} (${TIER}) — ${CURRENT_PHASE} (${CURRENT_STATUS})${DETAIL} — updated ${UPDATED_SHORT}"
      STATUS_LINES+=("$LINE")
      [ -n "$NEXT" ] && STATUS_LINES+=("$NEXT")
      ;;

    book-of-knowledge|BOK)
      KANI=$(jq -r '.kani_available // false' "$state_file" 2>/dev/null)
      DEGRADED=$(jq -r '.degraded_mode // false' "$state_file" 2>/dev/null)
      CURRENT_PHASE=""
      CURRENT_STATUS=""
      for phase in scan analyze confirm generate execute report; do
        PHASE_STATUS=$(jq -r ".phases.${phase}.status // \"pending\"" "$state_file" 2>/dev/null)
        if [ "$PHASE_STATUS" = "in_progress" ]; then
          CURRENT_PHASE="$phase"
          CURRENT_STATUS="in_progress"
          break
        elif [ "$PHASE_STATUS" = "complete" ]; then
          CURRENT_PHASE="$phase"
          CURRENT_STATUS="complete"
        fi
      done
      DETAIL=""
      if [ "$CURRENT_PHASE" = "execute" ] && [ "$CURRENT_STATUS" = "complete" ]; then
        PROVEN=$(jq -r '.phases.execute.proven // 0' "$state_file" 2>/dev/null)
        FAILED=$(jq -r '.phases.execute.failed // 0' "$state_file" 2>/dev/null)
        DETAIL=" — ${PROVEN} proven, ${FAILED} failed"
      fi
      [ "$DEGRADED" = "true" ] && DETAIL="${DETAIL} (no Kani)"
      NEXT=""
      if [ "$CURRENT_STATUS" = "in_progress" ]; then
        case "$CURRENT_PHASE" in
          scan)     NEXT="  Next: /BOK:scan (resume)" ;;
          analyze)  NEXT="  Next: /BOK:analyze (resume)" ;;
          confirm)  NEXT="  Next: /BOK:confirm (resume)" ;;
          generate) NEXT="  Next: /BOK:generate (resume)" ;;
          execute)  NEXT="  Next: /BOK:execute (resume)" ;;
          report)   NEXT="  Next: /BOK:report (resume)" ;;
        esac
      elif [ "$CURRENT_STATUS" = "complete" ]; then
        case "$CURRENT_PHASE" in
          scan)     NEXT="  Next: /BOK:analyze" ;;
          analyze)  NEXT="  Next: /BOK:confirm" ;;
          confirm)  NEXT="  Next: /BOK:generate" ;;
          generate) NEXT="  Next: /BOK:execute" ;;
          execute)  NEXT="  Next: /BOK:report" ;;
          report)   NEXT="  Verification complete" ;;
        esac
      fi
      LINE="▸ BOK — ${CURRENT_PHASE} (${CURRENT_STATUS})${DETAIL} — updated ${UPDATED_SHORT}"
      STATUS_LINES+=("$LINE")
      [ -n "$NEXT" ] && STATUS_LINES+=("$NEXT")
      ;;

    *)
      # Generic handler for future skills: show skill name, updated, and phases overview
      CURRENT_PHASE=$(jq -r '
        .phases | to_entries[]
        | select(.value.status == "in_progress")
        | .key' "$state_file" 2>/dev/null | head -1)
      if [ -z "$CURRENT_PHASE" ]; then
        CURRENT_PHASE=$(jq -r '
          .phases | to_entries[]
          | select(.value.status == "complete")
          | .key' "$state_file" 2>/dev/null | tail -1)
        CURRENT_STATUS="complete"
      else
        CURRENT_STATUS="in_progress"
      fi
      [ -z "$CURRENT_PHASE" ] && CURRENT_PHASE="initializing" && CURRENT_STATUS="pending"

      LINE="▸ ${SKILL} — ${CURRENT_PHASE} (${CURRENT_STATUS}) — updated ${UPDATED_SHORT}"
      STATUS_LINES+=("$LINE")
      ;;
  esac
done

# Check audit history
HISTORY_COUNT=0
if [ -d ".audit-history" ]; then
  HISTORY_COUNT=$(find .audit-history -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
fi

# If nothing found, exit silently (zero context cost)
if [ ${#STATUS_LINES[@]} -eq 0 ] && [ "$HISTORY_COUNT" -eq 0 ]; then
  exit 0
fi

# Build the status block
STATUS="SVK Project Status\n━━━━━━━━━━━━━━━━━"
for line in "${STATUS_LINES[@]}"; do
  STATUS="${STATUS}\n${line}"
done

if [ "$HISTORY_COUNT" -gt 0 ]; then
  STATUS="${STATUS}\n\nHistory: ${HISTORY_COUNT} previous SOS audit(s) in .audit-history/"
fi

# Output as JSON for Claude Code hook protocol
CONTEXT=$(printf '%s' "$STATUS" | jq -Rs .)
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":%s}}' "$CONTEXT"
