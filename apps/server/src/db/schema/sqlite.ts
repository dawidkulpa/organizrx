/**
 * SQLite schema - Generated from unified table definitions.
 */

import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').unique(),
  password: text('password'),
  email: text('email'),
  plex_token: text('plex_token'),
  group: text('group'),
  group_id: integer('group_id'),
  locked: integer('locked'),
  image: text('image'),
  register_date: text('register_date'),
  auth_service: text('auth_service').default('internal'),
  totp_secret: text('totp_secret'),
  totp_enabled: integer('totp_enabled').default(0),
  totp_backup_codes: text('totp_backup_codes'),
});

export const chatroom = sqliteTable('chatroom', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username'),
  gravatar: text('gravatar'),
  uid: text('uid'),
  date: text('date'),
  ip: text('ip'),
  message: text('message'),
});

export const tokens = sqliteTable('tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').unique(),
  user_id: integer('user_id'),
  browser: text('browser'),
  ip: text('ip'),
  created: text('created'),
  expires: text('expires'),
});

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  group: text('group').unique(),
  group_id: integer('group_id'),
  image: text('image'),
  default: integer('default'),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  order: integer('order'),
  category: text('category').unique(),
  category_id: integer('category_id'),
  image: text('image'),
  default: integer('default'),
});

export const tabs = sqliteTable('tabs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  order: integer('order'),
  category_id: integer('category_id'),
  name: text('name'),
  url: text('url'),
  url_local: text('url_local'),
  default: integer('default'),
  enabled: integer('enabled'),
  group_id: integer('group_id'),
  group_id_max: integer('group_id_max').default(0),
  add_to_admin: integer('add_to_admin').default(0),
  image: text('image'),
  type: integer('type'),
  splash: integer('splash'),
  ping: integer('ping'),
  ping_url: text('ping_url'),
  timeout: integer('timeout'),
  timeout_ms: integer('timeout_ms'),
  preload: integer('preload'),
});

export const options = sqliteTable('options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique(),
  value: text('value'),
});

export const invites = sqliteTable('invites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').unique(),
  date: text('date'),
  email: text('email'),
  username: text('username'),
  dateused: text('dateused'),
  usedby: text('usedby'),
  ip: text('ip'),
  valid: text('valid'),
  type: text('type'),
  invitedby: text('invitedby'),
});

export const bookmarkCategories = sqliteTable('BOOKMARK-categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  order: integer('order'),
  category: text('category').unique(),
  category_id: integer('category_id'),
  default: integer('default'),
});

export const bookmarkTabs = sqliteTable('BOOKMARK-tabs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  order: integer('order'),
  category_id: integer('category_id'),
  name: text('name'),
  url: text('url'),
  enabled: integer('enabled'),
  group_id: integer('group_id'),
  image: text('image'),
  background_color: text('background_color'),
  text_color: text('text_color'),
});
