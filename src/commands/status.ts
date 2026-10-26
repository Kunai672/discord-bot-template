import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { config } from "../config.js";

let startTime = Date.now();

export function setStartTime(time: number): void {
  startTime = time;
}

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Show current configuration and connection status");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const uptimeMs = Date.now() - startTime;
  const uptimeSec = Math.floor(uptimeMs / 1000);
  const uptimeMin = Math.floor(uptimeSec / 60);
  const uptimeHour = Math.floor(uptimeMin / 60);
  const uptimeDay = Math.floor(uptimeHour / 24);

  const parts: string[] = [];
  if (uptimeDay > 0) parts.push(`${uptimeDay}d`);
  if (uptimeHour > 0) parts.push(`${uptimeHour % 24}h`);
  if (uptimeMin > 0) parts.push(`${uptimeMin % 60}m`);
  parts.push(`${uptimeSec % 60}s`);
  const uptimeStr = parts.join(" ");

  const systemPromptStatus = config.openaiSystemPrompt ? "set" : "not set";

  const message = [
    "**Bot Status**",
    `• Uptime: ${uptimeStr}`,
    "",
    "**OpenAI Configuration**",
    `• Model: \`${config.openaiModel}\``,
    `• Base URL: \`${config.openaiBaseUrl}\``,
    `• Max Tokens: ${config.openaiMaxTokens ?? "default"}`,
    `• Temperature: ${config.openaiTemperature ?? "default"}`,
    `• System Prompt: ${systemPromptStatus}`,
    "",
    "**Discord Configuration**",
    `• Owner ID: ${config.ownerId ?? "not set (gate fails closed)"}`,
    `• Guild ID: ${config.guildId ?? "global commands"}`,
    `• Channel ID: ${config.channelId ?? "not set"}`,
  ].join("\n");

  await interaction.reply({ content: message, ephemeral: true });
}