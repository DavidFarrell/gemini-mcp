/**
 * Observability module for Gemini MCP Server
 * Provides token accounting, cost estimation, and request fingerprinting
 */

// Gemini pricing (per 1M tokens) - update as pricing changes
export const GEMINI_PRICING = {
  'gemini-2.5-flash': {
    input: 0.05,   // $0.05 per 1M input tokens  
    output: 0.20   // $0.20 per 1M output tokens
  },
  'gemini-2.5-pro': {
    input: 0.50,   // $0.50 per 1M input tokens
    output: 2.00   // $2.00 per 1M output tokens
  },
  'text-embedding-004': {
    input: 0.025,  // $0.025 per 1M tokens
    output: 0      // No output cost for embeddings
  }
} as const;

export interface UsageMetrics {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface CostEstimate {
  input_cost: number;
  output_cost: number;
  total_cost: number;
  currency: 'USD';
}

export interface RequestFingerprint {
  model: string;
  tool_name: string;
  has_system_instruction: boolean;
  has_tools: boolean;
  has_files: boolean;
  content_types: string[];
  message_count?: number;
  file_count?: number;
  estimated_static_ratio: number; // 0-1, how much of the request is likely static/cacheable
}

export interface ObservabilityEvent {
  timestamp: string;
  tool_name: string;
  model: string;
  usage?: UsageMetrics;
  cost?: CostEstimate;
  fingerprint: RequestFingerprint;
  latency_ms?: number;
  cache_hit?: boolean;
  cache_key?: string;
  error?: string;
  batch_size?: number;
}

export class ObservabilityCollector {
  private events: ObservabilityEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events in memory

  /**
   * Calculate cost estimate based on usage and model
   */
  calculateCost(usage: UsageMetrics, model: string): CostEstimate {
    // Normalize model name for pricing lookup
    const normalizedModel = model.includes('gemini-2.5-flash') ? 'gemini-2.5-flash' :
                           model.includes('gemini-2.5-pro') ? 'gemini-2.5-pro' :
                           model.includes('text-embedding') ? 'text-embedding-004' :
                           'gemini-2.5-flash'; // fallback

    const pricing = GEMINI_PRICING[normalizedModel] || GEMINI_PRICING['gemini-2.5-flash'];
    
    const input_cost = (usage.prompt_tokens / 1000000) * pricing.input;
    const output_cost = (usage.completion_tokens / 1000000) * pricing.output;
    
    return {
      input_cost,
      output_cost,
      total_cost: input_cost + output_cost,
      currency: 'USD'
    };
  }

  /**
   * Generate request fingerprint for caching and analysis
   */
  generateFingerprint(
    toolName: string,
    model: string,
    args: any
  ): RequestFingerprint {
    const fingerprint: RequestFingerprint = {
      model,
      tool_name: toolName,
      has_system_instruction: false,
      has_tools: false,
      has_files: false,
      content_types: [],
      estimated_static_ratio: 0
    };

    // Analyze based on tool type
    if (toolName === 'gemini_generate') {
      fingerprint.has_system_instruction = !!args.system;
      fingerprint.content_types = ['text'];
      fingerprint.estimated_static_ratio = args.system ? 0.3 : 0.1; // System instruction is static
    } else if (toolName === 'gemini_messages') {
      fingerprint.has_system_instruction = !!args.system;
      fingerprint.message_count = args.messages?.length || 0;
      fingerprint.has_tools = !!(args.tools && args.tools.length > 0);
      
      // Analyze message content types
      const contentTypes = new Set<string>();
      let fileCount = 0;
      
      if (args.messages) {
        for (const msg of args.messages) {
          if (typeof msg.content === 'string') {
            contentTypes.add('text');
          } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'text') contentTypes.add('text');
              else if (part.type === 'image_url') {
                contentTypes.add('image');
                fileCount++;
              }
              // Add other content types as needed
            }
          }
        }
      }
      
      fingerprint.content_types = Array.from(contentTypes);
      fingerprint.file_count = fileCount;
      fingerprint.has_files = fileCount > 0;
      
