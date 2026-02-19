#!/bin/bash
# Install Book of Knowledge into a project
# Usage: ./install.sh [target-project-directory]

set -e

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing Book of Knowledge to $TARGET..."

# Create directories
mkdir -p "$TARGET/.claude/skills/book-of-knowledge"
mkdir -p "$TARGET/.claude/commands/BOK"

# Copy skill files (SKILL.md, resources, agents, templates)
cp "$SCRIPT_DIR/SKILL.md" "$TARGET/.claude/skills/book-of-knowledge/"
cp -R "$SCRIPT_DIR/resources" "$TARGET/.claude/skills/book-of-knowledge/"
cp -R "$SCRIPT_DIR/agents" "$TARGET/.claude/skills/book-of-knowledge/"
cp -R "$SCRIPT_DIR/templates" "$TARGET/.claude/skills/book-of-knowledge/"

# Copy command files
cp "$SCRIPT_DIR/commands/"*.md "$TARGET/.claude/commands/BOK/"

# Update SVK metadata for version tracking
SVK_META="$TARGET/.claude/svk-meta.json"
SKILL_NAME="book-of-knowledge"
SVK_VERSION=$(grep '^version:' "$SCRIPT_DIR/SKILL.md" | head -1 | sed 's/version: *"\(.*\)"/\1/')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ -f "$SVK_META" ]; then
  if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
with open('$SVK_META', 'r') as f:
    meta = json.load(f)
if '$SKILL_NAME' not in meta.get('installed_skills', []):
    meta.setdefault('installed_skills', []).append('$SKILL_NAME')
meta['installed_version'] = '$SVK_VERSION'
meta['updated_at'] = '$TIMESTAMP'
meta['svk_repo'] = '$SCRIPT_DIR/..'
with open('$SVK_META', 'w') as f:
    json.dump(meta, f, indent=2)
"
  fi
else
  if command -v python3 &>/dev/null; then
    python3 -c "
import json
meta = {
  'svk_repo': '$(cd "$SCRIPT_DIR/.." && pwd)',
  'installed_version': '$SVK_VERSION',
  'installed_skills': ['$SKILL_NAME'],
  'installed_at': '$TIMESTAMP'
}
with open('$SVK_META', 'w') as f:
    json.dump(meta, f, indent=2)
"
  fi
fi

echo ""
echo "Done! Book of Knowledge is installed."
echo ""
echo "  Skill:    $TARGET/.claude/skills/book-of-knowledge/"
echo "  Commands: $TARGET/.claude/commands/BOK/"
echo ""
echo "Run /BOK for a getting-started guide, or /BOK:scan to begin."
