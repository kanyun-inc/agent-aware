/**
 * Task 009: Skill E2E 完整测试
 *
 * 基于 .cursor/skills/agent-aware-e2e-test/SKILL.md 实现完整的 E2E 评估：
 *
 * Phase 1: 使用 LLM 随机生成前端项目（包含故意埋入的问题）
 * Phase 2: 启动服务并使用浏览器自动化测试
 * Phase 3: 验证检测结果并生成报告
 * Phase 4: 清理资源
 *
 * 评分标准：
 * - 基础分 0.4：应用生成成功并正常运行
 * - +0.2：检测到 Dead Click
 * - +0.2：检测到 Rage Click
 * - +0.2：检测到 Runtime Error
 * - 总分 >= 0.8 为通过
 */

import type { EvalTask } from '../harness/types';

export const task009: EvalTask = {
  id: '009-skill-e2e-test',
  name: 'Skill E2E 完整测试',
  description:
    '基于 SKILL.md 流程：LLM 生成随机应用 → 浏览器自动化触发问题 → 验证检测能力',
  graders: [
    {
      type: 'skill-e2e',
      checks: {
        monitorDuration: 30,
        model: 'sonnet',
        browserAutomation: true,
      },
    },
  ],
  config: {
    needsServer: true,
    needsDevServer: false, // Grader 内部启动
    // 不设置 testAppPath，使用临时目录，由 Grader 动态生成应用
  },
};
