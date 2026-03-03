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
  tableMappings,
  migratedTables,
  skippedTables,
  type TableMapping,
  type ColumnMapping,
} from './column-map'
