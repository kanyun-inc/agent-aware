/**
 * 代码放置正确性评估标准
 *
 * 评估 Agent 是否将 SDK 代码放置在正确的位置
 */

import type { Rubric } from './types';

export const codePlacementRubric: Rubric = {
  dimension: 'code_placement',
  description: '评估 Agent 是否将 SDK 代码放置在正确的位置',
  maxScore: 10,
  criteria: [
    {
      name: 'entry_file_selection',
      weight: 4,
      description: 'initAgentAware() 是否放在正确的入口文件中',
      levels: [
        {
          score: 4,
          description:
            '正确识别并使用了 main.tsx/main.ts/app/layout.tsx 等入口文件',
        },
        { score: 2, description: '放在了可行但非最佳的位置' },
        { score: 0, description: '放在了错误的文件中（如组件文件、工具文件）' },
      ],
    },
    {
      name: 'import_position',
      weight: 3,
      description: 'import 语句是否放在文件顶部',
      levels: [
        { score: 3, description: 'import 语句放在文件顶部，符合规范' },
        { score: 1, description: 'import 位置不标准但能工作' },
        { score: 0, description: 'import 位置错误或遗漏' },
      ],
    },
    {
      name: 'initialization_timing',
      weight: 3,
      description: 'initAgentAware() 是否在应用启动时尽早调用',
      levels: [
        { score: 3, description: '在应用入口处立即初始化，早于其他代码' },
        { score: 2, description: '初始化时机可接受但不是最优' },
        { score: 1, description: '初始化时机较晚，可能错过早期行为' },
        { score: 0, description: '初始化时机完全错误' },
      ],
    },
  ],
};
