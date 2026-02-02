/**
 * LLM 客户端模块
 *
 * 支持 OpenAI 和 Anthropic API
 * 通过环境变量配置 API Key
 */

export interface LLMConfig {
  /** LLM 提供商 */
  provider: 'openai' | 'anthropic';
  /** 模型名称 */
  model: string;
  /** API Key（可选，默认从环境变量读取） */
  apiKey?: string;
  /** API Base URL（可选，用于自定义端点） */
  baseUrl?: string;
  /** 温度参数（0-1，默认 0 以保证可重复性） */
  temperature?: number;
  /** 最大 token 数 */
  maxTokens?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * 默认 LLM 配置
 */
export const defaultLLMConfig: LLMConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0,
  maxTokens: 4096,
};

/**
 * 获取 API Key
 */
function getApiKey(config: LLMConfig): string {
  if (config.apiKey) {
    return config.apiKey;
  }

  const envKey =
    config.provider === 'openai'
      ? process.env.OPENAI_API_KEY
      : process.env.ANTHROPIC_API_KEY;

  if (!envKey) {
    throw new Error(
      `Missing API key for ${config.provider}. Set ${
        config.provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'
      } environment variable.`
    );
  }

  return envKey;
}

/**
 * 调用 OpenAI API
 */
async function callOpenAI(
  messages: LLMMessage[],
  config: LLMConfig
): Promise<LLMResponse> {
  const apiKey = getApiKey(config);
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: config.temperature ?? 0,
      max_tokens: config.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };

  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage
      ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * 调用 Anthropic API
 */
async function callAnthropic(
  messages: LLMMessage[],
  config: LLMConfig
): Promise<LLMResponse> {
  const apiKey = getApiKey(config);
  const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';

  // 分离 system message
  const systemMessage = messages.find((m) => m.role === 'system');
  const otherMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens ?? 4096,
      system: systemMessage?.content,
      messages: otherMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };

  const textContent = data.content.find((c) => c.type === 'text');

  return {
    content: textContent?.text || '',
    usage: data.usage
      ? {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        }
      : undefined,
  };
}

/**
 * 统一的 LLM 调用接口
 */
export async function callLLM(
  messages: LLMMessage[],
  config: Partial<LLMConfig> = {}
): Promise<LLMResponse> {
  const mergedConfig = { ...defaultLLMConfig, ...config };

  if (mergedConfig.provider === 'anthropic') {
    return callAnthropic(messages, mergedConfig);
  }

  return callOpenAI(messages, mergedConfig);
}

/**
 * 从环境变量获取 LLM 配置
 */
export function getLLMConfigFromEnv(): Partial<LLMConfig> {
  const config: Partial<LLMConfig> = {};

  if (process.env.LLM_PROVIDER) {
    config.provider = process.env.LLM_PROVIDER as 'openai' | 'anthropic';
  }

  if (process.env.LLM_MODEL) {
    config.model = process.env.LLM_MODEL;
  }

  if (process.env.LLM_BASE_URL) {
    config.baseUrl = process.env.LLM_BASE_URL;
  }

  if (process.env.LLM_TEMPERATURE) {
    config.temperature = parseFloat(process.env.LLM_TEMPERATURE);
  }

  return config;
}
