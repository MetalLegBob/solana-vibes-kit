#!/bin/bash
# Install The Fortress into a project
# Usage: ./install.sh [target-project-directory]

set -e

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing The Fortress to $TARGET..."

# Create directories
mkdir -p "$TARGET/.claude/skills/the-fortress"
mkdir -p "$TARGET/.claude/commands/the-fortress"

# Copy skill files (agents, KB, resources, templates, SKILL.md)
cp -R "$SCRIPT_DIR/agents" "$TARGET/.claude/skills/the-fortress/"
cp -R "$SCRIPT_DIR/knowledge-base" "$TARGET/.claude/skills/the-fortress/"
cp -R "$SCRIPT_DIR/resources" "$TARGET/.claude/skills/the-fortress/"
cp -R "$SCRIPT_DIR/templates" "$TARGET/.claude/skills/the-fortress/"
cp "$SCRIPT_DIR/SKILL.md" "$TARGET/.claude/skills/the-fortress/"

# Copy command files
cp "$SCRIPT_DIR/commands/"*.md "$TARGET/.claude/commands/the-fortress/"

echo ""
echo "Done! The Fortress is installed."
echo ""
echo "  Skill:    $TARGET/.claude/skills/the-fortress/"
echo "  Commands: $TARGET/.claude/commands/the-fortress/"
echo ""
echo "Run /the-fortress to get started, or /the-fortress:scan to begin an audit."
