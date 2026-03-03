/**
 * Schema structure and adapter tests.
 */

import { describe, it, expect } from 'bun:test';
import { createAdapter } from './adapter';
import * as sqliteSchema from './sqlite';
import * as mysqlSchema from './mysql';
import * as pgSchema from './pg';
import { defaultGroups } from '../seed';

describe('Adapter', () => {
  it('should create SQLite adapter with correct types', () => {
    const adapter = createAdapter('sqlite');
    expect(adapter.pk).toBeDefined();
    expect(adapter.text).toBeDefined();
    expect(adapter.integer).toBeDefined();
    expect(adapter.datetime).toBeDefined();
  });

  it('should create MySQL adapter with correct types', () => {
    const adapter = createAdapter('mysql');
    expect(adapter.pk).toBeDefined();
    expect(adapter.text).toBeDefined();
    expect(adapter.integer).toBeDefined();
    expect(adapter.datetime).toBeDefined();
  });

  it('should create PostgreSQL adapter with correct types', () => {
    const adapter = createAdapter('postgresql');
    expect(adapter.pk).toBeDefined();
    expect(adapter.text).toBeDefined();
    expect(adapter.integer).toBeDefined();
    expect(adapter.datetime).toBeDefined();
  });

  it('should throw error for unsupported dialect', () => {
    expect(() => createAdapter('invalid' as any)).toThrow('Unsupported dialect: invalid');
  });
});

describe('Schema Structure', () => {
  it('SQLite schema should have all 10 tables', () => {
    expect(sqliteSchema.users).toBeDefined();
    expect(sqliteSchema.chatroom).toBeDefined();
    expect(sqliteSchema.tokens).toBeDefined();
    expect(sqliteSchema.groups).toBeDefined();
    expect(sqliteSchema.categories).toBeDefined();
    expect(sqliteSchema.tabs).toBeDefined();
    expect(sqliteSchema.options).toBeDefined();
    expect(sqliteSchema.invites).toBeDefined();
    expect(sqliteSchema.bookmarkCategories).toBeDefined();
    expect(sqliteSchema.bookmarkTabs).toBeDefined();
  });

  it('MySQL schema should have all 10 tables', () => {
    expect(mysqlSchema.users).toBeDefined();
    expect(mysqlSchema.chatroom).toBeDefined();
    expect(mysqlSchema.tokens).toBeDefined();
    expect(mysqlSchema.groups).toBeDefined();
    expect(mysqlSchema.categories).toBeDefined();
    expect(mysqlSchema.tabs).toBeDefined();
    expect(mysqlSchema.options).toBeDefined();
    expect(mysqlSchema.invites).toBeDefined();
    expect(mysqlSchema.bookmarkCategories).toBeDefined();
    expect(mysqlSchema.bookmarkTabs).toBeDefined();
  });

  it('PostgreSQL schema should have all 10 tables', () => {
    expect(pgSchema.users).toBeDefined();
    expect(pgSchema.chatroom).toBeDefined();
    expect(pgSchema.tokens).toBeDefined();
    expect(pgSchema.groups).toBeDefined();
    expect(pgSchema.categories).toBeDefined();
    expect(pgSchema.tabs).toBeDefined();
    expect(pgSchema.options).toBeDefined();
    expect(pgSchema.invites).toBeDefined();
    expect(pgSchema.bookmarkCategories).toBeDefined();
    expect(pgSchema.bookmarkTabs).toBeDefined();
  });

  it('should use exact bookmark table names with hyphens', () => {
    // @ts-ignore - accessing internal table name
    expect(sqliteSchema.bookmarkCategories[Symbol.for('drizzle:Name')]).toBe('BOOKMARK-categories');
    // @ts-ignore - accessing internal table name
    expect(sqliteSchema.bookmarkTabs[Symbol.for('drizzle:Name')]).toBe('BOOKMARK-tabs');
  });
});

describe('Seed Data', () => {
  it('should have 6 default groups', () => {
    expect(defaultGroups).toHaveLength(6);
  });

  it('should have correct group IDs', () => {
    const groupIds = defaultGroups.map((g) => g.group_id);
    expect(groupIds).toEqual([0, 1, 2, 3, 4, 999]);
  });

  it('should have correct group names', () => {
    const groupNames = defaultGroups.map((g) => g.name);
    expect(groupNames).toEqual(['Admin', 'Co-Admin', 'Super User', 'Power User', 'User', 'Guest']);
  });

  it('User group should be marked as default', () => {
    const userGroup = defaultGroups.find((g) => g.name === 'User');
    expect(userGroup?.isDefault).toBe(1);
  });

  it('non-User groups should not be default', () => {
    const nonUserGroups = defaultGroups.filter((g) => g.name !== 'User');
    expect(nonUserGroups.every((g) => g.isDefault === 0)).toBe(true);
  });
});
