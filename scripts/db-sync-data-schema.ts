import { writeFile, readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { factionDataSchema } from "../src/data/faction"
import z from "zod"

// Schema configuration - extensible for future schemas
type SchemaConfig = {
  name: string
  tableName: string
  columnName: string
  constraintName: string
  zodSchema: z.ZodObject<any>
}

const schemaConfig: SchemaConfig[] = [
  {
    name: 'faction',
    tableName: 'factions',
    columnName: 'data',
    constraintName: 'factions_data_schema_check',
    zodSchema: factionDataSchema,
  },
  // Future schemas can be added here:
  // { name: 'character', tableName: 'characters', columnName: 'data', constraintName: 'characters_data_schema_check', zodSchema: characterDataSchema },
]


// Helper function: Extract timestamp from migration filename
function extractTimestamp(filename: string): number | null {
  const match = filename.match(/^(\d{14})_/)
  if (!match) return null
  return parseInt(match[1])
}

// Helper function: Find latest validation migration for a specific constraint
async function findLatestValidationMigration(
  constraintName: string,
  migrationsDir: string
): Promise<{ filename: string; content: string } | null> {
  const files = await readdir(migrationsDir)
  const sqlFiles = files.filter(f => f.endsWith('.sql'))
  
  const matchingMigrations: Array<{ filename: string; timestamp: number; content: string }> = []
  
  for (const file of sqlFiles) {
    const filePath = join(migrationsDir, file)
    const content = await readFile(filePath, 'utf-8')
    
    // Check if migration contains the constraint name
    if (content.includes(constraintName)) {
      const timestamp = extractTimestamp(file)
      if (timestamp !== null) {
        matchingMigrations.push({ filename: file, timestamp, content })
      }
    }
  }
  
  if (matchingMigrations.length === 0) {
    return null
  }
  
  // Sort by timestamp descending and return the most recent
  matchingMigrations.sort((a, b) => b.timestamp - a.timestamp)
  return {
    filename: matchingMigrations[0].filename,
    content: matchingMigrations[0].content,
  }
}

// Helper function: Extract JSON schema from migration SQL
function extractSchemaFromMigration(
  migrationContent: string,
  constraintName: string,
  columnName: string
): object | null {
  // Look for extensions.jsonb_matches_schema('...'::json, column_name) pattern
  // We need to find the constraint that matches our constraintName and extract the JSON literal
  const constraintRegex = new RegExp(
    `ADD CONSTRAINT ${constraintName}[\\s\\S]*?CHECK\\s*\\(\\s*extensions\\.jsonb_matches_schema\\s*\\(\\s*'([^']*(?:''[^']*)*)'::json\\s*,\\s*${columnName}\\s*\\)\\s*\\)`,
    'i'
  )
  
  const match = migrationContent.match(constraintRegex)
  if (!match) {
    return null
  }
  
  // Unescape SQL string (handle '' -> ')
  const jsonString = match[1].replace(/''/g, "'")
  
  try {
    return JSON.parse(jsonString)
  } catch {
    return null
  }
}

// Helper function: Compare two JSON schemas (deep equality)
function compareSchemas(schema1: object, schema2: object): boolean {
  // Normalize both schemas by sorting keys recursively
  const normalize = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }
    
    if (Array.isArray(obj)) {
      return obj.map(normalize).sort()
    }
    
    const sorted: Record<string, any> = {}
    const keys = Object.keys(obj).sort()
    for (const key of keys) {
      sorted[key] = normalize(obj[key])
    }
    return sorted
  }
  
  const normalized1 = normalize(schema1)
  const normalized2 = normalize(schema2)
  
  return JSON.stringify(normalized1) === JSON.stringify(normalized2)
}

// Helper function: Generate migration SQL
function generateMigrationSQL(
  config: SchemaConfig,
  jsonSchema: object,
  includeExtension: boolean
): string {
  const schemaJsonString = JSON.stringify(jsonSchema, null, 2)
  // Escape single quotes for SQL ('' -> '')
  const escapedSchema = schemaJsonString.replace(/'/g, "''")
  
  const lines: string[] = []
  
  if (includeExtension) {
    lines.push('-- Enable pg_jsonschema extension (idempotent)')
    lines.push('CREATE EXTENSION IF NOT EXISTS pg_jsonschema WITH SCHEMA extensions;')
    lines.push('')
  }
  
  lines.push(`-- Drop existing constraint if it exists (safe for first migration)`)
  lines.push(`ALTER TABLE ${config.tableName}`)
  lines.push(`  DROP CONSTRAINT IF EXISTS ${config.constraintName};`)
  lines.push('')
  lines.push(`-- Add CHECK constraint with new schema`)
  lines.push(`ALTER TABLE ${config.tableName}`)
  lines.push(`  ADD CONSTRAINT ${config.constraintName}`)
  lines.push(`  CHECK (extensions.jsonb_matches_schema(`)
  lines.push(`    '${escapedSchema}'::json,`)
  lines.push(`    ${config.columnName}`)
  lines.push(`  ));`)
  
  return lines.join('\n')
}

// Helper function: Generate timestamp for migration filename
function generateMigrationTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

// Main execution

const migrationsDir = './supabase/migrations'
  let extensionIncluded = false
  
  // Process each schema
  for (const config of schemaConfig) {
    // Step 1: Generate JSON schema in memory
    const newSchema = z.toJSONSchema(config.zodSchema, { unrepresentable: 'any' })
    
    // Step 2: Find latest validation migration for this schema
    const latestMigration = await findLatestValidationMigration(
      config.constraintName,
      migrationsDir
    )
    
    // Step 3: Compare schemas if migration exists
    if (latestMigration) {
      const extractedSchema = extractSchemaFromMigration(
        latestMigration.content,
        config.constraintName,
        config.columnName
      )
      
      if (extractedSchema && compareSchemas(extractedSchema, newSchema)) {
        console.log(`✓ Schema for ${config.name} unchanged, skipping migration`)
        continue
      }
    }
    
    // Step 4: Generate migration SQL
    const migrationSQL = generateMigrationSQL(
      config,
      newSchema,
      !extensionIncluded
    )
    
    // Step 5: Write migration file
    const timestamp = generateMigrationTimestamp()
    const migrationFilename = `${timestamp}_${config.name}_data_validation.sql`
    const migrationPath = join(migrationsDir, migrationFilename)
    
    await writeFile(migrationPath, migrationSQL)
    console.log(`✓ Generated migration: ${migrationFilename}`)
    
    // Mark extension as included for subsequent migrations
    if (!extensionIncluded) {
      extensionIncluded = true
    }
  }
  
  console.log('✓ Schema generation complete')
