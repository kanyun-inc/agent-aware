/**
 * LLM 客户端模块
 *
 * 支持 OpenAI、Anthropic API 和 AWS Bedrock
 * 通过环境变量配置
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export interface LLMConfig {
  /** LLM 提供商 */
  provider: 'openai' | 'anthropic' | 'bedrock';
  /** 模型名称或 ARN */
  model: string;
  /** API Key（OpenAI/Anthropic） */
  apiKey?: string;
  /** API Base URL（可选） */
  baseUrl?: string;
  /** 温度参数（0-1，默认 0） */
  temperature?: number;
  /** 最大 token 数 */
  maxTokens?: number;
  /** AWS Region（Bedrock） */
  awsRegion?: string;
  /** AWS Access Key ID（Bedrock） */
  awsAccessKeyId?: string;
  /** AWS Secret Access Key（Bedrock） */
  awsSecretAccessKey?: string;
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
 * 获取 API Key（OpenAI/Anthropic）
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
 * 调用 Anthropic API（直接）
 */
async function callAnthropic(
  messages: LLMMessage[],
  config: LLMConfig
): Promise<LLMResponse> {
  const apiKey = getApiKey(config);
  const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';

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
 * 调用 AWS Bedrock
 */
async function callBedrock(
  messages: LLMMessage[],
  config: LLMConfig
): Promise<LLMResponse> {
  const region = config.awsRegion || process.env.AWS_REGION || 'us-west-2';
  const accessKeyId =
    config.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    config.awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
    );
  }

  const client = new BedrockRuntimeClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  // 分离 system message
  const systemMessage = messages.find((m) => m.role === 'system');
  const otherMessages = messages.filter((m) => m.role !== 'system');

  // 构建 Bedrock 请求体（Claude 格式）
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: config.maxTokens ?? 4096,
    system: systemMessage?.content || '',
    messages: otherMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };

  const command = new InvokeModelCommand({
    modelId: config.model,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);

  // 解析响应
  const responseBody = JSON.parse(new TextDecoder().decode(response.body)) as {
    content: Array<{ type: string; text: string }>;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };

  const textContent = responseBody.content.find((c) => c.type === 'text');

  return {
    content: textContent?.text || '',
    usage: responseBody.usage
      ? {
          inputTokens: responseBody.usage.input_tokens,
          outputTokens: responseBody.usage.output_tokens,
          totalTokens:
            responseBody.usage.input_tokens + responseBody.usage.output_tokens,
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

  switch (mergedConfig.provider) {
    case 'bedrock':
      return callBedrock(messages, mergedConfig);
    case 'anthropic':
      return callAnthropic(messages, mergedConfig);
    case 'openai':
    default:
      return callOpenAI(messages, mergedConfig);
  }
}

/**
 * 检测是否为 Bedrock ARN 模型
 */
function isBedrockModel(model?: string): boolean {
  return !!model && model.startsWith('arn:aws:bedrock:');
}

/**
 * 从环境变量获取 LLM 配置
 */
export function getLLMConfigFromEnv(): Partial<LLMConfig> {
  const config: Partial<LLMConfig> = {};

  // 获取模型配置
  const model =
    process.env.LLM_MODEL || process.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  if (model) {
    config.model = model;
  }

  // 检测 provider（优先级：LLM_MODEL 是 ARN > CLAUDE_CODE_USE_BEDROCK > LLM_PROVIDER）
  if (isBedrockModel(model)) {
    // 如果模型是 Bedrock ARN，强制使用 bedrock provider
    config.provider = 'bedrock';
  } else if (process.env.CLAUDE_CODE_USE_BEDROCK === '1') {
    // 自动检测 Bedrock 模式
    config.provider = 'bedrock';
    // 如果没有指定模型，使用默认 Bedrock 模型
    if (!config.model && process.env.ANTHROPIC_DEFAULT_SONNET_MODEL) {
      config.model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
    }
  } else if (process.env.LLM_PROVIDER) {
    config.provider = process.env.LLM_PROVIDER as
      | 'openai'
      | 'anthropic'
      | 'bedrock';
  }

  if (process.env.LLM_BASE_URL) {
    config.baseUrl = process.env.LLM_BASE_URL;
  }

  if (process.env.LLM_TEMPERATURE) {
    config.temperature = parseFloat(process.env.LLM_TEMPERATURE);
  }

  // AWS 配置
  if (process.env.AWS_REGION) {
    config.awsRegion = process.env.AWS_REGION;
  }

  return config;
}

/**
 * 检查 LLM 是否可用
 */
export function isLLMAvailable(): boolean {
  const model = process.env.LLM_MODEL || process.env.ANTHROPIC_DEFAULT_SONNET_MODEL;

  // 检查 Bedrock（模型是 ARN 或明确配置）
  if (
    isBedrockModel(model) ||
    process.env.CLAUDE_CODE_USE_BEDROCK === '1' ||
    process.env.LLM_PROVIDER === 'bedrock'
  ) {
    return !!(
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    );
  }

  // 检查 Anthropic 直接 API
  if (process.env.LLM_PROVIDER === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY;
    // 真正的 Anthropic API Key 以 sk-ant- 开头
    return !!key && key.startsWith('sk-ant-');
  }

  // 检查 OpenAI
  return !!process.env.OPENAI_API_KEY;
}

/**
 * 获取 LLM 不可用的原因
 */
export function getLLMUnavailableReason(): string | null {
  if (isLLMAvailable()) {
    return null;
  }

  const model = process.env.LLM_MODEL || process.env.ANTHROPIC_DEFAULT_SONNET_MODEL;

  if (
    isBedrockModel(model) ||
    process.env.CLAUDE_CODE_USE_BEDROCK === '1' ||
    process.env.LLM_PROVIDER === 'bedrock'
  ) {
    return 'AWS Bedrock: Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY';
  }

  if (process.env.LLM_PROVIDER === 'anthropic') {
    return 'Anthropic: Missing or invalid ANTHROPIC_API_KEY (should start with sk-ant-)';
  }

  return 'Missing API key. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or configure AWS Bedrock';
}
