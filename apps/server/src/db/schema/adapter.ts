/**
 * Dialect adapter for unified schema definitions.
 * Maps 4 logical types (pk, text, integer, datetime) to dialect-specific Drizzle types.
 * Keeps total adapter code under 60 lines as per architectural requirements.
 */

import type { SQLiteColumnBuilderBase } from 'drizzle-orm/sqlite-core';
import type { MySqlColumnBuilderBase } from 'drizzle-orm/mysql-core';
import type { PgColumnBuilderBase } from 'drizzle-orm/pg-core';

import { integer as sqliteInteger, text as sqliteText } from 'drizzle-orm/sqlite-core';
import { int as mysqlInt, text as mysqlText, timestamp as mysqlTimestamp } from 'drizzle-orm/mysql-core';
import { serial as pgSerial, text as pgText, integer as pgInteger, timestamp as pgTimestamp } from 'drizzle-orm/pg-core';

export type Dialect = 'sqlite' | 'mysql' | 'postgresql';

export interface DialectAdapter {
  pk: () => SQLiteColumnBuilderBase | MySqlColumnBuilderBase | PgColumnBuilderBase;
  text: () => SQLiteColumnBuilderBase | MySqlColumnBuilderBase | PgColumnBuilderBase;
  integer: () => SQLiteColumnBuilderBase | MySqlColumnBuilderBase | PgColumnBuilderBase;
  datetime: () => SQLiteColumnBuilderBase | MySqlColumnBuilderBase | PgColumnBuilderBase;
}

export function createAdapter(dialect: Dialect): DialectAdapter {
  switch (dialect) {
    case 'sqlite':
      return {
        pk: () => sqliteInteger('id').primaryKey({ autoIncrement: true }),
        text: () => sqliteText('_'),
        integer: () => sqliteInteger('_'),
        datetime: () => sqliteText('_'), // SQLite stores datetime as TEXT
      };
    case 'mysql':
      return {
        pk: () => mysqlInt('id').autoincrement().primaryKey(),
        text: () => mysqlText('_'),
        integer: () => mysqlInt('_'),
        datetime: () => mysqlTimestamp('_'),
      };
    case 'postgresql':
      return {
        pk: () => pgSerial('id').primaryKey(),
        text: () => pgText('_'),
        integer: () => pgInteger('_'),
        datetime: () => pgTimestamp('_'),
      };
    default:
      throw new Error(`Unsupported dialect: ${dialect}`);
  }
}
