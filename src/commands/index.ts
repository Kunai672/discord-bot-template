import type { ChatInputCommandInteraction } from "discord.js";
import type { OpenAISession } from "../openai-session.js";
import { data as chatData, execute as chatExecute } from "./chat.js";
import { data as statusData, execute as statusExecute, setStartTime } from "./status.js";
import { data as abortData, execute as abortExecute } from "./abort.js";

export interface Command {
  data: { toJSON(): unknown };
  execute(interaction: ChatInputCommandInteraction, session: OpenAISession): Promise<void>;
}

export { chatData, chatExecute, statusData, statusExecute, setStartTime, abortData, abortExecute };

export const commands = [
  { data: chatData, execute: chatExecute },
  { data: statusData, execute: statusExecute },
  { data: abortData, execute: abortExecute },
] as const satisfies readonly Command[];