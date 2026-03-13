-- ============================================================
-- Checkpoint 4.3: AI Feature Ideation via Dataplex Metadata
-- ============================================================
-- Uses table schema and descriptions (enriched by Dataplex) to
-- ask Gemini for new predictive feature ideas for AML/fraud
-- detection.
--
-- HOW TO RUN:
--   Copy-paste into BigQuery Console → Run.
--
-- PREREQUISITES:
--   1. gemini_model created (see 04_remote_model.sql)
--   2. Tables created with descriptions (see 02_bq_table_setup.sql)
--
-- Replace: ${GCP_PROJECT_ID} → GCP project ID
--          ${BQ_DATASET} → dataset name
-- ============================================================

-- ── Feature Ideation: What else could we compute? ───────────
CREATE OR REPLACE TABLE `${GCP_PROJECT_ID}.${BQ_DATASET}.feature_ideation` AS
SELECT
    source_table,
    ml_generate_text_llm_result AS new_feature_ideas,
    CURRENT_TIMESTAMP() AS generated_at
FROM
    ML.GENERATE_TEXT(
        MODEL `${GCP_PROJECT_ID}.${BQ_DATASET}.gemini_model`,
        (
            SELECT
                table_name AS source_table,
                CONCAT(
                    'You are a senior data scientist specializing in AML (Anti-Money Laundering) ',
                    'and financial fraud detection. Analyze the following BigQuery table metadata ',
                    'and suggest 5-7 NEW predictive features that could be engineered for real-time ',
                    'fraud detection, suspicious activity monitoring, or churn analysis.\n\n',
                    'For each feature, provide:\n',
                    '- Feature name\n',
                    '- SQL expression or logic to compute it\n',
                    '- Why it is useful for AML/fraud detection\n\n',
                    '--- Table Metadata from Dataplex Universal Catalog ---\n',
                    'Table: ', table_name, '\n',
                    'Description: ', IFNULL(CAST(option_value AS STRING), 'N/A'), '\n',
                    'Existing columns: transaction_id, user_id, amount, timestamp, ',
                    'merchant, category, currency, country\n',
                    'Existing features: tx_count, total_spend, avg_amount, max_amount ',
                    'calculated over 15m, 30m, and 60m sliding windows.\n\n',
                    'Suggest features that go BEYOND what already exists. Think about: ',
                    'velocity acceleration (15m vs 60m), spend ratios, time-of-day patterns, ',
                    'structuring/smurfing patterns, dormant account reactivation, ',
                    'cross-border transaction sequences, and peer group anomalies.'
                ) AS prompt
            FROM `${GCP_PROJECT_ID}.${BQ_DATASET}.INFORMATION_SCHEMA.TABLE_OPTIONS`
            WHERE table_name = 'raw_transactions'
              AND option_name = 'description'
        ),
        STRUCT(
            1024 AS max_output_tokens,
            0.5 AS temperature,
            TRUE AS flatten_json_output
        )
    );

-- ============================================================
-- Preview results:
-- ============================================================
-- SELECT source_table, new_feature_ideas
-- FROM `${GCP_PROJECT_ID}.${BQ_DATASET}.feature_ideation`;
