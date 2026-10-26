import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { OpenAISession } from "../openai-session.js";

export const data = new SlashCommandBuilder()
  .setName("abort")
  .setDescription("Cancel any in-flight request");

export async function execute(
  interaction: ChatInputCommandInteraction,
  session: OpenAISession,
): Promise<void> {
  if (session.status === "processing") {
    session.abort();
    await interaction.reply({ content: "✅ In-flight request cancelled.", ephemeral: true });
  } else {
    await interaction.reply({ content: "ℹ️ No request in progress.", ephemeral: true });
  }
}