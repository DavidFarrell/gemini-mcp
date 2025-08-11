import { z } from 'zod';
export declare const GenerationConfigSchema: z.ZodOptional<z.ZodObject<{
    temperature: z.ZodOptional<z.ZodNumber>;
    topP: z.ZodOptional<z.ZodNumber>;
    topK: z.ZodOptional<z.ZodNumber>;
    maxOutputTokens: z.ZodOptional<z.ZodNumber>;
    stopSequences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    candidateCount: z.ZodOptional<z.ZodNumber>;
    responseMimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    temperature?: number | undefined;
    topP?: number | undefined;
    topK?: number | undefined;
    maxOutputTokens?: number | undefined;
    stopSequences?: string[] | undefined;
    candidateCount?: number | undefined;
    responseMimeType?: string | undefined;
}, {
    temperature?: number | undefined;
    topP?: number | undefined;
    topK?: number | undefined;
    maxOutputTokens?: number | undefined;
    stopSequences?: string[] | undefined;
    candidateCount?: number | undefined;
    responseMimeType?: string | undefined;
}>>;
export declare const ThinkingConfigSchema: z.ZodOptional<z.ZodObject<{
    effort: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
    budgetTokens: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    effort?: "low" | "medium" | "high" | undefined;
    budgetTokens?: number | undefined;
}, {
    effort?: "low" | "medium" | "high" | undefined;
    budgetTokens?: number | undefined;
}>>;
export declare const SafetySettingsSchema: z.ZodOptional<z.ZodArray<z.ZodObject<{
    category: z.ZodString;
    threshold: z.ZodString;
}, "strip", z.ZodTypeAny, {
    category: string;
    threshold: string;
}, {
    category: string;
    threshold: string;
}>, "many">>;
export declare const GeminiGenerateSchema: z.ZodObject<{
    prompt: z.ZodString;
    model: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    system: z.ZodOptional<z.ZodString>;
    generation_config: z.ZodOptional<z.ZodObject<{
        temperature: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        topK: z.ZodOptional<z.ZodNumber>;
        maxOutputTokens: z.ZodOptional<z.ZodNumber>;
        stopSequences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        candidateCount: z.ZodOptional<z.ZodNumber>;
        responseMimeType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        maxOutputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        candidateCount?: number | undefined;
        responseMimeType?: string | undefined;
    }, {
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        maxOutputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        candidateCount?: number | undefined;
        responseMimeType?: string | undefined;
    }>>;
    response_schema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    response_mime_type: z.ZodOptional<z.ZodString>;
    safety_settings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        category: z.ZodString;
        threshold: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        category: string;
        threshold: string;
    }, {
        category: string;
        threshold: string;
    }>, "many">>;
    thinking: z.ZodOptional<z.ZodObject<{
        effort: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
        budgetTokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        effort?: "low" | "medium" | "high" | undefined;
        budgetTokens?: number | undefined;
    }, {
        effort?: "low" | "medium" | "high" | undefined;
        budgetTokens?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    model: string;
    system?: string | undefined;
    generation_config?: {
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        maxOutputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        candidateCount?: number | undefined;
        responseMimeType?: string | undefined;
    } | undefined;
    response_schema?: Record<string, any> | undefined;
    response_mime_type?: string | undefined;
    safety_settings?: {
        category: string;
        threshold: string;
    }[] | undefined;
    thinking?: {
        effort?: "low" | "medium" | "high" | undefined;
        budgetTokens?: number | undefined;
    } | undefined;
}, {
    prompt: string;
    model?: string | undefined;
    system?: string | undefined;
    generation_config?: {
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        maxOutputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        candidateCount?: number | undefined;
        responseMimeType?: string | undefined;
    } | undefined;
    response_schema?: Record<string, any> | undefined;
    response_mime_type?: string | undefined;
    safety_settings?: {
        category: string;
        threshold: string;
    }[] | undefined;
    thinking?: {
        effort?: "low" | "medium" | "high" | undefined;
        budgetTokens?: number | undefined;
    } | undefined;
}>;
export declare const TextPartSchema: z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "text";
    text: string;
}, {
    type: "text";
    text: string;
}>;
export declare const ImageUrlPartSchema: z.ZodObject<{
    type: z.ZodLiteral<"image_url">;
    url: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "image_url";
    url: string;
    mimeType?: string | undefined;
}, {
    type: "image_url";
    url: string;
    mimeType?: string | undefined;
}>;
export declare const AudioUrlPartSchema: z.ZodObject<{
    type: z.ZodLiteral<"audio_url">;
    url: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "audio_url";
    url: string;
    mimeType?: string | undefined;
}, {
    type: "audio_url";
    url: string;
    mimeType?: string | undefined;
}>;
export declare const VideoUrlPartSchema: z.ZodObject<{
    type: z.ZodLiteral<"video_url">;
    url: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "video_url";
    url: string;
    mimeType?: string | undefined;
}, {
    type: "video_url";
    url: string;
    mimeType?: string | undefined;
}>;
export declare const InlineDataPartSchema: z.ZodObject<{
    type: z.ZodLiteral<"inline_data">;
    data: z.ZodString;
    mimeType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "inline_data";
    mimeType: string;
    data: string;
}, {
    type: "inline_data";
    mimeType: string;
    data: string;
}>;
export declare const FileUriPartSchema: z.ZodObject<{
    type: z.ZodLiteral<"file_uri">;
    uri: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "file_uri";
    uri: string;
    mimeType?: string | undefined;
}, {
    type: "file_uri";
    uri: string;
    mimeType?: string | undefined;
}>;
export declare const ContentPartSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "text";
    text: string;
}, {
    type: "text";
    text: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"image_url">;
    url: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "image_url";
    url: string;
    mimeType?: string | undefined;
}, {
    type: "image_url";
    url: string;
    mimeType?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"audio_url">;
    url: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "audio_url";
    url: string;
    mimeType?: string | undefined;
}, {
    type: "audio_url";
    url: string;
    mimeType?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"video_url">;
    url: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "video_url";
    url: string;
    mimeType?: string | undefined;
}, {
    type: "video_url";
    url: string;
    mimeType?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"inline_data">;
    data: z.ZodString;
    mimeType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "inline_data";
    mimeType: string;
    data: string;
}, {
    type: "inline_data";
    mimeType: string;
    data: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"file_uri">;
    uri: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "file_uri";
    uri: string;
    mimeType?: string | undefined;
}, {
    type: "file_uri";
    uri: string;
    mimeType?: string | undefined;
}>]>;
export declare const MessageSchema: z.ZodObject<{
    role: z.ZodEnum<["user", "assistant", "model", "system"]>;
    content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodUnion<[z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "text";
        text: string;
    }, {
        type: "text";
        text: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"image_url">;
        url: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "image_url";
        url: string;
        mimeType?: string | undefined;
    }, {
        type: "image_url";
        url: string;
        mimeType?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"audio_url">;
        url: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "audio_url";
        url: string;
        mimeType?: string | undefined;
    }, {
        type: "audio_url";
        url: string;
        mimeType?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"video_url">;
        url: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "video_url";
        url: string;
        mimeType?: string | undefined;
    }, {
        type: "video_url";
        url: string;
        mimeType?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"inline_data">;
        data: z.ZodString;
        mimeType: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "inline_data";
        mimeType: string;
        data: string;
    }, {
        type: "inline_data";
        mimeType: string;
        data: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"file_uri">;
        uri: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "file_uri";
        uri: string;
        mimeType?: string | undefined;
    }, {
        type: "file_uri";
        uri: string;
        mimeType?: string | undefined;
    }>]>, "many">]>;
}, "strip", z.ZodTypeAny, {
    role: "model" | "system" | "user" | "assistant";
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image_url";
        url: string;
        mimeType?: string | undefined;
    } | {
        type: "audio_url";
        url: string;
        mimeType?: string | undefined;
    } | {
        type: "video_url";
        url: string;
        mimeType?: string | undefined;
    } | {
        type: "inline_data";
        mimeType: string;
        data: string;
    } | {
        type: "file_uri";
        uri: string;
        mimeType?: string | undefined;
    })[];
}, {
    role: "model" | "system" | "user" | "assistant";
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image_url";
        url: string;
        mimeType?: string | undefined;
    } | {
        type: "audio_url";
        url: string;
        mimeType?: string | undefined;
    } | {
        type: "video_url";
        url: string;
        mimeType?: string | undefined;
    } | {
        type: "inline_data";
        mimeType: string;
        data: string;
    } | {
        type: "file_uri";
        uri: string;
        mimeType?: string | undefined;
    })[];
}>;
export declare const ToolsSchema: z.ZodOptional<z.ZodArray<z.ZodObject<{
    functionDeclarations: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        parameters?: Record<string, any> | undefined;
    }, {
        name: string;
        description: string;
        parameters?: Record<string, any> | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    functionDeclarations: {
        name: string;
        description: string;
        parameters?: Record<string, any> | undefined;
    }[];
}, {
    functionDeclarations: {
        name: string;
        description: string;
        parameters?: Record<string, any> | undefined;
    }[];
}>, "many">>;
export declare const GeminiMessagesSchema: z.ZodObject<{
    model: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    system: z.ZodOptional<z.ZodString>;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["user", "assistant", "model", "system"]>;
        content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodUnion<[z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "text";
            text: string;
        }, {
            type: "text";
            text: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"image_url">;
            url: z.ZodString;
            mimeType: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "image_url";
            url: string;
            mimeType?: string | undefined;
        }, {
            type: "image_url";
            url: string;
            mimeType?: string | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"audio_url">;
            url: z.ZodString;
            mimeType: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "audio_url";
            url: string;
            mimeType?: string | undefined;
        }, {
            type: "audio_url";
            url: string;
            mimeType?: string | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"video_url">;
            url: z.ZodString;
            mimeType: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "video_url";
            url: string;
            mimeType?: string | undefined;
        }, {
            type: "video_url";
            url: string;
            mimeType?: string | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"inline_data">;
            data: z.ZodString;
            mimeType: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "inline_data";
            mimeType: string;
            data: string;
        }, {
            type: "inline_data";
            mimeType: string;
            data: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"file_uri">;
            uri: z.ZodString;
            mimeType: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "file_uri";
            uri: string;
            mimeType?: string | undefined;
        }, {
            type: "file_uri";
            uri: string;
            mimeType?: string | undefined;
        }>]>, "many">]>;
    }, "strip", z.ZodTypeAny, {
        role: "model" | "system" | "user" | "assistant";
        content: string | ({
            type: "text";
            text: string;
        } | {
            type: "image_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "audio_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "video_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "inline_data";
            mimeType: string;
            data: string;
        } | {
            type: "file_uri";
            uri: string;
            mimeType?: string | undefined;
        })[];
    }, {
        role: "model" | "system" | "user" | "assistant";
        content: string | ({
            type: "text";
            text: string;
        } | {
            type: "image_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "audio_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "video_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "inline_data";
            mimeType: string;
            data: string;
        } | {
            type: "file_uri";
            uri: string;
            mimeType?: string | undefined;
        })[];
    }>, "many">;
    generation_config: z.ZodOptional<z.ZodObject<{
        temperature: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        topK: z.ZodOptional<z.ZodNumber>;
        maxOutputTokens: z.ZodOptional<z.ZodNumber>;
        stopSequences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        candidateCount: z.ZodOptional<z.ZodNumber>;
        responseMimeType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        maxOutputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        candidateCount?: number | undefined;
        responseMimeType?: string | undefined;
    }, {
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        maxOutputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        candidateCount?: number | undefined;
        responseMimeType?: string | undefined;
    }>>;
    safety_settings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        category: z.ZodString;
        threshold: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        category: string;
        threshold: string;
    }, {
        category: string;
        threshold: string;
    }>, "many">>;
    response_schema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    response_mime_type: z.ZodOptional<z.ZodString>;
    tools: z.ZodOptional<z.ZodArray<z.ZodObject<{
        functionDeclarations: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            description: string;
            parameters?: Record<string, any> | undefined;
        }, {
            name: string;
            description: string;
            parameters?: Record<string, any> | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        functionDeclarations: {
            name: string;
            description: string;
            parameters?: Record<string, any> | undefined;
        }[];
    }, {
        functionDeclarations: {
            name: string;
            description: string;
            parameters?: Record<string, any> | undefined;
        }[];
    }>, "many">>;
    tool_config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    thinking: z.ZodOptional<z.ZodObject<{
        effort: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
        budgetTokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        effort?: "low" | "medium" | "high" | undefined;
        budgetTokens?: number | undefined;
    }, {
        effort?: "low" | "medium" | "high" | undefined;
        budgetTokens?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    model: string;
    messages: {
        role: "model" | "system" | "user" | "assistant";
        content: string | ({
            type: "text";
            text: string;
        } | {
            type: "image_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "audio_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "video_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "inline_data";
            mimeType: string;
            data: string;
        } | {
            type: "file_uri";
            uri: string;
            mimeType?: string | undefined;
        })[];
    }[];
    system?: string | undefined;
    generation_config?: {
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        maxOutputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        candidateCount?: number | undefined;
        responseMimeType?: string | undefined;
    } | undefined;
    response_schema?: Record<string, any> | undefined;
    response_mime_type?: string | undefined;
    safety_settings?: {
        category: string;
        threshold: string;
    }[] | undefined;
    thinking?: {
        effort?: "low" | "medium" | "high" | undefined;
        budgetTokens?: number | undefined;
    } | undefined;
    tools?: {
        functionDeclarations: {
            name: string;
            description: string;
            parameters?: Record<string, any> | undefined;
        }[];
    }[] | undefined;
    tool_config?: Record<string, any> | undefined;
}, {
    messages: {
        role: "model" | "system" | "user" | "assistant";
        content: string | ({
            type: "text";
            text: string;
        } | {
            type: "image_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "audio_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "video_url";
            url: string;
            mimeType?: string | undefined;
        } | {
            type: "inline_data";
            mimeType: string;
            data: string;
        } | {
            type: "file_uri";
            uri: string;
            mimeType?: string | undefined;
        })[];
    }[];
    model?: string | undefined;
    system?: string | undefined;
    generation_config?: {
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        maxOutputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        candidateCount?: number | undefined;
        responseMimeType?: string | undefined;
    } | undefined;
    response_schema?: Record<string, any> | undefined;
    response_mime_type?: string | undefined;
    safety_settings?: {
        category: string;
        threshold: string;
    }[] | undefined;
    thinking?: {
        effort?: "low" | "medium" | "high" | undefined;
        budgetTokens?: number | undefined;
    } | undefined;
    tools?: {
        functionDeclarations: {
            name: string;
            description: string;
            parameters?: Record<string, any> | undefined;
        }[];
    }[] | undefined;
    tool_config?: Record<string, any> | undefined;
}>;
export type GeminiGenerateArgs = z.infer<typeof GeminiGenerateSchema>;
export type GeminiMessagesArgs = z.infer<typeof GeminiMessagesSchema>;
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;
export type ContentPart = z.infer<typeof ContentPartSchema>;
export type Message = z.infer<typeof MessageSchema>;
/**
 * Shared File metadata schema (Upload output, List output items)
 */
