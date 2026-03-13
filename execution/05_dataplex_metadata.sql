-- ============================================================
-- Checkpoint 5: Query Dataplex Metadata for AI Grounding
-- ============================================================
-- Demonstrates how to pull enriched metadata from
-- INFORMATION_SCHEMA and use it as context for GenAI queries.
--
-- HOW TO RUN:
--   Copy-paste into BigQuery Console → Run.
--
-- Replace: your_project → GCP project ID
--          aml_demo_ds → dataset name
-- ============================================================

-- ── View Table Metadata (Dataplex-enriched) ─────────────────
-- This shows all table descriptions that Dataplex catalogs.
SELECT
    table_catalog AS project,
    table_schema AS dataset,
    table_name,
    option_name,
    option_value AS description
FROM `your_project.aml_demo_ds.INFORMATION_SCHEMA.TABLE_OPTIONS`
WHERE option_name = 'description'
ORDER BY table_name;


-- ── View Column-Level Metadata ──────────────────────────────
-- Useful for giving AI agents complete schema context.
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM `your_project.aml_demo_ds.INFORMATION_SCHEMA.COLUMNS`
ORDER BY table_name, ordinal_position;


-- ── Grounded AI Query: Schema-Aware Feature Ideation ────────
-- This query combines INFORMATION_SCHEMA metadata with Gemini
-- to generate AML-specific feature suggestions grounded in
-- the actual table schema.
SELECT
    ml_generate_text_result['candidates'][0]['content']['parts'][0]['text'] AS grounded_feature_ideas
FROM
    ML.GENERATE_TEXT(
        MODEL `your_project.aml_demo_ds.gemini_model`,
        (
            SELECT
                CONCAT(
                    'You are a senior AML data scientist. Below is the complete schema ',
                    'of a real-time transaction monitoring system in BigQuery, enriched ',
                    'with Dataplex Universal Catalog metadata.\n\n',
                    '--- Table Schemas ---\n',
                    (SELECT STRING_AGG(
                        CONCAT('Table: ', table_name, ' | Column: ', column_name,
                               ' | Type: ', data_type),
                        '\n'
                    )
                    FROM `your_project.aml_demo_ds.INFORMATION_SCHEMA.COLUMNS`),
                    '\n\n--- Table Descriptions ---\n',
                    (SELECT STRING_AGG(
                        CONCAT('Table: ', table_name, ' | Description: ', option_value),
                        '\n'
                    )
                    FROM `your_project.aml_demo_ds.INFORMATION_SCHEMA.TABLE_OPTIONS`
                    WHERE option_name = 'description'),
                    '\n\nBased on this complete schema and metadata context, suggest ',
                    '3 advanced SQL continuous queries that could be added to enhance ',
                    'AML detection. For each, provide the full SQL and explain the ',
                    'AML typology it addresses (e.g., structuring, layering, round-tripping).'
                ) AS prompt
        ),
        STRUCT(
            1024 AS max_output_tokens,
            0.4 AS temperature,
            TRUE AS flatten_json_output
        )
    );
