import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DiscordClient } from "../client.js";
import { displayName, formatDMList, formatMessage } from "../formatters.js";
import type { Channel } from "../types.js";
import { toolError, toolResult } from "./helpers.js";

export function registerDMTools(
  server: McpServer,
  client: DiscordClient,
): void {
  server.tool(
    "discord_list_dms",
    "List your DM conversations, most recently active first. Returns the other user's name (or the group's name or members) and the channel ID needed to read or send messages.",
    {
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of DM channels to return (default 20)."),
    },
    async ({ limit }) => {
      const channels = await client.getDMChannels();
      // The API returns DM channels oldest first; last_message_id is a snowflake, so it sorts by last activity.
      const lastActivity = (ch: Channel) => BigInt(ch.last_message_id ?? ch.id);
      channels.sort((a, b) => (lastActivity(b) > lastActivity(a) ? 1 : -1));
      return toolResult(formatDMList(channels.slice(0, limit ?? 20)));
    },
  );

  server.tool(
    "discord_send_dm",
    "Send a direct message to a user. Provide user_id to open a new DM, or channel_id if you already have the DM channel from discord_list_dms.",
    {
      user_id: z
        .string()
        .optional()
        .describe("User ID to DM. Creates a DM channel if needed."),
      channel_id: z
        .string()
        .optional()
        .describe("Existing DM channel ID (from discord_list_dms)."),
      content: z.string().describe("Message content."),
    },
    async ({ user_id, channel_id, content }) => {
      if (!user_id && !channel_id) {
        return toolError(
          "Provide either user_id or channel_id. Use discord_list_dms to find channel IDs.",
        );
      }

      let targetChannelId = channel_id;
      let recipientName = "user";

      if (user_id && !channel_id) {
        const dmChannel = await client.createDM(user_id);
        targetChannelId = dmChannel.id;
        if (dmChannel.recipients?.[0]) {
          recipientName = displayName(dmChannel.recipients[0]);
        }
      }

      const msg = await client.sendMessage(targetChannelId!, content);
      return toolResult(
        `DM sent to ${recipientName} (ID: ${msg.id}).\n${formatMessage(msg)}`,
      );
    },
  );
}