export declare const GeminiFileSchema: z.ZodObject<{
    fileId: z.ZodString;
    uri: z.ZodString;
    mimeType: z.ZodString;
    sizeBytes: z.ZodNumber;
    sha256: z.ZodString;
    createTime: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    mimeType: string;
    uri: string;
    fileId: string;
    sizeBytes: number;
    sha256: string;
    createTime: string;
    expiresAt?: string | undefined;
    displayName?: string | undefined;
}, {
    mimeType: string;
    uri: string;
    fileId: string;
    sizeBytes: number;
    sha256: string;
    createTime: string;
    expiresAt?: string | undefined;
    displayName?: string | undefined;
}>;
/**
 * gemini_upload_file
 */
export declare const GeminiUploadFileSchema: z.ZodObject<{
    source: z.ZodUnion<[z.ZodObject<{
        url: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        url: string;
    }, {
        url: string;
    }>, z.ZodEffects<z.ZodObject<{
        base64: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        base64: string;
    }, {
        base64: string;
    }>, {
        base64: string;
    }, {
        base64: string;
    }>]>;
    mimeType: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    dedupe: z.ZodDefault<z.ZodBoolean>;
    retention: z.ZodDefault<z.ZodUnion<[z.ZodObject<{
        type: z.ZodLiteral<"persistent">;
    }, "strip", z.ZodTypeAny, {
        type: "persistent";
    }, {
        type: "persistent";
    }>, z.ZodEffects<z.ZodObject<{
        type: z.ZodLiteral<"temporary">;
        ttlSeconds: z.ZodOptional<z.ZodNumber>;
        expiresAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "temporary";
        ttlSeconds?: number | undefined;
        expiresAt?: string | undefined;
    }, {
        type: "temporary";
        ttlSeconds?: number | undefined;
        expiresAt?: string | undefined;
    }>, {
        type: "temporary";
        ttlSeconds?: number | undefined;
        expiresAt?: string | undefined;
    }, {
        type: "temporary";
        ttlSeconds?: number | undefined;
        expiresAt?: string | undefined;
    }>]>>;
}, "strict", z.ZodTypeAny, {
    mimeType: string;
    source: {
        url: string;
    } | {
        base64: string;
    };
    dedupe: boolean;
    retention: {
        type: "persistent";
    } | {
        type: "temporary";
        ttlSeconds?: number | undefined;
        expiresAt?: string | undefined;
    };
    displayName?: string | undefined;
}, {
    mimeType: string;
    source: {
        url: string;
    } | {
        base64: string;
    };
    displayName?: string | undefined;
    dedupe?: boolean | undefined;
    retention?: {
        type: "persistent";
    } | {
        type: "temporary";
        ttlSeconds?: number | undefined;
        expiresAt?: string | undefined;
    } | undefined;
}>;
/**
 * gemini_list_files
 */
