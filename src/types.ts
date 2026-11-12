// Minimal Discord API types — only fields we actually use in formatters/tools.

export interface User {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  approximate_member_count?: number;
  description: string | null;
  features: string[];
}

export interface GuildDetailed extends Guild {
  roles: Role[];
  member_count?: number;
}

export interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
}

export interface Channel {
  id: string;
  type: ChannelType;
  guild_id?: string;
  name?: string;
  topic?: string | null;
  position?: number;
  parent_id?: string | null;
  last_message_id?: string | null;
  recipients?: User[];
  thread_metadata?: ThreadMetadata;
  message_count?: number;
  member_count?: number;
}

export enum ChannelType {
  GuildText = 0,
  DM = 1,
  GuildVoice = 2,
  GroupDM = 3,
  GuildCategory = 4,
  GuildAnnouncement = 5,
  AnnouncementThread = 10,
  PublicThread = 11,
  PrivateThread = 12,
  GuildStageVoice = 13,
  GuildForum = 15,
}

export interface ThreadMetadata {
  archived: boolean;
  auto_archive_duration: number;
  archive_timestamp: string;
  locked: boolean;
}

export interface Message {
  id: string;
  channel_id: string;
  author: User;
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  attachments: Attachment[];
  embeds: Embed[];
  reactions?: Reaction[];
  referenced_message?: Message | null;
  type: number;
  message_reference?: MessageReference;
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  content_type?: string;
}

export interface Embed {
  title?: string;
  description?: string;
  url?: string;
  type?: string;
}

export interface Reaction {
  count: number;
  me: boolean;
  emoji: { id: string | null; name: string | null };
}

export interface MessageReference {
  message_id?: string;
  channel_id?: string;
  guild_id?: string;
}

export interface SearchResponse {
  total_results: number;
  messages: Message[][]; // Each result is an array with context messages
}

export interface ThreadListResponse {
  threads: Channel[];
  has_more: boolean;
}

export interface GuildMember {
  user: User;
  nick: string | null;
  roles: string[];
  joined_at: string;
}

export interface MessageQuery {
  limit?: number;
  before?: string;
  after?: string;
  around?: string;
}

export interface SearchQuery {
  content?: string;
  author_id?: string;
  channel_id?: string;
  has?: string;
  min_id?: string;
  max_id?: string;
  offset?: number;
  sort_by?: "timestamp" | "relevance";
  sort_order?: "asc" | "desc";
}
