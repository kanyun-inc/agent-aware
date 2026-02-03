/**
 * 浏览器自动化触发器
 *
 * 使用 Playwright 自动触发预埋的问题
 */

import type { EmbeddedBug } from './generator';

/**
 * Playwright 类型（动态导入避免强制依赖）
 */
type Browser = import('playwright').Browser;
type Page = import('playwright').Page;

/**
 * 触发结果
 */
export interface TriggerResult {
  /** 是否成功触发 */
  success: boolean;
  /** 触发的问题类型 */
  bugType: EmbeddedBug['type'];
  /** 选择器 */
  selector: string;
  /** 错误信息（如果失败） */
  error?: string;
  /** 触发时间 */
  triggeredAt: string;
}

/**
 * 触发器配置
 */
export interface TriggerConfig {
  /** 开发服务器 URL */
  devServerUrl: string;
  /** 等待页面加载的时间（毫秒） */
  pageLoadWait?: number;
  /** 触发后等待数据上报的时间（毫秒） */
  reportWait?: number;
  /** 是否显示浏览器（调试用） */
  headless?: boolean;
  /** rage click 的点击次数 */
  rageClickCount?: number;
}

/**
 * 动态导入 Playwright
 */
async function importPlaywright(): Promise<typeof import('playwright')> {
  try {
    return await import('playwright');
  } catch {
    throw new Error(
      'Playwright is not installed. Run: pnpm add -D playwright @playwright/test'
    );
  }
}

/**
 * 等待指定毫秒
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 触发 dead_click
 * 点击一个无响应的元素
 */
async function triggerDeadClick(
  page: Page,
  bug: EmbeddedBug
): Promise<TriggerResult> {
  const result: TriggerResult = {
    success: false,
    bugType: 'dead_click',
    selector: bug.selector,
    triggeredAt: new Date().toISOString(),
  };

  try {
    // 等待元素出现
    await page.waitForSelector(bug.selector, { timeout: 5000 });

    // 点击元素（dead click 预期没有响应）
    await page.click(bug.selector);

    // 短暂等待
    await sleep(500);

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * 触发 rage_click
 * 快速多次点击一个元素
 */
async function triggerRageClick(
  page: Page,
  bug: EmbeddedBug,
  clickCount: number = 5
): Promise<TriggerResult> {
  const result: TriggerResult = {
    success: false,
    bugType: 'rage_click',
    selector: bug.selector,
    triggeredAt: new Date().toISOString(),
  };

  try {
    // 等待元素出现
    await page.waitForSelector(bug.selector, { timeout: 5000 });

    // 快速多次点击
    for (let i = 0; i < clickCount; i++) {
      try {
        // 使用 force: true 强制点击，即使元素移动
        await page.click(bug.selector, { force: true, timeout: 1000 });
      } catch {
        // 元素可能移动了，尝试重新定位
        const element = page.locator(bug.selector);
        if (await element.isVisible()) {
          await element.click({ force: true });
        }
      }
      // 快速点击间隔
      await sleep(100);
    }

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * 触发 runtime_error
 * 点击会导致运行时错误的元素
 */
async function triggerRuntimeError(
  page: Page,
  bug: EmbeddedBug
): Promise<TriggerResult> {
  const result: TriggerResult = {
    success: false,
    bugType: 'runtime_error',
    selector: bug.selector,
    triggeredAt: new Date().toISOString(),
  };

  try {
    // 监听页面错误
    let errorCaught = false;
    const errorHandler = () => {
      errorCaught = true;
    };
    page.on('pageerror', errorHandler);

    // 等待元素出现
    await page.waitForSelector(bug.selector, { timeout: 5000 });

    // 点击触发错误
    await page.click(bug.selector);

    // 等待错误被捕获
    await sleep(1000);

    // 移除监听器
    page.off('pageerror', errorHandler);

    // 即使没有捕获到页面错误，也认为触发成功（错误可能被 SDK 捕获）
    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * 触发所有预埋问题
 */
export async function triggerAllBugs(
  bugs: EmbeddedBug[],
  config: TriggerConfig
): Promise<{
  results: TriggerResult[];
  success: boolean;
  error?: string;
}> {
  const playwright = await importPlaywright();
  let browser: Browser | undefined;

  const results: TriggerResult[] = [];

  try {
    // 启动浏览器
    browser = await playwright.chromium.launch({
      headless: config.headless ?? true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // 导航到开发服务器
    await page.goto(config.devServerUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 等待页面完全加载
    await sleep(config.pageLoadWait ?? 2000);

    // 按类型分组并触发
    for (const bug of bugs) {
      let result: TriggerResult;

      switch (bug.type) {
        case 'dead_click':
          result = await triggerDeadClick(page, bug);
          break;
        case 'rage_click':
          result = await triggerRageClick(
            page,
            bug,
            config.rageClickCount ?? 5
          );
          break;
        case 'runtime_error':
          result = await triggerRuntimeError(page, bug);
          break;
        default:
          result = {
            success: false,
            bugType: bug.type,
            selector: bug.selector,
            error: `Unknown bug type: ${bug.type}`,
            triggeredAt: new Date().toISOString(),
          };
      }

      results.push(result);

      // 触发之间短暂等待
      await sleep(500);
    }

    // 等待数据上报
    await sleep(config.reportWait ?? 3000);

    return {
      results,
      success: results.every((r) => r.success),
    };
  } catch (error) {
    return {
      results,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 检查 Playwright 是否可用
 */
export async function isPlaywrightAvailable(): Promise<boolean> {
  try {
    await import('playwright');
    return true;
  } catch {
    return false;
  }
}
