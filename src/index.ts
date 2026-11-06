import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import { config } from "./config.js";
import { createOpenAISession } from "./openai-session.js";
import { createConversationHistory } from "./conversation-history.js";
import { createRateLimiter } from "./rate-limiter.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const session = createOpenAISession(config);
const history = createConversationHistory(config);
const rateLimiter = createRateLimiter(config);

function isOwner(userId: string): boolean {
  return config.ownerId !== undefined && userId === config.ownerId;
}

function shouldRespondToMessage(message: Message): boolean {
  if (message.author.bot) return false;
  if (message.author.id === client.user?.id) return false;

  // Respond to @mentions
  if (message.mentions.has(client.user?.id ?? "")) return true;

  // Respond to all messages in dedicated channel
  if (config.channelId && message.channelId === config.channelId) return true;

  return false;
}

async function handleMessage(message: Message): Promise<void> {
  if (!isOwner(message.author.id)) return;
  if (!shouldRespondToMessage(message)) return;

  // Rate limit check
  if (!rateLimiter.check(message.author.id)) {
    const resetMs = rateLimiter.getResetTime(message.author.id);
    const resetSec = Math.ceil(resetMs / 1000);
    await message.reply({
      content: `⏱️ Rate limited. Try again in ${resetSec}s.`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // Strip mention from content
  let content = message.content;
  if (message.mentions.has(client.user?.id ?? "")) {
    content = content.replace(new RegExp(`<@!?${client.user!.id}>\\s*`), "").trim();
  }

  if (!content) return;

  // Send typing indicator (only for text-based channels)
  if ("sendTyping" in message.channel) {
    await message.channel.sendTyping();
  }

  // Add user message to history
  history.add(message.author.id, message.channelId, { role: "user", content });

  // Get conversation history
  const conversationHistory = history.get(message.author.id, message.channelId);

  let buffer = "";
  let lastEdit = 0;
  let replyMessage: Message | null = null;
  let hasError = false;

  const EDIT_THROTTLE_MS = 1500;

  const flush = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastEdit < EDIT_THROTTLE_MS) return;
    if (!buffer) return;

    try {
      if (replyMessage) {
        await replyMessage.edit(buffer);
      } else {
        replyMessage = await message.reply(buffer);
      }
      lastEdit = now;
    } catch {
      // Ignore edit errors
    }
  };

  session.chat({
    messages: conversationHistory,
    onChunk: (chunk) => {
      buffer += chunk;
      void flush();
    },
    onError: async (error) => {
      hasError = true;
      const errorMsg = `❌ Error: ${error.message}`;
      try {
        if (replyMessage) {
          await replyMessage.edit(buffer + "\n\n" + errorMsg);
        } else {
          await message.reply(errorMsg);
        }
      } catch {
        // Ignore
      }
    },
    onComplete: async () => {
      if (hasError) return;
      // Add assistant response to history
      history.add(message.author.id, message.channelId, { role: "assistant", content: buffer });
      await flush(true);
    },
  });
}

client.on(Events.MessageCreate, handleMessage);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(`Rate limit: ${config.rateLimitRpm} requests/minute per user`);
  if (config.channelId) {
    console.log(`Dedicated channel: ${config.channelId}`);
  }
});

await client.login(config.token);