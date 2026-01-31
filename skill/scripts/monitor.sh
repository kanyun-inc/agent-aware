#!/bin/bash
# Agent-aware monitoring script
# Purpose: Monitor the .agent-aware/alert/ directory in the user's project root
# Based on SPEC-SKILL-002: Monitor Script Refactor
#
# Monitors .agent-aware/alert/behavior.json and .agent-aware/alert/error.json
# Priority: error.json > behavior.json

set -e

# Parameters
DURATION=${1:-120}        # Monitoring duration (seconds), default 120
INTERVAL=${2:-5}          # Check interval (seconds), default 5
PROJECT_ROOT=${3:-.}      # Project root directory, default current directory

# Calculate absolute path (handle relative paths)
if [[ "$PROJECT_ROOT" = /* ]]; then
  # Already absolute path
  ABS_PROJECT_ROOT="$PROJECT_ROOT"
else
  # Convert to absolute path
  ABS_PROJECT_ROOT="$(cd "$PROJECT_ROOT" 2>/dev/null && pwd || echo "$PROJECT_ROOT")"
fi

# Monitoring directory and files (unified to .agent-aware/alert/ directory)
AGENT_AWARE_DIR="${ABS_PROJECT_ROOT}/.agent-aware"
ALERT_DIR="${AGENT_AWARE_DIR}/alert"
ERROR_FILE="${ALERT_DIR}/error.json"
BEHAVIOR_FILE="${ALERT_DIR}/behavior.json"

echo "🔍 Starting Agent-aware detection file monitoring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Monitoring directory: ${ALERT_DIR}"
echo "📝 Error file: alert/error.json (Priority: High)"
echo "📝 Behavior file: alert/behavior.json (Priority: Medium)"
echo "⏱️  Monitoring duration: ${DURATION} seconds"
echo "🔄 Check interval: ${INTERVAL} seconds"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

elapsed=0
check_count=0

while [ $elapsed -lt $DURATION ]; do
  check_count=$((check_count + 1))
  
  # Priority check error.json (Critical errors)
  if [ -f "$ERROR_FILE" ]; then
    echo "🚨 Error issue detected!"
    echo "File: ${ERROR_FILE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$ERROR_FILE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "EXIT_CODE:1"
    exit 1
  fi
  
  # Check behavior.json (behavior issues)
  if [ -f "$BEHAVIOR_FILE" ]; then
    echo "⚠️  Behavior issue detected!"
    echo "File: ${BEHAVIOR_FILE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$BEHAVIOR_FILE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "EXIT_CODE:1"
    exit 1
  fi
  
  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))
  
  # Show progress (every 30 seconds)
  if [ $((elapsed % 30)) -eq 0 ] && [ $elapsed -lt $DURATION ]; then
    echo "⏱️  Monitored ${elapsed}/${DURATION} seconds | Check count: ${check_count}"
  fi
done

echo "✅ Monitoring complete, no issues found"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Monitoring duration: ${DURATION} seconds"
echo "Check count: ${check_count}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "EXIT_CODE:0"
exit 0