export declare const GeminiListFilesSchema: z.ZodObject<{
    pageSize: z.ZodDefault<z.ZodNumber>;
    pageToken: z.ZodOptional<z.ZodString>;
    filter: z.ZodEffects<z.ZodDefault<z.ZodObject<{
        mimeTypes: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        displayNameContains: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        createdAfter: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        createdBefore: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        expired: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        mimeTypes?: string[] | undefined;
        displayNameContains?: string | undefined;
        createdAfter?: string | undefined;
        createdBefore?: string | undefined;
        expired?: boolean | undefined;
    }, {
        mimeTypes?: string[] | undefined;
        displayNameContains?: string | undefined;
        createdAfter?: string | undefined;
        createdBefore?: string | undefined;
        expired?: boolean | undefined;
    }>>, {
        mimeTypes?: string[] | undefined;
        displayNameContains?: string | undefined;
        createdAfter?: string | undefined;
        createdBefore?: string | undefined;
        expired?: boolean | undefined;
    }, {
        mimeTypes?: string[] | undefined;
        displayNameContains?: string | undefined;
        createdAfter?: string | undefined;
        createdBefore?: string | undefined;
        expired?: boolean | undefined;
    } | undefined>;
}, "strict", z.ZodTypeAny, {
    filter: {
        mimeTypes?: string[] | undefined;
        displayNameContains?: string | undefined;
        createdAfter?: string | undefined;
        createdBefore?: string | undefined;
        expired?: boolean | undefined;
    };
    pageSize: number;
    pageToken?: string | undefined;
}, {
    filter?: {
        mimeTypes?: string[] | undefined;
        displayNameContains?: string | undefined;
        createdAfter?: string | undefined;
        createdBefore?: string | undefined;
        expired?: boolean | undefined;
    } | undefined;
    pageSize?: number | undefined;
    pageToken?: string | undefined;
}>;
/**
 * gemini_delete_file
 */
