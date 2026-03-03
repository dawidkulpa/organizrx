/**
 * PostgreSQL schema - Generated from unified table definitions.
 */

import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique(),
  password: text('password'),
  email: text('email'),
  plex_token: text('plex_token'),
  groupName: text('group'),
  group_id: integer('group_id'),
  locked: integer('locked'),
  image: text('image'),
  register_date: timestamp('register_date'),
  auth_service: text('auth_service').default('internal'),
  totp_secret: text('totp_secret'),
  totp_enabled: integer('totp_enabled').default(0),
  totp_backup_codes: text('totp_backup_codes'),
});

export const chatroom = pgTable('chatroom', {
  id: serial('id').primaryKey(),
  username: text('username'),
  gravatar: text('gravatar'),
  uid: text('uid'),
  date: timestamp('date'),
  ip: text('ip'),
  message: text('message'),
});

export const tokens = pgTable('tokens', {
  id: serial('id').primaryKey(),
  token: text('token').unique(),
  user_id: integer('user_id'),
  browser: text('browser'),
  ip: text('ip'),
  created: timestamp('created'),
  expires: timestamp('expires'),
});

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('group').unique(),
  group_id: integer('group_id'),
  image: text('image'),
  isDefault: integer('default'),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  order: integer('order'),
  name: text('category').unique(),
  category_id: integer('category_id'),
  image: text('image'),
  isDefault: integer('default'),
});

export const tabs = pgTable('tabs', {
  id: serial('id').primaryKey(),
  order: integer('order'),
  category_id: integer('category_id'),
  name: text('name'),
  url: text('url'),
  url_local: text('url_local'),
  isDefault: integer('default'),
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

export const options = pgTable('options', {
  id: serial('id').primaryKey(),
  name: text('name').unique(),
  value: text('value'),
});

export const invites = pgTable('invites', {
  id: serial('id').primaryKey(),
  code: text('code').unique(),
  date: timestamp('date'),
  email: text('email'),
  username: text('username'),
  dateused: timestamp('dateused'),
  usedby: text('usedby'),
  ip: text('ip'),
  valid: text('valid'),
  type: text('type'),
  invitedby: text('invitedby'),
});

export const bookmarkCategories = pgTable('BOOKMARK-categories', {
  id: serial('id').primaryKey(),
  order: integer('order'),
  name: text('category').unique(),
  category_id: integer('category_id'),
  isDefault: integer('default'),
});

export const bookmarkTabs = pgTable('BOOKMARK-tabs', {
  id: serial('id').primaryKey(),
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
