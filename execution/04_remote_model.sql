-- ============================================================
-- Checkpoint 4.1: Create Remote Gemini Model in BigQuery
-- ============================================================
-- Creates a BQML remote model that connects to Gemini via
-- the Vertex AI external connection.
--
-- HOW TO RUN:
--   Copy-paste into BigQuery Console → Run.
--
-- PREREQUISITES:
--   1. Run 04_setup_bq_connection.sh first
--   2. Replace: your-project → GCP project ID
--              us → your connection location
--              vertex-ai-connection → your connection name
-- ============================================================

CREATE OR REPLACE MODEL `your_project.aml_demo_ds.gemini_model`
REMOTE WITH CONNECTION `projects/your-project/locations/us/connections/vertex-ai-connection`
OPTIONS (
    ENDPOINT = 'gemini-2.5-flash'
);

-- ============================================================
-- Verify the model was created:
-- ============================================================
-- SELECT * FROM `your_project.aml_demo_ds.INFORMATION_SCHEMA.MODELS`;
