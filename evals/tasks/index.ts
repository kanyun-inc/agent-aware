/**
 * 任务注册表
 *
 * 任务列表：
 * - 001: SDK 安装初始化及上报数据
 * - 002: Server 启动数据收集处理持久化
 * - 003: Agent-Aware 服务错误处理测试
 * - 004: Agent-Aware 行为检测响应
 * - 005: Agent-Aware 错误检测响应
 * - 006: Agent-Aware 错误修复
 * - 007: 完整 Agent-Aware 集成测试
 */

import type { EvalTask } from '../harness/types';

// 导入所有任务
import { task as task001 } from './001-sdk-init-report';
import { task as task002 } from './002-server-data-collection';
import { task as task003 } from './003-server-error-handling';
import { task as task004 } from './004-server-behavior-detection';
import { task as task005 } from './005-server-error-detection';
import { task as task006 } from './006-error-fix';
import { task as task007 } from './007-full-integration';

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
  task007,
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
