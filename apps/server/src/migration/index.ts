export { detectOldDb, type DetectionResult } from './detector'
export { createBackup } from './backup'
export {
  runMigration,
  getMigrationStatus,
  type MigrationResult,
  type MigrationStatus,
  type ProgressCallback,
} from './migrator'
export {
  schemaMigrations,
  DATA_TRANSFORMS,
  TABLES_TO_CLEAR,
  MIGRATION_COMPLETED_KEY,
  swapBcryptPrefix,
  type SchemaMigration,
  type ColumnAddition,
} from './column-map'
export {
  execRawSql,
  queryRawSql,
  getExistingColumns,
  columnExists,
} from './sql-helpers'
