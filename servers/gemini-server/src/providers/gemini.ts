import fetch, { RequestInit, HeadersInit } from 'node-fetch';

function getBaseUrl(): string {
  return process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
}

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

// Gemini API types
export type GeminiTextPart = { text: string };
export type GeminiInlineDataPart = { inlineData: { data: string; mimeType: string } };
export type GeminiFileDataPart = { fileData: { fileUri: string; mimeType?: string } };
export type GeminiPart = GeminiTextPart | GeminiInlineDataPart | GeminiFileDataPart;

export type GeminiContent = { 
  role: "user" | "model"; 
  parts: GeminiPart[] 
};

export type GeminiGenerationConfig = {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  candidateCount?: number;
  responseMimeType?: string;
};

export type GeminiRequest = {
  model: string;
  system_instruction?: { text: string };
  contents: GeminiContent[];
  tools?: Array<{ functionDeclarations: any[] }>;
  toolConfig?: any;
  generationConfig?: GeminiGenerationConfig;
  safetySettings?: any[];
  responseSchema?: any;
  thinking?: any; // Evolving field in Gemini 2.5
};

export type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: any;
      }>;
      role?: string;
    };
    finishReason?: string;
    index?: number;
    safetyRatings?: any[];
  }>;
  promptFeedback?: {
    safetyRatings?: any[];
  };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class GeminiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey = getApiKey(), baseUrl = getBaseUrl()) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain error types
        if (error instanceof Error && error.message.includes('400')) {
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Only retry on 429 (rate limit) and 5xx (server) errors
        const shouldRetry = error instanceof Error && 
          (error.message.includes('429') || error.message.includes('5'));
        
        if (!shouldRetry) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.error(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  async generateContent(request: GeminiRequest): Promise<GeminiResponse> {
    return this.retryWithBackoff(async () => {
      const { model, ...body } = request;
      const url = `${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent`;
      
      console.error("Making Gemini API request to:", url);
      // Don't log full request body to avoid logging sensitive data
      console.error("Request model:", model);
      console.error("Request has system_instruction:", !!body.system_instruction);
      console.error("Request contents count:", body.contents?.length || 0);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });

      // Check for rate limit headers
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');
      if (rateLimitRemaining) {
        console.error(`Rate limit remaining: ${rateLimitRemaining}`);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as GeminiResponse;
      
      // Don't log full response to avoid logging sensitive data
      console.error("Response candidates count:", data.candidates?.length || 0);
      console.error("Response usage:", data.usageMetadata);
      
      return data;
    });
  }

  // Optional: Add streaming support later
  async streamGenerateContent(request: GeminiRequest): Promise<AsyncIterable<GeminiResponse>> {
    // Placeholder for future streaming implementation
    throw new Error("Streaming not yet implemented");
  }

  // ===== PHASE 2 WAVE 1 METHODS =====

  private readonly maxRetries = 3;
  private readonly initialBackoffMs = 500;

  private buildHeaders(contentType?: string): HeadersInit {
    const headers: Record<string, string> = {
      'x-goog-api-key': this.apiKey,
    };
    if (contentType) headers['Content-Type'] = contentType;
    return headers;
  }

  private async fetchWithRetry<T>(url: string, init: RequestInit, parseJson = true): Promise<T> {
    let attempt = 0;
    let lastError: any;

    while (attempt <= this.maxRetries) {
      try {
        const res = await fetch(url, init);

        if (res.ok) {
          if (!parseJson) return undefined as unknown as T;
          // Gracefully handle empty body
          const text = await res.text();
          return text ? (JSON.parse(text) as T) : ({} as T);
        }

        // Non-OK response
        let errorBody: any = undefined;
        try {
          errorBody = await res.json();
        } catch {
          // ignore parse errors
        }

        // Retry on 429 and 5xx
        if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
          const backoff = this.initialBackoffMs * Math.pow(2, attempt);
          console.warn(`[Gemini] HTTP ${res.status} on ${url} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${backoff}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
          attempt++;
          continue;
        }

        const message = errorBody?.error?.message || res.statusText || 'Unknown error';
        const code = errorBody?.error?.code || res.status;
        const status = errorBody?.error?.status;

        const err = new Error(`Gemini API error ${code}${status ? ` (${status})` : ''}: ${message}`);
        (err as any).status = res.status;
        (err as any).body = errorBody;
        throw err;
      } catch (err) {
        lastError = err;
        // Network or parsing error: retry
        if (attempt < this.maxRetries) {
          const backoff = this.initialBackoffMs * Math.pow(2, attempt);
          console.warn(`[Gemini] Request failed for ${url} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${backoff}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
          attempt++;
          continue;
        }
        break;
      }
    }

    // Exhausted retries
    console.error(`[Gemini] Request failed after ${this.maxRetries + 1} attempts: ${url}`);
    throw lastError;
  }

  private toBase64(data: Buffer | ArrayBuffer | Uint8Array | string): string {
    if (typeof data === 'string') {
      return Buffer.from(data, 'utf-8').toString('base64');
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(new Uint8Array(data)).toString('base64');
    }
    if (data instanceof Uint8Array) {
      return Buffer.from(data).toString('base64');
    }
    // Buffer
    return (data as Buffer).toString('base64');
  }

  public async uploadFile(params: UploadFileParams): Promise<GeminiFile> {
    const { data, mimeType, displayName } = params;

    // Use the upload endpoint with multipart format
    const url = `${this.baseUrl.replace('/v1beta', '/upload/v1beta')}/files?uploadType=multipart`;
    const boundary = `----formdata-gemini-${Date.now()}`;
    
    // Convert data to Buffer if needed
    let fileBuffer: Buffer;
    if (Buffer.isBuffer(data)) {
      fileBuffer = data;
    } else if (data instanceof ArrayBuffer) {
      fileBuffer = Buffer.from(data);
    } else if (data instanceof Uint8Array) {
      fileBuffer = Buffer.from(data);
    } else if (typeof data === 'string') {
      fileBuffer = Buffer.from(data, 'utf-8');
    } else {
      throw new Error('Unsupported data type for upload');
    }

    // Build multipart body
    const metadataPart = JSON.stringify({
      file: {
        display_name: displayName,
        mime_type: mimeType,
      },
    });

    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Type: application/json; charset=UTF-8\r\n\r\n`),
      Buffer.from(metadataPart),
      Buffer.from(`\r\n--${boundary}\r\n`),
      Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    console.error(`[Gemini] uploadFile -> POST ${url} (mimeType=${mimeType}${displayName ? `, displayName=${displayName}` : ''}, size=${fileBuffer.length} bytes)`);

    const res = await this.fetchWithRetry<GeminiFile>(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': this.apiKey,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    // Minimal success logging (no sensitive data)
    console.error(`[Gemini] uploadFile success: ${res?.name ?? 'unknown'}`);
    return res;
  }

  public async listFiles(params?: { pageSize?: number; pageToken?: string }): Promise<ListFilesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.pageSize != null) searchParams.set('pageSize', String(params.pageSize));
    if (params?.pageToken) searchParams.set('pageToken', params.pageToken);

    const url = `${this.baseUrl}/files${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    console.error(`[Gemini] listFiles -> GET ${url}`);

    const res = await this.fetchWithRetry<ListFilesResponse>(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    console.error(`[Gemini] listFiles returned ${res.files?.length ?? 0} file(s)`);
    return res;
  }

  public async deleteFile(fileId: string): Promise<void> {
    // Accept either "files/ID" or bare "ID"
    const resource = fileId.startsWith('files/') ? fileId : `files/${fileId}`;
    const url = `${this.baseUrl}/${resource}`;

    console.error(`[Gemini] deleteFile -> DELETE ${url}`);

    await this.fetchWithRetry<void>(url, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    }, /* parseJson */ false);

    console.error(`[Gemini] deleteFile success: ${resource}`);
  }

  public async generateEmbeddings(params: GenerateEmbeddingsParams): Promise<BatchEmbedContentsResponse> {
    const { model, texts, taskType, outputDimensionality, truncate } = params;
    if (!model) throw new Error('generateEmbeddings: "model" is required');
    if (!texts?.length) throw new Error('generateEmbeddings: "texts" must be a non-empty array');

    const url = `${this.baseUrl}/models/${encodeURIComponent(model)}:batchEmbedContents`;

    const requestBody: BatchEmbedContentsRequest = {
      requests: texts.map((text) => {
        const req: BatchEmbedContentsRequest['requests'][number] = {
          model: model.startsWith('models/') ? model : `models/${model}`,
          content: { parts: [{ text }] },
        };
        // Only include taskType if it's not unspecified and is supported
        if (taskType && taskType !== 'EMBEDDING_TASK_TYPE_UNSPECIFIED') {
          req.taskType = taskType;
        }
        // Only include outputDimensionality if explicitly requested
        if (typeof outputDimensionality === 'number' && outputDimensionality > 0) {
          req.outputDimensionality = outputDimensionality;
        }
        // Skip autoTruncate for now as it seems unsupported
        // if (typeof truncate === 'boolean') req.autoTruncate = truncate;
        return req;
      }),
    };

    console.error(`[Gemini] generateEmbeddings -> POST ${url} (count=${texts.length}, model=${model}${taskType ? `, taskType=${taskType}` : ''}${outputDimensionality ? `, dims=${outputDimensionality}` : ''})`);

    const res = await this.fetchWithRetry<BatchEmbedContentsResponse>(url, {
      method: 'POST',
      headers: this.buildHeaders('application/json'),
      body: JSON.stringify(requestBody),
    });

    console.error(`[Gemini] generateEmbeddings success: ${res.embeddings?.length ?? 0} vector(s) returned`);
    return res;
  }
}

// Utility function to check if response was blocked by safety filters
export function isBlocked(response: GeminiResponse): boolean {
  const candidates = response.candidates || [];
  if (candidates.length === 0) return true;
  
  const candidate = candidates[0];
  return candidate.finishReason === 'SAFETY' || 
         candidate.finishReason === 'BLOCKED_REASON_UNSPECIFIED';
}

// Utility function to get safety/block information
export function getBlockReason(response: GeminiResponse): string {
  const candidates = response.candidates || [];
  if (candidates.length === 0) {
    const promptFeedback = response.promptFeedback;
    if (promptFeedback?.safetyRatings) {
      const blocked = promptFeedback.safetyRatings
        .filter(rating => rating.blocked)
        .map(rating => `${rating.category}: ${rating.probability}`)
        .join(', ');
      return blocked ? `Prompt blocked due to safety concerns: ${blocked}` : "No content generated";
    }
    return "No content generated";
  }

  const candidate = candidates[0];
  if (candidate.finishReason === 'SAFETY') {
    const safetyRatings = candidate.safetyRatings || [];
    const issues = safetyRatings
      .filter(rating => rating.blocked)
      .map(rating => `${rating.category}: ${rating.probability}`)
      .join(', ');
    return issues ? `Content blocked due to safety concerns: ${issues}` : "Content blocked by safety filters";
  }

  return "Content generation was stopped unexpectedly";
}

// Utility function to extract text from Gemini response
export function extractText(response: GeminiResponse): string {
  const candidates = response.candidates || [];
  if (candidates.length === 0) {
    return "";
  }

  const parts = candidates[0].content?.parts || [];
  return parts
    .map(part => part.text)
    .filter(Boolean)
    .join("\n\n");
}

// Utility function to extract usage metadata
export function extractUsage(response: GeminiResponse) {
  const usage = response.usageMetadata;
  if (!usage) return undefined;

  return {
    prompt_tokens: usage.promptTokenCount || 0,
    completion_tokens: usage.candidatesTokenCount || 0,
    total_tokens: usage.totalTokenCount || 0
  };
}

// Utility function to check for function calls
export function extractFunctionCalls(response: GeminiResponse): any[] {
  const candidates = response.candidates || [];
  if (candidates.length === 0) {
    return [];
  }

  const parts = candidates[0].content?.parts || [];
  return parts
    .map(part => part.functionCall)
    .filter(Boolean);
}

// ===== PHASE 2 WAVE 1 PROVIDER EXTENSIONS =====

// Additional types for Wave 1 tools
export interface UploadFileParams {
  data: Buffer | ArrayBuffer | Uint8Array | string;
  mimeType: string;
  displayName?: string;
}

export interface GeminiFile {
  // Resource name, e.g., "files/abc123"
  name: string;

  // Metadata (snake_case per Google JSON)
  display_name?: string;
  mime_type?: string;
  size_bytes?: string;
  create_time?: string;
  update_time?: string;
  expiration_time?: string;
  sha256_hash?: string;
  uri?: string;
  state?: 'PROCESSING' | 'ACTIVE' | 'FAILED' | 'DELETED' | string;

  // Optional error info for failed files
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export interface ListFilesResponse {
  files?: GeminiFile[];
  next_page_token?: string;
}

export type EmbeddingTaskType =
  | 'EMBEDDING_TASK_TYPE_UNSPECIFIED'
  | 'RETRIEVAL_QUERY'
  | 'RETRIEVAL_DOCUMENT'
  | 'SEMANTIC_SIMILARITY'
  | 'CLASSIFICATION'
  | 'CLUSTERING'
  | 'QUESTION_ANSWERING'
  | 'FACT_VERIFICATION';

export interface GenerateEmbeddingsParams {
  model: string;
  texts: string[];
  taskType?: EmbeddingTaskType;
  truncate?: boolean; // mapped to auto_truncate
  outputDimensionality?: number;
}

interface BatchEmbedContentsRequest {
  requests: Array<{
    model?: string;
    content: { parts: Array<{ text: string }> };
    taskType?: EmbeddingTaskType;
    outputDimensionality?: number;
    autoTruncate?: boolean;
  }>;
}

export interface BatchEmbedContentsResponse {
  embeddings: Array<{
    values: number[];
    // statistics or additional fields may be present in future
    [k: string]: unknown;
  }>;
}