      // Estimate static ratio: system + tools are static, recent messages are dynamic
      let staticRatio = 0;
      if (fingerprint.has_system_instruction) staticRatio += 0.2;
      if (fingerprint.has_tools) staticRatio += 0.3;
      if ((fingerprint.message_count || 0) > 3) staticRatio += 0.3; // Older messages become static
      fingerprint.estimated_static_ratio = Math.min(staticRatio, 0.8);
      
    } else if (toolName === 'gemini_embeddings') {
      fingerprint.content_types = ['text'];
      fingerprint.estimated_static_ratio = 0.9; // Text for embedding is usually static
    } else if (toolName.startsWith('gemini_upload') || toolName.startsWith('gemini_list') || toolName.startsWith('gemini_delete')) {
      fingerprint.content_types = ['file'];
      fingerprint.estimated_static_ratio = 0.1; // File operations are usually dynamic
    }

    return fingerprint;
  }

  /**
   * Record an observability event
   */
  recordEvent(event: Partial<ObservabilityEvent>): void {
    const completeEvent: ObservabilityEvent = {
      timestamp: new Date().toISOString(),
      tool_name: event.tool_name || 'unknown',
      model: event.model || 'unknown',
      fingerprint: event.fingerprint || {
        model: event.model || 'unknown',
        tool_name: event.tool_name || 'unknown',
        has_system_instruction: false,
        has_tools: false,
        has_files: false,
        content_types: [],
        estimated_static_ratio: 0
      },
      ...event
    };

    this.events.push(completeEvent);
    
    // Keep only last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log important events
    if (completeEvent.usage && completeEvent.cost) {
      console.log(`[Observability] ${completeEvent.tool_name} (${completeEvent.model}): ` +
                  `${completeEvent.usage.prompt_tokens} prompt + ${completeEvent.usage.completion_tokens} completion = ` +
                  `${completeEvent.usage.total_tokens} tokens, $${completeEvent.cost.total_cost.toFixed(6)}`);
    }
  }

  /**
   * Get metrics summary
   */
  getMetrics(hours = 24): {
    total_events: number;
    total_tokens: number;
    total_cost: number;
    avg_latency_ms: number;
    cache_hit_rate: number;
    top_models: Array<{ model: string; count: number; cost: number }>;
    top_tools: Array<{ tool: string; count: number; cost: number }>;
  } {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => new Date(e.timestamp) > cutoff);

    const totals = recentEvents.reduce((acc, event) => {
      acc.events++;
      if (event.usage) acc.tokens += event.usage.total_tokens;
      if (event.cost) acc.cost += event.cost.total_cost;
      if (event.latency_ms) {
        acc.latency_sum += event.latency_ms;
        acc.latency_count++;
      }
      if (event.cache_hit !== undefined) {
        acc.cache_total++;
        if (event.cache_hit) acc.cache_hits++;
      }
      return acc;
    }, { events: 0, tokens: 0, cost: 0, latency_sum: 0, latency_count: 0, cache_hits: 0, cache_total: 0 });

    // Aggregate by model and tool
    const modelStats = new Map<string, { count: number; cost: number }>();
    const toolStats = new Map<string, { count: number; cost: number }>();

    for (const event of recentEvents) {
      // Model stats
      if (!modelStats.has(event.model)) {
        modelStats.set(event.model, { count: 0, cost: 0 });
      }
      const modelStat = modelStats.get(event.model)!;
      modelStat.count++;
      if (event.cost) modelStat.cost += event.cost.total_cost;

      // Tool stats
      if (!toolStats.has(event.tool_name)) {
        toolStats.set(event.tool_name, { count: 0, cost: 0 });
      }
      const toolStat = toolStats.get(event.tool_name)!;
      toolStat.count++;
      if (event.cost) toolStat.cost += event.cost.total_cost;
    }

    return {
      total_events: totals.events,
      total_tokens: totals.tokens,
      total_cost: totals.cost,
      avg_latency_ms: totals.latency_count > 0 ? totals.latency_sum / totals.latency_count : 0,
      cache_hit_rate: totals.cache_total > 0 ? totals.cache_hits / totals.cache_total : 0,
      top_models: Array.from(modelStats.entries())
        .map(([model, stats]) => ({ model, ...stats }))
        .sort((a, b) => b.cost - a.cost),
      top_tools: Array.from(toolStats.entries())
        .map(([tool, stats]) => ({ tool, ...stats }))
        .sort((a, b) => b.cost - a.cost)
    };
  }

  /**
   * Get recent events for debugging
   */
  getRecentEvents(limit = 10): ObservabilityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear all events (for testing)
   */
  clear(): void {
    this.events = [];
  }
}

// Global singleton
export const observability = new ObservabilityCollector();