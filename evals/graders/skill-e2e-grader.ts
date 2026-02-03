/**
 * Skill E2E Grader
 *
 * 基于 .cursor/skills/agent-aware-e2e-test/SKILL.md 实现完整的 E2E 评估流程：
 *
 * Phase 1: 随机生成前端项目（使用 LLM）
 * Phase 2: 使用主 Skill 监控修复（浏览器自动化）
 * Phase 3: 验证与报告
 * Phase 4: 清理
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import type { GraderResult } from '../harness/types';
import type { TranscriptRecorder } from '../harness/transcript';
import type { IsolatedEnvironment } from '../harness/environment';
import { callAI, type UIMessage } from './ai-client';
import {
  runBrowserAutomation,
  isPlaywrightAvailable,
  type TestScenario,
} from './browser-automation';

/**
 * Skill E2E Grader 配置
 */
export interface SkillE2EGraderConfig {
  type: 'skill-e2e';
  checks: {
    /** 监控时长（秒） */
    monitorDuration?: number;
    /** 使用的 AI 模型 */
    model?: string;
    /** 是否使用浏览器自动化 */
    browserAutomation?: boolean;
  };
}

/**
 * 生成应用的提示词
 * 基于 SKILL.md Phase 1.2 的要求
 */
const GENERATE_APP_PROMPT = `
你是一个前端开发专家。请在当前目录下创建一个 **随机主题** 的 React + Vite 项目。

## 要求

### 1. 项目结构
- package.json（包含 vite、react、react-dom 依赖）
- vite.config.js
- index.html
- src/main.jsx（入口文件）
- src/App.jsx（主组件）
- src/App.css

### 2. 依赖配置
在 package.json 中添加（SDK 依赖会自动配置，不需要手动指定）：
\`\`\`json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
\`\`\`

### 3. SDK 初始化
在 src/main.jsx 中添加：
\`\`\`javascript
import { initAgentAware } from '@reskill/agent-aware';
initAgentAware({ endpoint: 'http://localhost:4100/behaviors', debug: true });
\`\`\`

### 4. 故意埋入问题（用于测试 agent-aware 检测能力）
必须包含以下 3 种问题：

1. **Dead Click**: 一个看起来可点击但没有绑定事件处理器的按钮
   - 例如：\`<button>提交</button>\` 没有 onClick

2. **Rage Click**: 一个会触发慢速操作的按钮，用户可能会快速多次点击
   - 例如：点击后 3 秒才响应，无 loading 状态

3. **Runtime Error**: 一个会触发 JavaScript 错误的按钮
   - 例如：访问 undefined 的属性，抛出异常

### 5. 测试提示区域【重要】
在页面中添加一个明显的提示区域，包含：
- 哪些按钮会触发什么问题
- 预期的问题类型
- 如何测试每个问题

### 6. 随机主题
请随机选择一个应用主题（如：待办清单、购物车、天气应用、计算器等），使测试更接近真实场景。

## 输出格式
请直接输出所有文件内容，使用以下格式：

\`\`\`json:package.json
{文件内容}
\`\`\`

\`\`\`javascript:vite.config.js
{文件内容}
\`\`\`

\`\`\`html:index.html
{文件内容}
\`\`\`

\`\`\`jsx:src/main.jsx
{文件内容}
\`\`\`

\`\`\`jsx:src/App.jsx
{文件内容}
\`\`\`

\`\`\`css:src/App.css
{文件内容}
\`\`\`

确保代码可以正常运行，不需要额外解释。
`;

/**
 * 解析 AI 响应中的代码块
 */
function parseCodeBlocks(content: string): Record<string, string> {
  const files: Record<string, string> = {};

  // 匹配 ```language:filename 或 ```filename 格式
  const codeBlockRegex = /```(?:(\w+):)?([^\n`]+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [, lang, filename, code] = match;
    let finalFilename = filename?.trim();

    // 如果没有文件名，尝试从语言推断
    if (!finalFilename && lang) {
      const langToFile: Record<string, string> = {
        json: 'package.json',
        javascript: 'vite.config.js',
        html: 'index.html',
        jsx: 'src/App.jsx',
        css: 'src/App.css',
      };
      finalFilename = langToFile[lang];
    }

    if (finalFilename && code) {
      files[finalFilename] = code.trim();
    }
  }

  return files;
}

