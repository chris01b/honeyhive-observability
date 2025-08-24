export interface LlmResponseRecord {
    id?: string;
    timestamp?: string; // ISO 8601
    response_time_ms?: number;
    model?: string;
    status?: "success" | "error" | "timeout";
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost_usd?: number;
    temperature?: number;
    max_tokens?: number;
    prompt_template?: string;
    output?: string;
    evaluation_metrics?: {
      relevance_score?: number;
      factual_accuracy?: number;
      coherence_score?: number;
      response_quality?: number;
    };
    error?: {
      type?: string;
      message?: string;
    } | null;
    [k: string]: unknown;
  }
