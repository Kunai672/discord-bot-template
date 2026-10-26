import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { OpenAISession } from "../openai-session.js";

export const data = new SlashCommandBuilder()
  .setName("chat")
  .setDescription("Send a prompt to the AI and get a streaming response")
  .addStringOption((option) =>
    option
      .setName("prompt")
      .setDescription("The prompt to send to the AI")
      .setRequired(true),
  );

const EDIT_THROTTLE_MS = 1500;

export async function execute(
  interaction: ChatInputCommandInteraction,
  session: OpenAISession,
): Promise<void> {
  const prompt = interaction.options.getString("prompt", true);

  await interaction.deferReply();

  let buffer = "";
  let lastEdit = 0;
  let hasError = false;

  const flush = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastEdit < EDIT_THROTTLE_MS) return;
    if (!buffer) return;

    try {
      await interaction.editReply(buffer);
      lastEdit = now;
    } catch {
      // Ignore edit errors (e.g., interaction expired)
    }
  };

  session.chat({
    messages: [{ role: "user", content: prompt }],
    onChunk: (chunk) => {
      buffer += chunk;
      void flush();
    },
    onError: async (error) => {
      hasError = true;
      const message = `❌ Error: ${error.message}`;
      try {
        if (buffer) {
          await interaction.editReply(buffer + "\n\n" + message);
        } else {
          await interaction.editReply(message);
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