/**
 * 创建默认文件（当 AI 生成失败时使用）
 */
function createDefaultFiles(projectPath: string, serverPort: number): void {
  const files: Record<string, string> = {
    'package.json': JSON.stringify(
      {
        name: 'agent-aware-test-app',
        version: '0.0.1',
        type: 'module',
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: {
          '@reskill/agent-aware': `link:${path.join(process.cwd(), 'packages/sdk')}`,
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          vite: '^5.0.0',
          '@vitejs/plugin-react': '^4.0.0',
        },
      },
      null,
      2
    ),
    'vite.config.js': `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });
`.trim(),
    'index.html': `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agent-Aware 测试应用</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`.trim(),
    'src/main.jsx': `
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initAgentAware } from '@reskill/agent-aware';
import App from './App';

initAgentAware({ endpoint: 'http://localhost:${serverPort}/behaviors', debug: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`.trim(),
    'src/App.jsx': `
import React, { useState } from 'react';
import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  // Dead Click - 没有事件处理
  const handleDeadClick = null;

  // Rage Click - 慢速操作
  const handleSlowAction = () => {
    setLoading(true);
    setTimeout(() => {
      setCount(c => c + 1);
      setLoading(false);
    }, 3000);
  };

  // Runtime Error
  const handleError = () => {
    throw new Error('Intentional runtime error for testing');
  };

  return (
    <div className="app">
      <h1>🧪 Agent-Aware 测试应用</h1>
      
      <div className="test-hint">
        <h3>📋 测试说明</h3>
        <ul>
          <li><strong>Dead Click</strong>: 点击"提交"按钮（无响应）</li>
          <li><strong>Rage Click</strong>: 快速多次点击"加载数据"按钮</li>
          <li><strong>Runtime Error</strong>: 点击"触发错误"按钮</li>
        </ul>
      </div>

      <div className="buttons">
        <button onClick={handleDeadClick} className="dead-click">
          提交 (Dead Click)
        </button>
        <button onClick={handleSlowAction} disabled={loading} className="slow-action">
          {loading ? '加载中...' : '加载数据 (Rage Click)'}
        </button>
        <button onClick={handleError} className="error-trigger">
          触发错误 (Runtime Error)
        </button>
      </div>

      <p>计数: {count}</p>
    </div>
  );
}

export default App;
`.trim(),
    'src/App.css': `
.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: system-ui, sans-serif;
}

.test-hint {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin: 20px 0;
}

.test-hint h3 { margin-top: 0; }

.buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 20px 0;
}

button {
  padding: 12px 24px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  border-radius: 6px;
  transition: all 0.2s;
}

.dead-click { background: #e0e0e0; color: #666; }
.slow-action { background: #2196f3; color: white; }
.slow-action:disabled { background: #90caf9; cursor: wait; }
.error-trigger { background: #f44336; color: white; }

button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
`.trim(),
  };

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(projectPath, filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
    console.log(`📄 [E2E] 创建默认文件: ${filename}`);
  }
}

/**
 * Phase 1: 使用 LLM 生成随机前端项目
 */
