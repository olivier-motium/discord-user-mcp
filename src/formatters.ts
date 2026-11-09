import { ChannelType } from "./types.js";
import type {
  Attachment,
  Channel,
  Embed,
  Guild,
  GuildDetailed,
  GuildMember,
  Message,
  Role,
  User,
} from "./types.js";

// ── Timestamps ──

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `[${year}-${month}-${day} ${hours}:${minutes}]`;
}

// ── Users ──

export function displayName(user: User): string {
  return user.global_name || user.username;
}

// ── Messages ──

function formatAttachment(a: Attachment): string {
  const sizeMB = (a.size / (1024 * 1024)).toFixed(1);
  return `[file: ${a.filename}, ${sizeMB}MB]`;
}

function formatEmbed(e: Embed): string {
  if (e.title) return `[embed: ${e.title}]`;
  if (e.url) return `[link: ${e.url}]`;
  return "[embed]";
}

export function formatMessage(msg: Message): string {
  const ts = formatTimestamp(msg.timestamp);
  const author = displayName(msg.author);

  let prefix = `${ts} ${author} (ID: ${msg.id})`;
  if (msg.referenced_message) {
    prefix += ` (replying to ${displayName(msg.referenced_message.author)})`;
  }

  const parts: string[] = [];
  if (msg.content) {
    const content =
      msg.content.length > 2000
        ? msg.content.slice(0, 2000) + "..."
        : msg.content;
    parts.push(content);
  }
  for (const a of msg.attachments) {
    parts.push(formatAttachment(a));
  }
  for (const e of msg.embeds) {
    parts.push(formatEmbed(e));
  }

  const body = parts.join(" ") || "[empty message]";
  return `${prefix}: ${body}`;
}

export function formatMessageList(
  messages: Message[],
  options?: { showPagination?: boolean },
): string {
  if (messages.length === 0) return "No messages found.";

  // Discord returns newest first — reverse to chronological
  const sorted = [...messages].reverse();
  const lines = sorted.map(formatMessage);

  const result = lines.join("\n");

  if (options?.showPagination && sorted.length > 0) {
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    return (
      result +
      `\n---\n${sorted.length} messages shown. Oldest ID: ${first.id} | Newest ID: ${last.id} (use before/after for pagination)`
    );
  }

  return result;
}

// ── Channels ──

const CHANNEL_ICONS: Partial<Record<ChannelType, string>> = {
  [ChannelType.GuildText]: "#",
  [ChannelType.GuildVoice]: "V",
  [ChannelType.GuildAnnouncement]: "A",
  [ChannelType.GuildForum]: "F",
  [ChannelType.GuildStageVoice]: "S",
  [ChannelType.PublicThread]: "T",
  [ChannelType.PrivateThread]: "T",
};

export function formatChannel(ch: Channel): string {
  const icon = CHANNEL_ICONS[ch.type] ?? "?";
  const topic = ch.topic ? ` — ${ch.topic.slice(0, 80)}` : "";
  return `  ${icon} ${ch.name ?? "unknown"} (ID: ${ch.id})${topic}`;
}

export function formatChannelList(channels: Channel[]): string {
  if (channels.length === 0) return "No channels found.";

  // Group by category
  const categories = new Map<string | null, Channel[]>();
  const categoryNames = new Map<string, string>();

  for (const ch of channels) {
    if (ch.type === ChannelType.GuildCategory) {
      categoryNames.set(ch.id, ch.name ?? "Unknown Category");
      continue;
    }
    const parent = ch.parent_id ?? null;
    if (!categories.has(parent)) categories.set(parent, []);
    categories.get(parent)!.push(ch);
  }

  const lines: string[] = [];

  // Uncategorized first
  const uncategorized = categories.get(null);
  if (uncategorized?.length) {
    lines.push("(No Category)");
    for (const ch of uncategorized.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
      lines.push(formatChannel(ch));
    }
  }

  // Then each category
  for (const [catId, chans] of categories) {
    if (catId === null) continue;
    const name = categoryNames.get(catId) ?? "Unknown";
    lines.push(`\n${name}`);
    for (const ch of chans.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
      lines.push(formatChannel(ch));
    }
  }

  return lines.join("\n");
}