export declare const GeminiDeleteFileSchema: z.ZodObject<{
    fileId: z.ZodString;
    force: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    fileId: string;
    force: boolean;
}, {
    fileId: string;
    force?: boolean | undefined;
}>;
/**
 * gemini_embeddings
 */
export declare const GeminiEmbeddingsSchema: z.ZodObject<{
    texts: z.ZodArray<z.ZodString, "many">;
    model: z.ZodDefault<z.ZodString>;
    taskType: z.ZodDefault<z.ZodEnum<["unspecified", "classification", "clustering", "retrieval_query", "retrieval_document", "semantic_similarity", "question_answering"]>>;
    truncate: z.ZodDefault<z.ZodEnum<["NONE", "START", "END"]>>;
    outputDimensionality: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    model: string;
    texts: string[];
    taskType: "unspecified" | "classification" | "clustering" | "retrieval_query" | "retrieval_document" | "semantic_similarity" | "question_answering";
    truncate: "NONE" | "START" | "END";
    outputDimensionality?: number | undefined;
}, {
    texts: string[];
    model?: string | undefined;
    taskType?: "unspecified" | "classification" | "clustering" | "retrieval_query" | "retrieval_document" | "semantic_similarity" | "question_answering" | undefined;
    truncate?: "NONE" | "START" | "END" | undefined;
    outputDimensionality?: number | undefined;
}>;
/**
 * gemini_getdocs
 */
export declare const GeminiGetDocsSchema: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export type GeminiUploadFileArgs = z.infer<typeof GeminiUploadFileSchema>;
export type GeminiListFilesArgs = z.infer<typeof GeminiListFilesSchema>;
export type GeminiDeleteFileArgs = z.infer<typeof GeminiDeleteFileSchema>;
export type GeminiEmbeddingsArgs = z.infer<typeof GeminiEmbeddingsSchema>;
export type GeminiGetDocsArgs = z.infer<typeof GeminiGetDocsSchema>;
export type GeminiFileInfo = z.infer<typeof GeminiFileSchema>;
//# sourceMappingURL=schemas.d.ts.map