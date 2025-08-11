#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Import our schemas and client
import { 
  GeminiGenerateSchema, 
  GeminiMessagesSchema,
  GeminiUploadFileSchema,
  GeminiListFilesSchema,
  GeminiDeleteFileSchema,
  GeminiEmbeddingsSchema,
  GeminiGetDocsSchema,
  type GeminiGenerateArgs,
  type GeminiMessagesArgs,
  type GeminiUploadFileArgs,
  type GeminiListFilesArgs,
  type GeminiDeleteFileArgs,
  type GeminiEmbeddingsArgs,
  type GeminiGetDocsArgs,
  type ContentPart
} from './schemas.js';
import { 
  GeminiClient, 
  extractText, 
  extractUsage, 
  extractFunctionCalls,
  isBlocked,
  getBlockReason,
  type GeminiRequest,
  type GeminiContent,
  type GeminiPart
} from './providers/gemini.js';
import { fetchAsInlineData, validateMimeType, validateDataSize } from './utils/media.js';
import { observability } from './utils/observability.js';
import fs from 'fs/promises';

// Initialize environment - try multiple locations
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try .env in current directory first, then parent directories
const envPaths = [
  '.env',
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (result.parsed || process.env.GEMINI_API_KEY) {
      console.error("Environment loaded from:", envPath);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.error("Could not find .env file in any of these locations:", envPaths);
}

// Request mapping utilities
async function mapContentToGeminiParts(content: string | ContentPart[]): Promise<GeminiPart[]> {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  const parts: GeminiPart[] = [];
  
  for (const part of content) {
    switch (part.type) {
      case 'text':
        parts.push({ text: part.text });
        break;
        
      case 'image_url':
      case 'audio_url':
      case 'video_url':
        try {
          const inlineData = await fetchAsInlineData(part.url, part.mimeType);
          
          if (!validateDataSize(inlineData.data)) {
            throw new Error(`Media file too large: ${part.url}`);
          }
          
          const mediaType = part.type.replace('_url', '') as 'image' | 'audio' | 'video';
          if (!validateMimeType(inlineData.mimeType, mediaType)) {
            console.error(`Warning: MIME type ${inlineData.mimeType} may not be supported for ${mediaType}`);
          }
          
          parts.push({ inlineData });
        } catch (error) {
          console.error(`Failed to fetch media from ${part.url}:`, error);
          // Add as text error instead of failing completely
          parts.push({ text: `[Error loading media from ${part.url}: ${error}]` });
        }
        break;
        
      case 'inline_data':
        if (!validateDataSize(part.data)) {
          throw new Error("Inline data too large");
        }
        parts.push({ inlineData: { data: part.data, mimeType: part.mimeType } });
        break;
        
      case 'file_uri':
        parts.push({ fileData: { fileUri: part.uri, mimeType: part.mimeType } });
        break;
        
      default:
        console.error(`Unknown content part type: ${(part as any).type}`);
    }
  }
  
  return parts;
}

async function mapMessagesToGeminiContents(
  messages: GeminiMessagesArgs['messages'], 
  systemInstruction?: string
): Promise<{ contents: GeminiContent[], system_instruction?: { text: string } }> {
  const contents: GeminiContent[] = [];
  const systemMessages: string[] = [];
  
  // Add initial system instruction if provided
  if (systemInstruction) {
    systemMessages.push(systemInstruction);
  }

  for (const message of messages) {
    // Handle system messages by accumulating them with delimiters
    if (message.role === 'system') {
      const messageText = typeof message.content === 'string' 
        ? message.content 
        : message.content.find(p => p.type === 'text')?.text || '';
      if (messageText.trim()) {
        systemMessages.push(messageText.trim());
      }
      continue;
    }

    // Convert role: assistant -> model for Gemini
    const role = message.role === 'assistant' ? 'model' : message.role as 'user' | 'model';
    
    const parts = await mapContentToGeminiParts(message.content);
    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }

  // Merge all system messages with double newline delimiters
  const finalSystemText = systemMessages.length > 0 
    ? systemMessages.join('\n\n') 
    : undefined;

  return {
    contents,
    system_instruction: finalSystemText ? { text: finalSystemText } : undefined
  };
}

// Main function
async function main() {
  // Check if GEMINI_API_KEY is set
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY environment variable is not set');
    console.error('Please set it in .env file or as an environment variable');
    process.exit(1);
  }

  // Create MCP server
  const server = new Server({
    name: "gemini-server",
    version: "0.1.0"
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Set up error handling
  server.onerror = (error) => {
    console.error("MCP Server Error:", error);
  };

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  // Set up tool handlers
  server.setRequestHandler(
    ListToolsRequestSchema,
    async () => {
      console.error("Handling ListToolsRequest");
      return {
        tools: [
          {
            name: "gemini_generate",
            description: "Generate text using Google Gemini 2.5 API with a simple input prompt",
            inputSchema: zodToJsonSchema(GeminiGenerateSchema),
          },
          {
            name: "gemini_messages",
            description: "Generate text using Gemini with structured conversation messages and multimodal support",
            inputSchema: zodToJsonSchema(GeminiMessagesSchema),
          },
          {
            name: "gemini_upload_file",
            description: "Upload a file to Gemini Files API from a URL or base64 source for use in subsequent requests",
            inputSchema: zodToJsonSchema(GeminiUploadFileSchema),
          },
          {
            name: "gemini_list_files",
            description: "List files uploaded to Gemini Files API with pagination and filtering support",
            inputSchema: zodToJsonSchema(GeminiListFilesSchema),
          },
          {
            name: "gemini_delete_file",
            description: "Delete a file from Gemini Files API by file ID",
            inputSchema: zodToJsonSchema(GeminiDeleteFileSchema),
          },
          {
            name: "gemini_embeddings",
            description: "Generate embedding vectors for input texts using Gemini's embeddings API",
            inputSchema: zodToJsonSchema(GeminiEmbeddingsSchema),
          },
          {
            name: "gemini_getdocs",
            description: "Return the complete Gemini API documentation for reference",
            inputSchema: zodToJsonSchema(GeminiGetDocsSchema),
          },
        ]
      };
    }
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request) => {
      console.error("Handling CallToolRequest:", JSON.stringify(request.params));
      
      try {
        const client = new GeminiClient();

        switch (request.params.name) {
          case "gemini_generate": {
            const startTime = Date.now();
            const args = GeminiGenerateSchema.parse(request.params.arguments) as GeminiGenerateArgs;
            const model = args.model || "gemini-2.5-flash";
            console.error(`Gemini Generate: "${args.prompt.substring(0, 100)}..."`);
            
            // Generate request fingerprint for observability
            const fingerprint = observability.generateFingerprint("gemini_generate", model, args);
            
            try {
              // Build Gemini request
              const geminiRequest: GeminiRequest = {
                model,
                system_instruction: args.system ? { text: args.system } : undefined,
                contents: [{ role: "user", parts: [{ text: args.prompt }] }],
                generationConfig: {
                  ...args.generation_config,
                  ...(args.response_schema ? { 
                    responseMimeType: args.response_mime_type || "application/json" 
                  } : {})
                },
                responseSchema: args.response_schema,
                safetySettings: args.safety_settings,
                thinking: args.thinking
              };

              const response = await client.generateContent(geminiRequest);
              const latency_ms = Date.now() - startTime;
              
              // Check if response was blocked
              if (isBlocked(response)) {
                const blockReason = getBlockReason(response);
                observability.recordEvent({
                  tool_name: "gemini_generate",
                  model,
                  fingerprint,
                  latency_ms,
                  error: `Content blocked: ${blockReason}`
                });
                return {
                  content: [{
                    type: "text",
                    text: `Content generation was blocked: ${blockReason}`
                  }],
                  isError: true
                };
              }
              
              const text = extractText(response);
              const usage = extractUsage(response);
              
              // Record observability event
              if (usage) {
                const cost = observability.calculateCost(usage, model);
                observability.recordEvent({
                  tool_name: "gemini_generate",
                  model,
                  usage,
                  cost,
                  fingerprint,
                  latency_ms
                });
              }
              
              let responseText = text;
              if (usage) {
                responseText += `\n\n**Usage:** ${usage.prompt_tokens} prompt tokens, ${usage.completion_tokens} completion tokens, ${usage.total_tokens} total tokens`;
              }
              
              return {
                content: [{
                  type: "text",
                  text: responseText
                }]
              };
              
            } catch (error) {
              const latency_ms = Date.now() - startTime;
              observability.recordEvent({
                tool_name: "gemini_generate",
                model,
                fingerprint,
                latency_ms,
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            }
          }
          
          case "gemini_messages": {
            const startTime = Date.now();
            const args = GeminiMessagesSchema.parse(request.params.arguments) as GeminiMessagesArgs;
            const model = args.model || "gemini-2.5-flash";
            console.error(`Gemini Messages: ${args.messages.length} messages`);
            
            // Generate request fingerprint for observability
            const fingerprint = observability.generateFingerprint("gemini_messages", model, args);
            
            try {
              // Map messages to Gemini format
              const { contents, system_instruction } = await mapMessagesToGeminiContents(
                args.messages,
                args.system
              );

              // Build Gemini request
              const geminiRequest: GeminiRequest = {
                model,
                system_instruction,
                contents,
                tools: args.tools,
                toolConfig: args.tool_config,
                generationConfig: {
                  ...args.generation_config,
                  ...(args.response_schema ? { 
                    responseMimeType: args.response_mime_type || "application/json" 
                  } : {})
                },
                responseSchema: args.response_schema,
                safetySettings: args.safety_settings,
                thinking: args.thinking
              };

              const response = await client.generateContent(geminiRequest);
              const latency_ms = Date.now() - startTime;
              
              // Check if response was blocked
              if (isBlocked(response)) {
                const blockReason = getBlockReason(response);
                observability.recordEvent({
                  tool_name: "gemini_messages",
                  model,
                  fingerprint,
                  latency_ms,
                  error: `Content blocked: ${blockReason}`
                });
                return {
                  content: [{
                    type: "text",
                    text: `Content generation was blocked: ${blockReason}`
                  }],
                  isError: true
                };
              }
              
              const text = extractText(response);
              const usage = extractUsage(response);
              const functionCalls = extractFunctionCalls(response);
              
              // Record observability event
              if (usage) {
                const cost = observability.calculateCost(usage, model);
                observability.recordEvent({
                  tool_name: "gemini_messages",
                  model,
                  usage,
                  cost,
                  fingerprint,
                  latency_ms
                });
              }
              
              let responseText = text;
              if (functionCalls.length > 0) {
                responseText += `\n\n**Function Calls:** ${JSON.stringify(functionCalls, null, 2)}`;
              }
              if (usage) {
                responseText += `\n\n**Usage:** ${usage.prompt_tokens} prompt tokens, ${usage.completion_tokens} completion tokens, ${usage.total_tokens} total tokens`;
              }
              
              return {
                content: [{
                  type: "text",
                  text: responseText
                }]
              };
              
            } catch (error) {
              const latency_ms = Date.now() - startTime;
              observability.recordEvent({
                tool_name: "gemini_messages",
                model,
                fingerprint,
                latency_ms,
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            }
          }

          case "gemini_upload_file": {
            const args = GeminiUploadFileSchema.parse(request.params.arguments) as GeminiUploadFileArgs;
            console.error(`Gemini Upload File: ${args.displayName || 'unnamed file'}`);
            
            try {
              let data: Buffer;
              let finalMimeType: string;
              
              // Handle URL or base64 source
              if ('url' in args.source) {
                const fetched = await fetchAsInlineData(args.source.url, args.mimeType);
                data = Buffer.from(fetched.data, 'base64');
                finalMimeType = fetched.mimeType || args.mimeType;
              } else if ('base64' in args.source) {
                data = Buffer.from(args.source.base64, 'base64');
                finalMimeType = args.mimeType;
              } else {
                throw new Error("Invalid source: must specify either url or base64");
              }
              
              const uploadResult = await client.uploadFile({
                data,
                mimeType: finalMimeType,
                displayName: args.displayName
              });
              
              const responseText = JSON.stringify({
                fileId: uploadResult.name?.replace('files/', '') || 'unknown',
                uri: uploadResult.uri || '',
                mimeType: uploadResult.mime_type || finalMimeType,
                sizeBytes: parseInt(uploadResult.size_bytes || '0'),
                sha256: uploadResult.sha256_hash || '',
                createTime: uploadResult.create_time || new Date().toISOString(),
                displayName: uploadResult.display_name || args.displayName
              }, null, 2);
              
              return {
                content: [{
                  type: "text",
                  text: responseText
                }]
              };
            } catch (error) {
              return {
                content: [{
                  type: "text",
                  text: `Upload failed: ${error instanceof Error ? error.message : String(error)}`
                }],
                isError: true
              };
            }
          }

          case "gemini_list_files": {
            const args = GeminiListFilesSchema.parse(request.params.arguments) as GeminiListFilesArgs;
            console.error(`Gemini List Files: pageSize=${args.pageSize}`);
            
            try {
              const result = await client.listFiles({
                pageSize: args.pageSize,
                pageToken: args.pageToken
              });
              
              const files = (result.files || []).map(file => ({
                fileId: file.name?.replace('files/', '') || 'unknown',
                uri: file.uri || '',
                mimeType: file.mime_type || '',
                sizeBytes: parseInt(file.size_bytes || '0'),
                sha256: file.sha256_hash || '',
                createTime: file.create_time || '',
                displayName: file.display_name || ''
              }));
              
              const responseText = JSON.stringify({
                files,
                nextPageToken: result.next_page_token || null
              }, null, 2);
              
              return {
                content: [{
                  type: "text",
                  text: responseText
                }]
              };
            } catch (error) {
              return {
                content: [{
                  type: "text",
                  text: `List files failed: ${error instanceof Error ? error.message : String(error)}`
                }],
                isError: true
              };
            }
          }

          case "gemini_delete_file": {
            const args = GeminiDeleteFileSchema.parse(request.params.arguments) as GeminiDeleteFileArgs;
            console.error(`Gemini Delete File: ${args.fileId}`);
            
            try {
              await client.deleteFile(args.fileId);
              
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ deleted: true, fileId: args.fileId }, null, 2)
                }]
              };
            } catch (error) {
              return {
                content: [{
                  type: "text",
                  text: `Delete file failed: ${error instanceof Error ? error.message : String(error)}`
                }],
                isError: true
              };
            }
          }

          case "gemini_embeddings": {
            const startTime = Date.now();
            const args = GeminiEmbeddingsSchema.parse(request.params.arguments) as GeminiEmbeddingsArgs;
            const model = args.model || "text-embedding-004";
            console.error(`Gemini Embeddings: ${args.texts.length} texts, model=${model}`);
            
            // Generate request fingerprint for observability
            const fingerprint = observability.generateFingerprint("gemini_embeddings", model, args);
            
            try {
              const result = await client.generateEmbeddings({
                model,
                texts: args.texts,
                taskType: args.taskType === 'unspecified' ? undefined : 
                          args.taskType === 'retrieval_query' ? 'RETRIEVAL_QUERY' :
                          args.taskType === 'retrieval_document' ? 'RETRIEVAL_DOCUMENT' :
                          args.taskType === 'semantic_similarity' ? 'SEMANTIC_SIMILARITY' :
                          args.taskType === 'classification' ? 'CLASSIFICATION' :
                          args.taskType === 'clustering' ? 'CLUSTERING' :
                          args.taskType === 'question_answering' ? 'QUESTION_ANSWERING' :
                          undefined,
                truncate: args.truncate !== 'NONE',
                outputDimensionality: args.outputDimensionality
              });
              
              const latency_ms = Date.now() - startTime;
              const embeddings = (result.embeddings || []).map((embedding, index) => ({
                index,
                values: embedding.values || []
              }));
              
              // Estimate token usage for embeddings (approximate based on text length)
              const estimatedTokens = args.texts.reduce((total, text) => total + Math.ceil(text.length / 4), 0);
              const usage = {
                prompt_tokens: estimatedTokens,
                completion_tokens: 0,
                total_tokens: estimatedTokens
              };
              
              // Record observability event
              const cost = observability.calculateCost(usage, model);
              observability.recordEvent({
                tool_name: "gemini_embeddings",
                model,
                usage,
                cost,
                fingerprint,
                latency_ms,
                batch_size: args.texts.length
              });
              
              const responseText = JSON.stringify({ embeddings }, null, 2);
              
              return {
                content: [{
                  type: "text",
                  text: responseText
                }]
              };
            } catch (error) {
              const latency_ms = Date.now() - startTime;
              observability.recordEvent({
                tool_name: "gemini_embeddings",
                model,
                fingerprint,
                latency_ms,
                batch_size: args.texts.length,
                error: error instanceof Error ? error.message : String(error)
              });
              return {
                content: [{
                  type: "text",
                  text: `Generate embeddings failed: ${error instanceof Error ? error.message : String(error)}`
                }],
                isError: true
              };
            }
          }

          case "gemini_getdocs": {
            const args = GeminiGetDocsSchema.parse(request.params.arguments) as GeminiGetDocsArgs;
            console.error("Gemini Get Docs: Retrieving documentation");
            
            try {
              // Read the documentation file
              const docsPath = path.join(__dirname, '../docs/gemini.md');
              const docsContent = await fs.readFile(docsPath, 'utf8');
              
              return {
                content: [{
                  type: "text",
                  text: docsContent
                }]
              };
            } catch (error) {
              return {
                content: [{
                  type: "text",
                  text: `Failed to read documentation: ${error instanceof Error ? error.message : String(error)}`
                }],
                isError: true
              };
            }
          }
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error("ERROR during Gemini API call:", error);
        
        return {
          content: [{
            type: "text",
            text: `Gemini API error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Start the server
  console.error("Starting Gemini MCP server");
  
  try {
    const transport = new StdioServerTransport();
    console.error("StdioServerTransport created");
    
    await server.connect(transport);
    console.error("Server connected to transport");
    
    console.error("Gemini MCP server running on stdio");
  } catch (error) {
    console.error("ERROR starting server:", error);
    throw error;
  }
}

// Main execution
main().catch(error => {
  console.error("Server runtime error:", error);
  process.exit(1);
});