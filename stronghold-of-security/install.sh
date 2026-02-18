#!/bin/bash
# Install Stronghold of Security into a project
# Usage: ./install.sh [target-project-directory]

set -e

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing Stronghold of Security to $TARGET..."

# Create directories
mkdir -p "$TARGET/.claude/skills/stronghold-of-security"
mkdir -p "$TARGET/.claude/commands/SOS"

# Copy skill files (agents, KB, resources, templates, SKILL.md)
cp -R "$SCRIPT_DIR/agents" "$TARGET/.claude/skills/stronghold-of-security/"
cp -R "$SCRIPT_DIR/resources" "$TARGET/.claude/skills/stronghold-of-security/"
cp -R "$SCRIPT_DIR/templates" "$TARGET/.claude/skills/stronghold-of-security/"
cp "$SCRIPT_DIR/SKILL.md" "$TARGET/.claude/skills/stronghold-of-security/"

# Copy knowledge base (excluding archive and research)
rsync -a --exclude='archive/' "$SCRIPT_DIR/knowledge-base" "$TARGET/.claude/skills/stronghold-of-security/"

# Copy command files
cp "$SCRIPT_DIR/commands/"*.md "$TARGET/.claude/commands/SOS/"

echo ""
echo "Done! Stronghold of Security is installed."
echo ""
echo "  Skill:    $TARGET/.claude/skills/stronghold-of-security/"
echo "  Commands: $TARGET/.claude/commands/SOS/"
echo ""
echo "Run /stronghold-of-security to get started, or /SOS:scan to begin an audit."
