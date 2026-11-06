import type { Config } from "./config.js";

export interface HistoryMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** In-memory conversation history store, keyed by "userId:channelId". */
export class ConversationHistory {
  private histories = new Map<string, HistoryMessage[]>();
  private readonly maxTokens: number;
  private readonly maxMessages: number;

  constructor(config: Config) {
    // Rough token estimation: ~4 chars per token
    this.maxTokens = config.openaiMaxTokens ?? 4096;
    this.maxMessages = 20; // Cap at 20 messages to prevent unbounded growth
  }

  /** Get the history key for a user/channel pair. */
  private getKey(userId: string, channelId: string): string {
    return `${userId}:${channelId}`;
  }

  /** Add a message to history. */
  add(userId: string, channelId: string, message: HistoryMessage): void {
    const key = this.getKey(userId, channelId);
    const history = this.histories.get(key) ?? [];
    history.push(message);
    this.trimHistory(history);
    this.histories.set(key, history);
  }

  /** Get history for a user/channel pair. */
  get(userId: string, channelId: string): HistoryMessage[] {
    const key = this.getKey(userId, channelId);
    return this.histories.get(key) ?? [];
  }

  /** Clear history for a user/channel pair. */
  clear(userId: string, channelId: string): void {
    const key = this.getKey(userId, channelId);
    this.histories.delete(key);
  }

  /** Trim history to stay within token/message limits. */
  private trimHistory(history: HistoryMessage[]): void {
    // First, trim by message count
    while (history.length > this.maxMessages) {
      history.shift();
    }

    // Then, trim by estimated token count (rough approximation)
    let totalChars = 0;
    for (const msg of history) {
      totalChars += msg.content.length;
    }
    let estimatedTokens = totalChars / 4;

    while (estimatedTokens > this.maxTokens && history.length > 1) {
      const removed = history.shift();
      if (removed) {
        estimatedTokens -= removed.content.length / 4;
      }
    }
  }
}

/** Create a conversation history instance. */
export function createConversationHistory(config: Config): ConversationHistory {
  return new ConversationHistory(config);
}