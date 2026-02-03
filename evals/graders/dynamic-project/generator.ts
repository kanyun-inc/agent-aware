/**
 * 动态项目生成器
 *
 * 使用 LLM 生成随机的 React+Vite 项目，包含预埋的问题
 */

import fs from 'node:fs';
import path from 'node:path';
import { callLLM, getLLMConfigFromEnv, type LLMConfig } from '../llm/client';

/**
 * 预埋的问题类型
 */
export interface EmbeddedBug {
  /** 问题类型 */
  type: 'dead_click' | 'rage_click' | 'runtime_error';
  /** CSS 选择器（用于定位元素） */
  selector: string;
  /** 问题描述 */
  description: string;
  /** 触发动作描述 */
  triggerAction: string;
  /** 预期错误消息（仅 runtime_error） */
  expectedError?: string;
}

/**
 * 生成的项目结构
 */
export interface GeneratedProject {
  /** 文件路径 -> 内容 */
  files: Record<string, string>;
  /** 预埋问题清单 */
  embeddedBugs: EmbeddedBug[];
  /** 项目主题描述 */
  theme: string;
  /** 项目名称 */
  projectName: string;
}

/**
 * 生成器配置
 */
export interface GeneratorConfig {
  /** LLM 配置 */
  llmConfig?: Partial<LLMConfig>;
  /** 预埋问题数量配置 */
  bugCounts?: {
    deadClick?: number;
    rageClick?: number;
    runtimeError?: number;
  };
}

/**
 * 生成项目的 Prompt
 */
function buildGenerationPrompt(config: GeneratorConfig): string {
  const bugCounts = config.bugCounts || {
    deadClick: 1,
    rageClick: 1,
    runtimeError: 1,
  };

  return `You are a frontend developer creating a React + Vite demo application for testing purposes.

## Task
Generate a complete React + Vite project with intentionally embedded bugs for testing an error monitoring system.

## Requirements

### 1. Project Structure
Create a minimal but complete project with these files:
- package.json (MUST include scripts: {"dev": "vite", "build": "vite build"}, and dependencies: vite@^5, react@^18, react-dom@^18)
- vite.config.js (with react plugin: @vitejs/plugin-react)
- index.html
- src/main.jsx (entry point with agent-aware SDK initialization)
- src/App.jsx (main component)
- src/App.css (basic styles)

### 2. SDK Integration
In src/main.jsx, add this import and initialization at the TOP of the file:
\`\`\`javascript
import { initAgentAware } from '@reskill/agent-aware';
initAgentAware({ debug: true });
\`\`\`

### 3. Embedded Bugs (IMPORTANT)
You MUST embed exactly these bugs:
- ${bugCounts.deadClick || 1} dead_click: A button that looks clickable but has no click handler or the handler does nothing
- ${bugCounts.rageClick || 1} rage_click: A button/element that is frustrating to use (e.g., moves on hover, has tiny click area, or requires multiple clicks)
- ${bugCounts.runtimeError || 1} runtime_error: Code that throws an error when triggered (e.g., accessing undefined property, JSON.parse of invalid string)

### 4. Test Hints Section
Add a visible "Test Hints" section in the UI that lists:
- Which buttons/elements trigger which bugs
- What to do to trigger each bug

### 5. Theme
Choose a random but coherent theme for the app (e.g., todo list, weather app, calculator, game, etc.)

## Output Format
Return a JSON object with this exact structure:
\`\`\`json
{
  "theme": "Description of the app theme",
  "projectName": "app-name-lowercase",
  "files": {
    "package.json": "file content as string",
    "vite.config.js": "file content as string",
    "index.html": "file content as string",
    "src/main.jsx": "file content as string",
    "src/App.jsx": "file content as string",
    "src/App.css": "file content as string"
  },
  "embeddedBugs": [
    {
      "type": "dead_click",
      "selector": "button#dead-btn",
      "description": "Button looks clickable but does nothing",
      "triggerAction": "Click the 'Submit' button"
    },
    {
      "type": "rage_click",
      "selector": "button#rage-btn",
      "description": "Button that moves on hover",
      "triggerAction": "Try to click the moving button multiple times"
    },
    {
      "type": "runtime_error",
      "selector": "button#error-btn",
      "description": "Triggers JSON parse error",
      "triggerAction": "Click the 'Load Data' button",
      "expectedError": "Unexpected token"
    }
  ]
}
\`\`\`

IMPORTANT: 
- Return ONLY the JSON object, no markdown code blocks or explanations
- All file contents must be valid, working code
- The SDK import must be at the very top of main.jsx
- Each bug must have a clear, testable selector`;
}

