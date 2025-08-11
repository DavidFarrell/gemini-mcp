import { z } from 'zod';
// Generation configuration schema
export const GenerationConfigSchema = z.object({
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().min(1).optional(),
    maxOutputTokens: z.number().min(1).optional(),
    stopSequences: z.array(z.string()).optional(),
    candidateCount: z.number().min(1).max(8).optional(),
    responseMimeType: z.string().optional()
}).optional();
// Thinking configuration schema
export const ThinkingConfigSchema = z.object({
    effort: z.enum(['low', 'medium', 'high']).optional(),
    budgetTokens: z.number().min(1).optional()
}).optional();
// Safety settings schema
export const SafetySettingsSchema = z.array(z.object({
    category: z.string(),
    threshold: z.string()
})).optional();
// Gemini Generate tool input schema
export const GeminiGenerateSchema = z.object({
    prompt: z.string().describe("The input text or prompt for Gemini"),
    model: z.string().optional().default("gemini-2.5-flash").describe("Gemini model variant to use"),
    system: z.string().optional().describe("System instruction for the model"),
    generation_config: GenerationConfigSchema.describe("Generation configuration parameters"),
    response_schema: z.record(z.any()).optional().describe("JSON Schema for structured output"),
    response_mime_type: z.string().optional().describe("MIME type for response format"),
    safety_settings: SafetySettingsSchema.describe("Safety configuration settings"),
    thinking: ThinkingConfigSchema.describe("Thinking configuration for reasoning")
});
// Content part schemas for multimodal messages
export const TextPartSchema = z.object({
    type: z.literal("text"),
    text: z.string()
});
export const ImageUrlPartSchema = z.object({
    type: z.literal("image_url"),
    url: z.string(),
    mimeType: z.string().optional()
});
export const AudioUrlPartSchema = z.object({
    type: z.literal("audio_url"),
    url: z.string(),
    mimeType: z.string().optional()
});
export const VideoUrlPartSchema = z.object({
    type: z.literal("video_url"),
    url: z.string(),
    mimeType: z.string().optional()
});
export const InlineDataPartSchema = z.object({
    type: z.literal("inline_data"),
    data: z.string().describe("Base64 encoded data"),
    mimeType: z.string()
});
export const FileUriPartSchema = z.object({
    type: z.literal("file_uri"),
    uri: z.string(),
    mimeType: z.string().optional()
});
export const ContentPartSchema = z.union([
    TextPartSchema,
    ImageUrlPartSchema,
    AudioUrlPartSchema,
    VideoUrlPartSchema,
    InlineDataPartSchema,
    FileUriPartSchema
]);
// Message schema for conversations
export const MessageSchema = z.object({
    role: z.enum(["user", "assistant", "model", "system"]),
    content: z.union([
        z.string(),
        z.array(ContentPartSchema)
    ])
});
// Tools schema for function calling
export const ToolsSchema = z.array(z.object({
    functionDeclarations: z.array(z.object({
        name: z.string(),
        description: z.string(),
        parameters: z.record(z.any()).optional()
    }))
})).optional();
// Gemini Messages tool input schema
export const GeminiMessagesSchema = z.object({
    model: z.string().optional().default("gemini-2.5-flash").describe("Gemini model variant to use"),
    system: z.string().optional().describe("System instruction for the model"),
    messages: z.array(MessageSchema).describe("Array of conversation messages"),
    generation_config: GenerationConfigSchema.describe("Generation configuration parameters"),
    safety_settings: SafetySettingsSchema.describe("Safety configuration settings"),
    response_schema: z.record(z.any()).optional().describe("JSON Schema for structured output"),
    response_mime_type: z.string().optional().describe("MIME type for response format"),
    tools: ToolsSchema.describe("Function declarations for tool use"),
    tool_config: z.record(z.any()).optional().describe("Tool configuration settings"),
    thinking: ThinkingConfigSchema.describe("Thinking configuration for reasoning")
});
// ===== PHASE 2 WAVE 1 SCHEMAS =====
/**
 * Common helpers for Phase 2
 */
