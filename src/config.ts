import "dotenv/config";

export interface Config {
  /** Bot token (required). */
  token: string;
  /** Discord user ID of the bot owner. Optional; the command gate fails closed when unset. */
  ownerId: string | undefined;
  /** Guild ID for guild-scoped command registration. Optional; falls back to global registration. */
  guildId: string | undefined;
  /** Channel ID for dedicated chat channel. Optional; if set, bot responds to all messages in this channel without mentions. */
  channelId: string | undefined;

  /** OpenAI-compatible API base URL (required). */
  openaiBaseUrl: string;
  /** OpenAI API key (required). */
  openaiApiKey: string;
  /** Model to use (required). */
  openaiModel: string;
  /** Maximum tokens per response (optional). */
  openaiMaxTokens: number | undefined;
  /** Temperature (optional). */
  openaiTemperature: number | undefined;
  /** System prompt (optional). */
  openaiSystemPrompt: string | undefined;
  /** Rate limit: requests per minute per user (optional, default 30). */
  rateLimitRpm: number;
}

function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  return raw && raw.trim() !== "" ? raw.trim() : undefined;
}

function readEnvNumber(name: string): number | undefined {
  const raw = readEnv(name);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const token = env.DISCORD_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Missing DISCORD_TOKEN. Copy .env.example to .env and set your bot token.",
    );
  }

  const openaiBaseUrl = env.OPENAI_BASE_URL?.trim();
  if (!openaiBaseUrl) {
    throw new Error(
      "Missing OPENAI_BASE_URL. Set your OpenAI-compatible API endpoint (e.g., https://api.openai.com/v1 or http://localhost:8787/v1).",
    );
  }

  const openaiApiKey = env.OPENAI_API_KEY?.trim();
  if (!openaiApiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Set your API key.",
    );
  }

  const openaiModel = env.OPENAI_MODEL?.trim();
  if (!openaiModel) {
    throw new Error(
      "Missing OPENAI_MODEL. Set the model to use (e.g., gpt-4o, gpt-4o-mini, or your custom model name).",
    );
  }

  const rateLimitRpm = readEnvNumber("RATE_LIMIT_RPM") ?? 30;

  return {
    token,
    ownerId: readEnv("DISCORD_OWNER_ID"),
    guildId: readEnv("DISCORD_GUILD_ID"),
    channelId: readEnv("DISCORD_CHANNEL_ID"),
    openaiBaseUrl,
    openaiApiKey,
    openaiModel,
    openaiMaxTokens: readEnvNumber("OPENAI_MAX_TOKENS"),
    openaiTemperature: readEnvNumber("OPENAI_TEMPERATURE"),
    openaiSystemPrompt: readEnv("OPENAI_SYSTEM_PROMPT"),
    rateLimitRpm,
  };
}

export const config = loadConfig();