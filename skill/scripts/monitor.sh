#!/bin/bash
# Agent-aware 监听脚本
# 用途：监听用户项目根目录的 .agent-aware/alert/ 目录
# 基于 SPEC-SKILL-002: Monitor Script 重构
#
# 监听 .agent-aware/alert/behavior.json 和 .agent-aware/alert/error.json
# 优先级：error.json > behavior.json

set -e

# 参数
DURATION=${1:-120}        # 监听时长（秒），默认 120 秒
INTERVAL=${2:-5}          # 检查间隔（秒），默认 5 秒
PROJECT_ROOT=${3:-.}      # 项目根目录，默认当前目录

# 计算绝对路径（处理相对路径）
if [[ "$PROJECT_ROOT" = /* ]]; then
  # 已经是绝对路径
  ABS_PROJECT_ROOT="$PROJECT_ROOT"
else
  # 转换为绝对路径
  ABS_PROJECT_ROOT="$(cd "$PROJECT_ROOT" 2>/dev/null && pwd || echo "$PROJECT_ROOT")"
fi

# 监听目录和文件（统一到 .agent-aware/alert/ 目录）
AGENT_AWARE_DIR="${ABS_PROJECT_ROOT}/.agent-aware"
ALERT_DIR="${AGENT_AWARE_DIR}/alert"
ERROR_FILE="${ALERT_DIR}/error.json"
BEHAVIOR_FILE="${ALERT_DIR}/behavior.json"

echo "🔍 开始监控 Agent-aware 检测文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 监控目录: ${ALERT_DIR}"
echo "📝 错误文件: alert/error.json (优先级: 高)"
echo "📝 行为文件: alert/behavior.json (优先级: 中)"
echo "⏱️  监控时长: ${DURATION} 秒"
echo "🔄 检查间隔: ${INTERVAL} 秒"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

elapsed=0
check_count=0

while [ $elapsed -lt $DURATION ]; do
  check_count=$((check_count + 1))
  
  # 优先检查 error.json（Critical 错误）
  if [ -f "$ERROR_FILE" ]; then
    echo "🚨 发现错误问题！"
    echo "文件: ${ERROR_FILE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$ERROR_FILE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "EXIT_CODE:1"
    exit 1
  fi
  
  # 检查 behavior.json（行为问题）
  if [ -f "$BEHAVIOR_FILE" ]; then
    echo "⚠️  发现行为问题！"
    echo "文件: ${BEHAVIOR_FILE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$BEHAVIOR_FILE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "EXIT_CODE:1"
    exit 1
  fi
  
  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))
  
  # 显示进度（每 30 秒）
  if [ $((elapsed % 30)) -eq 0 ] && [ $elapsed -lt $DURATION ]; then
    echo "⏱️  已监控 ${elapsed}/${DURATION} 秒 | 检查次数: ${check_count}"
  fi
done

echo "✅ 监控完成，未发现问题"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "监控时长: ${DURATION} 秒"
echo "检查次数: ${check_count} 次"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "EXIT_CODE:0"
exit 0
