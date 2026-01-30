#!/bin/bash
# Agent-aware 监听脚本
# 用途：智能查找并监听 server 包的 .agent-aware/alert.json 文件
# 基于 SPEC-SKILL-001: Monitor Script

set -e

# 参数
DURATION=${1:-120}  # 监听时长（秒），默认 120 秒
INTERVAL=${2:-5}    # 检查间隔（秒），默认 5 秒
CUSTOM_PATH=${3:-""}  # 自定义路径（可选）

# 自动查找 alert.json 文件
# 优先级：1. 用户指定 2. 项目本地 3. 全局 4. 本地开发
find_alert_file() {
  # 1. 用户指定的路径
  if [ -n "$CUSTOM_PATH" ]; then
    echo "$CUSTOM_PATH"
    return
  fi
  
  # 2. 项目本地 node_modules
  if [ -f "node_modules/@reskill/agent-aware-server/.agent-aware/alert.json" ]; then
    echo "node_modules/@reskill/agent-aware-server/.agent-aware/alert.json"
    return
  fi
  
  # 3. 全局 node_modules（通过 npm root -g）
  if command -v npm &> /dev/null; then
    GLOBAL_MODULES=$(npm root -g 2>/dev/null)
    if [ -n "$GLOBAL_MODULES" ] && [ -f "$GLOBAL_MODULES/@reskill/agent-aware-server/.agent-aware/alert.json" ]; then
      echo "$GLOBAL_MODULES/@reskill/agent-aware-server/.agent-aware/alert.json"
      return
    fi
  fi
  
  # 4. 本地开发路径
  if [ -f "packages/server/.agent-aware/alert.json" ]; then
    echo "packages/server/.agent-aware/alert.json"
    return
  fi
  
  # 默认返回本地开发路径（即使不存在，后续会监听等待）
  echo "packages/server/.agent-aware/alert.json"
}

ALERT_FILE=$(find_alert_file)

echo "🔍 开始监控 (持续 ${DURATION} 秒，每 ${INTERVAL} 秒检查一次)"
echo "📁 监控文件: ${ALERT_FILE}"
echo ""

elapsed=0

while [ $elapsed -lt $DURATION ]; do
  if [ -f "$ALERT_FILE" ]; then
    echo "⚠️  发现问题标记！"
    cat "$ALERT_FILE"
    echo ""
    echo "EXIT_CODE:1"  # 告诉 agent 发现了问题
    exit 1
  fi
  
  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))
  
  # 显示进度
  if [ $((elapsed % 30)) -eq 0 ]; then
    echo "⏱️  已监控 ${elapsed}/${DURATION} 秒..."
  fi
done

echo "✅ 监控完成，未发现问题"
echo "EXIT_CODE:0"
exit 0