async function phase1GenerateApp(
  projectPath: string,
  recorder: TranscriptRecorder,
  model: string,
  serverPort: number
): Promise<{ success: boolean; theme?: string }> {
  console.log('\n📦 [Phase 1] 随机生成前端项目...');
  recorder.recordEvent('phase1_start', { projectPath });

  // 创建项目目录
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  try {
    // 调用 AI 生成应用
    const messages: UIMessage[] = [
      {
        role: 'system',
        content: `你在目录 ${projectPath} 下工作。请创建一个随机主题的测试应用。`,
      },
      { role: 'user', content: GENERATE_APP_PROMPT },
    ];

    console.log('🤖 [Phase 1] 调用 AI 生成应用...');
    const response = await callAI({
      messages,
      model,
      timeout: 120000,
      workspacePath: projectPath,
    });

    recorder.recordEvent('ai_response', {
      contentLength: response.content.length,
    });

    // 解析代码块
    const files = parseCodeBlocks(response.content);
    const fileCount = Object.keys(files).length;

    console.log(`📝 [Phase 1] AI 生成了 ${fileCount} 个文件`);

    // 写入文件
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(projectPath, filename);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content);
      console.log(`📄 [Phase 1] 创建文件: ${filename}`);
    }

    // 检查必需文件
    const requiredFiles = ['package.json', 'index.html', 'src/main.jsx', 'src/App.jsx'];
    const missingFiles = requiredFiles.filter(
      (f) => !fs.existsSync(path.join(projectPath, f))
    );

    if (missingFiles.length > 0) {
      console.log(`⚠️ [Phase 1] 缺少文件: ${missingFiles.join(', ')}，使用默认模板`);
      createDefaultFiles(projectPath, serverPort);
    }

    // 修复 package.json 依赖路径
    fixPackageJson(projectPath);

    recorder.recordEvent('phase1_complete', { fileCount, missingFiles });

    // 尝试提取主题
    const theme = extractTheme(response.content);
    return { success: true, theme };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ [Phase 1] AI 生成失败: ${errorMsg}`);
    console.log('📄 [Phase 1] 使用默认模板...');

    createDefaultFiles(projectPath, serverPort);
    recorder.recordEvent('phase1_fallback', { error: errorMsg });

    return { success: true, theme: '默认测试应用' };
  }
}

/**
 * 提取应用主题
 */
function extractTheme(content: string): string {
  const themePatterns = [
    /主题[：:]\s*(.+)/,
    /应用[：:]\s*(.+)/,
    /创建.*?(.+?)应用/,
    /这是一个(.+?)项目/,
  ];

  for (const pattern of themePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim().substring(0, 20);
    }
  }

  return '随机生成应用';
}

/**
 * 修复 package.json 中的依赖路径
 */
function fixPackageJson(projectPath: string): void {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const projectRoot = process.cwd();
  const sdkPath = path.join(projectRoot, 'packages/sdk');

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies['@reskill/agent-aware'] = `link:${sdkPath}`;

    pkg.devDependencies = pkg.devDependencies || {};
    if (!pkg.devDependencies.vite) pkg.devDependencies.vite = '^5.0.0';
    if (!pkg.devDependencies['@vitejs/plugin-react']) {
      pkg.devDependencies['@vitejs/plugin-react'] = '^4.0.0';
    }

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log(`📝 [Phase 1] 修复 package.json 依赖`);
  } catch {
    console.error('⚠️ [Phase 1] 修复 package.json 失败');
  }
}

/**
 * Phase 2: 启动服务并使用浏览器自动化测试
 */
async function phase2MonitorAndTest(
  projectPath: string,
  recorder: TranscriptRecorder,
  serverPort: number,
  monitorDuration: number,
  useBrowserAutomation: boolean
): Promise<{
  devServer: ChildProcess | null;
  devPort: number;
  automationResult?: {
    deadClicks: number;
    rageClicks: number;
    runtimeErrors: number;
  };
}> {
  console.log('\n🔍 [Phase 2] 启动监控和测试...');
  recorder.recordEvent('phase2_start', {});

  // 安装依赖
  console.log('📦 [Phase 2] 安装依赖...');
  try {
    execSync('pnpm install --no-frozen-lockfile', {
      cwd: projectPath,
      stdio: 'inherit',
    });
  } catch {
    console.error('❌ [Phase 2] 依赖安装失败');
    return { devServer: null, devPort: 0 };
  }

  // 等待 Server 就绪
  console.log('⏳ [Phase 2] 等待 Server 就绪...');
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const resp = await fetch(`http://localhost:${serverPort}/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (resp.ok) {
        serverReady = true;
        console.log(`✅ [Phase 2] Server 已就绪 (端口 ${serverPort})`);
        break;
      }
    } catch {
      // 继续等待
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!serverReady) {
    console.log('⚠️ [Phase 2] Server 未就绪，继续执行...');
  }

  // 清空旧数据（按照 SKILL.md Phase 2.1）
  console.log('🧹 [Phase 2] 清空旧数据...');
  try {
    await fetch(`http://localhost:${serverPort}/behaviors`, { method: 'DELETE' });
    await fetch(`http://localhost:${serverPort}/errors`, { method: 'DELETE' });
    console.log('✅ [Phase 2] 清空数据成功');
  } catch {
    console.log('⚠️ [Phase 2] 清空数据失败');
  }

  // 启动开发服务器
  console.log('🚀 [Phase 2] 启动开发服务器...');
  const devServer = spawn('pnpm', ['dev'], {
    cwd: projectPath,
    stdio: 'pipe',
    detached: true,
  });

  let devPort = 0;

  devServer.stdout?.on('data', (data) => {
    const output = data.toString();
    console.log(`[Dev] ${output.trim()}`);

    // 检测端口
    const portMatch = output.match(/localhost:(\d+)/);
    if (portMatch) {
      devPort = parseInt(portMatch[1], 10);
    }
  });

  devServer.stderr?.on('data', (data) => {
    console.error(`[Dev Error] ${data.toString().trim()}`);
  });

  // 等待服务器就绪
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 如果没有检测到端口，尝试常见端口
  if (devPort === 0) {
    for (const port of [5173, 3000, 5174, 3001]) {
      try {
        const resp = await fetch(`http://localhost:${port}`, {
          signal: AbortSignal.timeout(1000),
        });
        if (resp.ok) {
          devPort = port;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (devPort === 0) {
    console.error('❌ [Phase 2] 无法检测开发服务器端口');
    return { devServer, devPort: 0 };
  }

  console.log(`✅ [Phase 2] 开发服务器就绪: http://localhost:${devPort}`);
  recorder.recordEvent('dev_server_ready', { port: devPort });

  // 浏览器自动化测试
  let automationResult;

  if (useBrowserAutomation && (await isPlaywrightAvailable())) {
    console.log('🎭 [Phase 2] 启动浏览器自动化测试...');

    const scenarios: TestScenario[] = [
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

    const result = await runBrowserAutomation(
      {
        url: `http://localhost:${devPort}`,
        headless: true,
        timeout: monitorDuration * 1000,
        scenarios,
      },
      recorder
    );

    automationResult = {
      deadClicks: result.details.deadClicks,
      rageClicks: result.details.rageClicks,
      runtimeErrors: result.details.runtimeErrors,
    };

    console.log(`✅ [Phase 2] 浏览器自动化完成: ${result.scenariosExecuted} 个场景`);
  } else {
    // 手动等待
    console.log(`⏳ [Phase 2] 等待 ${monitorDuration} 秒进行监控...`);
    console.log(`📱 请访问 http://localhost:${devPort} 进行测试`);
    await new Promise((resolve) => setTimeout(resolve, monitorDuration * 1000));
  }

  recorder.recordEvent('phase2_complete', { automationResult });

  return { devServer, devPort, automationResult };
}

/**
 * Phase 3: 查询检测结果并生成报告
 */
async function phase3VerifyAndReport(
  recorder: TranscriptRecorder,
  serverPort: number,
  theme: string,
  projectPath: string,
  automationResult?: {
    deadClicks: number;
    rageClicks: number;
    runtimeErrors: number;
  }
): Promise<{
  behaviors: unknown[];
  errors: unknown[];
  frustrationIndex: number;
  report: string;
}> {
  console.log('\n📊 [Phase 3] 验证与报告...');
  recorder.recordEvent('phase3_start', {});

  // 等待数据上报
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 检查文件系统中的数据（调试用）
  // Server 存储数据在 USER_PROJECT_ROOT/.agent-aware/detail
  const agentAwareDir = path.join(projectPath, '.agent-aware/detail');
  console.log(`📊 [Phase 3] 检查数据目录: ${agentAwareDir}`);
  if (fs.existsSync(agentAwareDir)) {
    const files = fs.readdirSync(agentAwareDir);
    console.log(`📊 [Phase 3] 数据文件: ${files.join(', ') || '无'}`);
    for (const file of files) {
      const filePath = path.join(agentAwareDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        console.log(`📊 [Phase 3] ${file}: ${JSON.stringify(data).slice(0, 200)}...`);
      } catch {
        console.log(`📊 [Phase 3] ${file}: 无法读取`);
      }
    }
  } else {
    console.log(`📊 [Phase 3] 数据目录不存在`);
  }

  // 直接从文件读取数据（绕过可能被代理影响的 HTTP 请求）
  let behaviors: unknown[] = [];
  let errors: unknown[] = [];
  let frustrationIndex = 0;

  try {
    // 直接读取 behaviors.json
    const behaviorsFile = path.join(agentAwareDir, 'behaviors.json');
    if (fs.existsSync(behaviorsFile)) {
      const data = JSON.parse(fs.readFileSync(behaviorsFile, 'utf-8'));
      const allBehaviors = data.behaviors || [];
      console.log(`📊 [Phase 3] 文件中的所有行为: ${allBehaviors.length} 条`);

      if (allBehaviors.length > 0) {
        const types = [...new Set(allBehaviors.map((b: any) => b.type))];
        console.log(`📊 [Phase 3] 行为类型: ${types.join(', ')}`);
      }

      // 过滤问题行为
      behaviors = allBehaviors.filter(
        (b: any) => b.type === 'rage_click' || b.type === 'dead_click'
      );
      console.log(`📊 [Phase 3] 问题行为 (rage_click, dead_click): ${behaviors.length} 条`);

      // 计算挫折指数
      const totalInteractions = allBehaviors.length;
      const rageClickCount = allBehaviors.filter((b: any) => b.type === 'rage_click').length;
      const deadClickCount = allBehaviors.filter((b: any) => b.type === 'dead_click').length;
      const totalClicks = allBehaviors.filter((b: any) =>
        ['click', 'rage_click', 'dead_click'].includes(b.type)
      ).length;

      if (totalClicks > 0) {
        frustrationIndex = Math.round(((rageClickCount + deadClickCount) / totalClicks) * 100);
      }
      console.log(`📊 [Phase 3] 挫折指数: ${frustrationIndex}`);
    }

    // 直接读取 errors.json
    const errorsFile = path.join(agentAwareDir, 'errors.json');
    if (fs.existsSync(errorsFile)) {
      const data = JSON.parse(fs.readFileSync(errorsFile, 'utf-8'));
      errors = data.errors || [];
      console.log(`📊 [Phase 3] Runtime Errors: ${errors.length} 条`);
    }
  } catch (error) {
    console.error('⚠️ [Phase 3] 读取数据文件失败:', error);
  }

  // 生成报告（按照 SKILL.md Phase 3.1）
  const report = generateReport({
    theme,
    behaviors,
    errors,
    frustrationIndex,
    automationResult,
  });

  console.log(report);

  recorder.recordEvent('phase3_complete', {
    behaviorsCount: behaviors.length,
    errorsCount: errors.length,
    frustrationIndex,
  });

  return { behaviors, errors, frustrationIndex, report };
}

/**
 * 生成详细报告
 */
function generateReport(data: {
  theme: string;
  behaviors: unknown[];
  errors: unknown[];
  frustrationIndex: number;
  automationResult?: {
    deadClicks: number;
    rageClicks: number;
    runtimeErrors: number;
  };
}): string {
  const { theme, behaviors, errors, frustrationIndex, automationResult } = data;

  const deadClicks = behaviors.filter((b: any) => b.type === 'dead_click');
  const rageClicks = behaviors.filter((b: any) => b.type === 'rage_click');

  return `
📊 E2E 测试报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 生成的应用: ${theme}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 浏览器自动化执行:

   Dead Click:    ${automationResult?.deadClicks ?? 'N/A'} 次
   Rage Click:    ${automationResult?.rageClicks ?? 'N/A'} 次
   Runtime Error: ${automationResult?.runtimeErrors ?? 'N/A'} 次

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 检测结果:

   Dead Click:    ${deadClicks.length} 次
   Rage Click:    ${rageClicks.length} 次
   Runtime Error: ${errors.length} 次
   挫折指数:       ${frustrationIndex}/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 验证结果:

   | 指标 | 触发 | 检测 | 状态 |
   |------|------|------|------|
   | Dead Click    | ${automationResult?.deadClicks ?? '?'} | ${deadClicks.length} | ${deadClicks.length > 0 ? '✅' : '❌'} |
   | Rage Click    | ${automationResult?.rageClicks ?? '?'} | ${rageClicks.length} | ${rageClicks.length > 0 ? '✅' : '❌'} |
   | Runtime Error | ${automationResult?.runtimeErrors ?? '?'} | ${errors.length} | ${errors.length > 0 ? '✅' : '❌'} |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

/**
 * Phase 4: 清理
 */
function phase4Cleanup(
  devServer: ChildProcess | null,
  recorder: TranscriptRecorder
): void {
  console.log('\n🧹 [Phase 4] 清理...');
  recorder.recordEvent('phase4_start', {});

  if (devServer) {
    try {
      process.kill(-devServer.pid!, 'SIGTERM');
      console.log('✅ [Phase 4] 停止开发服务器');
    } catch {
      // 忽略
    }
  }

  recorder.recordEvent('phase4_complete', {});
}

/**
 * Skill E2E Grader 主函数
 */
export async function gradeSkillE2E(
  env: IsolatedEnvironment,
  config: SkillE2EGraderConfig,
  recorder: TranscriptRecorder,
  taskDescription: string
): Promise<GraderResult> {
  const details: Record<string, unknown> = {
    evaluatedAt: new Date().toISOString(),
  };

  const {
    monitorDuration = 30,
    model = 'sonnet',
    browserAutomation = true,
  } = config.checks;

  const serverPort = env.serverPort || 4100;
  const projectPath = env.testAppPath;

  let devServer: ChildProcess | null = null;

  try {
    // Phase 1: 生成应用
    const phase1Result = await phase1GenerateApp(
      projectPath,
      recorder,
      model,
      serverPort
    );
    details.phase1 = phase1Result;

    if (!phase1Result.success) {
      return {
        type: 'skill-e2e',
        passed: false,
        score: 0,
        details,
        error: '应用生成失败',
      };
    }

    // Phase 2: 监控和测试
    const phase2Result = await phase2MonitorAndTest(
      projectPath,
      recorder,
      serverPort,
      monitorDuration,
      browserAutomation
    );
    devServer = phase2Result.devServer;
    details.phase2 = {
      devPort: phase2Result.devPort,
      automation: phase2Result.automationResult,
    };

    if (phase2Result.devPort === 0) {
      return {
        type: 'skill-e2e',
        passed: false,
        score: 0.2,
        details,
        error: '开发服务器启动失败',
      };
    }

    // Phase 3: 验证与报告
    const phase3Result = await phase3VerifyAndReport(
      recorder,
      serverPort,
      phase1Result.theme || '测试应用',
      projectPath,
      phase2Result.automationResult
    );
    details.phase3 = {
      behaviors: phase3Result.behaviors.length,
      errors: phase3Result.errors.length,
      frustrationIndex: phase3Result.frustrationIndex,
    };

    // 计算得分
    let score = 0.4; // 基础分（成功运行）

    const hasDeadClick = phase3Result.behaviors.some((b: any) => b.type === 'dead_click');
    const hasRageClick = phase3Result.behaviors.some((b: any) => b.type === 'rage_click');
    const hasRuntimeError = phase3Result.errors.length > 0;

    if (hasDeadClick) score += 0.2;
    if (hasRageClick) score += 0.2;
    if (hasRuntimeError) score += 0.2;

    details.detectionResults = {
      hasDeadClick,
      hasRageClick,
      hasRuntimeError,
    };
    details.finalScore = score;

    const passed = score >= 0.8;

    return {
      type: 'skill-e2e',
      passed,
      score,
      details,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      type: 'skill-e2e',
      passed: false,
      score: 0,
      details,
      error: `Skill E2E 评估失败: ${errorMsg}`,
    };
  } finally {
    // Phase 4: 清理
    phase4Cleanup(devServer, recorder);
  }
}
