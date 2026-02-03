/**
 * AI Client
 * 用于调用 LLM API 生成代码
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * AI 消息类型
 */
export interface UIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * AI 调用配置
 */
export interface AICallConfig {
  messages: UIMessage[];
  model?: string;
  timeout?: number;
  workspacePath?: string;
}

/**
 * AI 响应
 */
export interface AIResponse {
  content: string;
  toolCalls: unknown[];
}

/**
 * 获取代理 URL
 */
function getProxyUrl(): string | undefined {
  return process.env.https_proxy || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
}

/**
 * 调用 AI API
 */
export async function callAI(config: AICallConfig): Promise<AIResponse> {
  const { messages, model = 'sonnet', timeout = 60000 } = config;

  // 优先使用 AWS Bedrock
  const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  const hasAwsCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

  if (hasAwsCredentials) {
    return callBedrock(messages, model, timeout, awsRegion);
  }

  // 回退到简单响应
  console.warn('⚠️ [AI] 没有配置 AWS 凭证，使用默认响应');
  return {
    content: '',
    toolCalls: [],
  };
}

/**
 * 调用 AWS Bedrock
 */
async function callBedrock(
  messages: UIMessage[],
  model: string,
  timeout: number,
  region: string
): Promise<AIResponse> {
  console.log('🔗 [AI] 使用 AWS Bedrock 调用');

  // 配置代理
  const proxyUrl = getProxyUrl();
  let requestHandler: NodeHttpHandler | undefined;

  if (proxyUrl) {
    console.log(`🔗 [AI] 使用代理: ${proxyUrl}`);
    const agent = new HttpsProxyAgent(proxyUrl);
    requestHandler = new NodeHttpHandler({
      httpAgent: agent,
      httpsAgent: agent,
      connectionTimeout: timeout,
      socketTimeout: timeout,
    });
  }

  const client = new BedrockRuntimeClient({
    region,
    ...(requestHandler && { requestHandler }),
  });

  // 映射模型名称到 Bedrock 模型 ID
  const modelIdMap: Record<string, string> = {
    sonnet: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    haiku: 'anthropic.claude-3-5-haiku-20241022-v1:0',
    opus: 'anthropic.claude-3-opus-20240229-v1:0',
  };

  const modelId = modelIdMap[model] || model;

  // 构建请求
  const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
  const conversationMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 8192,
    system: systemMessage,
    messages: conversationMessages,
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  const content = responseBody.content
    ?.map((block: { type: string; text?: string }) =>
      block.type === 'text' ? block.text : ''
    )
    .join('') || '';

  return {
    content,
    toolCalls: [],
  };
}

/**
 * 检查 AI 客户端是否可用
 */
export function isAIClientAvailable(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}
