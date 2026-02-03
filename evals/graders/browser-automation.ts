/**
 * 浏览器自动化测试模块
 *
 * 使用 Playwright 模拟用户操作，触发各种行为事件：
 * - Dead Click: 点击无响应的元素
 * - Rage Click: 快速连续点击
 * - Runtime Error: 触发 JavaScript 错误
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { TranscriptRecorder } from '../harness/transcript';

/**
 * 浏览器自动化配置
 */
export interface BrowserAutomationConfig {
  /** 应用 URL */
  url: string;
  /** 是否无头模式 */
  headless?: boolean;
  /** 等待超时（毫秒） */
  timeout?: number;
  /** 测试场景 */
  scenarios?: TestScenario[];
}

/**
 * 测试场景
 */
export interface TestScenario {
  type: 'dead_click' | 'rage_click' | 'runtime_error' | 'custom';
  /** 目标选择器 */
  selector?: string;
  /** 自定义操作 */
  action?: (page: Page) => Promise<void>;
  /** 点击次数（用于 rage_click） */
  clicks?: number;
  /** 点击间隔（毫秒，用于 rage_click） */
  interval?: number;
}

/**
 * 自动化测试结果
 */
export interface AutomationResult {
  success: boolean;
  scenariosExecuted: number;
  errors: string[];
  details: {
    deadClicks: number;
    rageClicks: number;
    runtimeErrors: number;
  };
}

/**
 * 默认测试场景
 */
const DEFAULT_SCENARIOS: TestScenario[] = [
  {
    type: 'dead_click',
    selector: 'button.dead-click, button:has-text("提交"), button:has-text("Dead Click")',
  },
  {
    type: 'rage_click',
    selector: 'button.slow-action, button:has-text("加载"), button:has-text("Rage Click")',
    clicks: 10,
    interval: 100,
  },
  {
    type: 'runtime_error',
    selector: 'button.error-trigger, button:has-text("触发错误"), button:has-text("Runtime Error")',
  },
];

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 运行浏览器自动化测试
 */
