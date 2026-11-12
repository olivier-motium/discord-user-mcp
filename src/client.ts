import type {
  Channel,
  Guild,
  GuildDetailed,
  GuildMember,
  Message,
  MessageQuery,
  SearchQuery,
  SearchResponse,
  ThreadListResponse,
  User,
} from "./types.js";

export class DiscordAPIError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    const msg = (body.message as string) || `HTTP ${status}`;
    super(msg);
    this.name = "DiscordAPIError";
  }
}

export class DiscordClient {
  private baseUrl = "https://discord.com/api/v10";

  constructor(private token: string) {}

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: this.token,
          "Content-Type": "application/json",
          "User-Agent": "DiscordBot (discord-user-mcp, 0.1.0)",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.status === 429) {
        const data = (await res.json().catch(() => ({}))) as {
          retry_after?: number;
        };
        const wait = ((data.retry_after ?? 1) * 1000) + Math.random() * 100;
        console.error(`Rate limited, retrying in ${Math.round(wait)}ms...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        const error = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        throw new DiscordAPIError(res.status, error);
      }

      if (res.status === 204) return undefined as T;

      return (await res.json()) as T;
    }

    throw new DiscordAPIError(429, {
      message: "Rate limited after 3 retries. Try again shortly.",
    });
  }

  // ── User ──

  getCurrentUser(): Promise<User> {
    return this.request("GET", "/users/@me");
  }

  getUser(userId: string): Promise<User> {
    return this.request("GET", `/users/${userId}`);
  }

  // ── Guilds ──

  getMyGuilds(): Promise<Guild[]> {
    return this.request("GET", "/users/@me/guilds?with_counts=true");
  }

  getGuild(guildId: string): Promise<GuildDetailed> {
    return this.request("GET", `/guilds/${guildId}?with_counts=true`);
  }

  getGuildChannels(guildId: string): Promise<Channel[]> {
    return this.request("GET", `/guilds/${guildId}/channels`);
  }

  getGuildMember(guildId: string, userId: string): Promise<GuildMember> {
    return this.request("GET", `/guilds/${guildId}/members/${userId}`);
  }

  searchGuildMembers(
    guildId: string,
    query: string,
    limit = 10,
  ): Promise<GuildMember[]> {
    return this.request(
      "GET",
      `/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=${limit}`,
    );
  }

  // ── Channels ──

  getChannel(channelId: string): Promise<Channel> {
    return this.request("GET", `/channels/${channelId}`);
  }

  // ── Messages ──

  getMessages(channelId: string, query: MessageQuery = {}): Promise<Message[]> {
    const params = new URLSearchParams();
    if (query.limit) params.set("limit", String(query.limit));
    if (query.before) params.set("before", query.before);
    if (query.after) params.set("after", query.after);
    if (query.around) params.set("around", query.around);
    const qs = params.toString();
    return this.request("GET", `/channels/${channelId}/messages${qs ? `?${qs}` : ""}`);
  }

  getMessage(channelId: string, messageId: string): Promise<Message> {
    return this.request("GET", `/channels/${channelId}/messages/${messageId}`);
  }

  sendMessage(
    channelId: string,
    content: string,
    replyTo?: string,
  ): Promise<Message> {
    const body: Record<string, unknown> = { content };
    if (replyTo) {
      body.message_reference = { message_id: replyTo };
    }
    return this.request("POST", `/channels/${channelId}/messages`, body);
  }

  editMessage(
    channelId: string,
    messageId: string,
    content: string,
  ): Promise<Message> {
    return this.request(
      "PATCH",
      `/channels/${channelId}/messages/${messageId}`,
      { content },
    );
  }

  deleteMessage(channelId: string, messageId: string): Promise<void> {
    return this.request(
      "DELETE",
      `/channels/${channelId}/messages/${messageId}`,
    );
  }

  getPinnedMessages(channelId: string): Promise<Message[]> {
    return this.request("GET", `/channels/${channelId}/pins`);
  }

  // ── Search ──

  searchGuild(guildId: string, query: SearchQuery): Promise<SearchResponse> {
    const params = new URLSearchParams();
    if (query.content) params.set("content", query.content);
    if (query.author_id) params.set("author_id", query.author_id);
    if (query.channel_id) params.set("channel_id", query.channel_id);
    if (query.has) params.set("has", query.has);
    if (query.min_id) params.set("min_id", query.min_id);
    if (query.max_id) params.set("max_id", query.max_id);
    if (query.offset !== undefined) params.set("offset", String(query.offset));
    if (query.sort_by) params.set("sort_by", query.sort_by);
    if (query.sort_order) params.set("sort_order", query.sort_order);
    return this.request(
      "GET",
      `/guilds/${guildId}/messages/search?${params.toString()}`,
    );
  }

  // ── Reactions ──

  addReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<void> {
    const encoded = encodeURIComponent(emoji);
    return this.request(
      "PUT",
      `/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`,
    );
  }

  // ── Threads ──

  getArchivedPublicThreads(channelId: string): Promise<ThreadListResponse> {
    return this.request(
      "GET",
      `/channels/${channelId}/threads/archived/public`,
    );
  }

  getArchivedPrivateThreads(channelId: string): Promise<ThreadListResponse> {
    return this.request(
      "GET",
      `/channels/${channelId}/threads/archived/private`,
    );
  }

  // ── DMs ──

  getDMChannels(): Promise<Channel[]> {
    return this.request("GET", "/users/@me/channels");
  }

  createDM(recipientId: string): Promise<Channel> {
    return this.request("POST", "/users/@me/channels", {
      recipient_id: recipientId,
    });
  }
}
