#!/bin/bash
# Install SVK Setup into a project
# Usage: ./install.sh [target-project-directory]

set -e

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing SVK Setup to $TARGET..."

# Create directories
mkdir -p "$TARGET/.claude/skills/svk-setup"
mkdir -p "$TARGET/.claude/commands/svk-setup"

# Copy skill files (resources, SKILL.md)
cp -R "$SCRIPT_DIR/resources" "$TARGET/.claude/skills/svk-setup/"
cp "$SCRIPT_DIR/SKILL.md" "$TARGET/.claude/skills/svk-setup/"

# Copy command files
cp "$SCRIPT_DIR/commands/"*.md "$TARGET/.claude/commands/svk-setup/"

echo ""
echo "Done! SVK Setup is installed."
echo ""
echo "  Skill:    $TARGET/.claude/skills/svk-setup/"
echo "  Commands: $TARGET/.claude/commands/svk-setup/"
echo ""
echo "Run /svk-setup for the full guided flow, or /SVK:setup:interview to begin."