// ── Guilds ──

export function formatGuildList(guilds: Guild[]): string {
  if (guilds.length === 0) return "You are not in any servers.";

  const lines = guilds.map((g, i) => {
    const members = g.approximate_member_count
      ? ` — ${g.approximate_member_count} members`
      : "";
    const owner = g.owner ? " (owner)" : "";
    return `${i + 1}. ${g.name} (ID: ${g.id})${members}${owner}`;
  });

  return "Your servers:\n" + lines.join("\n");
}

export function formatGuildInfo(guild: GuildDetailed): string {
  const lines: string[] = [
    `Server: ${guild.name}`,
    `ID: ${guild.id}`,
    `Members: ${guild.member_count ?? guild.approximate_member_count ?? "unknown"}`,
  ];

  if (guild.description) lines.push(`Description: ${guild.description}`);

  if (guild.roles?.length) {
    const roleNames = guild.roles
      .filter((r: Role) => r.name !== "@everyone")
      .sort((a: Role, b: Role) => b.position - a.position)
      .map((r: Role) => r.name)
      .slice(0, 20);
    lines.push(`Roles: ${roleNames.join(", ")}`);
  }

  if (guild.features?.length) {
    lines.push(`Features: ${guild.features.join(", ")}`);
  }

  return lines.join("\n");
}

// ── DMs ──

export function formatDMList(channels: Channel[]): string {
  if (channels.length === 0) return "No DM conversations found.";

  const lines = channels.map((ch, i) => {
    if (ch.type === ChannelType.GroupDM) {
      const label =
        ch.name || ch.recipients?.map(displayName).join(", ") || "Group DM";
      return `${i + 1}. Group: ${label} (ID: ${ch.id})`;
    }
    const recipient = ch.recipients?.[0];
    const name = recipient ? displayName(recipient) : "Unknown User";
    return `${i + 1}. ${name} (ID: ${ch.id})`;
  });

  return "Your DMs:\n" + lines.join("\n");
}

// ── Threads ──

export function formatThreadList(threads: Channel[]): string {
  if (threads.length === 0) return "No active threads found.";

  const lines = threads.map((t, i) => {
    const msgCount = t.message_count ? ` — ${t.message_count} messages` : "";
    const archived = t.thread_metadata?.archived ? " (archived)" : "";
    return `${i + 1}. ${t.name ?? "Unnamed thread"} (ID: ${t.id})${msgCount}${archived}`;
  });

  return "Active threads:\n" + lines.join("\n");
}

// ── Search ──

export function formatSearchResults(
  results: Message[][],
  totalResults: number,
): string {
  if (results.length === 0) return "No results found.";

  const lines: string[] = [`Found ${totalResults} results:\n`];

  for (let i = 0; i < results.length; i++) {
    const group = results[i]!;
    // The middle message is the match, surrounding ones are context
    const match = group[Math.floor(group.length / 2)];
    if (!match) continue;

    const ts = formatTimestamp(match.timestamp);
    const author = displayName(match.author);
    const content =
      match.content.length > 300
        ? match.content.slice(0, 300) + "..."
        : match.content;

    lines.push(
      `${i + 1}. ${ts} ${author} (ID: ${match.id}, channel: ${match.channel_id}):`,
    );
    lines.push(`   ${content}`);
    if (match.attachments.length > 0) {
      lines.push(
        `   ${match.attachments.map(formatAttachment).join(" ")}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── Members ──

export function formatMemberInfo(member: GuildMember, roles?: Role[]): string {
  const user = member.user;
  const lines: string[] = [
    `User: ${displayName(user)}`,
    `Username: ${user.username}`,
    `ID: ${user.id}`,
  ];

  if (member.nick) lines.push(`Server nickname: ${member.nick}`);
  lines.push(`Joined: ${formatTimestamp(member.joined_at)}`);

  if (roles?.length && member.roles.length > 0) {
    const roleMap = new Map(roles.map((r) => [r.id, r.name]));
    const memberRoles = member.roles
      .map((id) => roleMap.get(id))
      .filter(Boolean);
    if (memberRoles.length > 0) {
      lines.push(`Roles: ${memberRoles.join(", ")}`);
    }
  }

  return lines.join("\n");
}
