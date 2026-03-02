/**
 * Unified table definitions using factory pattern.
 * Single source of truth for all 10 Organizr tables.
 * Column names and types match legacy PHP schema exactly.
 */

import type { DialectAdapter } from './adapter';

export function createTables(adapter: DialectAdapter) {
  const { pk, text, integer, datetime } = adapter;

  return {
    users: {
      id: pk(),
      username: text().unique(),
      password: text(),
      email: text(),
      plex_token: text(),
      group: text(),
      group_id: integer(),
      locked: integer(),
      image: text(),
      register_date: datetime(),
      auth_service: text().default('internal'),
    },

    chatroom: {
      id: pk(),
      username: text(),
      gravatar: text(),
      uid: text(),
      date: datetime(),
      ip: text(),
      message: text(),
    },

    tokens: {
      id: pk(),
      token: text().unique(),
      user_id: integer(),
      browser: text(),
      ip: text(),
      created: datetime(),
      expires: datetime(),
    },

    groups: {
      id: pk(),
      group: text().unique(),
      group_id: integer(),
      image: text(),
      default: integer(),
    },

    categories: {
      id: pk(),
      order: integer(),
      category: text().unique(),
      category_id: integer(),
      image: text(),
      default: integer(),
    },

    tabs: {
      id: pk(),
      order: integer(),
      category_id: integer(),
      name: text(),
      url: text(),
      url_local: text(),
      default: integer(),
      enabled: integer(),
      group_id: integer(),
      group_id_max: integer().default(0),
      add_to_admin: integer().default(0),
      image: text(),
      type: integer(),
      splash: integer(),
      ping: integer(),
      ping_url: text(),
      timeout: integer(),
      timeout_ms: integer(),
      preload: integer(),
    },

    options: {
      id: pk(),
      name: text().unique(),
      value: text(),
    },

    invites: {
      id: pk(),
      code: text().unique(),
      date: datetime(),
      email: text(),
      username: text(),
      dateused: datetime(),
      usedby: text(),
      ip: text(),
      valid: text(), // TEXT not boolean - matches legacy
      type: text(),
      invitedby: text(),
    },

    'BOOKMARK-categories': {
      id: pk(),
      order: integer(),
      category: text().unique(),
      category_id: integer(),
      default: integer(),
    },

    'BOOKMARK-tabs': {
      id: pk(),
      order: integer(),
      category_id: integer(),
      name: text(),
      url: text(),
      enabled: integer(),
      group_id: integer(),
      image: text(),
      background_color: text(),
      text_color: text(),
    },
  };
}
