import { Client, Events, GatewayIntentBits, Message, REST, Routes } from "discord.js";
import { config } from "./config.js";
import { createOpenAISession } from "./openai-session.js";
import { commands, setStartTime } from "./commands/index.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const session = createOpenAISession(config);

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

  // Strip mention from content
  let content = message.content;
  if (message.mentions.has(client.user?.id ?? "")) {
    content = content.replace(new RegExp(`<@!?${client.user!.id}>\\s*`), "").trim();
  }

  if (!content) return;

  await message.channel.sendTyping();

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
    messages: [{ role: "user", content }],
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
      await flush(true);
    },
  });
}

client.on(Events.MessageCreate, handleMessage);

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: "❌ You are not authorized to use this command.", ephemeral: true });
    return;
  }

  const command = commands.find((c) => c.data.name === interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, session);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    const message = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  setStartTime(Date.now());

  const rest = new REST({ version: "10" }).setToken(config.token);

  const commandData = commands.map((c) => c.data.toJSON());

  try {
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(readyClient.user.id, config.guildId), {
        body: commandData,
      });
      console.log(`Registered ${commandData.length} guild command(s).`);
    } else {
      await rest.put(Routes.applicationCommands(readyClient.user.id), {
        body: commandData,
      });
      console.log(`Registered ${commandData.length} global command(s).`);
    }
  } catch (error) {
    console.error("Failed to register commands:", error);
  }
});

await client.login(config.token);