/**
 * 解析 LLM 响应
 */
function parseGenerationResponse(response: string): GeneratedProject {
  // 尝试清理响应（移除可能的 markdown 代码块标记）
  let cleanedResponse = response.trim();

  // 移除可能的 ```json 和 ``` 标记
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.slice(7);
  } else if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.slice(3);
  }

  if (cleanedResponse.endsWith('```')) {
    cleanedResponse = cleanedResponse.slice(0, -3);
  }

  cleanedResponse = cleanedResponse.trim();

  try {
    const parsed = JSON.parse(cleanedResponse) as GeneratedProject;

    // 验证必要字段
    if (!parsed.files || typeof parsed.files !== 'object') {
      throw new Error('Missing or invalid "files" field');
    }
    if (!parsed.embeddedBugs || !Array.isArray(parsed.embeddedBugs)) {
      throw new Error('Missing or invalid "embeddedBugs" field');
    }
    if (!parsed.theme || typeof parsed.theme !== 'string') {
      throw new Error('Missing or invalid "theme" field');
    }
    if (!parsed.projectName || typeof parsed.projectName !== 'string') {
      throw new Error('Missing or invalid "projectName" field');
    }

    // 验证 embeddedBugs 结构
    for (const bug of parsed.embeddedBugs) {
      if (!bug.type || !bug.selector || !bug.description || !bug.triggerAction) {
        throw new Error(
          `Invalid bug structure: ${JSON.stringify(bug)}`
        );
      }
      if (!['dead_click', 'rage_click', 'runtime_error'].includes(bug.type)) {
        throw new Error(`Invalid bug type: ${bug.type}`);
      }
    }

    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}\n\nResponse was:\n${response.slice(0, 500)}...`
    );
  }
}

/**
 * 将生成的项目写入磁盘
 */
export async function writeProjectToDisk(
  project: GeneratedProject,
  targetDir: string
): Promise<void> {
  // 创建目标目录
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 写入所有文件
  for (const [filePath, content] of Object.entries(project.files)) {
    const fullPath = path.join(targetDir, filePath);
    const dir = path.dirname(fullPath);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  // 写入预埋问题清单（供后续验证使用）
  const bugsManifest = {
    theme: project.theme,
    projectName: project.projectName,
    embeddedBugs: project.embeddedBugs,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(targetDir, '.embedded-bugs.json'),
    JSON.stringify(bugsManifest, null, 2),
    'utf-8'
  );
}

/**
 * 生成随机项目
 */
export async function generateProject(
  config: GeneratorConfig = {}
): Promise<GeneratedProject> {
  const llmConfig = {
    ...getLLMConfigFromEnv(),
    ...config.llmConfig,
    // 使用较高的 max_tokens 以确保完整生成
    maxTokens: 8192,
    // 使用较低的温度以确保稳定输出
    temperature: 0.7,
  };

  const prompt = buildGenerationPrompt(config);

  const response = await callLLM(
    [
      {
        role: 'system',
        content:
          'You are a skilled frontend developer. Generate valid, working code. Return only JSON, no explanations.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    llmConfig
  );

  return parseGenerationResponse(response.content);
}

/**
 * 生成并写入项目到指定目录
 */
export async function generateAndWriteProject(
  targetDir: string,
  config: GeneratorConfig = {}
): Promise<GeneratedProject> {
  const project = await generateProject(config);
  await writeProjectToDisk(project, targetDir);
  return project;
}
