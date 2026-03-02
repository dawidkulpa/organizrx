/**
 * Dialect adapter for unified schema definitions.
 * Maps 4 logical types (pk, text, integer, datetime) to dialect-specific Drizzle types.
 * Keeps total adapter code under 60 lines as per architectural requirements.
 */

import { type ColumnBuilderBaseConfig, type ColumnDataType, ColumnBuilder } from 'drizzle-orm/column-builder';
import { integer as sqliteInteger, text as sqliteText } from 'drizzle-orm/sqlite-core';
import { int as mysqlInt, text as mysqlText, timestamp as mysqlTimestamp } from 'drizzle-orm/mysql-core';
import { serial as pgSerial, text as pgText, integer as pgInteger, timestamp as pgTimestamp } from 'drizzle-orm/pg-core';

export type Dialect = 'sqlite' | 'mysql' | 'postgresql';

/**
 * Common column builder type that exposes .unique() and .default() across all dialects.
 * ColumnBuilder (abstract class) has .default(), .notNull(), .primaryKey().
 * .unique() exists on all dialect builders but not on the shared base, so we intersect it.
 */
type AnyColumnBuilder = ColumnBuilder<ColumnBuilderBaseConfig<ColumnDataType, string>, object, object> & {
  unique(name?: string): AnyColumnBuilder;
};

export interface DialectAdapter {
  pk: () => AnyColumnBuilder;
  text: () => AnyColumnBuilder;
  integer: () => AnyColumnBuilder;
  datetime: () => AnyColumnBuilder;
}

export function createAdapter(dialect: Dialect): DialectAdapter {
  switch (dialect) {
    case 'sqlite':
      return {
        pk: () => sqliteInteger('id').primaryKey({ autoIncrement: true }) as unknown as AnyColumnBuilder,
        text: () => sqliteText('_') as unknown as AnyColumnBuilder,
        integer: () => sqliteInteger('_') as unknown as AnyColumnBuilder,
        datetime: () => sqliteText('_') as unknown as AnyColumnBuilder, // SQLite stores datetime as TEXT
      };
    case 'mysql':
      return {
        pk: () => mysqlInt('id').autoincrement().primaryKey() as unknown as AnyColumnBuilder,
        text: () => mysqlText('_') as unknown as AnyColumnBuilder,
        integer: () => mysqlInt('_') as unknown as AnyColumnBuilder,
        datetime: () => mysqlTimestamp('_') as unknown as AnyColumnBuilder,
      };
    case 'postgresql':
      return {
        pk: () => pgSerial('id').primaryKey() as unknown as AnyColumnBuilder,
        text: () => pgText('_') as unknown as AnyColumnBuilder,
        integer: () => pgInteger('_') as unknown as AnyColumnBuilder,
        datetime: () => pgTimestamp('_') as unknown as AnyColumnBuilder,
      };
    default:
      throw new Error(`Unsupported dialect: ${dialect}`);
  }
}
