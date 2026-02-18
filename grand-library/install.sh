#!/bin/bash
# Install Grand Library into a project
# Usage: ./install.sh [target-project-directory]

set -e

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing Grand Library to $TARGET..."

# Create directories
mkdir -p "$TARGET/.claude/skills/grand-library"
mkdir -p "$TARGET/.claude/commands/GL"

# Copy skill files (agents, resources, templates, SKILL.md)
cp -R "$SCRIPT_DIR/agents" "$TARGET/.claude/skills/grand-library/"
cp -R "$SCRIPT_DIR/resources" "$TARGET/.claude/skills/grand-library/"
cp -R "$SCRIPT_DIR/templates" "$TARGET/.claude/skills/grand-library/"
cp "$SCRIPT_DIR/SKILL.md" "$TARGET/.claude/skills/grand-library/"

# Copy command files
cp "$SCRIPT_DIR/commands/"*.md "$TARGET/.claude/commands/GL/"

echo ""
echo "Done! Grand Library is installed."
echo ""
echo "  Skill:    $TARGET/.claude/skills/grand-library/"
echo "  Commands: $TARGET/.claude/commands/GL/"
echo ""
echo "Run /grand-library to get started, or /GL:survey to begin."
