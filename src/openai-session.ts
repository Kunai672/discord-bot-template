import OpenAI from "openai";
import type { Config } from "./config.js";

export type RequestStatus = "idle" | "processing";

export interface OpenAISession {
  /** Current request status. */
  status: RequestStatus;
  /** Send a chat completion request with streaming. */
  chat(params: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    onChunk: (chunk: string) => void;
    onError: (error: Error) => void;
    onComplete: () => void;
  }): void;
  /** Abort any in-flight request. */
  abort(): void;
}

/** Create an OpenAI-compatible API session. */
export function createOpenAISession(config: Config): OpenAISession {
  const client = new OpenAI({
    baseURL: config.openaiBaseUrl,
    apiKey: config.openaiApiKey,
  });

  let currentController: AbortController | null = null;
  let status: RequestStatus = "idle";

  return {
    get status() {
      return status;
    },

    chat({ messages, onChunk, onError, onComplete }) {
      if (status === "processing") {
        onError(new Error("A request is already in progress"));
        return;
      }

      currentController = new AbortController();
      status = "processing";

      const systemPrompt = config.openaiSystemPrompt
        ? [{ role: "system" as const, content: config.openaiSystemPrompt }]
        : [];

      const allMessages = [...systemPrompt, ...messages];

      (async () => {
        try {
          const stream = await client.chat.completions.create({
            model: config.openaiModel,
            messages: allMessages,
            max_tokens: config.openaiMaxTokens,
            temperature: config.openaiTemperature,
            stream: true,
            stream_options: { include_usage: true },
          }, {
            signal: currentController.signal,
          });

          for await (const chunk of stream) {
            if (currentController.signal.aborted) break;

            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          }

          if (!currentController.signal.aborted) {
            onComplete();
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            // Request was aborted, don't treat as error
          } else if (error instanceof Error) {
            onError(error);
          } else {
            onError(new Error(String(error)));
          }
        } finally {
          status = "idle";
          currentController = null;
        }
      })();
    },

    abort() {
      if (currentController && status === "processing") {
        currentController.abort();
        status = "idle";
        currentController = null;
      }
    },
  };
}