export async function runBrowserAutomation(
  config: BrowserAutomationConfig,
  recorder: TranscriptRecorder
): Promise<AutomationResult> {
  const { chromium } = await import('playwright');

  const {
    url,
    headless = true,
    timeout = 30000,
    scenarios = DEFAULT_SCENARIOS,
  } = config;

  const result: AutomationResult = {
    success: false,
    scenariosExecuted: 0,
    errors: [],
    details: {
      deadClicks: 0,
      rageClicks: 0,
      runtimeErrors: 0,
    },
  };

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    console.log('🎭 [Browser] 启动浏览器...');
    recorder.recordEvent('browser_start', { headless });

    browser = await chromium.launch({ headless });
    context = await browser.newContext();
    page = await context.newPage();

    page.setDefaultTimeout(timeout);

    // 监听控制台消息和错误
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();

      // 输出所有 AgentAware 相关的日志
      if (text.includes('AgentAware') || text.includes('agent-aware')) {
        console.log(`[Browser Console] ${text}`);
        recorder.recordEvent('browser_console', { type, message: text });
      }

      if (type === 'error') {
        recorder.recordEvent('browser_console_error', { message: text });
      }
    });

    page.on('pageerror', (error) => {
      console.log(`[Browser Error] ${error.message}`);
      recorder.recordEvent('browser_page_error', { message: error.message });
    });

    // 监控网络请求（用于调试 SDK 上报）
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('4100') || url.includes('behaviors') || url.includes('errors')) {
        console.log(`[Browser Request] ${request.method()} ${url}`);
        recorder.recordEvent('browser_request', { method: request.method(), url });
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('4100') || url.includes('behaviors') || url.includes('errors')) {
        console.log(`[Browser Response] ${response.status()} ${url}`);
        recorder.recordEvent('browser_response', { status: response.status(), url });
      }
    });

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('4100') || url.includes('behaviors') || url.includes('errors')) {
        console.log(`[Browser Request Failed] ${url} - ${request.failure()?.errorText}`);
        recorder.recordEvent('browser_request_failed', { url, error: request.failure()?.errorText });
      }
    });

    // 导航到应用
    console.log(`🌐 [Browser] 访问 ${url}...`);
    recorder.recordEvent('browser_navigate', { url });

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');

    // 等待页面和 SDK 初始化完成
    await sleep(3000);
    console.log('🎭 [Browser] 页面已加载，SDK 初始化中...');

    // 执行测试场景
    for (const scenario of scenarios) {
      try {
        await executeScenario(page, scenario, recorder, result);
        result.scenariosExecuted++;
        // 每个场景执行后等待 SDK 处理事件
        await sleep(2000);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`⚠️ [Browser] 场景执行失败: ${scenario.type} - ${errorMsg}`);
        result.errors.push(`${scenario.type}: ${errorMsg}`);
      }
    }

    // 等待事件上报
    console.log('⏳ [Browser] 等待事件上报...');
    await sleep(5000);

    result.success = result.scenariosExecuted > 0;
    recorder.recordEvent('browser_complete', {
      scenariosExecuted: result.scenariosExecuted,
      details: result.details,
    });

    console.log(`✅ [Browser] 完成 ${result.scenariosExecuted} 个测试场景`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ [Browser] 自动化测试失败: ${errorMsg}`);
    result.errors.push(errorMsg);
    recorder.recordEvent('browser_error', { error: errorMsg });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }

  return result;
}

/**
 * 执行单个测试场景
 */
async function executeScenario(
  page: Page,
  scenario: TestScenario,
  recorder: TranscriptRecorder,
  result: AutomationResult
): Promise<void> {
  console.log(`🎯 [Browser] 执行场景: ${scenario.type}`);
  recorder.recordEvent('scenario_start', { type: scenario.type });

  switch (scenario.type) {
    case 'dead_click':
      await executeDeadClick(page, scenario, recorder, result);
      break;
    case 'rage_click':
      await executeRageClick(page, scenario, recorder, result);
      break;
    case 'runtime_error':
      await executeRuntimeError(page, scenario, recorder, result);
      break;
    case 'custom':
      if (scenario.action) {
        await scenario.action(page);
      }
      break;
  }

  recorder.recordEvent('scenario_complete', { type: scenario.type });
}

/**
 * 执行 Dead Click 场景
 */
async function executeDeadClick(
  page: Page,
  scenario: TestScenario,
  recorder: TranscriptRecorder,
  result: AutomationResult
): Promise<void> {
  if (!scenario.selector) return;

  const selectors = scenario.selector.split(',').map((s) => s.trim());

  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        console.log(`🖱️ [Browser] Dead Click: ${selector}`);
        await element.click();
        result.details.deadClicks++;
        recorder.recordEvent('dead_click_executed', { selector });
        return;
      }
    } catch {
      // 继续尝试下一个选择器
    }
  }

  // 如果没有找到预定义的按钮，尝试点击页面上的第一个按钮
  const buttons = await page.$$('button');
  if (buttons.length > 0) {
    console.log(`🖱️ [Browser] Dead Click: 任意按钮`);
    await buttons[0].click();
    result.details.deadClicks++;
    recorder.recordEvent('dead_click_executed', { selector: 'button:first' });
  }
}

/**
 * 执行 Rage Click 场景
 */
async function executeRageClick(
  page: Page,
  scenario: TestScenario,
  recorder: TranscriptRecorder,
  result: AutomationResult
): Promise<void> {
  if (!scenario.selector) return;

  const clicks = scenario.clicks || 10;
  const interval = scenario.interval || 100;

  const selectors = scenario.selector.split(',').map((s) => s.trim());

  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        console.log(`🖱️ [Browser] Rage Click: ${selector} (${clicks} 次)`);

        for (let i = 0; i < clicks; i++) {
          await element.click({ force: true });
          if (i < clicks - 1) {
            await sleep(interval);
          }
        }

        result.details.rageClicks++;
        recorder.recordEvent('rage_click_executed', { selector, clicks });
        return;
      }
    } catch {
      // 继续尝试下一个选择器
    }
  }

  // 如果没有找到预定义的按钮，尝试快速点击页面上的按钮
  const buttons = await page.$$('button');
  if (buttons.length > 1) {
    const button = buttons[1];
    console.log(`🖱️ [Browser] Rage Click: 任意按钮 (${clicks} 次)`);

    for (let i = 0; i < clicks; i++) {
      await button.click({ force: true });
      if (i < clicks - 1) {
        await sleep(interval);
      }
    }

    result.details.rageClicks++;
    recorder.recordEvent('rage_click_executed', { selector: 'button:nth(1)', clicks });
  }
}

/**
 * 执行 Runtime Error 场景
 */
async function executeRuntimeError(
  page: Page,
  scenario: TestScenario,
  recorder: TranscriptRecorder,
  result: AutomationResult
): Promise<void> {
  if (!scenario.selector) return;

  const selectors = scenario.selector.split(',').map((s) => s.trim());

  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        console.log(`🖱️ [Browser] Runtime Error: ${selector}`);

        let errorCaught = false;
        page.once('pageerror', () => {
          errorCaught = true;
        });

        await element.click();
        await sleep(500);

        if (errorCaught) {
          result.details.runtimeErrors++;
          recorder.recordEvent('runtime_error_executed', { selector });
        }
        return;
      }
    } catch {
      // 继续尝试下一个选择器
    }
  }

  // 如果没有找到预定义的按钮，通过 JS 触发错误
  try {
    console.log(`🖱️ [Browser] Runtime Error: 通过 JS 触发`);
    await page.evaluate(() => {
      // @ts-ignore 故意触发错误
      const obj = undefined;
      // @ts-ignore
      console.log(obj.property);
    });
    result.details.runtimeErrors++;
    recorder.recordEvent('runtime_error_executed', { selector: 'js:evaluate' });
  } catch {
    result.details.runtimeErrors++;
    recorder.recordEvent('runtime_error_executed', { selector: 'js:evaluate' });
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
