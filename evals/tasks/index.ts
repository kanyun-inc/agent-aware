/**
 * 任务注册表
 *
 * 精简后任务列表（6 个）：
 * - 001: Server 基础功能测试（原 002+003 合并）
 * - 002: 问题检测测试（原 004+005 合并）
 * - 003: 错误修复测试（原 006）
 * - 004: 完整集成测试（原 007）
 * - 005: Skill 遵循度评估（原 008，LLM Judge）
 * - 006: 动态项目真实场景评估（原 009）
 */

import type { EvalTask } from '../harness/types';

// 重新导出常量
export { DEFAULT_TEST_APP_PATH } from './constants';

// 导入所有任务
import { task as task001 } from './001-server-basic';
import { task as task002 } from './002-issue-detection';
import { task as task003 } from './003-error-fix';
import { task as task004 } from './004-full-integration';
import { task as task005 } from './005-skill-compliance';
import { task as task006 } from './006-dynamic-project-eval';

/**
 * 所有可用的任务列表
 */
const allTasks: EvalTask[] = [
  task001,
  task002,
  task003,
  task004,
  task005,
  task006,
];

/**
 * 任务注册表（按 ID 索引）
 */
const taskRegistry = new Map<string, EvalTask>();
for (const task of allTasks) {
  taskRegistry.set(task.id, task);
}

/**
 * 加载所有任务
 */
export async function loadTasks(): Promise<EvalTask[]> {
  console.log(`[Tasks] 加载 ${allTasks.length} 个任务`);
  return allTasks;
}

/**
 * 根据 ID 获取任务
 */
export function getTask(taskId: string): EvalTask | undefined {
  return taskRegistry.get(taskId);
}

/**
 * 获取所有任务 ID
 */
export function getTaskIds(): string[] {
  return Array.from(taskRegistry.keys());
}

/**
 * 根据前缀过滤任务
 */
export async function loadTasksByPrefix(prefix: string): Promise<EvalTask[]> {
  return allTasks.filter((t) => t.id === prefix || t.id.startsWith(prefix));
}
