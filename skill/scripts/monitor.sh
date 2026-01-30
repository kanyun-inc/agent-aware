#!/bin/bash
# Agent-aware 监听脚本
# 用途：监听 .agent-aware/alert.json 文件变化

set -e

# 参数
DURATION=${1:-120}  # 监听时长（秒），默认 120 秒
INTERVAL=${2:-5}    # 检查间隔（秒），默认 5 秒
ALERT_FILE=${3:-.agent-aware/alert.json}

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
