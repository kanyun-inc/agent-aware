/**
 * 任务 009: 动态项目真实场景评估
 *
 * 随机生成前端项目，验证 agent-aware 检测能力，LLM 评估整体质量
 *
 * 流程：
 * 1. 使用 LLM 生成随机的 React+Vite 项目（包含预埋问题）
 * 2. 启动 agent-aware-server 和开发服务器
 * 3. 使用 Playwright 自动触发预埋问题
 * 4. 验证 Server 是否正确检测问题
 * 5. 使用 LLM Judge 评估整体质量
 */

import type { EvalTask } from '../harness/types';

export const task: EvalTask = {
  id: '009-dynamic-project-eval',
  name: '动态项目真实场景评估',
  description:
    '随机生成前端项目，验证 agent-aware 检测能力，LLM 评估整体质量',
  graders: [
    // 1. 动态项目评分器（生成项目、触发问题、计算检测准确性）
    {
      type: 'dynamic-project',
      checks: {
        generateProject: true,
        autoTrigger: true,
        generatorConfig: {
          bugCounts: {
            deadClick: 1,
            rageClick: 1,
            runtimeError: 1,
          },
        },
      },
    },
    // 2. Server 评分器（验证基础功能）
    {
      type: 'server',
      checks: {
        serverStart: true,
        apiResponse: true,
        issueDetection: true,
        // 不使用严格验证，因为问题是动态生成的
        strictIssueValidation: false,
      },
    },
    // 3. E2E 评分器（验证完整流程）
    {
      type: 'e2e',
      checks: {
        fullFlow: true,
        issueFix: false, // 此任务不测试修复功能
      },
    },
    // 4. LLM Judge 评估（评估生成质量和检测准确性）
    {
      type: 'llm',
      checks: {
        dimensions: ['project_generation', 'detection_accuracy'],
      },
    },
  ],
  config: {
    needsServer: true,
    needsDevServer: true,
    // testAppPath 由 dynamic-project grader 动态设置
  },
  timeout: 600000, // 10 分钟（LLM 生成 + 触发 + 评估需要较长时间）
};