const mimeTypeRegex = /^[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]{0,126}\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]{0,126}$/;
const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const mimeTypeSchema = z
    .string()
    .regex(mimeTypeRegex, "Invalid MIME type")
    .max(255)
    .describe("IANA-compliant MIME type, e.g., 'image/png', 'application/pdf', or 'application/octet-stream'.");
// Max decoded upload size: 50 MiB
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
function approximateBase64DecodedBytes(b64) {
    const len = b64.length;
    const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    return Math.floor((len * 3) / 4) - padding;
}
/**
 * Retention policy
 */
const RetentionPolicySchema = z
    .union([
    z
        .object({
        type: z
            .literal("persistent")
            .describe("Persistent files do not automatically expire."),
    })
        .describe("Persistent retention."),
    z
        .object({
        type: z
            .literal("temporary")
            .describe("Temporary files expire based on ttlSeconds or expiresAt."),
        ttlSeconds: z
            .number()
            .int()
            .min(60)
            .max(60 * 60 * 24 * 30)
            .optional()
            .describe("Time-to-live in seconds. Min 60s, max 30 days. Provide either ttlSeconds or expiresAt."),
        expiresAt: z
            .string()
            .datetime()
            .optional()
            .describe("RFC3339 timestamp for expiration. Provide either ttlSeconds or expiresAt."),
    })
        .superRefine((v, ctx) => {
        if (!v.ttlSeconds && !v.expiresAt) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Provide ttlSeconds or expiresAt for temporary retention.",
                path: ["ttlSeconds"],
            });
        }
        if (v.ttlSeconds && v.expiresAt) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Provide only one of ttlSeconds or expiresAt.",
                path: ["ttlSeconds"],
            });
        }
    })
        .describe("Temporary retention."),
])
    .describe("Retention policy for the uploaded file. Defaults to persistent if unspecified.");
