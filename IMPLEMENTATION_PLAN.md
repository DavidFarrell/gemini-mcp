# Gemini MCP Server Implementation Plan

## Analysis Summary

Based on the existing GPT-5 MCP server structure and Google Gemini 2.5 documentation, this plan outlines the implementation of a Gemini equivalent.

## Current GPT-5 MCP Structure Analysis

### File Structure
```
gpt5mcp/
├── servers/gpt5-server/
│   ├── src/
│   │   ├── index.ts       # MCP server setup, tool handlers
│   │   └── utils.ts       # API calling functions
│   ├── package.json       # Dependencies and scripts
│   └── tsconfig.json      # TypeScript config
```

### Key Components
- **Dependencies**: @modelcontextprotocol/sdk, dotenv, node-fetch, zod, zod-to-json-schema
- **Two main tools**:
  - `gpt5_generate`: Simple prompt input with text output
  - `gpt5_messages`: Conversation format with message array
- **API**: OpenAI GPT-5 endpoint (`https://api.openai.com/v1/responses`)
- **Features**: Reasoning effort, thinking parameters, structured Zod schemas

## Recommended Architecture for Gemini MCP

### Core Design Principles
1. **Keep the two-tool structure** but make messages tool multimodal
2. **Add provider adapter layer** to map generic inputs to Gemini's native API
3. **Parameter mapping utility** to translate OpenAI-style inputs to Gemini format
4. **Clean separation** between MCP interface and provider implementation

### Folder Structure
```
gemini-mcp/
├── servers/gemini-server/
│   ├── src/
│   │   ├── index.ts              # MCP server setup, tool handlers
│   │   ├── providers/
│   │   │   └── gemini.ts         # Gemini API client and request mapper
│   │   ├── utils/
│   │   │   └── media.ts          # Media handling for multimodal inputs
│   │   └── schemas.ts            # Zod schemas for tool inputs/outputs
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── README.md
```

## Implementation Details

### 1. Tool Design

#### Tool 1: `gemini_generate`
- **Purpose**: Simple text-only generation (convenience tool)
- **Input Schema**:
  ```typescript
  {
    prompt: string;
    model?: string; // default: "gemini-2.5-flash"
    system?: string;
    generation_config?: {
      temperature?: number;
      topP?: number;
      topK?: number;
      maxOutputTokens?: number;
      stopSequences?: string[];
    };
    response_schema?: object; // JSON Schema
    response_mime_type?: "application/json" | "text/plain";
    safety_settings?: any[];
    thinking?: { effort?: "low" | "medium" | "high"; budgetTokens?: number };
  }
  ```

#### Tool 2: `gemini_messages`
- **Purpose**: Multi-turn, multimodal generation with full capabilities
- **Input Schema**:
  ```typescript
  {
    model?: string;
    system?: string;
    messages: Array<{
      role: "user" | "assistant" | "model" | "system";
      content: string | Array<Part>;
    }>;
    generation_config?: GenerationConfig;
    safety_settings?: any[];
    response_schema?: object;
    response_mime_type?: string;
    tools?: { functionDeclarations: any[] };
    tool_config?: any;
    thinking?: { effort?: "low" | "medium" | "high"; budgetTokens?: number };
  }
  ```

#### Multimodal Part Types
```typescript
type Part = 
  | { type: "text"; text: string }
  | { type: "image_url" | "audio_url" | "video_url"; url: string; mimeType?: string }
  | { type: "inline_data"; data: string; mimeType: string } // base64
  | { type: "file_uri"; uri: string; mimeType?: string };
```

### 2. Provider Adapter (`src/providers/gemini.ts`)

#### Key Responsibilities
- Map generic tool inputs to Gemini request format
- Handle authentication via `x-goog-api-key` header
- Convert between OpenAI-style and Gemini-style parameters
- Process multimodal content (fetch URLs, convert to base64)
- Extract text from Gemini response format

#### API Mapping
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Authentication**: `x-goog-api-key: <GEMINI_API_KEY>`
- **Models**: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite

