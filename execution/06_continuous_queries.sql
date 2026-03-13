-- ============================================================
-- Checkpoint 6: Stateless Alerting via Continuous Queries
-- ============================================================
-- Continuous Queries run continuously on standard tables,
-- allowing you to insert the output directly into another table
-- or publish into Pub/Sub for event-driven logic.
--
-- PREREQUISITES:
--   1. raw_transactions & aml_alerts tables created (see 02)
--   2. Continuous Queries enabled (Reservation assignment required in Prod)
--
-- Replace: your_project → GCP project ID
--          aml_demo_ds → Dataset name
-- ============================================================

-- ── 1. Create Continuous Query for High-Risk Alerts ──────────
-- Runs per-row trigger validation as transactions stream in.

INSERT INTO `your_project.aml_demo_ds.aml_alerts`
    (transaction_id, user_id, alert_type, amount, timestamp)
SELECT
    transaction_id,
    user_id,
    CASE
        WHEN amount >= 50000 THEN 'LARGE_MOVEMENT'
        WHEN country IN ('FR', 'FRANCE') THEN 'JURISDICTION_SCAN' -- example high-risk match
        ELSE 'MANUAL_REVIEW_SUGGESTION'
    END AS alert_type,
    amount,
    CURRENT_TIMESTAMP() AS timestamp
FROM
    APPENDS(TABLE `your_project.aml_demo_ds.raw_transactions`, NULL, NULL)
WHERE
    amount >= 50000
    OR country IN ('FR', 'FRANCE');


-- ── 2. continuous Query to Vertex AI Enrichment (Stateless) ──
-- You can also stream individual rows into Gemini to get instant
-- risk assessment BEFORE window aggregate calculations occur.

-- SELECT 
--     transaction_id,
--     user_id,
--     ml_generate_text_llm_result AS instant_risk_assessment
-- FROM 
--     ML.GENERATE_TEXT(
--         MODEL `your_project.aml_demo_ds.gemini_model`,
--         (
--             SELECT 
--                 transaction_id,
--                 user_id,
--                 CONCAT(
--                     'Evaluate this single transaction for immediate anomalies (Stateless Scan):\n',
--                     'Amount: £', amount, '\n',
--                     'Merchant: ', merchant, '\n',
--                     'Country: ', country
--                 ) AS prompt
--             FROM 
--                 `your_project.aml_demo_ds.raw_transactions`
--         ),
--         STRUCT(
--             128 AS max_output_tokens,
--             0.2 AS temperature
--         )
--     );
