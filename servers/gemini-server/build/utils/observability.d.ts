/**
 * Observability module for Gemini MCP Server
 * Provides token accounting, cost estimation, and request fingerprinting
 */
export declare const GEMINI_PRICING: {
    readonly 'gemini-2.5-flash': {
        readonly input: 0.05;
        readonly output: 0.2;
    };
    readonly 'gemini-2.5-pro': {
        readonly input: 0.5;
        readonly output: 2;
    };
    readonly 'text-embedding-004': {
        readonly input: 0.025;
        readonly output: 0;
    };
};
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
    estimated_static_ratio: number;
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
export declare class ObservabilityCollector {
    private events;
    private maxEvents;
    /**
     * Calculate cost estimate based on usage and model
     */
    calculateCost(usage: UsageMetrics, model: string): CostEstimate;
    /**
     * Generate request fingerprint for caching and analysis
     */
    generateFingerprint(toolName: string, model: string, args: any): RequestFingerprint;
    /**
     * Record an observability event
     */
    recordEvent(event: Partial<ObservabilityEvent>): void;
    /**
     * Get metrics summary
     */
    getMetrics(hours?: number): {
        total_events: number;
        total_tokens: number;
        total_cost: number;
        avg_latency_ms: number;
        cache_hit_rate: number;
        top_models: Array<{
            model: string;
            count: number;
            cost: number;
        }>;
        top_tools: Array<{
            tool: string;
            count: number;
            cost: number;
        }>;
    };
    /**
     * Get recent events for debugging
     */
    getRecentEvents(limit?: number): ObservabilityEvent[];
    /**
     * Clear all events (for testing)
     */
    clear(): void;
}
export declare const observability: ObservabilityCollector;
//# sourceMappingURL=observability.d.ts.map