-- Enable pg_jsonschema extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_jsonschema WITH SCHEMA extensions;

-- Drop existing constraint if it exists (safe for first migration)
ALTER TABLE factions
  DROP CONSTRAINT IF EXISTS factions_data_schema_check;

-- Add CHECK constraint with new schema
ALTER TABLE factions
  ADD CONSTRAINT factions_data_schema_check
  CHECK (extensions.jsonb_matches_schema(
    '{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "image": {
      "type": "string"
    },
    "color": {
      "type": "string"
    },
    "icon": {
      "type": "string"
    }
  },
  "required": [
    "name",
    "description",
    "image",
    "color",
    "icon"
  ],
  "additionalProperties": false
}'::json,
    data
  ));