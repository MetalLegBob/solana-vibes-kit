#!/bin/bash
# Install SVK MCP server into a project's .mcp.json
# Usage: ./install.sh [target-project-directory]

set -e

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing SVK MCP server for $TARGET..."

# Install npm dependencies if needed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "Installing MCP server dependencies..."
  cd "$SCRIPT_DIR" && npm install --production && cd -
fi

# Create or update .mcp.json
MCP_CONFIG="$TARGET/.mcp.json"
SVK_MCP_PATH="$SCRIPT_DIR/index.js"

if [ -f "$MCP_CONFIG" ]; then
  if command -v python3 &>/dev/null; then
    python3 -c "
import json
with open('$MCP_CONFIG', 'r') as f:
    config = json.load(f)
config.setdefault('mcpServers', {})['svk'] = {
    'command': 'node',
    'args': ['$SVK_MCP_PATH'],
    'env': {'SVK_PROJECT_DIR': '.'}
}
with open('$MCP_CONFIG', 'w') as f:
    json.dump(config, f, indent=2)
"
  fi
else
  if command -v python3 &>/dev/null; then
    python3 -c "
import json
config = {
    'mcpServers': {
        'svk': {
            'command': 'node',
            'args': ['$SVK_MCP_PATH'],
            'env': {'SVK_PROJECT_DIR': '.'}
        }
    }
}
with open('$MCP_CONFIG', 'w') as f:
    json.dump(config, f, indent=2)
"
  fi
fi

# Copy hook script (skip if source and target are the same file, e.g. self-install)
mkdir -p "$TARGET/.claude/hooks"
HOOK_SRC="$SCRIPT_DIR/svk-session-start.sh"
HOOK_DST="$(cd "$TARGET/.claude/hooks" && pwd)/svk-session-start.sh"
if [ "$HOOK_SRC" != "$HOOK_DST" ]; then
  cp "$HOOK_SRC" "$HOOK_DST"
fi
chmod +x "$HOOK_DST"

# Create or update .claude/settings.json with hook config
SETTINGS="$TARGET/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  if command -v python3 &>/dev/null; then
    python3 -c "
import json
with open('$SETTINGS', 'r') as f:
    settings = json.load(f)
settings.setdefault('hooks', {}).setdefault('SessionStart', [])
# Check if SVK hook already exists
svk_exists = any(
    any('svk-session-start' in h.get('command', '') for h in entry.get('hooks', []))
    for entry in settings['hooks']['SessionStart']
)
if not svk_exists:
    settings['hooks']['SessionStart'].append({
        'matcher': 'startup',
        'hooks': [{
            'type': 'command',
            'command': '.claude/hooks/svk-session-start.sh',
            'timeout': 5
        }]
    })
with open('$SETTINGS', 'w') as f:
    json.dump(settings, f, indent=2)
"
  fi
else
  if command -v python3 &>/dev/null; then
    python3 -c "
import json
settings = {
    'hooks': {
        'SessionStart': [{
            'matcher': 'startup',
            'hooks': [{
                'type': 'command',
                'command': '.claude/hooks/svk-session-start.sh',
                'timeout': 5
            }]
        }]
    }
}
with open('$SETTINGS', 'w') as f:
    json.dump(settings, f, indent=2)
"
  fi
fi

echo ""
echo "Done! SVK awareness layer installed."
echo ""
echo "  MCP config: $MCP_CONFIG"
echo "  Hook:       $TARGET/.claude/hooks/svk-session-start.sh"
echo "  Settings:   $SETTINGS"
echo ""
echo "  MCP tools: svk_project_status, svk_get_doc, svk_get_decisions,"
echo "             svk_get_audit, svk_search, svk_suggest"
echo ""
echo "  Restart Claude Code to activate the SessionStart hook."