#### Request Format Conversion
```typescript
// OpenAI-style input → Gemini format
{
  model: "gemini-2.5-flash",
  system_instruction?: { text: string },
  contents: Array<{ role: "user" | "model", parts: GeminiPart[] }>,
  tools?: Array<{ functionDeclarations: any[] }>,
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  },
  responseSchema?: object,
  safetySettings?: any[],
  thinking?: any // evolving field
}
```

### 3. Media Handling (`src/utils/media.ts`)

#### Features
- Fetch media from URLs and convert to base64
- MIME type detection and validation
- Support for images, audio, and video
- Error handling for failed fetches

```typescript
export async function fetchAsInlineData(url: string, mimeHint?: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch media: ${url} ${response.status}`);
  
  const buffer = new Uint8Array(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") || mimeHint || "application/octet-stream";
  
  return { 
    data: Buffer.from(buffer).toString("base64"), 
    mimeType 
  };
}
```

### 4. Parameter Mapping

#### OpenAI → Gemini Translation
- **Messages**:
  - `role: "assistant"` → `role: "model"`
  - `role: "system"` → moved to `system_instruction`
  - String content → `parts: [{ text: content }]`
- **Parameters**:
  - `reasoning_effort` → `thinking.effort`
  - `max_tokens` → `maxOutputTokens`
  - `top_p` → `topP`
  - `stop` → `stopSequences`
- **Structured Output**:
  - JSON schema → `responseSchema` + `responseMimeType: "application/json"`
- **Tools**:
  - OpenAI function format → `tools.functionDeclarations`

### 5. Dependencies Update

#### Package.json Changes
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "0.6.0",
    "dotenv": "^16.3.1",
    "node-fetch": "^3.3.2", // or undici
    "zod": "^3.22.4",
    "zod-to-json-schema": "^3.22.1",
    "file-type": "^19.0.0" // optional: better MIME detection
  }
}
```

### 6. Environment Configuration

#### Required Environment Variables
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta # optional override
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. Set up project structure and dependencies
2. Implement Gemini API client (`src/providers/gemini.ts`)
3. Create basic request/response mapping
4. Implement text-only `gemini_generate` tool

### Phase 2: Multimodal Support
1. Add media handling utilities (`src/utils/media.ts`)
2. Implement full `gemini_messages` tool with multimodal support
3. Add support for images, audio, video inputs
4. Test with various media types

### Phase 3: Advanced Features
1. Add structured output support (JSON schema)
2. Implement thinking/reasoning parameter mapping
3. Add function calling/tools support
4. Error handling and retry logic

### Phase 4: Testing & Documentation
1. Create comprehensive test cases
2. Add usage examples and documentation
3. Performance optimization
4. Rate limiting and quota handling

## Key Considerations

### Authentication
- Use `x-goog-api-key` header for API authentication
- Support environment variable configuration
- Plan for future Vertex AI OAuth support

### Multimodal Handling
- Inline data for small media files (<20MB)
- File upload API for larger files
- Proper MIME type detection
- URL fetching with error handling

### Error Management
- Proper HTTP status code handling
- Rate limiting (429) with exponential backoff
- Quota exceeded handling
- Clear error messages for debugging

### Performance Optimization
- Context caching for repeated prompts
- Batch mode for bulk requests (50% cost reduction)
- Streaming support for real-time applications
- Right-sizing model selection (Pro vs Flash vs Flash-Lite)

## Migration from GPT-5 MCP

### Breaking Changes
- Different model names (gemini-2.5-* vs gpt-5)
- Different parameter names (generationConfig vs direct params)
- Multimodal content structure
- Different function calling format

### Compatibility Layer
- Map reasoning_effort to thinking configuration
- Translate OpenAI message format to Gemini contents
- Convert function definitions to Gemini tool declarations
- Handle response format differences

## Success Criteria

1. **Functional Parity**: Both tools work with text input/output
2. **Multimodal Support**: Images, audio, video inputs work correctly
3. **Structured Output**: JSON schema responses work as expected
4. **Tool Integration**: Function calling passes through correctly
5. **Error Handling**: Robust error handling and user feedback
6. **Documentation**: Clear usage examples and API documentation

This implementation plan provides a clear roadmap for creating a robust Gemini MCP server that maintains the simplicity of the two-tool design while adding powerful multimodal capabilities and proper provider abstraction.