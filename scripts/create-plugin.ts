#!/usr/bin/env bun

import { cp, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const pluginName = process.argv[2]

if (!pluginName) {
  console.error('Usage: bun run scripts/create-plugin.ts <plugin-name>')
  console.error('Example: bun run scripts/create-plugin.ts my-plugin')
  process.exit(1)
}

// Validate plugin name: lowercase, alphanumeric + dashes only
const validIdRegex = /^[a-z0-9-]+$/
if (!validIdRegex.test(pluginName)) {
  console.error('Error: Plugin name must be lowercase, alphanumeric with dashes only')
  console.error('Valid: my-plugin, plex, jellyfin-stats')
  console.error('Invalid: MyPlugin, my_plugin, my.plugin')
  process.exit(1)
}

const pluginId = pluginName
const pluginDisplayName = pluginName
  .split('-')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ')

const templateDir = join(process.cwd(), 'plugins', 'template')
const targetDir = join(process.cwd(), 'plugins', 'packages', `plugin-${pluginId}`)

// Check if plugin already exists
if (existsSync(targetDir)) {
  console.error(`Error: Plugin directory already exists: ${targetDir}`)
  process.exit(1)
}

// Check if template exists
if (!existsSync(templateDir)) {
  console.error(`Error: Template directory not found: ${templateDir}`)
  process.exit(1)
}

// Copy template directory
console.log(`Creating plugin: ${pluginDisplayName} (${pluginId})`)
console.log(`Target: ${targetDir}`)

await mkdir(targetDir, { recursive: true })
await cp(templateDir, targetDir, { recursive: true })

// Replace placeholders in all files
const filesToUpdate = [join(targetDir, 'package.json'), join(targetDir, 'src', 'index.ts')]

for (const filePath of filesToUpdate) {
  const content = await Bun.file(filePath).text()
  const updated = content
    .replaceAll('__PLUGIN_NAME__', pluginDisplayName)
    .replaceAll('__PLUGIN_ID__', pluginId)

  await Bun.write(filePath, updated)
}

console.log('✅ Plugin created successfully!')
console.log('')
console.log('Next steps:')
console.log('1. Run: bun install')
console.log(`2. Implement plugin logic in: ${targetDir}/src/index.ts`)
console.log(`3. Add tests in: ${targetDir}/src/`)
console.log('4. Run: bun run check')
