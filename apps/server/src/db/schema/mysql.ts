/**
 * MySQL schema - Generated from unified table definitions.
 */

import { mysqlTable, int, text, timestamp } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  username: text('username').unique(),
  password: text('password'),
  email: text('email'),
  plex_token: text('plex_token'),
  group: text('group'),
  group_id: int('group_id'),
  locked: int('locked'),
  image: text('image'),
  register_date: timestamp('register_date'),
  auth_service: text('auth_service').default('internal'),
});

export const chatroom = mysqlTable('chatroom', {
  id: int('id').autoincrement().primaryKey(),
  username: text('username'),
  gravatar: text('gravatar'),
  uid: text('uid'),
  date: timestamp('date'),
  ip: text('ip'),
  message: text('message'),
});

export const tokens = mysqlTable('tokens', {
  id: int('id').autoincrement().primaryKey(),
  token: text('token').unique(),
  user_id: int('user_id'),
  browser: text('browser'),
  ip: text('ip'),
  created: timestamp('created'),
  expires: timestamp('expires'),
});

export const groups = mysqlTable('groups', {
  id: int('id').autoincrement().primaryKey(),
  group: text('group').unique(),
  group_id: int('group_id'),
  image: text('image'),
  default: int('default'),
});

export const categories = mysqlTable('categories', {
  id: int('id').autoincrement().primaryKey(),
  order: int('order'),
  category: text('category').unique(),
  category_id: int('category_id'),
  image: text('image'),
  default: int('default'),
});

export const tabs = mysqlTable('tabs', {
  id: int('id').autoincrement().primaryKey(),
  order: int('order'),
  category_id: int('category_id'),
  name: text('name'),
  url: text('url'),
  url_local: text('url_local'),
  default: int('default'),
  enabled: int('enabled'),
  group_id: int('group_id'),
  group_id_max: int('group_id_max').default(0),
  add_to_admin: int('add_to_admin').default(0),
  image: text('image'),
  type: int('type'),
  splash: int('splash'),
  ping: int('ping'),
  ping_url: text('ping_url'),
  timeout: int('timeout'),
  timeout_ms: int('timeout_ms'),
  preload: int('preload'),
});

export const options = mysqlTable('options', {
  id: int('id').autoincrement().primaryKey(),
  name: text('name').unique(),
  value: text('value'),
});

export const invites = mysqlTable('invites', {
  id: int('id').autoincrement().primaryKey(),
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

export const bookmarkCategories = mysqlTable('BOOKMARK-categories', {
  id: int('id').autoincrement().primaryKey(),
  order: int('order'),
  category: text('category').unique(),
  category_id: int('category_id'),
  default: int('default'),
});

export const bookmarkTabs = mysqlTable('BOOKMARK-tabs', {
  id: int('id').autoincrement().primaryKey(),
  order: int('order'),
  category_id: int('category_id'),
  name: text('name'),
  url: text('url'),
  enabled: int('enabled'),
  group_id: int('group_id'),
  image: text('image'),
  background_color: text('background_color'),
  text_color: text('text_color'),
});
