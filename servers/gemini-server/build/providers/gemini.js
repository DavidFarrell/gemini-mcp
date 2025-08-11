import fetch from 'node-fetch';
function getBaseUrl() {
    return process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
}
function getApiKey() {
    return process.env.GEMINI_API_KEY;
}
export class GeminiClient {
    apiKey;
    baseUrl;
    constructor(apiKey = getApiKey(), baseUrl = getBaseUrl()) {
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is required");
        }
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async retryWithBackoff(operation, maxRetries = 3) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
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
        throw lastError;
    }
    async generateContent(request) {
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
            const data = await response.json();
            // Don't log full response to avoid logging sensitive data
            console.error("Response candidates count:", data.candidates?.length || 0);
            console.error("Response usage:", data.usageMetadata);
            return data;
        });
    }
    // Optional: Add streaming support later
    async streamGenerateContent(request) {
        // Placeholder for future streaming implementation
        throw new Error("Streaming not yet implemented");
    }
    // ===== PHASE 2 WAVE 1 METHODS =====
    maxRetries = 3;
    initialBackoffMs = 500;
    buildHeaders(contentType) {
        const headers = {
            'x-goog-api-key': this.apiKey,
        };
        if (contentType)
            headers['Content-Type'] = contentType;
        return headers;
    }
    async fetchWithRetry(url, init, parseJson = true) {
        let attempt = 0;
        let lastError;
        while (attempt <= this.maxRetries) {
            try {
                const res = await fetch(url, init);
                if (res.ok) {
                    if (!parseJson)
                        return undefined;
                    // Gracefully handle empty body
                    const text = await res.text();
                    return text ? JSON.parse(text) : {};
                }
                // Non-OK response
                let errorBody = undefined;
                try {
                    errorBody = await res.json();
                }
                catch {
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
                err.status = res.status;
                err.body = errorBody;
                throw err;
            }
            catch (err) {
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
    toBase64(data) {
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
        return data.toString('base64');
    }
    async uploadFile(params) {
        const { data, mimeType, displayName } = params;
        // Use the upload endpoint with multipart format
        const url = `${this.baseUrl.replace('/v1beta', '/upload/v1beta')}/files?uploadType=multipart`;
        const boundary = `----formdata-gemini-${Date.now()}`;
        // Convert data to Buffer if needed
        let fileBuffer;
        if (Buffer.isBuffer(data)) {
            fileBuffer = data;
        }
        else if (data instanceof ArrayBuffer) {
            fileBuffer = Buffer.from(data);
        }
        else if (data instanceof Uint8Array) {
            fileBuffer = Buffer.from(data);
        }
        else if (typeof data === 'string') {
            fileBuffer = Buffer.from(data, 'utf-8');
        }
        else {
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
        const res = await this.fetchWithRetry(url, {
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
    async listFiles(params) {
        const searchParams = new URLSearchParams();
        if (params?.pageSize != null)
            searchParams.set('pageSize', String(params.pageSize));
        if (params?.pageToken)
            searchParams.set('pageToken', params.pageToken);
        const url = `${this.baseUrl}/files${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        console.error(`[Gemini] listFiles -> GET ${url}`);
        const res = await this.fetchWithRetry(url, {
            method: 'GET',
            headers: this.buildHeaders(),
        });
        console.error(`[Gemini] listFiles returned ${res.files?.length ?? 0} file(s)`);
        return res;
    }
    async deleteFile(fileId) {
        // Accept either "files/ID" or bare "ID"
        const resource = fileId.startsWith('files/') ? fileId : `files/${fileId}`;
        const url = `${this.baseUrl}/${resource}`;
        console.error(`[Gemini] deleteFile -> DELETE ${url}`);
        await this.fetchWithRetry(url, {
            method: 'DELETE',
            headers: this.buildHeaders(),
        }, /* parseJson */ false);
        console.error(`[Gemini] deleteFile success: ${resource}`);
    }
    async generateEmbeddings(params) {
        const { model, texts, taskType, outputDimensionality, truncate } = params;
        if (!model)
            throw new Error('generateEmbeddings: "model" is required');
        if (!texts?.length)
            throw new Error('generateEmbeddings: "texts" must be a non-empty array');
        const url = `${this.baseUrl}/models/${encodeURIComponent(model)}:batchEmbedContents`;
        const requestBody = {
            requests: texts.map((text) => {
                const req = {
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
        const res = await this.fetchWithRetry(url, {
            method: 'POST',
            headers: this.buildHeaders('application/json'),
            body: JSON.stringify(requestBody),
        });
        console.error(`[Gemini] generateEmbeddings success: ${res.embeddings?.length ?? 0} vector(s) returned`);
        return res;
    }
}
// Utility function to check if response was blocked by safety filters
export function isBlocked(response) {
    const candidates = response.candidates || [];
    if (candidates.length === 0)
        return true;
    const candidate = candidates[0];
    return candidate.finishReason === 'SAFETY' ||
        candidate.finishReason === 'BLOCKED_REASON_UNSPECIFIED';
}
// Utility function to get safety/block information
export function getBlockReason(response) {
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
export function extractText(response) {
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
export function extractUsage(response) {
    const usage = response.usageMetadata;
    if (!usage)
        return undefined;
    return {
        prompt_tokens: usage.promptTokenCount || 0,
        completion_tokens: usage.candidatesTokenCount || 0,
        total_tokens: usage.totalTokenCount || 0
    };
}
// Utility function to check for function calls
export function extractFunctionCalls(response) {
    const candidates = response.candidates || [];
    if (candidates.length === 0) {
        return [];
    }
    const parts = candidates[0].content?.parts || [];
    return parts
        .map(part => part.functionCall)
        .filter(Boolean);
}
//# sourceMappingURL=gemini.js.map