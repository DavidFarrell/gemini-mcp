export type GeminiTextPart = {
    text: string;
};
export type GeminiInlineDataPart = {
    inlineData: {
        data: string;
        mimeType: string;
    };
};
export type GeminiFileDataPart = {
    fileData: {
        fileUri: string;
        mimeType?: string;
    };
};
export type GeminiPart = GeminiTextPart | GeminiInlineDataPart | GeminiFileDataPart;
export type GeminiContent = {
    role: "user" | "model";
    parts: GeminiPart[];
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
    system_instruction?: {
        text: string;
    };
    contents: GeminiContent[];
    tools?: Array<{
        functionDeclarations: any[];
    }>;
    toolConfig?: any;
    generationConfig?: GeminiGenerationConfig;
    safetySettings?: any[];
    responseSchema?: any;
    thinking?: any;
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
export declare class GeminiClient {
    private apiKey;
    private baseUrl;
    constructor(apiKey?: string | undefined, baseUrl?: string);
    private sleep;
    private retryWithBackoff;
    generateContent(request: GeminiRequest): Promise<GeminiResponse>;
    streamGenerateContent(request: GeminiRequest): Promise<AsyncIterable<GeminiResponse>>;
    private readonly maxRetries;
    private readonly initialBackoffMs;
    private buildHeaders;
    private fetchWithRetry;
    private toBase64;
    uploadFile(params: UploadFileParams): Promise<GeminiFile>;
    listFiles(params?: {
        pageSize?: number;
        pageToken?: string;
    }): Promise<ListFilesResponse>;
    deleteFile(fileId: string): Promise<void>;
    generateEmbeddings(params: GenerateEmbeddingsParams): Promise<BatchEmbedContentsResponse>;
}
export declare function isBlocked(response: GeminiResponse): boolean;
export declare function getBlockReason(response: GeminiResponse): string;
export declare function extractText(response: GeminiResponse): string;
export declare function extractUsage(response: GeminiResponse): {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
} | undefined;
export declare function extractFunctionCalls(response: GeminiResponse): any[];
export interface UploadFileParams {
    data: Buffer | ArrayBuffer | Uint8Array | string;
    mimeType: string;
    displayName?: string;
}
export interface GeminiFile {
    name: string;
    display_name?: string;
    mime_type?: string;
    size_bytes?: string;
    create_time?: string;
    update_time?: string;
    expiration_time?: string;
    sha256_hash?: string;
    uri?: string;
    state?: 'PROCESSING' | 'ACTIVE' | 'FAILED' | 'DELETED' | string;
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
export type EmbeddingTaskType = 'EMBEDDING_TASK_TYPE_UNSPECIFIED' | 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING' | 'QUESTION_ANSWERING' | 'FACT_VERIFICATION';
export interface GenerateEmbeddingsParams {
    model: string;
    texts: string[];
    taskType?: EmbeddingTaskType;
    truncate?: boolean;
    outputDimensionality?: number;
}
export interface BatchEmbedContentsResponse {
    embeddings: Array<{
        values: number[];
        [k: string]: unknown;
    }>;
}
//# sourceMappingURL=gemini.d.ts.map