const SourceUrlSchema = z
    .object({
    url: z
        .string()
        .url()
        .max(2048)
        .refine((u) => /^https?:\/\//i.test(u), "Only http(s) schemes are supported.")
        .describe("HTTP(S) URL to fetch the file from."),
})
    .describe("Source via remote URL.");
const SourceBase64Schema = z
    .object({
    base64: z
        .string()
        .regex(base64Regex, "Invalid base64 content.")
        .min(4)
        .describe("Base64-encoded file content. Decoded payload must not exceed 50 MiB."),
})
    .superRefine((v, ctx) => {
    const bytes = approximateBase64DecodedBytes(v.base64);
    if (bytes <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Base64 payload is empty.",
            path: ["base64"],
        });
    }
    if (bytes > MAX_UPLOAD_BYTES) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Base64 payload exceeds 50 MiB (decoded).`,
            path: ["base64"],
        });
    }
})
    .describe("Source via base64 payload.");
/**
 * Shared File metadata schema (Upload output, List output items)
 */
export const GeminiFileSchema = z
    .object({
    fileId: z
        .string()
        .min(1)
        .max(512)
        .describe("Server-assigned identifier for the file."),
    uri: z
        .string()
        .url()
        .max(2048)
        .describe("Canonical URI for the file resource (may be used to reference it in prompts)."),
    mimeType: mimeTypeSchema.describe("MIME type of the stored file."),
    sizeBytes: z
        .number()
        .int()
        .nonnegative()
        .describe("Size of the file in bytes."),
    sha256: z
        .string()
        .regex(/^[A-Fa-f0-9]{64}$/, "Expected 64-character hex SHA-256.")
        .describe("Hex-encoded SHA-256 checksum of the file content."),
    createTime: z
        .string()
        .datetime()
        .describe("RFC3339 timestamp when the file was created."),
    expiresAt: z
        .string()
        .datetime()
        .optional()
        .describe("RFC3339 timestamp when the file will expire, if applicable (temporary files only)."),
    displayName: z
        .string()
        .min(1)
        .max(256)
        .optional()
        .describe("Optional human-readable display name."),
})
    .strict()
    .describe("File metadata.");
/**
 * gemini_upload_file
 */
export const GeminiUploadFileSchema = z
    .object({
    source: z
        .union([SourceUrlSchema, SourceBase64Schema])
        .describe("Source of the file: either a URL or base64 payload."),
    mimeType: mimeTypeSchema.describe("MIME type of the file being uploaded. Required for base64; for URL, used as a hint/fallback."),
    displayName: z
        .string()
        .min(1)
        .max(256)
        .optional()
        .describe("Optional human-readable display name for the file."),
    dedupe: z
        .boolean()
        .default(true)
        .describe("If true (default), reuse an existing stored file with identical content when possible."),
    retention: RetentionPolicySchema.default({ type: "persistent" }).describe("Retention policy for the uploaded file. Defaults to persistent."),
})
    .strict()
    .describe("Input for gemini_upload_file.");
/**
 * gemini_list_files
 */
export const GeminiListFilesSchema = z
    .object({
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(100)
        .describe("Maximum number of files to return. Default 100, max 1000."),
    pageToken: z
        .string()
        .min(1)
        .max(4096)
        .optional()
        .describe("Opaque token to retrieve the next page of results from a previous list request."),
    filter: z
        .object({
        mimeTypes: z
            .array(mimeTypeSchema)
            .min(1)
            .max(20)
            .optional()
            .describe("Return files whose MIME type matches any of these."),
        displayNameContains: z
            .string()
            .min(1)
            .max(256)
            .optional()
            .describe("Case-insensitive substring to match against the displayName."),
        createdAfter: z
            .string()
            .datetime()
            .optional()
            .describe("Return files created strictly after this RFC3339 timestamp."),
        createdBefore: z
            .string()
            .datetime()
            .optional()
            .describe("Return files created strictly before this RFC3339 timestamp."),
        expired: z
            .boolean()
            .optional()
            .describe("If true, return only expired files; if false, only non-expired; if omitted, return all."),
    })
        .partial()
        .default({})
        .superRefine((f, ctx) => {
        if (f.createdAfter && f.createdBefore) {
            const after = Date.parse(f.createdAfter);
            const before = Date.parse(f.createdBefore);
            if (!Number.isFinite(after) || !Number.isFinite(before)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Invalid date range.",
                    path: ["createdAfter"],
                });
            }
            else if (after > before) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "createdAfter must be <= createdBefore.",
                    path: ["createdAfter"],
                });
            }
        }
    })
        .describe("Filter options."),
})
    .strict()
    .describe("Input for gemini_list_files.");
/**
 * gemini_delete_file
 */
export const GeminiDeleteFileSchema = z
    .object({
    fileId: z
        .string()
        .min(1)
        .max(512)
        .describe("Identifier of the file to delete."),
    force: z
        .boolean()
        .default(false)
        .describe("If true, delete even if the file is currently referenced by other resources."),
})
    .strict()
    .describe("Input for gemini_delete_file.");
/**
 * gemini_embeddings
 */
export const GeminiEmbeddingsSchema = z
    .object({
    texts: z
        .array(z.string().min(1).max(100_000))
        .min(1)
        .max(2048)
        .describe("Array of input texts to embed. Each text up to 100k characters. Max 2048 texts per request."),
    model: z
        .string()
        .min(1)
        .default("text-embedding-004")
        .describe("Embedding model name. Defaults to 'text-embedding-004'. Use an appropriate model available in your environment."),
    taskType: z
        .enum([
        "unspecified",
        "classification",
        "clustering",
        "retrieval_query",
        "retrieval_document",
        "semantic_similarity",
        "question_answering",
    ])
        .default("unspecified")
        .describe("Intended downstream task to tailor embeddings. Defaults to 'unspecified'."),
    truncate: z
        .enum(["NONE", "START", "END"])
        .default("NONE")
        .describe("Truncation strategy if input exceeds model limits. NONE (default), START, or END."),
    outputDimensionality: z
        .number()
        .int()
        .min(8)
        .max(3072)
        .optional()
        .describe("If set, request embeddings projected to this dimensionality. Range 8–3072 depending on model."),
})
    .strict()
    .describe("Input for gemini_embeddings.");
/**
 * gemini_getdocs
 */
export const GeminiGetDocsSchema = z
    .object({})
    .strict()
    .describe("Input for gemini_getdocs - returns the full Gemini API documentation.");
//# sourceMappingURL=schemas.js.map