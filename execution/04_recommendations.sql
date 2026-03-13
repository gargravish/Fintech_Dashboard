-- ============================================================
-- Checkpoint 4.2: GenAI Recommendations via ML.GENERATE_TEXT
-- ============================================================
-- Generates personalized financial recommendations for each
-- user based on their real-time spending patterns from
-- user_features.
--
-- HOW TO RUN:
--   Copy-paste into BigQuery Console → Run.
--
-- PREREQUISITES:
--   1. gemini_model created (see 04_remote_model.sql)
--   2. user_features_60m table has data (Dataflow running)
--
-- Replace: ${GCP_PROJECT_ID} → GCP project ID
--          ${BQ_DATASET} → dataset name
-- ============================================================

-- ── Generate Recommendations ────────────────────────────────
CREATE OR REPLACE TABLE `${GCP_PROJECT_ID}.${BQ_DATASET}.user_recommendations` AS
SELECT
    user_id,
    ml_generate_text_llm_result AS recommendation,
    ml_generate_text_status AS status,
    ml_generate_text_rai_result AS safety_attributes,
    CURRENT_TIMESTAMP() AS generated_at
FROM
    ML.GENERATE_TEXT(
        MODEL `${GCP_PROJECT_ID}.${BQ_DATASET}.gemini_model`,
        (
            WITH f15 AS (
                SELECT * FROM `${GCP_PROJECT_ID}.${BQ_DATASET}.user_features_15m`
                QUALIFY ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY last_updated DESC) = 1
            ),
            f30 AS (
                SELECT * FROM `${GCP_PROJECT_ID}.${BQ_DATASET}.user_features_30m`
                QUALIFY ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY last_updated DESC) = 1
            ),
            f60 AS (
                SELECT * FROM `${GCP_PROJECT_ID}.${BQ_DATASET}.user_features_60m`
                QUALIFY ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY last_updated DESC) = 1
            )
            SELECT
                f60.user_id,
                CONCAT(
                    'You are a financial advisor AI for an AML compliance platform. ',
                    'Based on the following real-time spending patterns, provide: ',
                    '1) A risk assessment (LOW/MEDIUM/HIGH) with reasoning, ',
                    '2) A personalized savings tip or product recommendation, ',
                    '3) Any AML red flags (e.g., sudden velocity spikes).\n\n',
                    'User: ', f60.user_id, '\n',
                    '--- Recent Activity (Last 15m) ---\n',
                    'Tx Count: ', IFNULL(CAST(f15.tx_count AS STRING), '0'), '\n',
                    'Total Spend: £', IFNULL(CAST(ROUND(f15.total_spend, 2) AS STRING), '0.00'), '\n',
                    'Max Tx: £', IFNULL(CAST(ROUND(f15.max_amount, 2) AS STRING), '0.00'), '\n',
                    '--- Medium Term (Last 30m) ---\n',
                    'Tx Count: ', IFNULL(CAST(f30.tx_count AS STRING), '0'), '\n',
                    'Total Spend: £', IFNULL(CAST(ROUND(f30.total_spend, 2) AS STRING), '0.00'), '\n',
                    '--- Long Term (Last 60m) ---\n',
                    'Tx Count: ', IFNULL(CAST(f60.tx_count AS STRING), '0'), '\n',
                    'Total Spend: £', IFNULL(CAST(ROUND(f60.total_spend, 2) AS STRING), '0.00'), '\n',
                    'Avg Tx: £', IFNULL(CAST(ROUND(f60.avg_amount, 2) AS STRING), '0.00'), '\n',
                    'Distinct Merchants: ', IFNULL(CAST(f60.distinct_merchants AS STRING), '0'), '\n',
                    'Distinct Countries: ', IFNULL(CAST(f60.distinct_countries AS STRING), '0'), '\n',
                    '--- AML Indicators ---\n',
                    'Near-Threshold Transactions (Last 60m): ', IFNULL(CAST(f60.near_threshold_count AS STRING), '0')
                ) AS prompt
            FROM f60
            LEFT JOIN f30 ON f60.user_id = f30.user_id
            LEFT JOIN f15 ON f60.user_id = f15.user_id
        ),
        STRUCT(
            256 AS max_output_tokens,
            0.3 AS temperature,
            TRUE AS flatten_json_output
        )
    );

-- ============================================================
-- Preview results:
-- ============================================================
-- SELECT user_id, recommendation, generated_at
-- FROM `${GCP_PROJECT_ID}.${BQ_DATASET}.user_recommendations`
-- ORDER BY generated_at DESC
-- LIMIT 10;
