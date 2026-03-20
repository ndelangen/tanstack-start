-- Enable pg_jsonschema extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_jsonschema WITH SCHEMA extensions;

-- Drop existing constraint if it exists (safe for first migration)
ALTER TABLE factions
  DROP CONSTRAINT IF EXISTS factions_data_schema_check;
ALTER TABLE factions
  DROP CONSTRAINT IF EXISTS factions_data_is_object_check;

-- Add CHECK constraint with new schema
ALTER TABLE factions
  ADD CONSTRAINT factions_data_schema_check
  CHECK (extensions.jsonb_matches_schema(
    '{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9]+$"
    },
    "name": {
      "type": "string"
    },
    "logo": {
      "type": "string"
    },
    "background": {
      "type": "object",
      "properties": {
        "image": {
          "type": "string"
        },
        "colors": {
          "type": "array",
          "prefixItems": [
            {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^#[0-9a-f]{6}$"
                },
                {
                  "oneOf": [
                    {
                      "type": "object",
                      "properties": {
                        "type": {
                          "type": "string",
                          "const": "linear"
                        },
                        "angle": {
                          "type": "integer",
                          "minimum": 0,
                          "maximum": 360
                        },
                        "stops": {
                          "type": "array",
                          "items": {
                            "type": "array",
                            "prefixItems": [
                              {
                                "type": "string",
                                "pattern": "^#[0-9a-f]{6}$"
                              },
                              {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                              }
                            ]
                          }
                        }
                      },
                      "required": [
                        "type",
                        "angle",
                        "stops"
                      ],
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "type": {
                          "type": "string",
                          "const": "radial"
                        },
                        "x": {
                          "type": "number"
                        },
                        "y": {
                          "type": "number"
                        },
                        "r": {
                          "type": "number"
                        },
                        "stops": {
                          "type": "array",
                          "items": {
                            "type": "array",
                            "prefixItems": [
                              {
                                "type": "string",
                                "pattern": "^#[0-9a-f]{6}$"
                              },
                              {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                              }
                            ]
                          }
                        }
                      },
                      "required": [
                        "type",
                        "stops"
                      ],
                      "additionalProperties": false
                    }
                  ]
                }
              ]
            },
            {
              "anyOf": [
                {
                  "type": "string",
                  "pattern": "^#[0-9a-f]{6}$"
                },
                {
                  "oneOf": [
                    {
                      "type": "object",
                      "properties": {
                        "type": {
                          "type": "string",
                          "const": "linear"
                        },
                        "angle": {
                          "type": "integer",
                          "minimum": 0,
                          "maximum": 360
                        },
                        "stops": {
                          "type": "array",
                          "items": {
                            "type": "array",
                            "prefixItems": [
                              {
                                "type": "string",
                                "pattern": "^#[0-9a-f]{6}$"
                              },
                              {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                              }
                            ]
                          }
                        }
                      },
                      "required": [
                        "type",
                        "angle",
                        "stops"
                      ],
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "type": {
                          "type": "string",
                          "const": "radial"
                        },
                        "x": {
                          "type": "number"
                        },
                        "y": {
                          "type": "number"
                        },
                        "r": {
                          "type": "number"
                        },
                        "stops": {
                          "type": "array",
                          "items": {
                            "type": "array",
                            "prefixItems": [
                              {
                                "type": "string",
                                "pattern": "^#[0-9a-f]{6}$"
                              },
                              {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                              }
                            ]
                          }
                        }
                      },
                      "required": [
                        "type",
                        "stops"
                      ],
                      "additionalProperties": false
                    }
                  ]
                }
              ]
            }
          ]
        },
        "strength": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "opacity": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      },
      "required": [
        "image",
        "colors",
        "strength",
        "opacity"
      ],
      "additionalProperties": false
    },
    "themeColor": {
      "type": "string",
      "pattern": "^#[0-9a-f]{6}$"
    },
    "colors": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "hero": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "image": {
          "type": "string"
        }
      },
      "required": [
        "name",
        "image"
      ],
      "additionalProperties": false
    },
    "leaders": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "strength": {
            "anyOf": [
              {
                "type": "integer",
                "minimum": -9007199254740991,
                "maximum": 9007199254740991
              },
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 1
              }
            ]
          },
          "image": {
            "type": "string"
          }
        },
        "required": [
          "name",
          "image"
        ],
        "additionalProperties": false
      }
    },
    "decals": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "muted": {
            "type": "boolean"
          },
          "outline": {
            "type": "boolean"
          },
          "scale": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "offset": {
            "type": "array",
            "prefixItems": [
              {
                "type": "number"
              },
              {
                "type": "number"
              }
            ]
          }
        },
        "required": [
          "id",
          "muted",
          "outline",
          "scale",
          "offset"
        ],
        "additionalProperties": false
      }
    },
    "planet": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "image": {
            "anyOf": [
              {
                "type": "string",
                "enum": []
              },
              {
                "type": "string",
                "format": "uri"
              }
            ]
          },
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          }
        },
        "required": [
          "image",
          "name",
          "description"
        ],
        "additionalProperties": false
      }
    },
    "troops": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "image": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "star": {
            "type": "string"
          },
          "striped": {
            "type": "boolean"
          },
          "back": {
            "type": "object",
            "properties": {
              "image": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "star": {
                "type": "string"
              },
              "striped": {
                "type": "boolean"
              }
            },
            "required": [
              "image",
              "name",
              "description"
            ],
            "additionalProperties": false
          },
          "count": {
            "type": "integer",
            "exclusiveMinimum": 0,
            "maximum": 9007199254740991
          },
          "planet": {
            "type": "string"
          }
        },
        "required": [
          "image",
          "name",
          "description",
          "count"
        ],
        "additionalProperties": false
      }
    },
    "rules": {
      "type": "object",
      "properties": {
        "startText": {
          "type": "string"
        },
        "revivalText": {
          "type": "string"
        },
        "spiceCount": {
          "type": "integer",
          "exclusiveMinimum": 0,
          "maximum": 9007199254740991
        },
        "advantages": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "title": {
                "type": "string"
              },
              "text": {
                "type": "string"
              },
              "karama": {
                "type": "string"
              }
            },
            "required": [
              "text"
            ],
            "additionalProperties": false
          }
        },
        "fate": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string"
            },
            "text": {
              "type": "string"
            }
          },
          "required": [
            "text"
          ],
          "additionalProperties": false
        },
        "alliance": {
          "type": "object",
          "properties": {
            "text": {
              "type": "string"
            }
          },
          "required": [
            "text"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "startText",
        "revivalText",
        "spiceCount",
        "advantages",
        "fate",
        "alliance"
      ],
      "additionalProperties": false
    },
    "extras": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "url": {
                  "anyOf": [
                    {
                      "type": "string",
                      "enum": []
                    },
                    {
                      "type": "string",
                      "format": "uri"
                    }
                  ]
                },
                "description": {
                  "type": "string"
                }
              },
              "required": [
                "url"
              ],
              "additionalProperties": false
            }
          }
        },
        "required": [
          "name",
          "items"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "id",
    "name",
    "logo",
    "background",
    "themeColor",
    "colors",
    "hero",
    "leaders",
    "decals",
    "troops",
    "rules"
  ],
  "additionalProperties": false
}'::json,
    data
  ));