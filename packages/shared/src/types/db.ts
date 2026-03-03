/**
 * Database schema types matching Organizr legacy schema exactly.
 * Column names and types map 1:1 with the SQLite schema.
 */

/**
 * User table - represents application users
 */
export interface User {
  id: number;
  username: string;
  password: string;
  email: string | null;
  plex_token: string | null;
  groupName: string | null;
  group_id: number | null;
  locked: number | null; // boolean as integer (0/1)
  image: string | null;
  register_date: string; // ISO datetime
  auth_service: 'internal' | string; // defaults to 'internal'
}

/**
 * Group table - represents user groups with permission levels
 */
export interface Group {
  id: number;
  name: string; // unique group name
  group_id: number; // numeric group identifier
  image: string | null;
  isDefault: number | null; // boolean as integer (0/1)
}

/**
 * Category table - top-level organization units for tabs
 */
export interface Category {
  id: number;
  order: number | null;
  name: string; // unique category name
  category_id: number;
  image: string | null;
  isDefault: number | null; // boolean as integer (0/1)
}

/**
 * Tab table - individual bookmarked items/services
 */
export interface Tab {
  id: number;
  order: number | null;
  category_id: number;
  name: string;
  url: string | null;
  url_local: string | null;
  isDefault: number | null; // boolean as integer (0/1)
  enabled: number | null; // boolean as integer (0/1)
  group_id: number;
  group_id_max: number; // defaults to 0
  add_to_admin: number; // defaults to 0
  image: string | null;
  type: number | null;
  splash: number | null; // boolean as integer (0/1)
  ping: number | null; // boolean as integer (0/1)
  ping_url: string | null;
  timeout: number | null;
  timeout_ms: number | null;
  preload: number | null; // boolean as integer (0/1)
}

/**
 * Token table - authentication tokens for API access
 */
export interface Token {
  id: number;
  token: string; // unique token
  user_id: number;
  browser: string | null;
  ip: string | null;
  created: string; // ISO datetime
  expires: string; // ISO datetime
}

/**
 * Invite table - user invitation codes
 */
export interface Invite {
  id: number;
  code: string; // unique invite code
  date: string; // ISO datetime (created)
  email: string | null;
  username: string | null;
  dateused: string | null; // ISO datetime (when used)
  usedby: string | null;
  ip: string | null;
  valid: string; // TEXT not boolean - "1" or "0"
  type: string | null;
  invitedby: string | null;
}

/**
 * BookmarkCategory table - categories specific to bookmarks
 */
export interface BookmarkCategory {
  id: number;
  order: number | null;
  name: string; // unique
  category_id: number;
  isDefault: number | null; // boolean as integer (0/1)
}

/**
 * BookmarkTab table - individual bookmarks with styling
 */
export interface BookmarkTab {
  id: number;
  order: number | null;
  category_id: number;
  name: string;
  url: string;
  enabled: number | null; // boolean as integer (0/1)
  group_id: number;
  image: string | null;
  background_color: string | null;
  text_color: string | null;
}

/**
 * Settings - application options (not a strict table)
 */
export interface Settings {
  id?: number;
  name: string; // unique setting name
  value: string | null;
}

/**
 * Chatroom table - chat messages (optional, for completeness)
 */
export interface ChatMessage {
  id: number;
  username: string;
  gravatar: string | null;
  uid: string;
  date: string; // ISO datetime
  ip: string | null;
  message: string;
}
